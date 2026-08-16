// ============================================================
// dsh-manager · Host 半边（静态插件包）
//
// 与动态插件（harness.handle ↔ host.call）的唯一区别：
// 通信面改为本插件自己在 webServer 上注册的 HTTP 路由
//   POST /api/dsh-manager   body: { method, args }
// 浏览器半边用同源 fetch 调用。
//
// 方法（技能管理）：
//  - catalog()       读取当前会话视角合并后的技能目录（skills.snapshot）
//  - config()        读取单个技能文件原文（含 frontmatter）
//  - save()          把编辑后的全文写回技能文件
//  - setInvocation() 增删 frontmatter 里的 user-invocable / disable-model-invocation
//  - trash()         把技能移入回收站（内容完整备份到 ~/.dsh/skills-trash/）
//  - trashList()     列出回收站条目
//  - trashRestore()  还原回收站条目（写回原路径）
//  - trashDelete()   彻底删除回收站条目（不可恢复）
//  - notesGet()      读取用户备注（全局，仅用户可见，模型不读取）
//  - notesSave()     保存某个技能的备注（标题 + 内容）
//
// 方法（部署补丁管理，0.7.0：目录驱动）：
//  - patchScan()             扫描补丁目录（类别 + 补丁 + 现场状态 + 设置）
//  - patchEnable/Disable()   事务化启用 / 链重建禁用（多文件、干跑校验、回滚）
//  - patchCategoryAdd/Rename/Delete()  类别 = 一级文件夹（默认 = 根目录）
//  - patchDelete()           删除补丁声明与伴随文件（须先禁用）
//  - patchImport()           导入 .dsh-patch.json（结构校验 + id 唯一性）
//  - patchSettingsGet/Set()  提醒模式 + 可执行补丁总开关
//  - RECOVERY.md             每次状态变更后原子重写（恢复手册）
//
// 文件写入说明（关键）：
// 这里的写入全部是“用户点击 UI 按钮”发起的用户动作，不是模型动作，
// 因此不走 ctx.fs（那是模型面的沙箱缝：无会话时按部署默认模式拒绝
// 工作区外写入，提权又需要代理回合 + 审批通道）。与内置
// dsh-settings-file 一致，本插件作为受信任的宿主平面行直接用 node:fs
// 写入，边界由两道闸门收紧：
//   1) 写入路径只能来自 skills 注册表（definition.path），不接受前端路径；
//   2) 仅 EDITABLE_SOURCES（user-dsh/project-dsh/project-agents/user-agents）
//      允许写/移入回收站，bundled/runtime/custom 一律拒绝。
// 备注存 ~/.dsh/skills-notes.json（模型只读 SKILL.md，永远读不到它）。
// 回收站目录 ~/.dsh/skills-trash/<id>.json：每条含 name/source/path/content/deletedAt，
// 还原即把 content 写回 path，彻底删除即移除该文件。
// ============================================================

import { readFile, writeFile, rename, unlink, rmdir, readdir, mkdir, access, rm, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { pinyin } from 'pinyin-pro'

export const name = 'dsh-manager'

/** 硬依赖：HTTP 载体必须先于路由注册存在。 */
export const inject = ['webServer']

const EDITABLE_SOURCES = ['user-dsh', 'project-dsh', 'project-agents', 'user-agents']
const NOTES_FILENAME = 'skills-notes.json'
const TRASH_DIRNAME = 'skills-trash'

// ---- 拼音索引（0.5.0）----
// 备注名/中文技能原名的拼音串由 host 一次性计算并随响应下发，客户端只做
// 字符串匹配（前缀 + 有序子序列），零新依赖零 bundler。
// 全拼串：拉丁字母原样保留 + 汉字转无音调拼音，其余字符剥离；
// 首字母串：仅取汉字音节首字母。按输入串缓存，notesSave 时整表失效。
// 转换失败（罕见）静默降级：不提供拼音字段，其余功能不受影响。

const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/
const pinyinCache = new Map()

function pinyinMeta(text) {
  if (text === undefined || text === null) return null
  const input = String(text)
  const cached = pinyinCache.get(input)
  if (cached !== undefined) return cached
  let meta = null
  if (CJK_RE.test(input)) {
    try {
      const lower = input.toLowerCase()
      const full = pinyin(lower, { toneType: 'none' }).replace(/[^a-z]/g, '')
      const initials = pinyin(lower, { pattern: 'first', toneType: 'none' }).replace(/[^a-z]/g, '')
      if (full.length > 0) meta = { pinyin: full, initials: initials }
    } catch (error) {
      meta = null
    }
  }
  pinyinCache.set(input, meta)
  return meta
}

function enrichNotes(rawNotes) {
  const out = {}
  for (const key of Object.keys(rawNotes)) {
    const note = rawNotes[key]
    const copy = {
      title: note !== undefined && note !== null && typeof note.title === 'string' ? note.title : '',
      content: note !== undefined && note !== null && typeof note.content === 'string' ? note.content : '',
      updatedAt: note !== undefined && note !== null && typeof note.updatedAt === 'number' ? note.updatedAt : 0,
    }
    const meta = pinyinMeta(copy.title)
    if (meta !== null) { copy.aliasPinyin = meta.pinyin; copy.aliasInitials = meta.initials }
    out[key] = copy
  }
  return out
}

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function notesPath() {
  return join(dshHome(), NOTES_FILENAME)
}

function trashDir() {
  return join(dshHome(), TRASH_DIRNAME)
}

function trashId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

/** 客户端传来的回收站 id 必须满足该白名单（防路径穿越），否则返回 undefined。 */
function safeTrashId(input) {
  return typeof input === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(input) ? input : undefined
}

// ============================================================
// 部署补丁引擎 v2（0.7.0）：目录驱动
//
// 补丁目录：~/.dsh/dsh-manager/patches/
//   *.dsh-patch.json     声明文件（根目录 =「默认」类别；一级子目录 = 类别）
//   *.dsh-patch.js       script 类型纯函数（module.exports = { apply(text) }）
//   <name>.override/     override 类型：目录内单个名为 file 的完整替换文件
//   .state/              机器状态：每文件官方快照 + 启用链 + 校验和
//   RECOVERY.md          人类可读恢复文档（每次状态变更后重写）
//
// 设计要点：
//  - 声明式 + 可执行双轨：replace（查找替换对）/ script（纯函数沙箱，无 IO + 超时）/
//    override（整文件覆盖，同文件自动排他）
//  - 补丁可多文件（files[]）：事务化启用（先全部快照 → 逐个原子写 → 失败回滚已写）
//  - 状态 = 每文件「官方快照 + 启用链重放」：官方更新只影响被更新文件上的补丁；
//    任一文件失配 → 整补丁「已丢失」
//  - 同文件共存：链重放 + 干跑裁定；显式 prerequisites/conflicts 声明
//  - 收养（adoption）：已打上标记但无状态文件的补丁（如历史版本已应用的），
//    扫描时反向推导官方快照、补写状态
//  - 所有写操作原子写（temp + rename），永不下发半写状态
// ============================================================

const PATCH_SETTINGS_FILENAME = 'dsh-manager.json'
const MANIFEST_SUFFIX = '.dsh-patch.json'
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const CATEGORY_RE = /^[\u4e00-\u9fffA-Za-z0-9_-]{1,32}$/
const FILE_NAME_RE = /^[A-Za-z0-9_.-]{1,80}$/
const COMPANION_RE = /^[A-Za-z0-9_.-]{1,64}$/
const VM_TIMEOUT_MS = 3000
const MAX_SCRIPT_OUTPUT = 64 * 1024 * 1024

/** 部署根定位：环境变量覆盖 → argv[1]（<根>/lib/bin.js）推导 → AppData 兜底。 */
function deploymentRoot() {
  const override = process.env.DSH_DEPLOYMENT_ROOT
  if (typeof override === 'string' && override.length > 0) return override
  const script = process.argv[1]
  if (typeof script === 'string' && script.length > 0) {
    const normalized = script.replace(/\\/g, '/')
    const at = normalized.indexOf('/node_modules/@deepseek-ai/dsh')
    if (at !== -1) return normalized.slice(0, at + '/node_modules/@deepseek-ai/dsh'.length)
    let dir = dirname(script)
    for (let i = 0; i < 3; i++) {
      if (/[\\/]dsh$/.test(dir)) return dir
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'npm', 'node_modules', '@deepseek-ai', 'dsh')
}

function patchesRoot() { return join(dshHome(), 'dsh-manager', 'patches') }
function stateFilesDir() { return join(patchesRoot(), '.state', 'files') }
function stateSnapshotsDir() { return join(patchesRoot(), '.state', 'snapshots') }
function recoveryPath() { return join(patchesRoot(), 'RECOVERY.md') }
function stateFileFor(targetAbs) { return join(stateFilesDir(), createHash('sha1').update(targetAbs).digest('hex') + '.json') }
function sha256(text) { return createHash('sha256').update(text).digest('hex') }
function countOf(text, needle) { return text.split(needle).length - 1 }
function truncate(text, max) { return text.length > max ? text.slice(0, max) + '…' : text }

/** 目标路径白名单：部署根内相对路径，禁止穿越与绝对路径。 */
function safeRelativePath(input) {
  if (typeof input !== 'string') return null
  const rel = input.replace(/\\/g, '/')
  if (rel.length === 0 || rel.length > 500 || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return null
  const parts = rel.split('/')
  if (parts.includes('..') || parts.includes('.')) return null
  if (parts.some(function (p) { return p.length === 0 })) return null
  return rel
}

// ---- 声明文件结构校验 ----

function validateManifest(manifest) {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) return { error: '声明文件必须是 JSON 对象' }
  if (!ID_RE.test(String(manifest.id || ''))) return { error: 'id 不合法（字母数字开头，仅字母数字 _ -，≤64）' }
  if (typeof manifest.name !== 'string' || manifest.name.trim().length === 0 || manifest.name.length > 100) return { error: 'name 必须是 1–100 字符' }
  if (manifest.description !== undefined && (typeof manifest.description !== 'string' || manifest.description.length > 500)) return { error: 'description 必须 ≤500 字符' }
  if (manifest.apply !== undefined && manifest.apply !== 'refresh' && manifest.apply !== 'restart') return { error: 'apply 仅允许 refresh / restart' }
  for (const key of ['prerequisites', 'conflicts']) {
    const list = manifest[key]
    if (list !== undefined) {
      if (!Array.isArray(list) || list.length > 50) return { error: key + ' 必须是 ≤50 项的 id 数组' }
      if (list.some(function (x) { return !ID_RE.test(String(x)) })) return { error: key + ' 必须是合法 id 数组' }
    }
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0 || manifest.files.length > 20) return { error: 'files 必须是 1–20 条' }
  const seenTargets = new Set()
  for (const fe of manifest.files) {
    if (fe === null || typeof fe !== 'object') return { error: 'file 条目必须是对象' }
    if (safeRelativePath(fe.file) === null) return { error: '目标路径不合法（须为部署根内相对路径）：' + truncate(String(fe.file || ''), 60) }
    if (seenTargets.has(fe.file)) return { error: 'files 中存在重复的目标文件：' + truncate(String(fe.file), 60) }
    seenTargets.add(fe.file)
    if (fe.kind === 'replace') {
      if (!Array.isArray(fe.pairs) || fe.pairs.length === 0 || fe.pairs.length > 200) return { error: 'replace 的 pairs 必须是 1–200 条' }
      for (const pair of fe.pairs) {
        if (pair === null || typeof pair !== 'object' || typeof pair.find !== 'string' || pair.find.length === 0 || pair.find.length > 2000) return { error: 'pair.find 必须是非空字符串（≤2000）' }
        if (typeof pair.replace !== 'string' || pair.replace.length > 4000) return { error: 'pair.replace 必须是字符串（≤4000）' }
        if (!Number.isInteger(pair.count) || pair.count < 1 || pair.count > 200) return { error: 'pair.count 必须是 1–200 的整数' }
      }
      if (fe.marker !== undefined && (typeof fe.marker !== 'string' || fe.marker.length === 0 || fe.marker.length > 200)) return { error: 'marker 必须是 ≤200 字符' }
    } else if (fe.kind === 'script') {
      if (typeof fe.script !== 'string' || !COMPANION_RE.test(fe.script) || !fe.script.endsWith('.dsh-patch.js')) return { error: 'script 文件名不合法（须为 *.dsh-patch.js）' }
      if (fe.marker !== undefined && (typeof fe.marker !== 'string' || fe.marker.length === 0 || fe.marker.length > 200)) return { error: 'marker 必须是 ≤200 字符' }
    } else if (fe.kind === 'override') {
      if (typeof fe.override !== 'string' || !COMPANION_RE.test(fe.override)) return { error: 'override 目录名不合法' }
      if (fe.marker !== undefined && (typeof fe.marker !== 'string' || fe.marker.length === 0 || fe.marker.length > 200)) return { error: 'marker 必须是 ≤200 字符' }
    } else {
      return { error: '未知补丁类型：' + String(fe.kind) }
    }
  }
  return { ok: true }
}

// ---- 目录骨架（完全平等：引擎不内置任何补丁定义，不写任何补丁文件） ----
// 可选示例补丁随包分发在 examples/，由用户/agent 经面板「导入」加入。

async function ensurePatchDirs() {
  await mkdir(patchesRoot(), { recursive: true })
  await mkdir(stateFilesDir(), { recursive: true })
  await mkdir(stateSnapshotsDir(), { recursive: true })
}

// ---- 目录扫描 ----

async function listPatchFiles() {
  const out = []
  const dirs = []
  const root = patchesRoot()
  let names = []
  try { names = await readdir(root, { withFileTypes: true }) } catch (error) {
    if (error !== undefined && error.code === 'ENOENT') return { files: out, dirs: dirs }
    throw error
  }
  names.sort(function (a, b) { return a.name.localeCompare(b.name) })
  for (const ent of names) {
    if (ent.isFile() && ent.name.endsWith(MANIFEST_SUFFIX)) out.push({ category: '默认', dir: root, file: join(root, ent.name), name: ent.name })
    else if (ent.isDirectory() && !ent.name.startsWith('.')) {
      dirs.push(ent.name)
      const dir = join(root, ent.name)
      let subs = []
      try { subs = await readdir(dir, { withFileTypes: true }) } catch { continue }
      for (const sub of subs) if (sub.isFile() && sub.name.endsWith(MANIFEST_SUFFIX)) out.push({ category: ent.name, dir: dir, file: join(dir, sub.name), name: sub.name })
    }
  }
  return { files: out, dirs: dirs }
}

/** 全量索引：entries（含结构校验结果与重复 id）+ byId + 类别目录列表（含空目录）。 */
async function loadIndex() {
  await ensurePatchDirs()
  const { files, dirs } = await listPatchFiles()
  const entries = []
  const firstSeen = new Map()
  for (const f of files) {
    let manifest = null
    let error = null
    try {
      const parsed = JSON.parse(await readFile(f.file, 'utf8'))
      const v = validateManifest(parsed)
      if (v.error !== undefined) error = v.error
      else manifest = parsed
    } catch (e) {
      error = '无法解析 JSON：' + (e instanceof Error ? e.message : String(e))
    }
    entries.push({ category: f.category, name: f.name, file: f.file, dir: f.dir, manifest: manifest, error: error, dup: false })
    if (manifest !== null) {
      if (firstSeen.has(manifest.id)) {
        entries[firstSeen.get(manifest.id)].dup = true
        entries[entries.length - 1].dup = true
      } else {
        firstSeen.set(manifest.id, entries.length - 1)
      }
    }
  }
  const byId = new Map()
  for (const entry of entries) if (entry.manifest !== null && entry.dup !== true) byId.set(entry.manifest.id, entry)
  return { entries: entries, byId: byId, dirs: dirs }
}

// ---- 状态（每文件官方快照 + 启用链） ----

async function readFileState(targetAbs) {
  try { return JSON.parse(await readFile(stateFileFor(targetAbs), 'utf8')) } catch (error) {
    // ENOENT 或损坏的状态文件一律按"无状态"处理：收养/lost 判定会自愈，绝不让面板 500
    return null
  }
}

async function writeFileState(targetAbs, state) {
  await mkdir(stateFilesDir(), { recursive: true })
  await atomicWrite(stateFileFor(targetAbs), JSON.stringify(state, null, 2) + '\n')
}

async function deleteFileState(targetAbs) {
  try { await unlink(stateFileFor(targetAbs)) } catch {}
}

async function readSnapshot(snapshotId) {
  return readFile(join(stateSnapshotsDir(), snapshotId), 'utf8')
}

async function writeSnapshot(content) {
  const id = sha256(content)
  const path = join(stateSnapshotsDir(), id)
  try { await access(path) } catch { await writeFile(path, content, 'utf8') }
  return id
}

async function deleteSnapshot(snapshotId) {
  try { await unlink(join(stateSnapshotsDir(), snapshotId)) } catch {}
}

function targetAbsOf(rel) {
  return join(deploymentRoot(), ...rel.split('/'))
}

function relOfTarget(targetAbs) {
  const root = deploymentRoot().replace(/\\/g, '/')
  const norm = targetAbs.replace(/\\/g, '/')
  if (norm.startsWith(root + '/')) return norm.slice(root.length + 1)
  return norm
}

// ---- 变换执行 ----

function applyReplace(text, pairs) {
  let out = text
  for (const pair of pairs) {
    if (countOf(out, pair.find) !== pair.count) throw new Error('查找串出现次数不符（期望 ' + pair.count + '）：' + truncate(pair.find, 40))
    out = out.split(pair.find).join(pair.replace)
  }
  return out
}

function reverseReplace(text, pairs) {
  let out = text
  for (const pair of pairs) {
    if (countOf(out, pair.replace) !== pair.count) throw new Error('替换串出现次数不符：' + truncate(pair.replace, 40))
    out = out.split(pair.replace).join(pair.find)
  }
  return out
}

function runScriptTransform(code, text) {
  // node:vm 不是硬安全边界；但沙箱无任何 IO 能力（无 require/process/fs），
  // 最坏 = CPU/内存消耗，由超时与输出上限兜底。脚本是纯函数：text 进，字符串出。
  // 全局名使用带前缀的私有名，避免被脚本自身的同名声明遮蔽。
  const sandbox = { module: { exports: {} }, __dsh_patch_text__: text }
  sandbox.exports = sandbox.module.exports
  runInNewContext(code + '\n;__result__ = (typeof module.exports === "function" ? module.exports : module.exports.apply)(__dsh_patch_text__);', sandbox, { timeout: VM_TIMEOUT_MS })
  if (typeof sandbox.__result__ !== 'string') throw new Error('脚本必须返回字符串')
  if (sandbox.__result__.length > MAX_SCRIPT_OUTPUT) throw new Error('脚本输出过大')
  return sandbox.__result__
}

async function applyFileEntry(fileEntry, text, patchDir) {
  if (fileEntry.kind === 'replace') return applyReplace(text, fileEntry.pairs)
  if (fileEntry.kind === 'script') {
    let code
    try { code = await readFile(join(patchDir, fileEntry.script), 'utf8') } catch (error) {
      if (error !== undefined && error.code === 'ENOENT') throw new Error('脚本文件缺失：' + fileEntry.script)
      throw error
    }
    if (code.length > 1000 * 1000) throw new Error('脚本文件过大（上限 1MB）：' + fileEntry.script)
    return runScriptTransform(code, text)
  }
  if (fileEntry.kind === 'override') {
    let content
    try { content = await readFile(join(patchDir, fileEntry.override, 'file'), 'utf8') } catch (error) {
      if (error !== undefined && error.code === 'ENOENT') throw new Error('覆盖文件缺失：' + fileEntry.override + '/file')
      throw error
    }
    if (content.length > 10 * 1000 * 1000) throw new Error('覆盖文件过大（上限 10MB）：' + fileEntry.override)
    return content
  }
  throw new Error('未知补丁类型：' + String(fileEntry.kind))
}

/** 从基底内容按序重放一条链（成员 = 补丁 id，均须含该文件条目）。 */
async function replayChain(chainIds, rel, base, index) {
  let text = base
  for (const id of chainIds) {
    const entry = index.byId.get(id)
    if (entry === undefined || entry.manifest === null) throw new Error('链成员缺失：' + id)
    const fe = entry.manifest.files.find(function (f) { return safeRelativePath(f.file) === rel })
    if (fe === undefined) throw new Error('补丁 ' + id + ' 不含文件条目 ' + rel)
    text = await applyFileEntry(fe, text, entry.dir)
  }
  return text
}

// ---- 收养（历史已应用但无状态文件的补丁） ----

async function adoptReplaceIfMarker(entry, fe, targetAbs) {
  if (typeof fe.marker !== 'string' || fe.marker.length === 0) return null
  let disk
  try { disk = await readFile(targetAbs, 'utf8') } catch { return null }
  if (!disk.includes(fe.marker)) return null
  let base
  try { base = reverseReplace(disk, fe.pairs) } catch { return null }
  const snapshotId = await writeSnapshot(base)
  await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: snapshotId, chain: [entry.manifest.id], outputSha: sha256(disk), at: Date.now() })
  return { base: base, disk: disk }
}

/** 磁盘内容是否含补丁条目的标记（script/override 无法求逆，仅作"疑似已应用"检测）。 */
async function markerPresentOnDisk(fe, targetAbs) {
  if (typeof fe.marker !== 'string' || fe.marker.length === 0) return false
  let disk
  try { disk = await readFile(targetAbs, 'utf8') } catch { return false }
  return disk.includes(fe.marker)
}

/** 单个补丁的状态（对全部文件聚合）：applied / clean / lost / error。
 *  判定全部基于校验和（sha256）——读路径不重放任何变换，script 不会在扫描时执行。 */
async function statusOf(id, index) {
  const entry = index.byId.get(id)
  if (entry === undefined || entry.manifest === null) return 'error'
  const files = entry.manifest.files
  let inChain = 0
  let lost = 0
  for (const fe of files) {
    const rel = safeRelativePath(fe.file)
    const targetAbs = targetAbsOf(rel)
    const st = await readFileState(targetAbs)
    if (st === null) {
      // replace 且带标记：可逆 → 收养补写状态
      if (fe.kind === 'replace') {
        const adopted = await adoptReplaceIfMarker(entry, fe, targetAbs)
        if (adopted !== null) { inChain += 1; continue }
      }
      // script/override 带标记但无状态：无法求逆 → 按已丢失（防止二次应用）
      if (await markerPresentOnDisk(fe, targetAbs)) { lost += 1; continue }
      continue // 未启用
    }
    if (!(Array.isArray(st.chain) ? st.chain : []).includes(id)) continue
    inChain += 1
    // 部署根失配：其它环境写入的状态，一律按已丢失
    if (typeof st.root === 'string' && st.root !== deploymentRoot()) { lost += 1; continue }
    try {
      const disk = await readFile(targetAbs, 'utf8')
      if (sha256(disk) !== st.outputSha) lost += 1
    } catch { lost += 1 }
  }
  if (lost > 0) return 'lost'
  if (inChain > 0 && inChain < files.length) return 'lost' // 部分文件在链、部分不在：不一致
  return inChain === files.length ? 'applied' : 'clean'
}

// ---- 启用 / 禁用 ----

async function doEnable(id) {
  const index = await loadIndex()
  const entry = index.byId.get(id)
  if (entry === undefined || entry.manifest === null) return { error: '未找到补丁或补丁校验失败：' + id }
  if (entry.dup === true) return { error: '补丁 id 与其它补丁重复，无法启用' }
  const settings = await readPatchSettings()
  const hasScript = entry.manifest.files.some(function (f) { return f.kind === 'script' })
  if (hasScript && settings.allowExecutable !== true) return { error: '全局开关「允许可执行补丁」已关闭' }
  const missing = []
  for (const p of (entry.manifest.prerequisites || [])) {
    const st = await statusOf(p, index)
    if (st !== 'applied') missing.push(p)
  }
  if (missing.length > 0) return { error: '前置补丁未启用：' + missing.join(', ') }
  for (const c of (entry.manifest.conflicts || [])) {
    if (await statusOf(c, index) === 'applied') return { error: '与已启用的补丁 ' + c + ' 互斥' }
  }
  for (const other of index.entries) {
    if (other.manifest === null || other.manifest.id === id) continue
    if ((other.manifest.conflicts || []).includes(id) && await statusOf(other.manifest.id, index) === 'applied') {
      return { error: '补丁 ' + other.manifest.id + ' 声明了与本补丁互斥' }
    }
  }
  // 第一遍：逐文件判定状态（不提前 return already，避免"部分文件已启用"被掩盖）
  const fileInfos = []
  for (const fe of entry.manifest.files) {
    const rel = safeRelativePath(fe.file)
    const targetAbs = targetAbsOf(rel)
    let st = await readFileState(targetAbs)
    // 空链状态的快照若与磁盘不一致（用户手动还原过文件）：丢弃过期状态，以磁盘为基准
    if (st !== null && (st.chain || []).length === 0) {
      let diskNow = null
      try { diskNow = await readFile(targetAbs, 'utf8') } catch {}
      if (diskNow !== null && sha256(diskNow) !== st.outputSha) {
        await deleteFileState(targetAbs)
        st = null
      }
    }
    // 部署根失配优先于一切判定：其它环境写入的状态一律按"已丢失"处理
    if (st !== null && typeof st.root === 'string' && st.root !== deploymentRoot()) {
      return { error: '该文件存在其它部署根的状态记录（部署根可能已变更）。请先在面板禁用对应补丁刷新状态' }
    }
    let alreadyOk = false
    if (st !== null && (st.chain || []).includes(id)) {
      // 已在链中：核对磁盘校验和，防止"已丢失却报已启用"的假成功
      let diskNow = null
      try { diskNow = await readFile(targetAbs, 'utf8') } catch {}
      if (diskNow !== null && sha256(diskNow) === st.outputSha) alreadyOk = true
      else return { error: '目标文件已被外部改动（已丢失）。请先在面板禁用该补丁以刷新状态，再重新启用' }
    }
    if (st === null && await markerPresentOnDisk(fe, targetAbs)) {
      return { error: '目标文件已含本补丁标记但状态缺失，无法安全启用。请先恢复官方原样（或运行 -restore 清理）' }
    }
    fileInfos.push({ fe: fe, rel: rel, targetAbs: targetAbs, st: st, alreadyOk: alreadyOk })
  }
  const alreadyCount = fileInfos.filter(function (fi) { return fi.alreadyOk }).length
  if (alreadyCount > 0) {
    if (alreadyCount === fileInfos.length) return { ok: true, state: 'applied', already: true, apply: entry.manifest.apply }
    return { error: '补丁状态不一致（部分文件已启用、部分未启用）。请先在面板禁用它以重建一致状态' }
  }
  // 第二遍：构建写入计划（干跑整条新链）
  const plans = []
  for (const fi of fileInfos) {
    let base
    if (fi.st !== null) {
      try { base = await readSnapshot(fi.st.snapshotId) } catch { return { error: '状态文件缺失，无法继续：' + fi.rel } }
    } else {
      try { base = await readFile(fi.targetAbs, 'utf8') } catch { return { error: '目标文件不存在：' + fi.rel } }
    }
    const chain = fi.st !== null ? (fi.st.chain || []) : []
    let output
    try { output = await replayChain([...chain, id], fi.rel, base, index) } catch (e) { return { error: '干跑失败（' + fi.rel + '）：' + (e instanceof Error ? e.message : String(e)) } }
    plans.push({ rel: fi.rel, targetAbs: fi.targetAbs, base: base, output: output, st: fi.st, chain: chain })
  }
  // 事务：先全部快照 → 逐个原子写 → 失败回滚已写文件
  try {
    for (const plan of plans) {
      plan.snapshotId = plan.st !== null ? plan.st.snapshotId : await writeSnapshot(plan.base)
    }
    const written = []
    for (const plan of plans) {
      await atomicWrite(plan.targetAbs, plan.output)
      written.push(plan)
    }
    for (const plan of plans) {
      await writeFileState(plan.targetAbs, { path: plan.targetAbs, root: deploymentRoot(), snapshotId: plan.snapshotId, chain: [...plan.chain, id], outputSha: sha256(plan.output), at: Date.now() })
    }
  } catch (error) {
    for (const plan of written) { try { await atomicWrite(plan.targetAbs, plan.base) } catch {} }
    throw error
  }
  await regenerateRecovery(await loadIndex())
  return { ok: true, state: 'applied', apply: entry.manifest.apply }
}

async function doDisable(id) {
  const index = await loadIndex()
  const entry = index.byId.get(id)
  if (entry === undefined || entry.manifest === null) return { error: '未找到补丁：' + id }
  let touched = false
  let reset = false
  for (const fe of entry.manifest.files) {
    const rel = safeRelativePath(fe.file)
    const targetAbs = targetAbsOf(rel)
    const st = await readFileState(targetAbs)
    if (st === null) {
      // 无状态但磁盘含标记（script/override 无法求逆、或状态曾丢失）：
      // 提供恢复出口——把当前磁盘内容刷新为新官方基线（文件不动），补丁回到 clean
      if (await markerPresentOnDisk(fe, targetAbs)) {
        let disk = null
        try { disk = await readFile(targetAbs, 'utf8') } catch {}
        if (disk !== null) {
          const snapshotId = await writeSnapshot(disk)
          await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: snapshotId, chain: [], outputSha: sha256(disk), at: Date.now() })
          touched = true
          reset = true
        }
      }
      continue
    }
    if (!(st.chain || []).includes(id)) continue
    touched = true
    let disk = null
    try { disk = await readFile(targetAbs, 'utf8') } catch {}
    const rootMismatch = typeof st.root === 'string' && st.root !== deploymentRoot()
    if (disk === null) {
      // 目标文件已被外部删除（官方升级移除整包/文件）：绝不复活文件，只清理状态
      await deleteFileState(targetAbs)
      await deleteSnapshot(st.snapshotId)
      reset = true
      continue
    }
    if (rootMismatch || sha256(disk) !== st.outputSha) {
      // 外部改动（官方升级/手动编辑/部署根变更）：放弃旧链，把当前内容刷新为新官方快照
      const snapshotId = await writeSnapshot(disk)
      await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: snapshotId, chain: [], outputSha: sha256(disk), at: Date.now() })
      reset = true
      continue
    }
    const newChain = (st.chain || []).filter(function (x) { return x !== id })
    const base = await readSnapshot(st.snapshotId)
    let output
    try { output = await replayChain(newChain, rel, base, index) } catch (e) { return { error: '重建链失败（' + rel + '）：' + (e instanceof Error ? e.message : String(e)) + '——请先禁用该文件上的其它补丁' } }
    await atomicWrite(targetAbs, output)
    if (newChain.length === 0) {
      await deleteFileState(targetAbs)
      await deleteSnapshot(st.snapshotId)
    } else {
      await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: st.snapshotId, chain: newChain, outputSha: sha256(output), at: Date.now() })
    }
  }
  await regenerateRecovery(await loadIndex())
  return { ok: true, apply: entry.manifest.apply, touched: touched, reset: reset }
}

// ---- 类别 / 删除 / 导入 ----

async function doCategoryAdd(name) {
  const cat = String(name || '')
  if (!CATEGORY_RE.test(cat)) return { error: '类别名不合法（中文/字母/数字/下划线/连字符，1–32 字符）' }
  if (cat === '默认') return { error: '「默认」是根目录，不能创建' }
  try { await mkdir(join(patchesRoot(), cat)) } catch (error) {
    if (error !== undefined && error.code === 'EEXIST') return { error: '类别已存在：' + cat }
    throw error
  }
  await regenerateRecovery(await loadIndex())
  return { ok: true }
}

async function doCategoryRename(oldName, newName) {
  const oldCat = String(oldName || '')
  const newCat = String(newName || '')
  if (oldCat === '默认' || newCat === '默认') return { error: '「默认」是根目录，不能重命名' }
  if (!CATEGORY_RE.test(newCat)) return { error: '新类别名不合法' }
  let exists = true
  try { await access(join(patchesRoot(), oldCat)) } catch { exists = false }
  if (!exists) return { error: '类别不存在：' + oldCat }
  try { await access(join(patchesRoot(), newCat)) } catch { exists = false }
  if (exists) return { error: '目标类别名已存在：' + newCat }
  await rename(join(patchesRoot(), oldCat), join(patchesRoot(), newCat))
  await regenerateRecovery(await loadIndex())
  return { ok: true }
}

async function doCategoryDelete(name) {
  const cat = String(name || '')
  if (cat === '默认') return { error: '「默认」是根目录，不能删除' }
  let subs = []
  try { subs = await readdir(join(patchesRoot(), cat)) } catch (error) {
    if (error !== undefined && error.code === 'ENOENT') return { error: '类别不存在：' + cat }
    throw error
  }
  if (subs.length > 0) return { error: '类别非空（含 ' + subs.length + ' 个文件），请先移走或删除' }
  await rmdir(join(patchesRoot(), cat))
  await regenerateRecovery(await loadIndex())
  return { ok: true }
}

/** 按 id 或文件名解析补丁条目（byId 只收合法且 id 唯一的条目；
 *  id 重复、结构损坏的条目也要能被定位——否则永远删不掉）。 */
function resolvePatchEntry(index, id) {
  for (const entry of index.entries) {
    if (entry.manifest !== null && entry.manifest.id === id) return entry
  }
  let byName = null
  for (const entry of index.entries) {
    if (entry.name !== id) continue
    if (byName !== null) return null // 多个同名：无法唯一定位
    byName = entry
  }
  return byName
}

/** 某个补丁 id 是否仍被任何状态链引用。 */
async function idInAnyChain(id) {
  let files = []
  try { files = await readdir(stateFilesDir()) } catch { return false }
  for (const f of files) {
    try {
      const st = JSON.parse(await readFile(join(stateFilesDir(), f), 'utf8'))
      if (st !== null && typeof st === 'object' && Array.isArray(st.chain) && st.chain.includes(id)) return true
    } catch {}
  }
  return false
}

async function doPatchDelete(id) {
  const index = await loadIndex()
  const entry = resolvePatchEntry(index, id)
  if (entry === undefined) return { error: '未找到补丁：' + id }
  if (entry === null) return { error: '存在多个同名损坏文件，无法唯一定位——请先修复或手动删除其中一个：' + id }
  if (entry.manifest !== null) {
    const mid = entry.manifest.id
    if (entry.dup === true) {
      // 重复 id：byId 不收它，无法判定状态；只要还被状态链引用就拒绝（删另一份后可解除）
      if (await idInAnyChain(mid)) return { error: '该补丁 id 仍被状态链引用，无法删除（请先删除另一份重复文件并在面板禁用）' }
    } else {
      const st = await statusOf(mid, index)
      if (st === 'applied') return { error: '补丁处于启用状态，请先禁用' }
      if (st === 'lost') return { error: '补丁状态异常（已丢失）——请先在面板禁用它以清理状态，再删除' }
      if (await idInAnyChain(mid)) return { error: '该补丁仍被状态链引用，无法删除（请先在面板禁用）' }
    }
  }
  await unlink(entry.file)
  if (entry.manifest !== null) {
    for (const fe of entry.manifest.files) {
      if (fe.kind === 'script' && typeof fe.script === 'string') { try { await unlink(join(entry.dir, fe.script)) } catch {} }
      if (fe.kind === 'override' && typeof fe.override === 'string') { try { await rm(join(entry.dir, fe.override), { recursive: true, force: true }) } catch {} }
    }
  }
  await regenerateRecovery(await loadIndex())
  return { ok: true }
}

async function doPatchImport(args) {
  const input = args !== null && typeof args === 'object' ? args : {}
  const category = typeof input.category === 'string' && input.category.length > 0 ? input.category : '默认'
  let targetDir = patchesRoot()
  if (category !== '默认') {
    if (!CATEGORY_RE.test(category)) return { error: '非法类别名' }
    targetDir = join(patchesRoot(), category)
    let exists = true
    try { await access(targetDir) } catch { exists = false }
    if (!exists) return { error: '类别不存在：' + category }
  }
  const fileName = String(input.fileName || '')
  if (!fileName.endsWith(MANIFEST_SUFFIX)) return { error: '仅接受 .dsh-patch.json 声明文件' }
  const base = fileName.split(/[\\/]/).pop()
  if (!FILE_NAME_RE.test(base)) return { error: '文件名不合法' }
  if (typeof input.content !== 'string' || input.content.length === 0) return { error: '内容不能为空' }
  if (input.content.length > 1000 * 1000) return { error: '内容过大（上限 1MB）' }
  let parsed
  try { parsed = JSON.parse(input.content) } catch { return { error: 'JSON 解析失败' } }
  const v = validateManifest(parsed)
  if (v.error !== undefined) return { error: '结构校验失败：' + v.error }
  await ensurePatchDirs()
  const index = await loadIndex()
  // 查重必须覆盖全部条目（含 id 重复的条目，byId 里没有它们）
  const dupEntry = index.entries.find(function (e) { return e.manifest !== null && e.manifest.id === parsed.id })
  if (dupEntry !== undefined) return { error: 'id 与现有补丁重复：' + parsed.id + '（文件：' + dupEntry.name + '）' }
  const target = join(targetDir, base)
  let occupied = true
  try { await access(target) } catch { occupied = false }
  if (occupied) return { error: '同名文件已存在：' + base }
  await atomicWrite(target, JSON.stringify(parsed, null, 2) + '\n')
  await regenerateRecovery(await loadIndex())
  return { ok: true, id: parsed.id, category: category }
}

// ---- 设置 / 恢复文档 ----

function settingsPath() {
  return join(dshHome(), PATCH_SETTINGS_FILENAME)
}

async function readPatchSettings() {
  try {
    const parsed = JSON.parse(await readFile(settingsPath(), 'utf8'))
    const mode = (parsed !== null && typeof parsed === 'object' && (parsed.alertMode === 'panel' || parsed.alertMode === 'badge')) ? parsed.alertMode : 'panel'
    const allowExecutable = parsed !== null && typeof parsed === 'object' && typeof parsed.allowExecutable === 'boolean' ? parsed.allowExecutable : true
    return { version: 1, alertMode: mode, allowExecutable: allowExecutable }
  } catch (error) {
    // ENOENT 或损坏的设置文件一律按默认设置处理，绝不让面板 500
    return { version: 1, alertMode: 'panel', allowExecutable: true }
  }
}

async function mtimeMs(path) {
  try { return (await stat(path)).mtimeMs } catch { return 0 }
}

/** RECOVERY.md 是否过期：任一清单/状态文件比它新（含"尚不存在"）。 */
async function recoveryIsStale(index) {
  let newest = 0
  for (const entry of index.entries) newest = Math.max(newest, await mtimeMs(entry.file))
  let files = []
  try { files = await readdir(stateFilesDir()) } catch {}
  for (const f of files) newest = Math.max(newest, await mtimeMs(join(stateFilesDir(), f)))
  const rec = await mtimeMs(recoveryPath())
  return rec === 0 || newest > rec
}

async function regenerateRecovery(index) {
  // RECOVERY.md 是状态的投影：写失败（磁盘只读/瞬时占用）只记日志，绝不打断主流程
  try {
    await regenerateRecoveryInner(index)
  } catch (error) {
    console.error('[dsh-manager] RECOVERY.md 重写失败（不影响主流程）：', error instanceof Error ? error.message : String(error))
  }
}

async function regenerateRecoveryInner(index) {
  const root = deploymentRoot()
  const lines = []
  lines.push('# 补丁状态与恢复手册')
  lines.push('')
  lines.push('由 dsh-manager 自动生成，每次补丁状态变更后重写；请勿手改。')
  lines.push('生成时间：' + new Date().toISOString())
  lines.push('部署根：' + root)
  lines.push('')
  lines.push('## 已启用补丁')
  lines.push('')
  const appliedRows = []
  const otherRows = []
  for (const entry of index.entries) {
    if (entry.manifest === null) {
      otherRows.push('| ' + entry.name + ' | ' + entry.category + ' | （校验失败：' + (entry.error || '') + '） | | |')
      continue
    }
    const m = entry.manifest
    const st = await statusOf(m.id, index)
    for (const fe of m.files) {
      const rel = safeRelativePath(fe.file)
      const targetAbs = targetAbsOf(rel)
      const state = await readFileState(targetAbs)
      const inChain = state !== null && (state.chain || []).includes(m.id)
      const backup = inChain && typeof state.snapshotId === 'string' ? join(stateSnapshotsDir(), state.snapshotId) : ''
      const target = inChain ? targetAbs : (st === 'clean' ? targetAbs : '')
      const row = '| ' + m.name + '（' + m.id + '） | ' + entry.category + ' | ' + rel + ' | ' + (inChain ? backup : '—') + ' |'
      if (st === 'applied' && inChain) appliedRows.push(row)
      else otherRows.push(row + ' （' + (st === 'clean' ? '未启用' : st === 'lost' ? '已丢失' : '状态异常') + '） |')
    }
  }
  if (appliedRows.length === 0) lines.push('（无）')
  else { lines.push('| 补丁 | 类别 | 目标文件 | 官方备份（绝对路径） |'); lines.push('|---|---|---|---|'); for (const r of appliedRows) lines.push(r) }
  lines.push('')
  lines.push('## 其它（未启用 / 已丢失 / 校验失败）')
  lines.push('')
  if (otherRows.length === 0) lines.push('（无）')
  else for (const r of otherRows) lines.push(r)
  lines.push('')
  lines.push('## 复原方法（dsh 打不开时）')
  lines.push('')
  lines.push('1. 把「已启用补丁」表中每行的官方备份文件复制覆盖回对应目标文件（备份按文件、不按补丁）。')
  lines.push('2. 或命令行一键还原全部：')
  lines.push('   powershell -ExecutionPolicy Bypass -File <scripts 目录>\\reapply-deployment-patches.ps1 -restore')
  lines.push('')
  await atomicWrite(recoveryPath(), lines.join('\n') + '\n')
}


/** 同卷原子写：先写临时文件再 rename（Windows 上 rename 覆盖目标）。 */
async function atomicWrite(path, content) {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    await writeFile(tmp, content, 'utf8')
    await rename(tmp, path)
  } catch (error) {
    try { await unlink(tmp) } catch {}
    throw error
  }
}

// 备注文件是单用户读改写，用模块级队列串行化，避免并发交错。
let notesQueue = Promise.resolve()
function serialized(fn) {
  const next = notesQueue.then(fn, fn)
  notesQueue = next.then(() => undefined, () => undefined)
  return next
}

async function readNotesStore() {
  try {
    const parsed = JSON.parse(await readFile(notesPath(), 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.notes === null || typeof parsed.notes !== 'object') {
      return { version: 1, notes: {} }
    }
    return { version: 1, notes: parsed.notes }
  } catch (error) {
    if (error !== undefined && error.code === 'ENOENT') return { version: 1, notes: {} }
    throw error
  }
}

function presetOfSession(session) {
  if (session === undefined || session === null) return undefined
  let presetId = session.header === undefined || session.header === null ? undefined : session.header.agentPreset
  const events = session.events
  if (Array.isArray(events)) {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (event !== undefined && event !== null && event.type === 'agent-preset/selected') {
        if (event.data !== undefined && event.data !== null && typeof event.data.agentPreset === 'string') presetId = event.data.agentPreset
        break
      }
    }
  }
  return presetId
}

/**
 * 解析“当前会话视角”的技能注册表、view scope 与 cwd。
 * 与 api-proxy 的 skill.list 保持一致：优先取实例作用域
 * （agentPresets.serviceFor(live,'skills')），否则退回 host 全局的
 * ctx.get('skills')；scope 取活动 agent 或预设 standing key。
 */
async function resolveView(ctx, args) {
  const input = args !== null && typeof args === 'object' ? args : {}
  const sessions = ctx.get('sessions')
  const agents = ctx.get('agents')
  const presets = ctx.get('agentPresets')
  const sessionId = typeof input.sessionId === 'string' && input.sessionId.length > 0 ? input.sessionId : undefined
  const session = sessionId === undefined || sessions === undefined ? undefined : sessions.get(sessionId)
  let cwd = typeof input.cwd === 'string' && input.cwd.length > 0 ? input.cwd : undefined
  if (cwd === undefined && session !== undefined && session.header !== undefined && typeof session.header.cwd === 'string') cwd = session.header.cwd
  const live = sessionId === undefined || agents === undefined ? undefined : agents.get(sessionId)
  let scope = live
  if (scope === undefined && presets !== undefined) {
    try {
      scope = await presets.standingKeyFor(presetOfSession(session))
    } catch (error) {
      scope = undefined
    }
  }
  let skills = ctx.get('skills')
  if (live !== undefined && presets !== undefined) {
    try {
      const scoped = presets.serviceFor(live, 'skills')
      if (scoped !== undefined) skills = scoped
    } catch (error) {
      skills = ctx.get('skills')
    }
  }
  return { skills: skills, scope: scope, cwd: cwd }
}

/** 取一个技能的 definition 并校验可写权限；不可写/不存在时返回 { error }。 */
async function writableDefinition(view, args) {
  if (view.skills === undefined) return { error: '技能注册表不可用：当前预设或宿主组合未挂载 skill 服务' }
  const name = args !== null && typeof args === 'object' && typeof args.name === 'string' ? args.name : ''
  if (name.length === 0) return { error: '缺少技能名称' }
  const definition = await view.skills.get(name, { cwd: view.cwd, scope: view.scope })
  if (definition === undefined) return { error: '未找到技能 "' + name + '"' }
  if (typeof definition.path !== 'string' || definition.path.length === 0) return { error: '该技能由运行时注册，没有配置文件' }
  if (EDITABLE_SOURCES.indexOf(String(definition.source)) === -1) return { error: '该技能来自只读来源（系统/预设自带），不允许修改' }
  return { definition: definition }
}

// ---- frontmatter 增删（不依赖 YAML 解析器，行级安全处理）----

function lineHasKey(line, key) {
  const t = line.trim()
  return t.length > 0 && t.charAt(0) !== '#' && t.slice(0, key.length + 1) === key + ':'
}

function splitFrontmatter(text) {
  const src = text.length > 0 && text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = src.split('\n')
  if (lines.length > 0 && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        return { has: true, fm: lines.slice(1, i), body: lines.slice(i + 1) }
      }
    }
  }
  return { has: false, fm: [], body: lines }
}

function ensureFlag(fm, key, offText, wantOn) {
  let idx = -1
  for (let i = 0; i < fm.length; i++) {
    if (lineHasKey(fm[i], key)) { idx = i; break }
  }
  if (wantOn) {
    if (idx >= 0) fm.splice(idx, 1) // 缺省 = 允许，删除即恢复
  } else if (idx >= 0) {
    fm[idx] = offText
  } else {
    fm.unshift(offText)
  }
}

function mutateInvocationFrontmatter(raw, wantModel, wantUser) {
  const split = splitFrontmatter(raw)
  const fm = split.fm.slice()
  ensureFlag(fm, 'disable-model-invocation', 'disable-model-invocation: true', wantModel)
  ensureFlag(fm, 'user-invocable', 'user-invocable: false', wantUser)
  if (!split.has) {
    if (wantModel && wantUser) return raw
    return '---\n' + fm.join('\n') + '\n---\n' + split.body.join('\n')
  }
  return '---\n' + fm.join('\n') + '\n---\n' + split.body.join('\n')
}

// ---- HTTP 载体（与 dsh-market 插件同款：webServer 自定义路由 + 同源 fetch）----

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

/** Same-origin check: the browser's Origin host must equal the request Host. */
function sameOrigin(req) {
  const origin = req.headers && req.headers.origin
  const host = req.headers && req.headers.host
  if (origin === undefined || host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(obj))
}

/**
 * 包内技能自动注册（0.8.0）：把本包 skills/ 目录的 SKILL.md 注册进技能
 * 注册表（runtime provider）。技能随插件装配生效、随卸载消失，无需用户
 * 手动复制到 ~/.dsh/skills。frontmatter 的 description 成为路由描述；
 * 无 frontmatter 时以技能名为描述兜底。
 */
function registerPackagedSkills(ctx) {
  const PACKAGED = [
    ['local-governance', '../skills/local-governance/SKILL.md'],
    ['dsh-plugin-lifecycle', '../skills/dsh-plugin-lifecycle/SKILL.md'],
  ]
  const svc = ctx.get('skills')
  if (svc === undefined) {
    console.warn('[dsh-manager] skills service unavailable; packaged skill registration skipped')
    return
  }
  for (const [skillName, relPath] of PACKAGED) {
    try {
      const url = new URL(relPath, import.meta.url)
      const text = readFileSync(url, 'utf8')
      const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text)
      const meta = {}
      if (fm !== null) {
        for (const line of fm[1].split('\n')) {
          const i = line.indexOf(':')
          if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
        }
      }
      const content = fm === null ? text : text.slice(fm[0].length)
      ctx.effect(() => svc.register({
        name: skillName,
        description: String(meta.description ?? skillName),
        source: 'custom',
        content,
        path: fileURLToPath(url),
      }), `dsh-manager: packaged skill ${skillName}`)
    } catch (error) {
      console.warn(`[dsh-manager] packaged skill "${skillName}" registration skipped (${url.href}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

export function apply(ctx) {
  registerPackagedSkills(ctx)

  const webServer = ctx.get('webServer')
  if (webServer === undefined) {
    // inject: ['webServer'] 声明了硬依赖，正常挂载时不会走到这里；
    // 保留优雅降级便于在无 webserver 的组合（headless 等）中诊断。
    console.error('[dsh-skill-manager] webServer service unavailable; route not registered')
    return
  }

  const handlers = {
    'catalog': async function (args) {
      const view = await resolveView(ctx, args)
      if (view.skills === undefined) return { error: '技能注册表不可用：当前预设或宿主组合未挂载 skill 服务' }
      const snapshot = await view.skills.snapshot({ cwd: view.cwd, scope: view.scope })
      return {
        complete: snapshot.complete === true,
        skills: snapshot.skills.map(function (skill) {
          const skillName = String(skill.name)
          const meta = pinyinMeta(skillName)
          const out = {
            name: skillName,
            description: skill.description === undefined ? '' : String(skill.description),
            whenToUse: skill.whenToUse === undefined ? null : String(skill.whenToUse),
            modelInvocable: skill.invocation !== undefined && skill.invocation.modelInvocable === true,
            userInvocable: skill.invocation !== undefined && skill.invocation.userInvocable === true,
            source: String(skill.source),
            provider: String(skill.provider),
          }
          if (meta !== null) { out.namePinyin = meta.pinyin; out.nameInitials = meta.initials }
          return out
        }),
      }
    },

    'config': async function (args) {
      const view = await resolveView(ctx, args)
      if (view.skills === undefined) return { error: '技能注册表不可用：当前预设或宿主组合未挂载 skill 服务' }
      const name = args !== null && typeof args === 'object' && typeof args.name === 'string' ? args.name : ''
      if (name.length === 0) return { error: '缺少技能名称' }
      const definition = await view.skills.get(name, { cwd: view.cwd, scope: view.scope })
      if (definition === undefined) return { error: '未找到技能 "' + name + '"' }
      const source = String(definition.source)
      const hasPath = typeof definition.path === 'string' && definition.path.length > 0
      let content = definition.content === undefined ? '' : String(definition.content)
      if (hasPath) {
        try {
          content = await readFile(definition.path, 'utf8')
        } catch (error) {
          return { error: '读取配置文件失败：' + (error instanceof Error ? error.message : String(error)) }
        }
      }
      return {
        name: String(definition.name),
        description: definition.description === undefined ? '' : String(definition.description),
        content: content,
        path: hasPath ? definition.path : null,
        source: source,
        provider: String(definition.provider),
        editable: hasPath && EDITABLE_SOURCES.indexOf(source) !== -1,
      }
    },

    'save': async function (args) {
      const view = await resolveView(ctx, args)
      const writable = await writableDefinition(view, args)
      if (writable.error !== undefined) return { error: writable.error }
      const content = args !== null && typeof args === 'object' && typeof args.content === 'string' ? args.content : ''
      await atomicWrite(writable.definition.path, content)
      return { ok: true, operation: 'update' }
    },

    'setInvocation': async function (args) {
      const view = await resolveView(ctx, args)
      const writable = await writableDefinition(view, args)
      if (writable.error !== undefined) return { error: writable.error }
      const input = args !== null && typeof args === 'object' ? args : {}
      const wantModel = input.modelOn === true
      const wantUser = input.userOn === true
      const raw = await readFile(writable.definition.path, 'utf8')
      const next = mutateInvocationFrontmatter(raw, wantModel, wantUser)
      if (next !== raw) {
        await atomicWrite(writable.definition.path, next)
      }
      return { ok: true }
    },

    'trash': async function (args) {
      const view = await resolveView(ctx, args)
      const writable = await writableDefinition(view, args)
      if (writable.error !== undefined) return { error: writable.error }
      const target = writable.definition.path
      const content = await readFile(target, 'utf8')
      await mkdir(trashDir(), { recursive: true })
      const id = trashId()
      await atomicWrite(join(trashDir(), id + '.json'), JSON.stringify({
        name: String(writable.definition.name),
        source: String(writable.definition.source),
        path: target,
        content: content,
        deletedAt: Date.now(),
      }, null, 2) + '\n')
      await unlink(target)
      // 技能目录只装 SKILL.md 时顺手清掉空目录；目录里还有别的文件则保留。
      try {
        await rmdir(dirname(target))
      } catch (error) {
        const code = error !== undefined && error.code
        if (code !== 'ENOTEMPTY' && code !== 'ENOENT') throw error
      }
      return { ok: true, id: id }
    },

    'trashList': async function () {
      let names = []
      try {
        names = await readdir(trashDir())
      } catch (error) {
        if (error !== undefined && error.code === 'ENOENT') return { ok: true, items: [] }
        throw error
      }
      const items = []
      for (const name of names) {
        if (!/^[A-Za-z0-9_-]+\.json$/.test(name)) continue
        try {
          const parsed = JSON.parse(await readFile(join(trashDir(), name), 'utf8'))
          if (parsed === null || typeof parsed !== 'object' || typeof parsed.name !== 'string') continue
          items.push({
            id: name.slice(0, -5),
            name: parsed.name,
            source: typeof parsed.source === 'string' ? parsed.source : '',
            path: typeof parsed.path === 'string' ? parsed.path : '',
            deletedAt: typeof parsed.deletedAt === 'number' ? parsed.deletedAt : 0,
            // 回收站备份文件本身的路径（“配置”按钮用它打开对应文件）
            file: join(trashDir(), name),
          })
        } catch (error) {
          // 损坏的条目跳过（不阻塞列表）
        }
      }
      items.sort(function (a, b) { return b.deletedAt - a.deletedAt })
      return { ok: true, items: items }
    },

    'trashRestore': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const id = safeTrashId(input.id)
      if (id === undefined) return { error: '无效的回收站条目 id' }
      const file = join(trashDir(), id + '.json')
      let parsed
      try {
        parsed = JSON.parse(await readFile(file, 'utf8'))
      } catch (error) {
        if (error !== undefined && error.code === 'ENOENT') return { error: '回收站条目不存在' }
        return { error: '读取回收站条目失败：' + (error instanceof Error ? error.message : String(error)) }
      }
      if (parsed === null || typeof parsed !== 'object' || typeof parsed.path !== 'string' || parsed.path.length === 0 || typeof parsed.content !== 'string') {
        return { error: '回收站条目已损坏，无法还原' }
      }
      let exists = true
      try { await access(parsed.path) } catch { exists = false }
      if (exists) return { error: '目标位置已存在文件，无法还原（请先处理现有文件）' }
      await mkdir(dirname(parsed.path), { recursive: true })
      await atomicWrite(parsed.path, parsed.content)
      await unlink(file)
      return { ok: true }
    },

    'trashDelete': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const id = safeTrashId(input.id)
      if (id === undefined) return { error: '无效的回收站条目 id' }
      try {
        await unlink(join(trashDir(), id + '.json'))
      } catch (error) {
        if (error !== undefined && error.code === 'ENOENT') return { error: '回收站条目不存在' }
        throw error
      }
      return { ok: true }
    },

    'notesGet': async function () {
      const store = await readNotesStore()
      return { ok: true, notes: enrichNotes(store.notes) }
    },

    'notesSave': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const name = typeof input.name === 'string' ? input.name : ''
      if (name.length === 0) return { error: '缺少技能名称' }
      const title = typeof input.title === 'string' ? input.title : ''
      const content = typeof input.content === 'string' ? input.content : ''
      const store = await serialized(async function () {
        const current = await readNotesStore()
        const next = {}
        for (const key of Object.keys(current.notes)) next[key] = current.notes[key]
        next[name] = { title: title, content: content, updatedAt: Date.now() }
        await atomicWrite(notesPath(), JSON.stringify({ version: 1, notes: next }, null, 2) + '\n')
        pinyinCache.clear()
        return next
      })
      return { ok: true, notes: enrichNotes(store) }
    },

    // ---- 部署补丁管理（0.7.0：目录驱动引擎）----

    'patchScan': async function () {
      const index = await loadIndex()
      const settings = await readPatchSettings()
      const patches = []
      for (const entry of index.entries) {
        if (entry.manifest === null) {
          patches.push({ id: entry.name, name: entry.name, description: '', category: entry.category, fileName: entry.name, structuralError: entry.error || '结构校验失败', state: 'error' })
          continue
        }
        const m = entry.manifest
        const st = await statusOf(m.id, index)
        patches.push({
          id: m.id, name: m.name, description: typeof m.description === 'string' ? m.description : '', category: entry.category,
          fileName: entry.name, apply: m.apply === 'restart' ? 'restart' : 'refresh',
          hasScript: m.files.some(function (f) { return f.kind === 'script' }),
          structuralError: entry.dup === true ? 'id 与其它补丁重复' : null,
          targets: m.files.map(function (f) { return typeof f.file === 'string' ? f.file : '' }).filter(function (p) { return p.length > 0 }),
          state: st,
        })
      }
      const categories = ['默认']
      for (const dir of (index.dirs || [])) if (categories.indexOf(dir) === -1) categories.push(dir)
      for (const entry of index.entries) if (entry.category !== '默认' && categories.indexOf(entry.category) === -1) categories.push(entry.category)
      if (await recoveryIsStale(index)) await regenerateRecovery(index)
      return { ok: true, root: deploymentRoot(), settings: settings, categories: categories, patches: patches }
    },

    'patchEnable': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      return serialized(function () { return doEnable(typeof input.id === 'string' ? input.id : '') })
    },

    'patchDisable': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      return serialized(function () { return doDisable(typeof input.id === 'string' ? input.id : '') })
    },

    'patchCategoryAdd': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      return serialized(function () { return doCategoryAdd(input.name) })
    },

    'patchCategoryRename': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      return serialized(function () { return doCategoryRename(input.oldName, input.newName) })
    },

    'patchCategoryDelete': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      return serialized(function () { return doCategoryDelete(input.name) })
    },

    'patchDelete': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      return serialized(function () { return doPatchDelete(typeof input.id === 'string' ? input.id : '') })
    },

    'patchImport': async function (args) {
      return serialized(function () { return doPatchImport(args) })
    },

    'patchSettingsGet': async function () {
      const settings = await readPatchSettings()
      return { ok: true, settings: settings }
    },

    'patchSettingsSet': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const current = await readPatchSettings()
      const next = { version: 1, alertMode: current.alertMode, allowExecutable: current.allowExecutable }
      if (input.alertMode === 'panel' || input.alertMode === 'badge') next.alertMode = input.alertMode
      else if (input.alertMode !== undefined) return { error: '无效的提醒模式（仅 panel / badge）' }
      if (typeof input.allowExecutable === 'boolean') next.allowExecutable = input.allowExecutable
      await serialized(async function () {
        await atomicWrite(settingsPath(), JSON.stringify(next, null, 2) + '\n')
      })
      return { ok: true, settings: next }
    },
  }

  webServer.register({
    kind: 'exact',
    path: '/api/dsh-manager',
    handler: async (req, res) => {
      const body = await readBody(req)
      const method = String(body.method || '')
      const fn = handlers[method]
      if (fn === undefined) return sendJson(res, 404, { error: 'unknown method ' + method })
      // 全部方法都要求同源（浏览器 fetch POST 一定携带 Origin），
      // 防止其它站点跨站触发写操作或读取本地技能目录。
      if (!sameOrigin(req)) return sendJson(res, 403, { error: 'untrusted origin' })
      try {
        const args = body.args !== null && typeof body.args === 'object' ? body.args : {}
        const result = await fn(args)
        return sendJson(res, 200, result)
      } catch (error) {
        return sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  })
}
