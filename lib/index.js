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
//  - skillObserveGet/Set/List()  技能观察（0.35.2）：观察开关 + 复盘记录
//    （状态存 _governance/skill-observations.json；插件技能运行时注入约定块、
//     文件技能直接改 SKILL.md；开关即时生效）
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

import { readFile, writeFile, rename, unlink, rmdir, readdir, mkdir, access, rm, stat, cp, appendFile } from 'node:fs/promises'
import { readFileSync, readdirSync, createWriteStream, openSync, closeSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { homedir } from 'node:os'
import { join, dirname, basename, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'
import net from 'node:net'
import http from 'node:http'
import https from 'node:https'
import { pinyin } from 'pinyin-pro'
import YAML from 'js-yaml'

// ---- 0.29.0：拆分出去的纯逻辑（见 lib/service-core.js / repo-core.js / ai-core.js）----
import { aiCachePath, atomicWrite, buildExplainPrompt, normalizeAiExplain, parseExplainOutput, readAiCache, writeAiCache, AI_CACHE_FILENAME } from './ai-core.js'
import { buildCommitMaterial, cloudRepoFromRemote, detectRepoMeta, findLocalDocEntry, gitLogEntries, gitState, parseFrontmatterMeta, parseLocalChangelog, parseSkillFrontmatter, pathUnderRoot, readPackageInfo, readReadmeInfo, resolveFullHash, runGh, runGit, splitFrontmatter, uncoveredOutgoing } from './repo-core.js'
import { commandFirstToken, decodeServiceLogChunk, dshHome, dshManagerDir, envLinesToObject, expandEnvVars, findPidByPort, findProcessName, findShellOperator, formatServiceLogTime, isCommandInPath, isPidAlive, loadEnvFile, maskCommandLine, normalizeServicePath, probeTcpPort, quoteCmdArg, relateExternalProcess, resolveCmdEntryScript, resolveDetachedCommand, serviceLogFilePath, serviceStateKey, servicesLogDir, stopServicePid, stopServicePidGraceful, summarizeStartupFailure, terminatePid, tokenizeCommandLine, SERVICES_LOG_DIRNAME } from './service-core.js'

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
const COMPANION_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
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
  runInNewContext(code + '\n;__result__ = (typeof module.exports === "function" ? module.exports : module.exports.apply)(__dsh_patch_text__);', sandbox, { timeout: VM_TIMEOUT_MS, codeGeneration: { strings: false, wasm: false } })
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
    if (typeof fileEntry.override !== 'string' || !COMPANION_RE.test(fileEntry.override)) throw new Error('覆盖目录名不合法：' + truncate(String(fileEntry.override || ''), 60))
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
  // 0.34.2 F1-6：记录已修改的文件状态，用于回滚（避免部分禁用导致半禁用状态）。
  // 0.34.2 F1-2：快照采用内容去重共享；不再在禁用时删除快照（其他文件可能仍在引用同一快照）。
  const rollbacks = []
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
      reset = true
      rollbacks.push(async function () { /* 状态已删，无法完全回滚 */ })
      continue
    }
    if (rootMismatch || sha256(disk) !== st.outputSha) {
      // 外部改动（官方升级/手动编辑/部署根变更）：放弃旧链，把当前内容刷新为新官方快照
      const prevChain = st.chain || []
      const prevOutputSha = st.outputSha
      const snapshotId = await writeSnapshot(disk)
      await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: snapshotId, chain: [], outputSha: sha256(disk), at: Date.now() })
      rollbacks.push(async function () {
        const oldSnap = await writeSnapshot(disk)
        await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: oldSnap, chain: prevChain, outputSha: prevOutputSha, at: Date.now() })
      })
      reset = true
      continue
    }
    const newChain = (st.chain || []).filter(function (x) { return x !== id })
    const base = await readSnapshot(st.snapshotId)
    let output
    try { output = await replayChain(newChain, rel, base, index) } catch (e) {
      for (let i = rollbacks.length - 1; i >= 0; i--) {
        try { await rollbacks[i]() } catch (ignore) {}
      }
      return { error: '重建链失败（' + rel + '）：' + (e instanceof Error ? e.message : String(e)) + '——已回滚，该文件上的其它补丁可能冲突' }
    }
    const prevChain = st.chain || []
    const prevOutputSha = st.outputSha
    await atomicWrite(targetAbs, output)
    if (newChain.length === 0) {
      await deleteFileState(targetAbs)
    } else {
      await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: st.snapshotId, chain: newChain, outputSha: sha256(output), at: Date.now() })
    }
    rollbacks.push(async function () {
      await atomicWrite(targetAbs, disk)
      await writeFileState(targetAbs, { path: targetAbs, root: deploymentRoot(), snapshotId: st.snapshotId, chain: prevChain, outputSha: prevOutputSha, at: Date.now() })
    })
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
      if (fe.kind === 'override' && typeof fe.override === 'string' && COMPANION_RE.test(fe.override)) { try { await rm(join(entry.dir, fe.override), { recursive: true, force: true }) } catch {} }
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

// 备注文件是单用户读改写，用模块级队列串行化，避免并发交错。
let notesQueue = Promise.resolve()
function serialized(fn) {
  const next = notesQueue.then(fn, fn)
  notesQueue = next.then(() => undefined, () => undefined)
  return next
}

// 服务状态文件同样是单用户读改写，但服务操作（启动/停止/注册/配置）还会伴随进程
// 探测与日志写入，用独立队列串行化，避免并发 RMW 丢失状态更新（F2-3）。
let serviceQueue = Promise.resolve()
function serializedSvc(fn) {
  const next = serviceQueue.then(fn, fn)
  serviceQueue = next.then(() => undefined, () => undefined)
  return next
}

// 状态突变型服务方法：在 HTTP 分发处串行化（wrapHandler 调用点统一排队）。
const SERVICE_MUTATING_METHODS = new Set([
  'serviceSettingsSet', 'serviceRegister', 'serviceConfigSet', 'serviceUnregister',
  'serviceStart', 'serviceStop', 'serviceExternalKill', 'serviceRestart',
  'serviceStartAll', 'serviceStopAll', 'serviceLogClear',
])

async function readNotesStore() {
  try {
    const parsed = JSON.parse(await readFile(notesPath(), 'utf8'))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.notes === null || typeof parsed.notes !== 'object') {
      return { version: 1, notes: {} }
    }
    return { version: 1, notes: parsed.notes }
  } catch (error) {
    // ENOENT 或损坏的备注文件一律按空备注处理（与 readPatchSettings 策略一致），绝不让面板 500
    return { version: 1, notes: {} }
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
  return new Promise((resolve, reject) => {
    const MAX_BODY = 10 * 1024 * 1024
    let raw = ''
    let total = 0
    req.on('data', (chunk) => {
      total += Buffer.byteLength(chunk)
      if (total > MAX_BODY) { req.destroy(); reject(new Error('请求体过大（上限 10MB）')) }
      else raw += chunk
    })
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

// ---- 技能观察（0.35.2）：观察开关 + 复盘记录 ----
// 状态单一事实源 _governance/skill-observations.json（与 pending-reviews.json 同模式）：
// {
//   "version": 1,
//   "updatedAt": "ISO8601",
//   "skills": {
//     "<技能名>": {
//       "observing": false,
//       "enabledAt": null,
//       "disabledAt": null,
//       "optimizedAt": null,
//       "revision": 0,
//       "entries": []   // 复盘记录：{ id, createdAt, summary, findings[], suggestions[], status: pending|handled, handledAt }
//     }
//   }
// }
// 注入分层：插件技能（source=custom, provider=dsh-manager）= 注册时运行时注入约定块，
// 不污染包内 SKILL.md；文件技能（EDITABLE_SOURCES 内且有 path）= 开关 on/off 时直接
// 改 SKILL.md 追加/移除约定块。host 只维护 observing/enabledAt/disabledAt 与结构规整，
// entries 复盘内容由 agent（收尾复盘 / skill-optimize）写入，host 读写时原样保留。
const OBSERVATIONS_FILENAME = 'skill-observations.json'
const OBSERVE_BLOCK_START = '<!-- dsh-observe:start -->'
const OBSERVE_BLOCK_END = '<!-- dsh-observe:end -->'
const OBSERVE_BLOCK_TEXT = '本技能正被观察。不要在本技能执行完就复盘。当整个用户任务（所有技能调用、所有步骤执行完毕，即将输出最终答复）完成时，若本次任务使用过本技能，做一次收尾复盘：①汇总本次使用中模糊/重复/缺失/误导的步骤或判据（引用 SKILL.md 具体小节）；②对照 writing-for-agents 判断哪些值得优化、哪些是本次噪音；③追加一条记录到 _governance/skill-observations.json；④记录优化建议但不直接改 SKILL.md。一次任务无论用过几个被观察技能，统一只复盘一次，覆盖本次用过的全部被观察技能。'
const OBSERVE_BLOCK = OBSERVE_BLOCK_START + '\n' + OBSERVE_BLOCK_TEXT + '\n' + OBSERVE_BLOCK_END

function observationsPath(governanceRoot) {
  return join(governanceRoot, '_governance', OBSERVATIONS_FILENAME)
}

function normalizeObservations(parsed) {
  const skills = {}
  if (parsed !== null && typeof parsed === 'object' && parsed.skills !== null && typeof parsed.skills === 'object') {
    for (const key of Object.keys(parsed.skills)) {
      const e = parsed.skills[key]
      if (e === null || typeof e !== 'object') continue
      skills[key] = {
        observing: e.observing === true,
        enabledAt: typeof e.enabledAt === 'string' && e.enabledAt.length > 0 ? e.enabledAt : null,
        disabledAt: typeof e.disabledAt === 'string' && e.disabledAt.length > 0 ? e.disabledAt : null,
        optimizedAt: typeof e.optimizedAt === 'string' && e.optimizedAt.length > 0 ? e.optimizedAt : null,
        revision: Number.isInteger(e.revision) && e.revision > 0 ? e.revision : 0,
        entries: Array.isArray(e.entries) ? e.entries : [],
      }
    }
  }
  return { version: 1, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '', skills: skills }
}

async function readSkillObservations(governanceRoot) {
  if (typeof governanceRoot !== 'string' || governanceRoot.length === 0) return { version: 1, updatedAt: '', skills: {} }
  try {
    const parsed = JSON.parse(await readFile(observationsPath(governanceRoot), 'utf8'))
    return normalizeObservations(parsed)
  } catch (error) {
    return { version: 1, updatedAt: '', skills: {} }
  }
}

async function writeSkillObservations(governanceRoot, observations) {
  const next = { version: 1, updatedAt: new Date().toISOString(), skills: observations.skills }
  await mkdir(join(governanceRoot, '_governance'), { recursive: true })
  await atomicWrite(observationsPath(governanceRoot), JSON.stringify(next, null, 2) + '\n')
  return next
}

/** 统计某技能观察记录里未处理（status ≠ handled/optimized）的建议条数。 */
function countPendingSuggestions(entry) {
  if (entry === null || typeof entry !== 'object' || !Array.isArray(entry.entries)) return 0
  let n = 0
  for (const rec of entry.entries) {
    if (rec === null || typeof rec !== 'object') continue
    if (rec.status === 'handled' || rec.status === 'optimized') continue
    if (Array.isArray(rec.suggestions)) n += rec.suggestions.filter(function (x) { return typeof x === 'string' && x.length > 0 }).length
    else if (typeof rec.suggestion === 'string' && rec.suggestion.length > 0) n += 1
  }
  return n
}

function escapeRegExpText(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 文件技能：末尾追加观察约定块（幂等：先移除旧块再追加）。 */
function injectObserveBlock(text) {
  const cleaned = removeObserveBlock(text)
  return cleaned.replace(/\s*$/, '') + '\n\n' + OBSERVE_BLOCK + '\n'
}

/** 文件技能：精确移除观察约定块（含其前后空行）。 */
function removeObserveBlock(text) {
  const re = new RegExp('\\n?[ \\t]*' + escapeRegExpText(OBSERVE_BLOCK_START) + '[\\s\\S]*?' + escapeRegExpText(OBSERVE_BLOCK_END) + '[ \\t]*\\n?', 'g')
  return String(text).replace(re, '')
}

/**
 * 包内技能自动注册（0.8.0）：把本包 skills/ 目录的 SKILL.md 注册进技能
 * 注册表（runtime provider）。技能随插件装配生效、随卸载消失，无需用户
 * 手动复制到 ~/.dsh/skills。frontmatter 的 description 成为路由描述；
 * 无 frontmatter 时以技能名为描述兜底。
 * 0.34.5：注册清单从硬编码白名单改为自动扫描 skills/ 直接子目录
 * （目录即真相）——新增包内技能只需建目录 skills/<name>/SKILL.md，
 * 不再需要第二处登记。扫描约定与 discoverPresetSkillPreviews 及官方
 * dsh-skill-filesystem 一致：depth=1 只认 SKILL.md，注册名取
 * frontmatter.name ?? 目录名；逐条 try/catch 隔离，坏条目只 warn 不拖垮整体。
 * 0.34.6：注册不再丢 frontmatter 元数据——①meta 改从 split.fm 行解析
 * （splitFrontmatter 兼容 BOM/CRLF，parseFrontmatterMeta 的 `^---\n` 正则对
 * CRLF/BOM 文件会整段失配导致 description 静默回退成技能名）；②透传
 * invocation（disable-model-invocation: true → modelInvocable:false 仅用户
 * 显式调用；user-invocable: false → userInvocable:false 仅模型自动路由）；
 * ③透传 whenToUse（路由触发上下文）与 resourceBase（{kind:'directory'}，
 * 技能正文里相对路径资源如 REFERENCE.md 可解析）；④description 空串回退
 * name，避免 validateRuntimeSkill 抛「requires a description」吞掉整条。
 */
function registerPackagedSkills(ctx, registry) {
  const svc = ctx.get('skills')
  if (svc === undefined) {
    console.warn('[dsh-manager] skills service unavailable; packaged skill registration skipped')
    return
  }
  let root = null
  let dirs = []
  try {
    root = new URL('../skills/', import.meta.url)
    for (const ent of readdirSync(root, { withFileTypes: true })) {
      if (ent.isDirectory()) dirs.push(ent.name)
    }
    dirs.sort()
  } catch (error) {
    console.warn(`[dsh-manager] packaged skills dir scan failed: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  for (const dirName of dirs) {
    let url = null
    try {
      url = new URL('./' + dirName + '/SKILL.md', root)
      const text = readFileSync(url, 'utf8')
      const split = splitFrontmatter(text)
      const meta = {}
      for (const line of split.fm) {
        const i = line.indexOf(':')
        if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
      }
      const name = typeof meta.name === 'string' && meta.name.length > 0 ? meta.name : dirName
      const description = typeof meta.description === 'string' && meta.description.length > 0 ? meta.description : name
      const invocation = {
        modelInvocable: meta['disable-model-invocation'] !== 'true',
        userInvocable: meta['user-invocable'] !== 'false',
      }
      const whenToUse = typeof meta.whenToUse === 'string' && meta.whenToUse.length > 0 ? meta.whenToUse : undefined
      const body = split.body.join('\n')
      const path = fileURLToPath(url)
      const resourceBase = { kind: 'directory', path: fileURLToPath(new URL('./' + dirName + '/', root)) }
      ctx.effect(() => {
        const reg = svc.register({
          name: name,
          description: description,
          whenToUse: whenToUse,
          invocation: invocation,
          source: 'custom',
          provider: 'dsh-manager',
          content: body,
          path: path,
          resourceBase: resourceBase,
        })
        // 0.35.2：注册状态登记进 registry，供 skillObserveSet 即时重注册注入/移除观察约定块
        registry.set(name, { dirName: dirName, disposer: reg, url: url, meta: meta, body: body, description: description, whenToUse: whenToUse, invocation: invocation, path: path, resourceBase: resourceBase, ctx: ctx })
        return () => {
          reg()
          if (registry.get(name) !== undefined && registry.get(name).ctx === ctx) registry.delete(name)
        }
      }, `dsh-manager: packaged skill ${name}`)
    } catch (error) {
      console.warn(`[dsh-manager] packaged skill dir "${dirName}" registration skipped (${url === null ? 'SKILL.md' : url.href}): ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/**
 * 0.35.2：按观察状态重注册插件技能。dsh-skill register 同名 first-wins（重复注册
 * 返回 no-op disposer），因此先调用旧 disposer 从 runtime 移除，再以新 content
 * （是否附加观察约定块）重新 register。旧 reg 已手动调用过；ctx 销毁时新 reg 的
 * effect 清理仍会执行（layers.effect 注册在同一个 ctx 上），无泄漏。
 */
function reRegisterPackagedSkill(svc, registry, name, observing) {
  const state = registry.get(name)
  if (state === undefined) return { ok: false, error: '插件技能注册状态不可用（可能尚未加载）' }
  const content = observing ? state.body + '\n\n' + OBSERVE_BLOCK : state.body
  state.disposer()
  const reg = svc.register({
    name: name,
    description: state.description,
    whenToUse: state.whenToUse,
    invocation: state.invocation,
    source: 'custom',
    provider: 'dsh-manager',
    content: content,
    path: state.path,
    resourceBase: state.resourceBase,
  })
  state.disposer = reg
  return { ok: true }
}

// ---- 未挂载预设技能静态预览（0.8.6）----
// 预设的专属技能（customSkillDirs）只有在预设被挂载时才存在于运行时注册表。
// 为了让 Skills 面板不点开会话也能看到，这里静态解析各预设 agent.cordis.yml 的
// skill-filesystem.customSkillDirs，扫描其 SKILL.md 并生成 preview 条目。
const JS_EXPR_TYPE = new YAML.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: function (data) { return data } })
const PRESET_YAML_SCHEMA = YAML.DEFAULT_SCHEMA.extend([JS_EXPR_TYPE])
const PRESET_SKILL_FILESYSTEM = '@deepseek-ai/dsh-skill-filesystem'


/** 把预设组合里的 customSkillDirs 表达式解析为绝对目录（baseUrl 相对预设目录）。 */
function resolveCustomSkillDir(expr, presetDir) {
  if (typeof expr !== 'string' || expr.length === 0) return null
  if (expr.indexOf('baseUrl') !== -1 || expr.indexOf('new URL') !== -1) {
    const sandbox = {
      baseUrl: pathToFileURL(presetDir + '/').href,
      URL: globalThis.URL,
      process: {
        getBuiltinModule: function (name) {
          return name === 'node:url' ? { fileURLToPath: fileURLToPath, URL: globalThis.URL } : undefined
        },
      },
    }
    // 0.34.2 F1-8：与 runScriptTransform(387) 对称收紧——禁字符串构造代码与 wasm。
    const value = runInNewContext(expr, sandbox, { timeout: 1000, codeGeneration: { strings: false, wasm: false } })
    return typeof value === 'string' && value.length > 0 ? value : null
  }
  if (/^[A-Za-z]:[\\/]/.test(expr) || expr.startsWith('/')) return expr
  return join(presetDir, expr)
}

/**
 * 枚举所有未挂载预设的 skill-filesystem.customSkillDirs，扫描出预览技能。
 * 只处理尚未出现在 buckets（=已挂载）的预设，避免与运行时条目重复。
 * @returns 新加入 buckets 的预设 id 列表（仅用于日志/调试，可忽略）。
 */
async function discoverPresetSkillPreviews(presetsSvc, buckets) {
  let list = []
  try {
    list = await presetsSvc.list()
  } catch (error) {
    return
  }
  for (const preset of list) {
    if (preset === null || preset === undefined || typeof preset.id !== 'string') continue
    if (buckets.has(preset.id)) continue
    let rows = []
    try {
      const text = await readFile(preset.path, 'utf8')
      const parsed = YAML.load(text, { schema: PRESET_YAML_SCHEMA })
      rows = Array.isArray(parsed) ? parsed : []
    } catch (error) {
      continue
    }
    const exprs = []
    for (const row of rows) {
      if (row === null || typeof row !== 'object') continue
      if (row.name !== PRESET_SKILL_FILESYSTEM) continue
      const config = row.config !== null && typeof row.config === 'object' ? row.config : {}
      if (Array.isArray(config.customSkillDirs)) {
        for (const d of config.customSkillDirs) if (typeof d === 'string') exprs.push(d)
      }
    }
    if (exprs.length === 0) continue
    const presetDir = dirname(preset.path)
    const seenDirs = new Set()
    const entries = []
    for (const expr of exprs) {
      const dir = resolveCustomSkillDir(expr, presetDir)
      if (dir === null || seenDirs.has(dir)) continue
      seenDirs.add(dir)
      let subs = []
      try {
        subs = await readdir(dir, { withFileTypes: true })
      } catch (error) {
        continue
      }
      for (const ent of subs) {
        if (!ent.isDirectory()) continue
        const skillFile = join(dir, ent.name, 'SKILL.md')
        let text
        try {
          text = await readFile(skillFile, 'utf8')
        } catch (error) {
          continue
        }
        const meta = parseFrontmatterMeta(text)
        const name = typeof meta.name === 'string' && meta.name.length > 0 ? meta.name : ent.name
        entries.push({
          name: name,
          description: typeof meta.description === 'string' ? meta.description : '',
          source: 'custom',
          scopeId: preset.id,
          scopeLabel: preset.id,
          crossScope: true,
          preview: true,
        })
      }
    }
    if (entries.length > 0) buckets.set(preset.id, { label: preset.id, skills: entries })
  }
}

// ---- 本地仓库面板（0.9.0：多根目录）----
// 面板执行边界：
//  - 面板自己写：~/.dsh/dsh-manager/settings.json（roots/governanceRoot）
//  - 面板只读：扫描目录、git fetch/status、读 repos.json
//  - agent 执行：repos.json 写入、git 写操作、账本更新、应用到插件包
const REPO_SETTINGS_FILENAME = 'settings.json'
const REPO_EXCLUDE_DIRS = new Set(['_governance', '_snapshots'])
const SERVICES_FILENAME = 'services.json'
const SERVICES_STATE_FILENAME = 'services-state.json'
const SERVICES_LOG_MAX_BYTES = 256 * 1024
const SERVICES_LOG_TAIL_DEFAULT = 32 * 1024
const SERVICES_LOG_ROTATE_FILES = 3 // .log + .log.1 + .log.2
const SERVICES_LOG_RETAIN_MS = 7 * 24 * 3600 * 1000
const SERVICES_STATUS_CACHE_MS = 2000
const svcStatusCache = new Map() // serviceStateKey -> { ts, status }
const svcLogStreams = new Map() // serviceStateKey -> { stream, file, bytes }
const svcLineBufs = new Map() // serviceStateKey -> { out: Buffer, err: Buffer } 行缓冲（0.18.0 行级时间戳）
const svcAutoRestart = new Map() // serviceStateKey -> { count, windowStart, timer } 崩溃重启退避（0.19.0）
// 0.26.0 P1-1：detached 日志懒归档节流（防 3s 轮询反复归档 .1 无限增长）与
// P1-3：会话中途接管尝试冷却（写状态失败时 5 分钟不重试，防每次扫描都重写状态文件）。
const DETACHED_LOG_ARCHIVE_INTERVAL_MS = 60 * 1000
const DETACHED_ADOPT_RETRY_MS = 5 * 60 * 1000
const detachedLogArchiveAt = new Map() // serviceStateKey -> 上次归档时间戳
const detachedAdoptAttemptAt = new Map() // serviceStateKey -> 上次接管尝试时间戳
// 0.28.0 P2-7：getProcessInfo 按 pid 缓存（tasklist + wmic/PowerShell 两个子进程太贵，
// external 分支每次扫描都跑；30s 内同一 pid 直接复用上次结果）。
const PROCESS_INFO_CACHE_MS = 30 * 1000
const PROCESS_INFO_CACHE_MAX = 200
const processInfoCache = new Map() // pid -> { ts, data }


function repoSettingsPath() {
  return join(dshManagerDir(), REPO_SETTINGS_FILENAME)
}

function reposJsonPath(governanceRoot) {
  return join(governanceRoot, '_governance', 'repos.json')
}

function servicesPath(governanceRoot) {
  return join(governanceRoot, '_governance', SERVICES_FILENAME)
}

function servicesStatePath() {
  return join(dshManagerDir(), SERVICES_STATE_FILENAME)
}


async function readRepoSettings() {
  const defaults = { roots: [], governanceRoot: '', rootTypes: {}, services: { enabled: true, confirmStart: true }, aiExplain: normalizeAiExplain(null) }
  try {
    const parsed = JSON.parse(await readFile(repoSettingsPath(), 'utf8'))
    const roots = Array.isArray(parsed.roots) ? parsed.roots.filter(function (x) { return typeof x === 'string' && x.trim().length > 0 }).map(function (x) { return x.trim() }) : []
    const governanceRoot = typeof parsed.governanceRoot === 'string' && parsed.governanceRoot.trim().length > 0 ? parsed.governanceRoot.trim() : (roots[0] || '')
    const rootTypes = {}
    if (parsed.rootTypes !== null && typeof parsed.rootTypes === 'object') {
      for (const key of Object.keys(parsed.rootTypes)) {
        const v = parsed.rootTypes[key]
        if (v === 'local' || v === 'mirror') rootTypes[key] = v
      }
    }
    const services = { enabled: true, confirmStart: true }
    if (parsed.services !== null && typeof parsed.services === 'object') {
      if (typeof parsed.services.enabled === 'boolean') services.enabled = parsed.services.enabled
      if (typeof parsed.services.confirmStart === 'boolean') services.confirmStart = parsed.services.confirmStart
    }
    const aiExplain = normalizeAiExplain(parsed.aiExplain)
    return { roots: roots, governanceRoot: governanceRoot, rootTypes: rootTypes, services: services, aiExplain: aiExplain }
  } catch (error) {
    return defaults
  }
}

async function writeRepoSettings(settings) {
  const roots = []
  for (const r of (settings.roots || [])) if (typeof r === 'string' && r.trim().length > 0 && roots.indexOf(r.trim()) === -1) roots.push(r.trim())
  let governanceRoot = typeof settings.governanceRoot === 'string' && settings.governanceRoot.trim().length > 0 ? settings.governanceRoot.trim() : (roots[0] || '')
  if (governanceRoot.length > 0 && roots.indexOf(governanceRoot) === -1) roots.unshift(governanceRoot)
  const rootTypes = {}
  if (settings.rootTypes !== null && typeof settings.rootTypes === 'object') {
    for (const key of Object.keys(settings.rootTypes)) {
      const v = settings.rootTypes[key]
      if ((v === 'local' || v === 'mirror') && roots.indexOf(key) !== -1) rootTypes[key] = v
    }
  }
  const services = { enabled: true, confirmStart: true }
  if (settings.services !== null && typeof settings.services === 'object') {
    if (typeof settings.services.enabled === 'boolean') services.enabled = settings.services.enabled
    if (typeof settings.services.confirmStart === 'boolean') services.confirmStart = settings.services.confirmStart
  }
  const aiExplain = normalizeAiExplain(settings.aiExplain)
  const next = { roots: roots, governanceRoot: governanceRoot, rootTypes: rootTypes, services: services, aiExplain: aiExplain }
  await mkdir(dshManagerDir(), { recursive: true })
  await atomicWrite(repoSettingsPath(), JSON.stringify(next, null, 2) + '\n')
  return next
}

async function readReposJson(governanceRoot) {
  if (typeof governanceRoot !== 'string' || governanceRoot.length === 0) return null
  try {
    const parsed = JSON.parse(await readFile(reposJsonPath(governanceRoot), 'utf8'))
    return parsed !== null && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    return null
  }
}

// ---- 本地服务面板（0.12.0：配置集中在 _governance/services.json）----
// 服务配置键 = 项目绝对路径（正斜杠）。运行时状态（pid/startedAt）存
// ~/.dsh/dsh-manager/services-state.json，键 = `${path}|${name}`。
// 进程语义（已确认 Q4/Q5/Q6/Q7）：面板直接 spawn（补丁引擎 allowExecutable
// 先例）；服务随 dsh 停止（host 启动对账 + dispose 统一杀树，独立存活→v2）；
// 每项目命名服务列表 {name,cwd,command,args,env,port?}；PID 探活 + 配 port 才 TCP 探活。



// 0.27.0：服务 handler 统一前导——解析 path/name、读设置与配置、定位条目。
// opts.requireName=false 允许只按 path 操作（批量启停）；requireEnabled=true 校验总开关；
// requireEntry=true 要求条目存在（找不到返回 error）。返回 {settings,pathKey,config,entries,entry,name} 或 {error}。
async function resolveServiceTarget(args, opts) {
  const input = args !== null && typeof args === 'object' ? args : {}
  const o = opts || {}
  const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (rawPath.length === 0) return { error: '缺少项目路径' }
  if (o.requireName !== false && name.length === 0) return { error: '缺少项目路径或服务名' }
  const settings = await readRepoSettings()
  if (o.requireEnabled === true && settings.services.enabled !== true) {
    return { error: typeof o.enabledMessage === 'string' ? o.enabledMessage : '服务管理总开关已关闭，无法操作服务' }
  }
  const pathKey = normalizeServicePath(rawPath)
  const config = await readServicesConfig(settings.governanceRoot)
  if (config.error !== undefined) return { error: config.error }
  const list = config.services[pathKey]
  const entries = Array.isArray(list) ? list : []
  const entry = entries.find(function (e) { return e !== null && typeof e === 'object' && e.name === name })
  if (o.requireEntry === true && entry === undefined) return { error: '未找到已注册的服务 "' + name + '"' }
  return { settings: settings, pathKey: pathKey, config: config, entries: entries, entry: entry, name: name }
}

function validateServiceEntry(input) {
  if (input === null || typeof input !== 'object') return { error: '服务条目必须是对象' }
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (name.length === 0) return { error: '服务名不能为空' }
  if (name.length > 64) return { error: '服务名过长（最多 64 字符）' }
  if (/[|]/.test(name)) return { error: '服务名不能包含 | 字符' }
  const cwd = typeof input.cwd === 'string' ? input.cwd.trim() : ''
  if (cwd.length === 0) return { error: '缺少工作目录 cwd' }
  const command = typeof input.command === 'string' ? input.command.trim() : ''
  if (command.length === 0) return { error: '启动命令不能为空' }
  let args = []
  if (input.args !== undefined && input.args !== null) {
    if (!Array.isArray(input.args)) return { error: 'args 必须是数组' }
    args = input.args.map(function (a) { return String(a) })
  }
  let env = {}
  if (input.env !== undefined && input.env !== null) {
    if (typeof input.env !== 'object' || Array.isArray(input.env)) return { error: 'env 必须是对象' }
    for (const key of Object.keys(input.env)) {
      const v = input.env[key]
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') return { error: 'env 值只能是字符串/数字/布尔' }
      env[key] = String(v)
    }
  }
  let port = null
  if (input.port !== undefined && input.port !== null) {
    if (typeof input.port !== 'number' && typeof input.port !== 'string') return { error: '端口必须是数字或数字字符串' }
    const n = Number(input.port)
    if (!Number.isInteger(n) || n < 1 || n > 65535) return { error: '端口必须是 1-65535 的整数' }
    port = n
  }
  const autoStart = input.autoStart === true
  const autoRestart = input.autoRestart === true
  // 0.24.0：独立运行——进程 detached 启动，dsh 关闭/重启不停止，重启后身份验证接管。
  const detached = input.detached === true
  let healthUrl = null
  if (input.healthUrl !== undefined && input.healthUrl !== null) {
    const hu = String(input.healthUrl).trim()
    if (hu.length > 0) {
      if (hu.length > 300) return { error: '健康检查地址过长（最多 300 字符）' }
      if (!/^https?:\/\//i.test(hu) && hu[0] !== '/') return { error: '健康检查地址必须是 http(s):// 开头的完整地址，或以 / 开头的路径' }
      healthUrl = hu
    }
  }
  let envFile = ''
  if (input.envFile !== undefined && input.envFile !== null) {
    envFile = String(input.envFile).trim()
    if (envFile.length > 500) return { error: 'envFile 路径过长（最多 500 字符）' }
  }
  let startTimeoutMs = SERVICE_DEFAULT_START_TIMEOUT_MS
  if (input.startTimeoutMs !== undefined && input.startTimeoutMs !== null) {
    const n = Number(input.startTimeoutMs)
    if (!Number.isInteger(n) || n < 1000 || n > 300000) return { error: '启动超时必须是 1000-300000 毫秒的整数' }
    startTimeoutMs = n
  }
  // 0.31.0：服务说明（面板展示用途，纯展示字段）。
  let note = ''
  if (input.note !== undefined && input.note !== null) {
    note = String(input.note).trim()
    if (note.length > 300) return { error: '服务说明过长（最多 300 字符）' }
  }
  return { entry: { name: name, cwd: cwd, command: command, args: args, env: env, port: port, autoStart: autoStart, autoRestart: autoRestart, detached: detached, healthUrl: healthUrl, envFile: envFile, startTimeoutMs: startTimeoutMs, note: note } }
}

async function readServicesConfig(governanceRoot) {
  if (typeof governanceRoot !== 'string' || governanceRoot.length === 0) return { version: 1, updatedAt: '', services: {}, error: '尚未设置治理根目录' }
  let parsed = null
  try {
    parsed = JSON.parse(await readFile(servicesPath(governanceRoot), 'utf8'))
  } catch (error) {
    if (error !== undefined && error.code === 'ENOENT') return { version: 1, updatedAt: '', services: {} }
    return { version: 1, updatedAt: '', services: {}, error: 'services.json 解析失败，已阻止写入以避免覆盖原文件：' + (error instanceof Error ? error.message : String(error)) }
  }
  const services = {}
  if (parsed !== null && typeof parsed === 'object' && parsed.services !== null && typeof parsed.services === 'object' && !Array.isArray(parsed.services)) {
    for (const key of Object.keys(parsed.services)) {
      const list = parsed.services[key]
      if (!Array.isArray(list)) continue
      const entries = []
      for (const item of list) {
        if (item === null || typeof item !== 'object' || typeof item.name !== 'string' || item.name.trim().length === 0) continue
        const name = item.name.trim()
        entries.push({
          name: name,
          cwd: typeof item.cwd === 'string' ? item.cwd : '',
          command: typeof item.command === 'string' ? item.command : '',
          args: Array.isArray(item.args) ? item.args.map(function (a) { return String(a) }) : [],
          env: item.env !== null && typeof item.env === 'object' && !Array.isArray(item.env) ? Object.assign({}, item.env) : {},
          port: item.port === undefined || item.port === null ? null : Number(item.port),
          autoStart: item.autoStart === true,
          autoRestart: item.autoRestart === true,
          detached: item.detached === true,
          healthUrl: typeof item.healthUrl === 'string' && item.healthUrl.trim().length > 0 ? item.healthUrl.trim() : null,
          envFile: typeof item.envFile === 'string' ? item.envFile.trim() : '',
          startTimeoutMs: Number.isInteger(item.startTimeoutMs) && item.startTimeoutMs >= 1000 ? item.startTimeoutMs : SERVICE_DEFAULT_START_TIMEOUT_MS,
          note: typeof item.note === 'string' ? item.note.trim() : '',
        })
      }
      services[normalizeServicePath(key)] = entries
    }
  }
  return { version: 1, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '', services: services }
}

async function writeServicesConfig(governanceRoot, services) {
  const next = { version: 1, updatedAt: new Date().toISOString(), services: services }
  await mkdir(join(governanceRoot, '_governance'), { recursive: true })
  await atomicWrite(servicesPath(governanceRoot), JSON.stringify(next, null, 2) + '\n')
  return next
}

async function readServicesState() {
  try {
    const parsed = JSON.parse(await readFile(servicesStatePath(), 'utf8'))
    if (parsed !== null && typeof parsed === 'object' && parsed.services !== null && typeof parsed.services === 'object' && !Array.isArray(parsed.services)) {
      return { services: parsed.services }
    }
    return { services: {} }
  } catch (error) {
    return { services: {} }
  }
}

async function writeServicesState(state) {
  await mkdir(dshManagerDir(), { recursive: true })
  await atomicWrite(servicesStatePath(), JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), services: state }, null, 2) + '\n')
}



function invalidateServiceStatusCache(key) {
  if (typeof key === 'string' && key.length > 0) svcStatusCache.delete(key)
  else svcStatusCache.clear()
}

// ---- 0.20.0：本地服务 AI 增强 + 优雅停止 + 健康检查 + 配置校验辅助 ----
const SERVICE_DEFAULT_START_TIMEOUT_MS = 30000
const AI_DIAG_TIMEOUT_MS = 90000



function maskSecretEnv(env) {
  const masked = {}
  if (env !== null && typeof env === 'object') {
    for (const k of Object.keys(env)) {
      masked[k] = /TOKEN|KEY|SECRET|PASSWORD|AUTH/i.test(k) ? '***' : String(env[k])
    }
  }
  return masked
}



function probeHttpUrl(url, timeoutMs) {
  return new Promise(function (resolve) {
    let settled = false
    const finish = function (ok) {
      if (settled) return
      settled = true
      resolve(ok)
    }
    const target = String(url || '')
    const mod = target.indexOf('https://') === 0 ? https : http
    let req = null
    try {
      req = mod.get(target, function (res) {
        res.resume()
        finish(res.statusCode >= 200 && res.statusCode < 400)
      })
      req.setTimeout(timeoutMs, function () { req.destroy(); finish(false) })
      req.on('error', function () { finish(false) })
    } catch (error) {
      finish(false)
    }
  })
}







// 滚动三段：file.log -> file.log.1 -> file.log.2（最旧丢弃）。旧流先 end，再重开新流。
async function rotateServiceLogStream(path, name) {
  const key = serviceStateKey(path, name)
  const rec = svcLogStreams.get(key)
  const file = rec !== undefined ? rec.file : serviceLogFilePath(path, name)
  if (rec !== undefined) { try { rec.stream.end() } catch (error) {} }
  for (let i = SERVICES_LOG_ROTATE_FILES - 1; i >= 1; i -= 1) {
    const src = i === 1 ? file : file + '.' + (i - 1)
    const dst = file + '.' + i
    try { await rm(dst, { force: true }) } catch (error) {}
    try { await rename(src, dst) } catch (error) {}
  }
  const stream = createWriteStream(file, { flags: 'a' })
  stream.on('error', function () {})  // 0.34.2 F2-1：防止 write-after-end 导致 unhandled error 崩溃宿主
  const next = { stream: stream, file: file, bytes: 0 }
  svcLogStreams.set(key, next)
  return next
}

// 统一 UTF-8 追加（滚动阈值在此执行）；文件格式为 [时间] [out|err] 行。
async function appendServiceLogText(path, name, text) {
  if (typeof text !== 'string' || text.length === 0) return
  const buf = Buffer.from(text, 'utf8')
  const key = serviceStateKey(path, name)
  let rec = svcLogStreams.get(key)
  if (rec === undefined) {
    await mkdir(servicesLogDir(), { recursive: true })
    rec = await rotateServiceLogStream(path, name)
  }
  if (rec.bytes + buf.length > SERVICES_LOG_MAX_BYTES) rec = await rotateServiceLogStream(path, name)
  rec.bytes += buf.length
  rec.stream.write(buf)
}

function serviceLogLine(stream, line) {
  return '[' + formatServiceLogTime(Date.now()) + '] [' + (stream === 'err' ? 'err' : 'out') + '] ' + line + '\n'
}

// 行缓冲：stdout/stderr 是字节流，可能跨 chunk 断行；按 \n 切分后逐行
// 转 UTF-8 + 本地时间戳 + out/err 标记，解决乱码、无时间、stdout/stderr 混杂三个问题。
function handleServiceLogChunk(path, name, stream, chunk) {
  const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
  if (buf.length === 0) return
  const key = serviceStateKey(path, name)
  let rec = svcLineBufs.get(key)
  if (rec === undefined) { rec = { out: Buffer.alloc(0), err: Buffer.alloc(0) }; svcLineBufs.set(key, rec) }
  const merged = Buffer.concat([rec[stream], buf])
  if (merged.length > 1024 * 1024) { rec[stream] = Buffer.alloc(0); return }  // 0.34.2 F2-9：单行日志上限 1MB，超限丢弃（避免无换行日志无限膨胀内存）
  let start = 0
  let idx = merged.indexOf(0x0a)
  while (idx >= 0) {
    let line = merged.subarray(start, idx)
    if (line.length > 0 && line[line.length - 1] === 0x0d) line = line.subarray(0, line.length - 1)
    if (line.length > 0) {
      const text = decodeServiceLogChunk(line)
      appendServiceLogText(path, name, serviceLogLine(stream, text)).catch(function () {})
    }
    start = idx + 1
    idx = merged.indexOf(0x0a, start)
  }
  rec[stream] = merged.subarray(start)
}

async function flushServiceLogBuffers(path, name) {
  const key = serviceStateKey(path, name)
  const rec = svcLineBufs.get(key)
  if (rec === undefined) return
  for (const stream of ['out', 'err']) {
    let line = rec[stream]
    if (line.length > 0) {
      if (line[line.length - 1] === 0x0d) line = line.subarray(0, line.length - 1)
      if (line.length > 0) {
        const text = decodeServiceLogChunk(line)
        await appendServiceLogText(path, name, serviceLogLine(stream, text))
      }
    }
    rec[stream] = Buffer.alloc(0)
  }
}

// 读当前文件 + 两个滚动窗口（最旧优先），再截尾；ENOENT 视作无日志。
async function readServiceLogTail(path, name, maxBytes) {
  const file = serviceLogFilePath(path, name)
  const cap = Math.max(1024, Math.min(Number(maxBytes) || SERVICES_LOG_TAIL_DEFAULT, 2 * 1024 * 1024))
  try {
    const order = [file + '.2', file + '.1', file]
    const parts = []
    let total = 0
    for (const f of order) {
      try {
        const data = await readFile(f)
        parts.push(data)
        total += data.length
      } catch (error) {
        continue
      }
    }
    if (parts.length === 0) return { exists: false, text: '', total: 0 }
    const full = Buffer.concat(parts)
    if (full.length === 0) return { exists: true, text: '', total: 0 }
    // 0.26.0 P1-2：统一 GBK 回退解码（UTF-8 优先，含替换符才回退 GBK），
    // 之前 detached 直写日志只按 utf8 解码，cmd/服务输出 GBK 中文会乱码。
    if (full.length <= cap) return { exists: true, text: decodeServiceLogChunk(full), total: total }
    const tail = full.subarray(full.length - cap)
    const start = tail.indexOf(0x0a)
    const slice = start >= 0 && start < tail.length - 1 ? tail.subarray(start + 1) : tail
    return { exists: true, text: decodeServiceLogChunk(slice), total: total }
  } catch (error) {
    if (error !== undefined && error.code === 'ENOENT') return { exists: false, text: '', total: 0 }
    return { exists: false, text: '', total: 0, error: error instanceof Error ? error.message : String(error) }
  }
}

async function clearServiceLog(path, name) {
  const key = serviceStateKey(path, name)
  const rec = svcLogStreams.get(key)
  if (rec !== undefined) {
    try { rec.stream.end() } catch (error) {}
    svcLogStreams.delete(key)
  }
  svcLineBufs.delete(key)
  const file = serviceLogFilePath(path, name)
  // 0.28.0 P2-2：运行中 detached 服务子进程持有该文件 fd 直写——rm 后子进程继续写
  // 已删除 inode，日志永久丢失。改为截断当前文件（写空）并只删滚动档 .1/.2。
  let runningDetached = false
  try {
    const state = await readServicesState()
    const info = state.services[key]
    runningDetached = info !== null && typeof info === 'object' && info.detached === true && isPidAlive(Number(info.pid))
  } catch (error) {}
  if (runningDetached) {
    try { await writeFile(file, Buffer.alloc(0)) } catch (error) {}
    for (let i = 1; i < SERVICES_LOG_ROTATE_FILES; i += 1) {
      const f = file + '.' + i
      try { await rm(f, { force: true }) } catch (error) {}
    }
  } else {
    for (let i = 0; i < SERVICES_LOG_ROTATE_FILES; i += 1) {
      const f = i === 0 ? file : file + '.' + i
      try { await rm(f, { force: true }) } catch (error) {}
    }
  }
  return { ok: true }
}

// 清理超过 7 天的日志文件（host 启动时执行一次，fire-and-forget）。
// 0.28.0 P2-6：运行中 detached 服务的日志文件绝不能删——子进程通过继承的 fd 直写，
// 删除文件会让它继续写已删除 inode，日志永久丢失。从状态文件收集正在运行的 detached
// 服务对应日志名，清理时跳过。
async function cleanupOldServiceLogs() {
  try {
    await mkdir(servicesLogDir(), { recursive: true })
    const keep = new Set()
    try {
      const state = await readServicesState()
      for (const key of Object.keys(state.services)) {
        const info = state.services[key]
        if (info === null || typeof info !== 'object' || info.detached !== true) continue
        if (!isPidAlive(Number(info.pid))) continue
        const sep = key.indexOf('|')
        if (sep <= 0 || sep >= key.length - 1) continue
        const path = key.slice(0, sep)
        const name = key.slice(sep + 1)
        const base = serviceLogFilePath(path, name)
        keep.add(basename(base))
        keep.add(basename(base + '.1'))
        keep.add(basename(base + '.2'))
      }
    } catch (error) {}
    const files = await readdir(servicesLogDir())
    const cutoff = Date.now() - SERVICES_LOG_RETAIN_MS
    for (const f of files) {
      if (keep.has(f)) continue
      const p = join(servicesLogDir(), f)
      try {
        const st = await stat(p)
        if (st.isFile() && st.mtimeMs < cutoff) await rm(p, { force: true })
      } catch (error) {}
    }
  } catch (error) {}
}

function closeServiceLogStreams() {
  for (const rec of svcLogStreams.values()) {
    try { rec.stream.end() } catch (error) {}
  }
  svcLogStreams.clear()
  svcLineBufs.clear()
}





// 0.22.0：外部占用进程详情。先 tasklist 拿进程名，再尝试 wmic/PowerShell 拿命令行。
// 0.28.0 P2-7：按 pid 30s 缓存（external 分支 2s 扫描会高频调用，tasklist+wmic 子进程开销大）。
async function getProcessInfo(pid) {
  const n = Number(pid)
  if (!Number.isInteger(n) || n <= 0) return { name: null, commandLine: null }
  const hit = processInfoCache.get(n)
  if (hit !== undefined && Date.now() - hit.ts < PROCESS_INFO_CACHE_MS) return hit.data
  const name = await findProcessName(n)
  let commandLine = null
  try {
    const { stdout } = await execFileAsync('wmic', ['process', 'where', 'ProcessId=' + n, 'get', 'CommandLine', '/value'], { timeout: 5000, windowsHide: true })
    const m = String(stdout).match(/CommandLine=([\s\S]*?)(?:\r?\n\s*\r?\n|$)/)
    if (m !== null && m[1] !== undefined) {
      const cl = m[1].trim()
      if (cl.length > 0) commandLine = cl
    }
  } catch (error) {
    // wmic 可能不存在（Win11 24H2+ 移除），回退 PowerShell。
    try {
      const ps = 'powershell.exe'
      const script = '(Get-CimInstance Win32_Process -Filter \'ProcessId = ' + n + '\').CommandLine'
      const { stdout } = await execFileAsync(ps, ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 8000, windowsHide: true })
      const cl = String(stdout).trim()
      if (cl.length > 0) commandLine = cl
    } catch (error2) {
      commandLine = null
    }
  }
  const data = { name: name, commandLine: commandLine }
  if (processInfoCache.size >= PROCESS_INFO_CACHE_MAX) {
    // 简单淘汰：清掉最老的一半（按插入序）。
    const keys = Array.from(processInfoCache.keys())
    for (let i = 0; i < Math.floor(keys.length / 2); i += 1) processInfoCache.delete(keys[i])
  }
  processInfoCache.set(n, { ts: Date.now(), data: data })
  return data
}



async function describePortConflict(port) {
  const pid = await findPidByPort(port)
  if (pid !== null) {
    const pname = await findProcessName(pid)
    const who = pname !== null ? pname + '（PID ' + pid + '）' : 'PID ' + pid
    return '端口 ' + port + ' 已被进程 ' + who + ' 占用。请先停止占用该端口的进程（taskkill /PID ' + pid + ' /F），或修改本服务的监听端口后重试。'
  }
  const up = await probeTcpPort(port, 500)
  if (up) return '端口 ' + port + ' 已被占用（无法确定占用进程）。请停止占用该端口的进程，或修改本服务的监听端口后重试。'
  return null
}







// 独立运行服务日志直写文件、不受管道流管理，读取侧做懒归档+截断（旧档存 .1，当前文件清空）。
// 0.26.0 P1-1：节流（60s 一次）+ 轮换 .1→.2（丢弃最旧 .2），防止 3s 轮询反复归档导致 .1 无限增长。
async function maybeRotateDetachedLog(path, name) {
  const file = serviceLogFilePath(path, name)
  const key = serviceStateKey(path, name)
  const now = Date.now()
  const last = detachedLogArchiveAt.get(key) || 0
  if (now - last < DETACHED_LOG_ARCHIVE_INTERVAL_MS) return
  try {
    const st = await stat(file)
    if (st === null || !st.isFile() || st.size <= SERVICES_LOG_MAX_BYTES) return
    detachedLogArchiveAt.set(key, now)
    let data = null
    try { data = await readFile(file) } catch (error) { return }
    try { await rm(file + '.2', { force: true }) } catch (error) {}
    try { await rename(file + '.1', file + '.2') } catch (error) {}
    try { await appendFile(file + '.1', data) } catch (error) {}
    try { await writeFile(file, Buffer.alloc(0)) } catch (error) {}
  } catch (error) {}
}

// detached 服务的分隔线必须直写文件（appendFile），绝不能走 appendServiceLogText：
// 后者首次调用会触发 rotateServiceLogStream 把 file rename 成 file.1，而子进程的 fd
// 开在 rename 之前的 inode 上 → 子进程输出全部落到 .1，与当前文件分叉。
async function appendDetachedLogLine(path, name, text) {
  try {
    await mkdir(servicesLogDir(), { recursive: true })
    await appendFile(serviceLogFilePath(path, name), String(text || ''), 'utf8')
  } catch (error) {}
}

// 0.27.0：日志写入唯一路由——按是否独立运行选择直写文件（fd 通道）或流式（stream 通道）。
// 直写与流式不可混用：流式首次写入会触发 rename 滚动，让 detached 子进程继承的 fd 分叉到旧 inode。
function writeServiceLog(path, name, text, opts) {
  const o = opts || {}
  if (o.detached === true) return appendDetachedLogLine(path, name, text)
  return appendServiceLogText(path, name, text)
}


async function spawnService(entry) {
  // 0.20.0：envFile 加载（相对 cwd 解析），显式 env 覆盖文件值；读取失败直接阻止启动。
  let extraEnv = Object.assign({}, entry.env || {})
  const envFileResult = await loadEnvFile(entry.cwd, entry.envFile)
  if (envFileResult.error !== undefined) throw new Error(envFileResult.error)
  extraEnv = Object.assign({}, envFileResult.env, extraEnv)
  const detached = entry.detached === true
  // 0.25.0：独立运行服务弹窗根因 = shell:true + detached:true（cmd.exe 中介自开可见控制台）。
  // detached 服务改为直 spawn 可执行文件（无 shell）；普通服务保持 shell:true（零回归）。
  let spawnSpec = null
  let logFd = null
  if (detached) {
    const resolved = await resolveDetachedCommand(entry)
    if (resolved.error !== undefined) throw new Error(resolved.error)
    spawnSpec = resolved.spawn
    try {
      await mkdir(servicesLogDir(), { recursive: true })
      // stdout/stderr 直写日志文件 fd（O_APPEND）：dsh 退出后写文件永不 EPIPE，
      // 且独立进程持有的继承句柄让日志在 dsh 重启接管后持续记录。
      logFd = openSync(serviceLogFilePath(entry.cwd, entry.name), 'a')
    } catch (error) {
      throw new Error('无法打开服务日志文件（独立运行模式需要）：' + (error instanceof Error ? error.message : String(error)))
    }
  }
  return new Promise(function (resolve, reject) {
    const key = serviceStateKey(entry.cwd, entry.name)
    // 0.25.1 P0-2：args 数组 join 前重新加双引号（客户端 parseArgs 保存时已剥掉引号），
    // 否则 shell:true 下含空格参数会被 cmd.exe 重新拆段。
    const cmdLine = [entry.command].concat((entry.args || []).map(quoteCmdArg)).join(' ')
    // detached 日志分隔线显示真实 spawn 命令（exe + args 数组），不显示 shell 版 cmdLine。
    const detachedLine = (detached && spawnSpec !== null) ? [spawnSpec.command].concat(spawnSpec.args.map(quoteCmdArg)).join(' ') : cmdLine
    let child = null
    try {
      if (detached && spawnSpec !== null) {
        child = spawn(spawnSpec.command, spawnSpec.args, {
          cwd: entry.cwd,
          env: Object.assign({}, process.env, extraEnv),
          stdio: ['ignore', logFd, logFd],
          windowsHide: true,
          detached: true,
          shell: false,
        })
      } else {
        // 普通服务：shell:true 交给 cmd.exe /c 解析整条命令行（支持命令内嵌双引号；
        // args 数组拼接法经 Windows 参数引号转义会把内嵌引号改坏，导致进程立即退出）。
        child = spawn(cmdLine, {
          cwd: entry.cwd,
          env: Object.assign({}, process.env, extraEnv),
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
          detached: false,
          shell: true,
        })
      }
    } catch (error) {
      if (logFd !== null) { try { closeSync(logFd) } catch (error2) {} }
      reject(error)
      return
    }
    if (detached && logFd !== null) {
      // 父进程关闭自己的 fd 副本；子进程在 CreateProcess 时已持有继承句柄，继续有效。
      try { closeSync(logFd) } catch (error) {}
      logFd = null
    }
    if (!detached) {
      // 0.18.0：stdout/stderr 分行落盘，每行带本地时间戳与 out/err 标记（统一 UTF-8）。
      child.stdout.on('data', function (chunk) { handleServiceLogChunk(entry.cwd, entry.name, 'out', chunk) })
      child.stderr.on('data', function (chunk) { handleServiceLogChunk(entry.cwd, entry.name, 'err', chunk) })
    }
    let done = false
    child.once('spawn', function () {
      done = true
      if (detached) {
        writeServiceLog(entry.cwd, entry.name, '----- 启动 ' + formatServiceLogTime(Date.now()) + ' pid=' + child.pid + ' 命令=' + detachedLine + ' -----\n', { detached: true }).catch(function () {})
      } else {
        writeServiceLog(entry.cwd, entry.name, '----- 启动 ' + formatServiceLogTime(Date.now()) + ' pid=' + child.pid + ' 命令=' + cmdLine + ' -----\n', { detached: false }).catch(function () {})
      }
      resolve({ pid: child.pid, startedAt: Date.now() })
    })
    child.once('error', function (error) {
      if (!done) { done = true; reject(error) }
    })
    child.once('exit', function (code, signal) {
      if (!detached) flushServiceLogBuffers(entry.cwd, entry.name).catch(function () {})
      if (detached) {
        writeServiceLog(entry.cwd, entry.name, '----- 退出 ' + formatServiceLogTime(Date.now()) + ' code=' + (code === null ? 'null' : String(code)) + ' signal=' + (signal === null || signal === undefined ? 'null' : String(signal)) + ' -----\n', { detached: true }).catch(function () {})
      } else {
        writeServiceLog(entry.cwd, entry.name, '----- 退出 ' + formatServiceLogTime(Date.now()) + ' code=' + (code === null ? 'null' : String(code)) + ' signal=' + (signal === null || signal === undefined ? 'null' : String(signal)) + ' -----\n', { detached: false }).catch(function () {})
      }
      // 崩溃/异常退出落盘到状态（手动停止时 state 已删除或 pid 不匹配，自动跳过）。
      readServicesState().then(function (state) {
        const info = state.services[key]
        if (info !== null && info !== undefined && Number(info.pid) === child.pid) {
          info.lastExitCode = code
          info.lastExitAt = Date.now()
          return writeServicesState(state.services).then(function () { invalidateServiceStatusCache(key) })
        }
        return undefined
      }).catch(function () {})
      // 0.19.0：崩溃自动重启（手动停止/重启时 pid 已删除不匹配，不会误触发）。
      if (code !== 0 && code !== null) {
        readRepoSettings().then(function (settings) {
          return scheduleAutoRestart(settings, normalizeServicePath(entry.cwd), entry.name, code)
        }).catch(function () {})
      }
    })
    child.unref()
  })
}

// 崩溃自动重启退避（0.19.0 P1）：5 分钟窗口内最多 5 次，指数退避 2s/4s/8s/16s/30s 封顶。
const AUTO_RESTART_WINDOW_MS = 5 * 60 * 1000
const AUTO_RESTART_MAX_COUNT = 5
function autoRestartDelay(count) {
  return Math.min(30000, 2000 * Math.pow(2, count - 1))
}

async function scheduleAutoRestart(settings, pathKey, name, code) {
  if (settings.services === null || settings.services === undefined || settings.services.enabled !== true) return
  const config = await readServicesConfig(settings.governanceRoot)
  if (config.error !== undefined) return
  const list = config.services[pathKey]
  const entry = Array.isArray(list) ? list.find(function (e) { return e !== null && typeof e === 'object' && e.name === name }) : undefined
  if (entry === undefined || entry.autoRestart !== true) return
  // 0.27.0：崩溃通知统一走 writeServiceLog 路由（detached 直写文件，非 detached 走流式）。
  const logDetached = entry.detached === true
  const key = serviceStateKey(pathKey, name)
  const state = await readServicesState()
  const info = state.services[key]
  if (info !== null && info !== undefined && isPidAlive(Number(info.pid))) return // 已被手动启动
  const now = Date.now()
  const prev = svcAutoRestart.get(key)
  let windowStart = now
  let count = 1
  if (prev !== null && prev !== undefined) {
    if (prev.timer !== null && prev.timer !== undefined) { clearTimeout(prev.timer); prev.timer = null }
    if (now - prev.windowStart <= AUTO_RESTART_WINDOW_MS) { windowStart = prev.windowStart; count = prev.count + 1 } else { count = 1 }
  }
  if (count > AUTO_RESTART_MAX_COUNT) {
    svcAutoRestart.delete(key)
    writeServiceLog(entry.cwd, entry.name, '----- 自动重启已停止：5 分钟内崩溃超过 ' + AUTO_RESTART_MAX_COUNT + ' 次 -----\n', { detached: logDetached }).catch(function () {})
    return
  }
  const delay = autoRestartDelay(count)
  const rec = { count: count, windowStart: windowStart, timer: null }
  svcAutoRestart.set(key, rec)
  rec.timer = setTimeout(function () {
    svcAutoRestart.delete(key)
    doStartService(settings, pathKey, name).catch(function () {})
  }, delay)
  if (rec.timer !== null && rec.timer !== undefined && typeof rec.timer.unref === 'function') rec.timer.unref()
  writeServiceLog(entry.cwd, entry.name, '----- 服务崩溃（code=' + code + '），' + Math.round(delay / 1000) + ' 秒后自动重启（窗口内第 ' + count + ' 次）-----\n', { detached: logDetached }).catch(function () {})
}

// 0.24.0：启动对账时按 state key 反查配置条目（key 格式 pathKey|name）。
function findServiceEntryByKey(config, key) {
  if (config === null || config === undefined || typeof config !== 'object') return undefined
  const services = config.services
  if (services === null || typeof services !== 'object') return undefined
  for (const pathKey of Object.keys(services)) {
    const list = services[pathKey]
    if (!Array.isArray(list)) continue
    for (const e of list) {
      if (e !== null && typeof e === 'object' && typeof e.name === 'string' && serviceStateKey(pathKey, e.name) === key) return e
    }
  }
  return undefined
}

// 0.24.0：独立运行服务重启后接管前的身份验证——命令行匹配 +（配置了端口时）端口确实在监听。
// 防 PID 复用误接管：命令行无法读取或匹配失败都视为不可接管（不杀、不接管，仅删记录）。
async function verifyAdoptedService(entry, pid) {
  if (entry === null || typeof entry !== 'object') return false
  try {
    const pinfo = await getProcessInfo(pid)
    if (pinfo === null || pinfo === undefined) return false
    const related = relateExternalProcess(entry, pinfo.commandLine)
    if (related !== true) return false
    if (Number.isInteger(entry.port) && entry.port > 0) {
      const up = await probeTcpPort(entry.port, 500)
      if (!up) return false
    }
    return true
  } catch (error) {
    return false
  }
}


// 0.26.0 P1-3：detached 服务会话中途状态丢失（state 文件被清/覆盖）→ 端口仍在监听且命令行匹配 →
// 自动接管回托管（写回 state，附日志标记）。失败/已接管/冷却期内返回 false。
async function adoptDetachedMidSession(path, entry, externalPid) {
  if (entry.detached !== true) return false
  const key = serviceStateKey(path, entry.name)
  const now = Date.now()
  const lastTry = detachedAdoptAttemptAt.get(key) || 0
  if (now - lastTry < DETACHED_ADOPT_RETRY_MS) return false
  detachedAdoptAttemptAt.set(key, now)
  try {
    const state = await readServicesState()
    if (state.services[key] !== null && state.services[key] !== undefined) return false // 已有状态，无需接管
    const next = Object.assign({}, state.services)
    next[key] = { pid: externalPid, startedAt: now, detached: true }
    await writeServicesState(next)
    appendDetachedLogLine(path, entry.name, '----- dsh 运行中接管：进程 pid=' + externalPid + '（此后的日志持续由面板捕获）-----\n').catch(function () {})
    return true
  } catch (error) {
    return false
  }
}

async function computeServiceStatus(path, entry, info) {
  const pid = info !== null && info !== undefined ? Number(info.pid) : 0
  let running = isPidAlive(pid)
  if (running) {
    // F2-4：PID 存活 ≠ 还是本服务进程——核验命令行；确认无关则按 external 处理，
    // 避免 PID 复用导致面板长时间误报 running。
    try {
      const pinfo = await getProcessInfo(pid)
      const related = pinfo !== null && pinfo !== undefined ? relateExternalProcess(entry, pinfo.commandLine) : null
      if (related === false) running = false
    } catch (error) {
      // 命令行不可读：保守维持 running（不误杀、不误删状态），由启动对账兜底。
    }
  }
  let adoptedPid = null
  let adoptedAt = null
  let portUp = false
  if (running && Number.isInteger(entry.port) && entry.port > 0) portUp = await probeTcpPort(entry.port, 1000)
  // 0.20.0：HTTP 健康检查（healthUrl 为完整地址或相对端口路径）。
  let healthUrl = null
  let healthUp = false
  if (running) {
    const hu = typeof entry.healthUrl === 'string' && entry.healthUrl.trim().length > 0 ? entry.healthUrl.trim() : null
    if (hu !== null) {
      healthUrl = hu
      if (/^https?:\/\//i.test(hu)) {
        healthUp = await probeHttpUrl(hu, 1500)
      } else if (Number.isInteger(entry.port) && entry.port > 0) {
        healthUrl = 'http://127.0.0.1:' + entry.port + (hu[0] === '/' ? hu : '/' + hu)
        healthUp = await probeHttpUrl(healthUrl, 1500)
      }
    }
  }
  let state = 'stopped'
  let external = false
  let externalPid = null
  let externalName = null
  let externalCommandLine = null
  let externalRelated = null
  if (running) {
    state = 'running'
    if ((Number.isInteger(entry.port) && entry.port > 0 && !portUp) || (healthUrl !== null && !healthUp)) state = 'starting'
  } else if (Number.isInteger(entry.port) && entry.port > 0) {
    // 0.21.0：面板记录的进程不在跑，但端口可能被外部/命令行手动启动的进程占用。
    // 只读识别（state=external + externalPid），不接管、不写状态、不自动停止。
    // 0.22.0：附带进程名/掩码命令行/身份判断（externalName/externalCommandLine/externalRelated）。
    const up = await probeTcpPort(entry.port, 500)
    if (up) {
      external = true
      externalPid = await findPidByPort(entry.port)
      if (externalPid !== null) {
        const pinfo = await getProcessInfo(externalPid)
        externalName = pinfo.name
        externalCommandLine = pinfo.commandLine !== null ? maskCommandLine(pinfo.commandLine) : null
        externalRelated = relateExternalProcess(entry, pinfo.commandLine)
        // 0.26.0 P1-3：detached 服务状态丢失后，端口在监听且命令行匹配 → 自动接管回托管。
        if (entry.detached === true && externalRelated === true) {
          const adopted = await adoptDetachedMidSession(path, entry, externalPid)
          if (adopted) {
            adoptedPid = externalPid
            adoptedAt = Date.now()
          }
        }
      }
      state = adoptedPid !== null ? 'running' : 'external'
    }
  }
  // 接管成功后按托管运行态返回（翻转 external 标记），下一轮扫描直接走 running 分支。
  if (adoptedPid !== null) {
    running = true
    portUp = true
    external = false
    externalPid = null
    externalName = null
    externalCommandLine = null
    externalRelated = null
  }
  return {
    name: entry.name,
    cwd: entry.cwd,
    command: entry.command,
    args: entry.args,
    env: entry.env,
    port: entry.port,
    running: running,
    portUp: portUp,
    healthUrl: healthUrl,
    healthUp: healthUp,
    state: state,
    external: external,
    externalPid: externalPid,
    externalName: externalName,
    externalCommandLine: externalCommandLine,
    externalRelated: externalRelated,
    pid: running ? (adoptedPid !== null ? adoptedPid : pid) : null,
    startedAt: adoptedPid !== null ? adoptedAt : (running && info !== null && info !== undefined ? info.startedAt : null),
    lastExitCode: info !== null && info !== undefined ? info.lastExitCode : null,
    lastExitAt: info !== null && info !== undefined ? info.lastExitAt : null,
    autoStart: entry.autoStart === true,
    autoRestart: entry.autoRestart === true,
    detached: entry.detached === true,
    note: typeof entry.note === 'string' ? entry.note : '',
  }
}

// 启动一个已注册服务（0.17.0 抽取：serviceStart 与 serviceRestart 共用）。
// 返回 {ok:true,status} 或 {error}；不负责总开关检查（调用方判断）。
async function doStartService(settings, pathKey, name) {
  const config = await readServicesConfig(settings.governanceRoot)
  if (config.error !== undefined) return { error: config.error }
  const list = config.services[pathKey]
  const entry = Array.isArray(list) ? list.find(function (e) { return e !== null && typeof e === 'object' && e.name === name }) : undefined
  if (entry === undefined) return { error: '未找到已注册的服务 "' + name + '"（请先在服务面板注册并保存配置）' }
  if (typeof entry.command !== 'string' || entry.command.trim().length === 0) return { error: '服务 "' + name + '" 尚未配置启动命令' }
  let cwdOk = false
  try { await access(entry.cwd); cwdOk = true } catch (error) {}
  if (!cwdOk) return { error: '工作目录不存在：' + entry.cwd }
  const state = await readServicesState()
  const key = serviceStateKey(pathKey, name)
  svcAutoRestart.delete(key)
  const existing = state.services[key]
  if (existing !== null && existing !== undefined && isPidAlive(Number(existing.pid))) {
    const existingStatus = await computeServiceStatus(pathKey, entry, existing)
    if (existingStatus.running === true) return { ok: true, alreadyRunning: true, status: existingStatus }
    // PID 已复用给无关进程：不认作本服务在跑，继续走启动流程（下面会覆盖状态）。
  }
  delete state.services[key]
  // 0.17.7：启动前端口预检——端口已被占用时直接拦截，不再等到进程退出后靠日志猜测。
  if (Number.isInteger(entry.port) && entry.port > 0) {
    const conflict = await describePortConflict(entry.port)
    if (conflict !== null) return { error: conflict }
  }
  // 0.25.0：spawn 前的解析/文件准备错误（detached 命令不合法、.cmd 无法重写、日志文件打不开等）
  // 转为 {error} 返回，而不是让 handler 整体 500。
  let spawned = null
  try {
    spawned = await spawnService(entry)
  } catch (error) {
    return { error: '启动失败：' + (error instanceof Error ? error.message : String(error)) }
  }
  state.services[key] = { pid: spawned.pid, startedAt: spawned.startedAt, detached: entry.detached === true }
  await writeServicesState(state.services)
  invalidateServiceStatusCache(key)
  // F2-6：启动前端口预检与 spawn 之间存在 TOCTOU 窗口——spawn 后立刻复检一次；
  // 若端口已被其它进程抢占，立即报错，不再误等到启动超时。
  if (Number.isInteger(entry.port) && entry.port > 0) {
    const racePid = await findPidByPort(entry.port)
    if (racePid !== null && Number(racePid) !== Number(spawned.pid)) {
      const raceWho = await findProcessName(racePid)
      delete state.services[key]
      await writeServicesState(state.services)
      invalidateServiceStatusCache(key)
      const who = raceWho !== null ? raceWho + '（PID ' + racePid + '）' : 'PID ' + racePid
      return { error: '启动失败：端口 ' + entry.port + ' 在启动瞬间被进程 ' + who + ' 抢占，请停止该进程或修改端口后重试' }
    }
  }
  // 0.20.0：启动中状态 + 启动超时。进程存活但端口/健康检查未就绪时，
  // 按 startTimeoutMs（默认 30s）等待；进程中途退出照旧做规则诊断。
  const startTimeout = Number.isInteger(entry.startTimeoutMs) && entry.startTimeoutMs >= 1000 ? entry.startTimeoutMs : SERVICE_DEFAULT_START_TIMEOUT_MS
  const deadline = Date.now() + startTimeout
  let status = await computeServiceStatus(pathKey, entry, state.services[key])
  while (true) {
    if (!status.running) {
      delete state.services[key]
      await writeServicesState(state.services)
      invalidateServiceStatusCache(key)
      // 0.17.7：等日志落盘后读尾部做自动诊断，把 EADDRINUSE/缺依赖/命令不存在等关键行放进错误提示。
      await new Promise(function (resolve) { setTimeout(resolve, 250) })
      const logTail = await readServiceLogTail(entry.cwd, entry.name, 8192)
      const diag = summarizeStartupFailure(logTail.exists ? logTail.text : '', entry.port)
      return { error: '启动失败：进程立即退出' + (diag.length > 0 ? '；' + diag : '（请检查启动命令与工作目录，可点击「日志」查看输出）') }
    }
    const needProbe = (Number.isInteger(entry.port) && entry.port > 0) || (typeof entry.healthUrl === 'string' && entry.healthUrl.trim().length > 0)
    if (!needProbe || status.portUp === true || (status.healthUrl !== null && status.healthUp === true)) {
      invalidateServiceStatusCache(key)
      return { ok: true, status: status }
    }
    if (Date.now() >= deadline) {
      invalidateServiceStatusCache(key)
      const target = status.healthUrl !== null ? '健康检查 ' + status.healthUrl : '端口 ' + entry.port
      return { error: '启动超时：进程已运行但 ' + target + ' 在 ' + Math.round(startTimeout / 1000) + ' 秒内未就绪（当前为启动中状态，可点击「日志」查看输出）', status: status }
    }
    await new Promise(function (resolve) { setTimeout(resolve, 500) })
    status = await computeServiceStatus(pathKey, entry, state.services[key])
  }
}

async function stopAllServicesForPath(path, state) {
  const results = []
  const prefix = normalizeServicePath(path) + '|'
  for (const key of Object.keys(state.services)) {
    if (!key.startsWith(prefix)) continue
    const info = state.services[key]
    if (info !== null && typeof info === 'object' && Number.isInteger(Number(info.pid))) {
      const stopped = await stopServicePidGraceful(Number(info.pid), 5000)
      results.push({ key: key, pid: Number(info.pid), stopped: stopped.stopped, error: stopped.error })
      // F2-5：停止失败必须保留状态条目，否则进程仍在跑但面板显示已停止。
      if (stopped.stopped !== true) continue
    }
    delete state.services[key]
  }
  return results
}

async function killAllServices(state) {
  const killed = []
  for (const key of Object.keys(state.services)) {
    const info = state.services[key]
    if (info === null || typeof info !== 'object') { delete state.services[key]; continue }
    const pid = Number(info.pid)
    if (!Number.isInteger(pid) || pid <= 0) { delete state.services[key]; continue }
    // 0.24.0：独立运行（detached）服务不随 dsh 停止——保留状态条目，等下次启动对账接管。
    if (info.detached === true) continue
    const stopped = await stopServicePid(pid)
    killed.push({ key: key, pid: pid, stopped: stopped.stopped, error: stopped.error })
    delete state.services[key]
  }
  return killed
}

function reposMdPath(governanceRoot) {
  return join(governanceRoot, '_governance', 'REPOS.md')
}

// 面板切换可见性后，同步人读账本 REPOS.md 对应行的「云端状态」列（第 4 列）。
// 匹配依据：行内仓库路径 == path，或行内云端仓库 == cloudRepo。
async function updateReposMdVisibility(governanceRoot, path, cloudRepo, isPrivate) {
  if (typeof governanceRoot !== 'string' || governanceRoot.length === 0) return 0
  const target = reposMdPath(governanceRoot)
  let text = ''
  try { text = await readFile(target, 'utf8') } catch (error) { return 0 }
  const status = isPrivate ? '✅ 已上云（私有）' : '✅ 已上云（公开）'
  const eol = text.indexOf('\r\n') !== -1 ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  let updated = 0
  const next = lines.map(function (line) {
    if (updated > 0) return line
    if (line.charAt(0) !== '|') return line
    const cells = line.split('|')
    if (cells.length < 6) return line
    const rowPath = cells[1].trim()
    const rowCloud = cells[5].trim()
    const matchPath = typeof path === 'string' && path.length > 0 && rowPath === path
    const matchCloud = typeof cloudRepo === 'string' && cloudRepo.length > 0 && rowCloud === cloudRepo
    if (!matchPath && !matchCloud) return line
    cells[4] = ' ' + status + ' '
    updated++
    return cells.join('|')
  })
  if (updated > 0) {
    await atomicWrite(target, next.join(eol) + eol)
  }
  return updated
}

// 文件规则（0.12.0，Q16）：目录含 .git/.dsh，或顶层有非隐藏、非 README*
// 普通文件 → 项目卡；否则视为分类目录继续递归。package.json 单独探测只为
// 保留 hasPkg 字段（它本身也是非隐藏普通文件，会被文件规则命中）。
async function detectProjectDir(dir) {
  let hasGit = false
  let hasPkg = false
  let hasDsh = false
  let hasTopFiles = false
  try { await access(join(dir, '.git')); hasGit = true } catch (error) {}
  try { await access(join(dir, 'package.json')); hasPkg = true } catch (error) {}
  try { await access(join(dir, '.dsh')); hasDsh = true } catch (error) {}
  let entries = []
  try { entries = await readdir(dir, { withFileTypes: true }) } catch (error) {}
  for (const f of entries) {
    if (f.isFile() && !f.name.startsWith('.') && !/^readme/i.test(f.name)) { hasTopFiles = true; break }
  }
  return { hasGit: hasGit, hasPkg: hasPkg, hasDsh: hasDsh, hasTopFiles: hasTopFiles, isProject: hasGit || hasDsh || hasPkg || hasTopFiles }
}

async function scanProjectDirs(root) {
  const out = []
  async function walk(current, relParts) {
    let entries = []
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error) {
      return
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const name = ent.name
      if (name === 'node_modules' || name === '.git') continue
      if (REPO_EXCLUDE_DIRS.has(name)) continue
      const dir = join(current, name)
      const rel = relParts.concat(name)
      const det = await detectProjectDir(dir)
      if (det.isProject) {
        out.push({ name: name, path: dir, rel: rel.join('/'), hasGit: det.hasGit, hasPkg: det.hasPkg, hasDsh: det.hasDsh })
        continue
      }
      await walk(dir, rel)
    }
  }
  await walk(root, [])
  return out
}

async function scanSkillMirror(governanceRoot) {
  const base = join(governanceRoot, 'skill仓库')
  const divisions = [
    { key: 'local', label: '本地' },
    { key: 'plugins', label: '插件' },
    { key: 'projects', label: '项目' },
  ]
  const groups = []
  for (const div of divisions) {
    const root = join(base, div.key)
    const skills = []
    async function walk(current, relParts) {
      let entries = []
      try { entries = await readdir(current, { withFileTypes: true }) } catch (error) { return }
      const hasSkill = entries.some(function (e) { return e.isFile() && e.name === 'SKILL.md' })
      if (hasSkill) {
        let name = basename(current)
        try {
          const meta = parseFrontmatterMeta(await readFile(join(current, 'SKILL.md'), 'utf8'))
          if (typeof meta.name === 'string' && meta.name.length > 0) name = meta.name
        } catch (error) {}
        skills.push({ name: name, path: current, sub: relParts.join('/') })
        return
      }
      for (const ent of entries) {
        if (!ent.isDirectory()) continue
        await walk(join(current, ent.name), relParts.concat(ent.name))
      }
    }
    await walk(root, [])
    groups.push({ key: div.key, label: div.label, skills: skills })
  }
  return groups
}

async function scanPluginPackages(projectPath) {
  const out = []
  try { await access(join(projectPath, 'package.json')); out.push({ name: basename(projectPath), path: projectPath, relative: '' }) } catch (error) {}
  let entries = []
  try { entries = await readdir(projectPath, { withFileTypes: true }) } catch (error) { return out }
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name === 'node_modules' || ent.name.startsWith('.')) continue
    const pkgPath = join(projectPath, ent.name)
    try { await access(join(pkgPath, 'package.json')); out.push({ name: ent.name, path: pkgPath, relative: ent.name }) } catch (error) {}
  }
  return out
}

const execFileAsync = promisify(execFile)



async function fetchRepo(path) {
  try {
    await runGit(path, ['fetch', '--all', '--prune', '--quiet'], 15000)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}




/** 技能目录名 = 单个路径组件：禁止分隔符 / 控制字符 / 以点开头（防御路径穿越）。 */
function safeSkillName(name) {
  if (typeof name !== 'string') return null
  const n = name.trim()
  if (n.length === 0 || n.length > 64) return null
  if (n === '.' || n === '..' || n.charAt(0) === '.') return null
  if (/[\\/]/.test(n) || /[\u0000-\u001f]/.test(n)) return null
  return n
}

async function copySkillDir(src, dest) {
  try { await access(dest); return { ok: false, skipped: true, path: dest } } catch (error) {}
  await mkdir(dirname(dest), { recursive: true })
  await cp(src, dest, { recursive: true })
  return { ok: true, path: dest }
}

// ---- 项目详情面板数据源（repoDetail）----
// 0.16.1：三层缓存 —— 内存 SWR（同进程秒开）→ 磁盘指纹（进程重启秒开）→ 全量重建（项目真的变了才做）。
// 指纹只取 head/upstream/branch/remote 四个决定“重数据”的分量；dirty 单独用 git status --porcelain 刷新，不触发重建。
const REPO_DETAIL_CACHE_FILENAME = 'repo-detail-cache.json'
const REPO_DETAIL_SWR_MS = 20000
const repoDetailCache = new Map()
const REPO_DETAIL_CACHE_MAX = 64
// F3-8：内存缓存加容量上限——按插入序淘汰最旧条目，防止长会话大量切换项目导致无界增长。
function repoDetailCacheSet(path, value) {
  if (repoDetailCache.size >= REPO_DETAIL_CACHE_MAX && !repoDetailCache.has(path)) {
    const oldest = repoDetailCache.keys().next().value
    if (oldest !== undefined) repoDetailCache.delete(oldest)
  }
  repoDetailCache.set(path, value)
}
const repoDetailRefreshing = new Set()

function repoDetailCachePath(governanceRoot) {
  return join(governanceRoot, '_governance', REPO_DETAIL_CACHE_FILENAME)
}

async function readRepoDetailDiskCache(governanceRoot) {
  try {
    const parsed = JSON.parse(await readFile(repoDetailCachePath(governanceRoot), 'utf8'))
    if (parsed !== null && typeof parsed === 'object' && parsed.entries !== null && typeof parsed.entries === 'object') {
      return { entries: parsed.entries, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '' }
    }
    return { entries: {}, updatedAt: '' }
  } catch (error) {
    return { entries: {}, updatedAt: '' }
  }
}

async function writeRepoDetailDiskCache(governanceRoot, cache) {
  try {
    await mkdir(join(governanceRoot, '_governance'), { recursive: true })
    await atomicWrite(repoDetailCachePath(governanceRoot), JSON.stringify({ entries: cache.entries, updatedAt: new Date().toISOString() }, null, 2) + '\n')
  } catch (error) {}
}

async function computeRepoFingerprint(path) {
  const fp = { isRepo: false, head: '', upstream: '', branch: '', remote: '', dirty: false }
  try { await access(join(path, '.git')) } catch (error) { return fp }
  fp.isRepo = true
  try { fp.head = (await runGit(path, ['rev-parse', 'HEAD'])).trim() } catch (error) {}
  try { fp.branch = (await runGit(path, ['branch', '--show-current'])).trim() } catch (error) {}
  try { fp.upstream = (await runGit(path, ['rev-parse', '@{u}'])).trim() } catch (error) {}
  try { fp.remote = (await runGit(path, ['remote', 'get-url', 'origin'])).trim() } catch (error) {}
  try { fp.dirty = (await runGit(path, ['status', '--porcelain'])).trim().length > 0 } catch (error) {}
  return fp
}

function repoFingerprintCoreEqual(a, b) {
  return a !== null && a !== undefined && b !== null && b !== undefined &&
    a.head === b.head && a.upstream === b.upstream && a.branch === b.branch && a.remote === b.remote
}

function repoFingerprintCore(fp) {
  return fp !== null && fp !== undefined ? { head: fp.head, upstream: fp.upstream, branch: fp.branch, remote: fp.remote } : null
}

function patchRepoDetailDirty(data, dirty) {
  if (data !== null && typeof data === 'object' && data.git !== null && typeof data.git === 'object') {
    data.git.dirty = dirty === true
  }
  return data
}

async function refreshRepoDetailInBackground(path, settings) {
  if (repoDetailRefreshing.has(path)) return
  repoDetailRefreshing.add(path)
  try {
    const fresh = await buildRepoDetail(path)
    const fp = repoFingerprintCore(await computeRepoFingerprint(path))
    repoDetailCacheSet(path, { ts: Date.now(), data: fresh, fp: fp })
    const disk = await readRepoDetailDiskCache(settings.governanceRoot)
    disk.entries[path] = { fp: fp, ts: Date.now(), data: fresh }
    await writeRepoDetailDiskCache(settings.governanceRoot, disk)
  } catch (error) {
  } finally {
    repoDetailRefreshing.delete(path)
  }
}





async function buildSkillDetail(path) {
  let text = ''
  for (const name of ['SKILL.md', 'SKILL.txt', 'SKILL']) {
    try { text = await readFile(join(path, name), 'utf8'); break } catch (error) {}
  }
  const limited = typeof text === 'string' ? text.slice(0, 30000) : ''
  const parsed = parseSkillFrontmatter(limited)
  const fm = parsed.frontmatter
  let title = fm !== null && typeof fm.name === 'string' && fm.name.length > 0 ? fm.name : ''
  let description = fm !== null && typeof fm.description === 'string' ? fm.description : ''
  if (title.length === 0) {
    const heading = /^#\s+(.+)$/m.exec(parsed.body)
    if (heading !== null) title = heading[1].trim()
  }
  if (title.length === 0) title = basename(path)
  if (description.length === 0) {
    for (const line of parsed.body.split(/\r?\n/)) {
      const t = line.trim()
      if (t.length === 0 || /^#/.test(t)) continue
      description = t
      break
    }
  }
  return { ok: true, path: path, name: basename(path), title: title, description: description, text: limited }
}

// ---- AI 讲解（0.15.0）----
// 缓存：_governance/ai-explanations.json，键 = commit hash。
// 约定优于强制：人工本地更新文档 = 项目根 CHANGELOG-local.md，
// 条目锚点 `### [commit <hash>] <标题>`，未覆盖的提交由 git 事实兜底。

const AI_WARMUP_CAP = 50
let aiMessageSeq = 0




function makeUserMessage(text) {
  aiMessageSeq += 1
  return {
    id: 'skm-ai-' + aiMessageSeq,
    role: 'user',
    content: [{ type: 'text', text: text }],
    source: { kind: 'plugin', plugin: 'dsh-manager' },
  }
}

async function llmGenerateText(llm, aiSettings, system, prompt, signal, onDelta) {
  let text = ''
  const effort = typeof aiSettings.reasoningEffort === 'string' && aiSettings.reasoningEffort.length > 0 ? aiSettings.reasoningEffort : 'off'
  const options = {
    provider: aiSettings.provider,
    model: aiSettings.model,
    messages: [makeUserMessage(prompt)],
    ...system.length > 0 ? { system: system } : {},
    maxTokens: aiSettings.maxTokens,
    ...effort !== 'off' ? { reasoningEffort: effort } : {},
    ...signal !== undefined ? { signal: signal } : {},
  }
  for await (const chunk of llm.stream(options)) {
    if (chunk === null || typeof chunk !== 'object') continue
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      text += chunk.text
      if (typeof onDelta === 'function') onDelta(text)
    } else if (chunk.type === 'finish') {
      const reason = chunk.reason
      if (reason !== null && reason !== undefined && (reason.kind === 'error' || reason.kind === 'aborted')) {
        const failure = reason.failure
        const message = failure !== null && failure !== undefined && typeof failure.message === 'string' ? failure.message : (reason.kind === 'aborted' ? '请求被中止' : '生成失败')
        throw new Error(message)
      }
    }
  }
  return text
}

// 0.27.0：LLM 调用统一超时样板——AbortController + 定时器 + 异常规整为 {error}。
async function runLlmWithTimeout(llm, aiSettings, system, prompt, timeoutMs, onDelta) {
  const controller = new AbortController()
  const timer = setTimeout(function () { controller.abort() }, Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000)
  try {
    const text = await llmGenerateText(llm, aiSettings, system, prompt, controller.signal, onDelta)
    return { ok: true, text: text }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}








async function buildRepoDetail(path) {
  const settings = await readRepoSettings()
  const reposJson = await readReposJson(settings.governanceRoot)
  let meta = null
  if (reposJson !== null && Array.isArray(reposJson.repos)) {
    meta = reposJson.repos.find(function (r) { return r !== null && typeof r === 'object' && typeof r.path === 'string' && r.path === path }) || null
  }
  const name = basename(path)
  // 并行：git 状态、README、package、本地更新文档（0.15.0 提速：不再串行）
  const [git, readme, pkg, localDoc] = await Promise.all([
    gitState(path),
    readReadmeInfo(path),
    readPackageInfo(path),
    parseLocalChangelog(path),
  ])
  let incoming = []
  let outgoing = []
  let history = []
  if (git.isRepo === true) {
    const jobs = []
    if (git.hasUpstream === true && git.behind > 0) jobs.push(gitLogEntries(path, 'HEAD..@{u}', 20).then(function (v) { incoming = v }).catch(function () {}))
    if (git.hasUpstream === true && git.ahead > 0) jobs.push(gitLogEntries(path, '@{u}..HEAD', 20).then(function (v) { outgoing = v }).catch(function () {}))
    jobs.push(gitLogEntries(path, 'HEAD', 10).then(function (v) { history = v }).catch(function () {}))
    await Promise.all(jobs)
  }
  // cloudRepo / private / type：只用账本字段，不做 gh 网络探测（0.15.0：详情提速）
  const cloudRepo = meta !== null && typeof meta.cloudRepo === 'string' && meta.cloudRepo.length > 0 ? meta.cloudRepo : ''
  const privateRepo = meta !== null && typeof meta.private === 'boolean' ? meta.private : false
  let type = meta !== null && (meta.type === 'local' || meta.type === 'mirror') ? meta.type : null
  if (type === null) type = cloudRepo.length > 0 ? (cloudRepo.split('/')[0] !== 'as1350' ? 'mirror' : 'local') : null
  if (type === null) {
    const root = settings.roots.find(function (r) { return pathUnderRoot(path, r) })
    type = root !== undefined && settings.rootTypes[root] === 'mirror' ? 'mirror' : 'local'
  }
  return {
    ok: true,
    path: path,
    name: name,
    type: type,
    cloudRepo: cloudRepo,
    private: privateRepo,
    git: git,
    incoming: incoming,
    outgoing: outgoing,
    unregisteredOutgoing: uncoveredOutgoing(localDoc, outgoing),
    history: history,
    readme: readme,
    package: pkg,
    localDoc: localDoc,
  }
}

export function apply(ctx) {
  // 0.35.2：packagedSkillRegistry 保存包内技能注册状态（name → {disposer, ...}），
  // 供 skillObserveSet 对插件技能即时重注册注入/移除观察约定块。
  const packagedSkillRegistry = new Map()
  registerPackagedSkills(ctx, packagedSkillRegistry)
  // 启动后异步读观察文件，对已开启观察的插件技能补注约定块（重注册，等待下次 effect 周期生效）
  readRepoSettings().then(function (settings) {
    return readSkillObservations(settings.governanceRoot)
  }).then(function (observations) {
    const svc = ctx.get('skills')
    if (svc === undefined) return
    for (const key of Object.keys(observations.skills)) {
      const entry = observations.skills[key]
      if (entry === undefined || entry.observing !== true) continue
      try {
        reRegisterPackagedSkill(svc, packagedSkillRegistry, key, true)
      } catch (error) {
        console.warn(`[dsh-manager] skill "${key}" observe injection failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }).catch(function () {})

  const webServer = ctx.get('webServer')
  if (webServer === undefined) {
    // inject: ['webServer'] 声明了硬依赖，正常挂载时不会走到这里；
    // 保留优雅降级便于在无 webserver 的组合（headless 等）中诊断。
    console.error('[dsh-skill-manager] webServer service unavailable; route not registered')
    return
  }

  // ---- AI 讲解（0.15.0）：可选 ctx.llm + 串行后台队列 + 持久缓存 ----
  const llm = ctx.get('llm')
  const aiQueue = []
  let aiPumping = false
  const aiRunning = new Map()
  const aiFailedAt = new Map()
  const aiForce = new Set()
  const aiGeneration = new Map()
  let aiWarmupRunning = false

  // ---- AI 讲解设置（0.16.0）：只展示已配置好 key 的供应商；思考等级来自模型能力 ----
  const settingsSvc = ctx.get('settings')
  const credentialsSvc = ctx.get('credentials')
  const llmPiAiProviderKeyRef = function (providerId) {
    try {
      if (settingsSvc === undefined || typeof settingsSvc.section !== 'function') return ''
      const section = settingsSvc.section('llm-pi-ai')
      const prov = section !== null && typeof section === 'object' && section.providers !== null && typeof section.providers === 'object' ? section.providers[providerId] : undefined
      return prov !== null && typeof prov === 'object' && typeof prov.apiKeyEnv === 'string' && prov.apiKeyEnv.trim().length > 0 ? prov.apiKeyEnv.trim() : ''
    } catch (error) {
      return ''
    }
  }
  const providerHasKey = async function (providerId) {
    const ref = llmPiAiProviderKeyRef(providerId)
    if (ref.length === 0) return false
    if (credentialsSvc === undefined || typeof credentialsSvc.resolve !== 'function') return false
    try {
      const hit = await credentialsSvc.resolve(ref)
      return hit !== undefined && hit !== null && typeof hit.value === 'string' && hit.value.length > 0
    } catch (error) {
      return false
    }
  }

  const enqueueAiItem = function (item) {
    if (aiQueue.some(function (i) { return i.hash === item.hash })) return
    if (aiRunning.has(item.hash)) return
    aiQueue.push(item)
  }

  const enqueueAiItemFront = function (item) {
    if (aiRunning.has(item.hash)) return
    for (let i = aiQueue.length - 1; i >= 0; i--) if (aiQueue[i].hash === item.hash) aiQueue.splice(i, 1)
    aiQueue.unshift(item)
  }

  const pumpAiQueue = function () {
    if (aiPumping === true) return
    aiPumping = true
    const step = function () {
      if (aiQueue.length === 0) { aiPumping = false; return }
      const item = aiQueue.shift()
      void (async function () {
        let settings = null
        let material = null
        try {
          item.hash = await resolveFullHash(item.path, item.hash)
          const gen = aiGeneration.get(item.hash) || 0
          settings = await readRepoSettings()
          const aiSettings = settings.aiExplain
          if (llm === undefined) throw new Error('AI 服务不可用（宿主未挂载 llm 服务）')
          if (aiSettings.enabled !== true) throw new Error('AI 讲解已在设置中关闭')
          const cache = await readAiCache(settings.governanceRoot)
          const force = aiForce.has(item.hash)
          if (force !== true && cache.explanations[item.hash] !== undefined && cache.explanations[item.hash].ok === true) {
            aiRunning.delete(item.hash)
            return
          }
          if ((aiGeneration.get(item.hash) || 0) !== gen) { aiRunning.delete(item.hash); return }
          if (force === true) aiForce.delete(item.hash)
          aiRunning.set(item.hash, { state: 'running', text: '' })
          material = await buildCommitMaterial(item.path, item.hash)
          const doc = await parseLocalChangelog(item.path)
          const docEntry = findLocalDocEntry(doc, item.hash)
          const promptParts = buildExplainPrompt(material, docEntry, basename(item.path))
          const run = await runLlmWithTimeout(llm, aiSettings, promptParts.system, promptParts.prompt, 120000, function (partial) {
            const cur = aiRunning.get(item.hash)
            if (cur !== undefined) { cur.text = partial; cur.state = 'running' }
          })
          if (run.error !== undefined) throw new Error(run.error)
          const text = run.text
          const data = parseExplainOutput(text)
          if (data.summary.length === 0 && data.points.length === 0) throw new Error('模型未返回有效讲解内容')
          cache.explanations[item.hash] = {
            ok: true,
            summary: data.summary,
            points: data.points,
            impact: data.impact,
            subject: material.subject,
            stat: material.stat,
            provider: aiSettings.provider,
            model: aiSettings.model,
            generatedAt: new Date().toISOString(),
          }
          if ((aiGeneration.get(item.hash) || 0) !== gen) { aiRunning.delete(item.hash); return }
          await writeAiCache(settings.governanceRoot, cache)
          aiRunning.set(item.hash, { state: 'done', text: text, data: data })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if ((aiGeneration.get(item.hash) || 0) !== gen) { aiRunning.delete(item.hash); return }
          aiFailedAt.set(item.hash, Date.now())
          aiRunning.set(item.hash, { state: 'error', text: '', error: message })
          // 失败也落盘：刷新/重进面板后仍能显示红色与真实原因（0.15.1）
          if (settings !== null && typeof settings.governanceRoot === 'string' && settings.governanceRoot.length > 0) {
            try {
              const cache = await readAiCache(settings.governanceRoot)
              cache.explanations[item.hash] = {
                ok: false,
                error: message,
                subject: material !== null && material !== undefined ? material.subject : '',
                stat: material !== null && material !== undefined ? material.stat : '',
                attemptedAt: new Date().toISOString(),
              }
              await writeAiCache(settings.governanceRoot, cache)
            } catch (cacheError) {}
          }
        } finally {
          step()
        }
      })()
    }
    step()
  }

  const collectWarmupHashes = async function (maxItems) {
    const cap = typeof maxItems === 'number' && maxItems > 0 ? Math.min(maxItems, AI_WARMUP_CAP) : AI_WARMUP_CAP
    if (cap <= 0) return 0
    const settings = await readRepoSettings()
    const cache = await readAiCache(settings.governanceRoot)
    const items = []
    const seen = new Set()
    const now = Date.now()
    const pushRepo = async function (path) {
      const st = await gitState(path)
      if (st.isRepo !== true) return
      const add = function (entry) {
        if (entry === null || typeof entry !== 'object' || typeof entry.hash !== 'string') return
        if (seen.has(entry.hash)) return
        const cached = cache.explanations[entry.hash]
        if (cached !== undefined) {
          if (cached.ok === true) return
          const attemptedAt = typeof cached.attemptedAt === 'string' ? Date.parse(cached.attemptedAt) : 0
          if (Number.isFinite(attemptedAt) && attemptedAt > 0 && now - attemptedAt < 300000) return
        }
        if (aiRunning.has(entry.hash)) return
        if (aiQueue.some(function (i) { return i.hash === entry.hash })) return
        const failedAt = aiFailedAt.get(entry.hash)
        if (failedAt !== undefined && now - failedAt < 300000) return
        seen.add(entry.hash)
        items.push({ hash: entry.hash, path: path, date: typeof entry.date === 'string' ? entry.date : '' })
      }
      try {
        if (st.hasUpstream === true) {
          if (st.behind > 0) for (const e of await gitLogEntries(path, 'HEAD..@{u}', 20)) add(e)
          if (st.ahead > 0) for (const e of await gitLogEntries(path, '@{u}..HEAD', 20)) add(e)
        }
        for (const e of await gitLogEntries(path, 'HEAD', 10)) add(e)
      } catch (error) {}
    }
    let scan = null
    try { scan = await handlers['repoScan']() } catch (error) { return 0 }
    if (scan === null || !Array.isArray(scan.projects)) return 0
    for (const project of scan.projects) await pushRepo(project.path)
    if (Array.isArray(scan.mirrors)) for (const mirror of scan.mirrors) await pushRepo(mirror.path)
    items.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) })
    const capped = items.slice(0, cap)
    for (const item of capped) enqueueAiItem(item)
    if (aiQueue.length > 0) pumpAiQueue()
    return capped.length
  }

  // ---- repoScan SWR 缓存（0.35.0）：面板每次打开无条件全量重扫导致 7-8s 加载 ----
  // 新鲜缓存（15s）直接回；过期先回旧值 + 后台单飞重扫（与 repoDetail 三层缓存同款 SWR 模式）。
  let repoScanCache = null
  let repoScanRefreshing = false
  const REPO_SCAN_TTL_MS = 15000

  async function buildRepoScan() {
    const settings = await readRepoSettings()
    const reposJson = await readReposJson(settings.governanceRoot)
    const servicesConfig = await readServicesConfig(settings.governanceRoot)
    const repoMap = new Map()
    if (reposJson !== null && Array.isArray(reposJson.repos)) {
      for (const r of reposJson.repos) {
        if (r !== null && typeof r === 'object' && typeof r.path === 'string') repoMap.set(r.path, r)
      }
    }
    const foundAll = []
    for (const root of settings.roots) {
      const found = await scanProjectDirs(root)
      for (const p of found) foundAll.push({ root: root, p: p })
    }
    const skillScanPromise = scanSkillMirror(settings.governanceRoot)
    // 已知仓库（repos.json 已含 cloudRepo + private）不再 spawn git/gh 探测，
    // 直接复用账本字段——repoScan 提速（否则每个项目都要 gh repo view 拉取可见性）。
    const CONCURRENCY = 5
    const detectedAll = new Array(foundAll.length)
    let detectIdx = 0
    const detectWorker = async function () {
      while (detectIdx < foundAll.length) {
        const i = detectIdx++
        const item = foundAll[i]
        const meta = repoMap.get(item.p.path) || null
        if (meta !== null && typeof meta.cloudRepo === 'string' && meta.cloudRepo.length > 0 && typeof meta.private === 'boolean') {
          detectedAll[i] = { cloudRepo: meta.cloudRepo, private: meta.private }
        } else {
          detectedAll[i] = await detectRepoMeta(item.p.path)
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, function () { return detectWorker() }))
    const projects = []
    const mirrors = []
    foundAll.forEach(function (item, idx) {
      const p = item.p
      const root = item.root
      const meta = repoMap.get(p.path) || null
      const detected = detectedAll[idx]
      // 自动分类（0.12.0，Q9/Q11）：有第三方 origin → GitHub项目；无 origin 或
      // 自己(as1350) 的 origin → 本地项目。rootTypes 不再参与类型判定（手动切换已删除）。
      const detectedCloud = detected !== null && typeof detected.cloudRepo === 'string' ? detected.cloudRepo : ''
      const metaCloud = meta !== null && typeof meta.cloudRepo === 'string' && meta.cloudRepo.length > 0 ? meta.cloudRepo : ''
      const effectiveCloud = detectedCloud.length > 0 ? detectedCloud : metaCloud
      let autoType = 'local'
      if (effectiveCloud.length > 0) {
        const owner = String(effectiveCloud).split('/')[0]
        if (owner !== 'as1350') autoType = 'mirror'
      }
      const cloudRepo = effectiveCloud
      const privateRepo = meta !== null && typeof meta.private === 'boolean' ? meta.private : (detected !== null ? detected.private : false)
      const pathKey = normalizeServicePath(p.path)
      const registered = Array.isArray(servicesConfig.services[pathKey])
      const row = { root: root, name: p.name, path: p.path, rel: typeof p.rel === 'string' ? p.rel : '', hasGit: p.hasGit, hasPkg: p.hasPkg, hasDsh: p.hasDsh, type: autoType, cloudRepo: cloudRepo, private: privateRepo, registered: registered, meta: meta }
      projects.push(row)
      if (row.type === 'mirror') mirrors.push(row)
    })
    const skillGroups = await skillScanPromise
    return { ok: true, settings: settings, reposJson: reposJson, servicesConfig: servicesConfig, projects: projects, mirrors: mirrors, skillGroups: skillGroups }
  }

  // 返回进行中的 promise（0.35.3）：启动预热与首开面板可共享同一次构建，避免双路并行全量扫描。
  let repoScanRefreshPromise = null
  async function refreshRepoScanInBackground() {
    if (repoScanRefreshing) return repoScanRefreshPromise
    repoScanRefreshing = true
    repoScanRefreshPromise = (async function () {
      try {
        const data = await buildRepoScan()
        repoScanCache = { ts: Date.now(), data: data }
      } catch (error) {} finally {
        repoScanRefreshing = false
        repoScanRefreshPromise = null
      }
    })()
    return repoScanRefreshPromise
  }

  const handlers = {
    'catalog': async function (args) {
      const view = await resolveView(ctx, args)
      if (view.skills === undefined) return { error: '技能注册表不可用：当前预设或宿主组合未挂载 skill 服务' }
      // 0.35.2：观察状态并入目录行（observing + 待处理建议数，供面板卡片开关与徽标）
      const catalogSettings = await readRepoSettings()
      const observations = await readSkillObservations(catalogSettings.governanceRoot)
      const registry = ctx.get('skills') !== undefined ? ctx.get('skills') : view.skills
      const cwd = view.cwd
      const currentScopeId = view.scope !== undefined && view.scope !== null && typeof view.scope.agentPreset === 'string' ? view.scope.agentPreset : 'global'
      // 全局层：scope 传 undefined = 只看宿主全局（不混入任何预设层）
      const globalSnapshot = await registry.snapshot({ cwd: cwd, scope: undefined })
      const buckets = new Map()
      buckets.set('global', { label: 'global', skills: globalSnapshot.skills })
      // 枚举活动会话所在预设的 standing 作用域（会话在 = 预设已挂载，不会触发新挂载）
      const sessionsSvc = ctx.get('sessions')
      const presetsSvc = ctx.get('agentPresets')
      if (sessionsSvc !== undefined && presetsSvc !== undefined && typeof sessionsSvc.list === 'function' && typeof presetsSvc.standingKeyFor === 'function') {
        const seen = new Set()
        for (const session of sessionsSvc.list()) {
          const presetId = presetOfSession(session)
          if (typeof presetId !== 'string' || presetId.length === 0 || seen.has(presetId)) continue
          seen.add(presetId)
          try {
            const key = await presetsSvc.standingKeyFor(presetId)
            if (key === undefined || key === null) continue
            const snap = await registry.snapshot({ cwd: cwd, scope: key })
            buckets.set(presetId, { label: presetId, skills: snap.skills })
          } catch (error) {
            // 预设作用域不可解析时跳过该作用域，不影响全局视图
          }
        }
      }
      // 未挂载预设的专属技能：静态扫描 customSkillDirs，生成预览条目（不触发挂载）
      if (presetsSvc !== undefined && typeof presetsSvc.list === 'function') {
        await discoverPresetSkillPreviews(presetsSvc, buckets)
      }
      const globalNames = new Set(globalSnapshot.skills.map(function (s) { return String(s.name) }))
      // 文件根来源（用户/项目目录）语义上属于全局/项目，不按发现它的预设作用域标徽标；
      // 插件/预设注入类（custom/bundled/runtime）才按所在作用域桶标注。
      const FILESYSTEM_GLOBAL_SOURCES = ['user-dsh', 'user-agents']
      const FILESYSTEM_PROJECT_SOURCES = ['project-dsh', 'project-agents']
      const seenShared = new Set()
      const out = []
      for (const [bucketScopeId, bucket] of buckets) {
        const isGlobalBucket = bucketScopeId === 'global'
        for (const skill of bucket.skills) {
          if (!isGlobalBucket && globalNames.has(String(skill.name))) continue
          const skillName = String(skill.name)
          const source = String(skill.source)
          let scopeId
          let scopeLabel
          let crossScope
          if (FILESYSTEM_GLOBAL_SOURCES.indexOf(source) !== -1) {
            if (seenShared.has(skillName)) continue
            seenShared.add(skillName)
            scopeId = 'global'; scopeLabel = 'global'; crossScope = false
          } else if (FILESYSTEM_PROJECT_SOURCES.indexOf(source) !== -1) {
            if (seenShared.has('project:' + skillName)) continue
            seenShared.add('project:' + skillName)
            scopeId = 'project'; scopeLabel = 'project'; crossScope = false
          } else {
            scopeId = isGlobalBucket ? 'global' : bucketScopeId
            scopeLabel = scopeId
            crossScope = !isGlobalBucket && bucketScopeId !== currentScopeId
          }
          const meta = pinyinMeta(skillName)
          const row = {
            name: skillName,
            description: skill.description === undefined ? '' : String(skill.description),
            whenToUse: skill.whenToUse === undefined ? null : String(skill.whenToUse),
            modelInvocable: skill.invocation !== undefined && skill.invocation.modelInvocable === true,
            userInvocable: skill.invocation !== undefined && skill.invocation.userInvocable === true,
            source: source,
            provider: String(skill.provider),
            scopeId: scopeId,
            scopeLabel: scopeLabel,
            crossScope: crossScope,
            preview: skill.preview === true,
            observing: observations.skills[skillName] !== undefined && observations.skills[skillName].observing === true,
            pendingSuggestions: countPendingSuggestions(observations.skills[skillName]),
          }
          if (meta !== null) { row.namePinyin = meta.pinyin; row.nameInitials = meta.initials }
          out.push(row)
        }
      }
      return {
        complete: globalSnapshot.complete === true,
        currentScopeId: currentScopeId,
        skills: out,
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

    // ---- 技能观察（0.35.2）：观察开关 + 复盘记录 ----
    'skillObserveGet': async function (args) {
      const name = args !== null && typeof args === 'object' && typeof args.name === 'string' ? args.name : ''
      if (name.length === 0) return { error: '缺少技能名称' }
      const settings = await readRepoSettings()
      const observations = await readSkillObservations(settings.governanceRoot)
      const entry = observations.skills[name]
      let canObserve = false
      try {
        const view = await resolveView(ctx, args)
        if (view.skills !== undefined) {
          const definition = await view.skills.get(name, { cwd: view.cwd, scope: view.scope })
          if (definition !== undefined) {
            const source = String(definition.source)
            const provider = String(definition.provider)
            const hasPath = typeof definition.path === 'string' && definition.path.length > 0
            canObserve = (source === 'custom' && provider === 'dsh-manager') || (hasPath && EDITABLE_SOURCES.indexOf(source) !== -1)
          }
        }
      } catch (error) {}
      return {
        name: name,
        observing: entry !== undefined && entry.observing === true,
        pendingSuggestions: countPendingSuggestions(entry),
        entryCount: entry !== undefined && Array.isArray(entry.entries) ? entry.entries.length : 0,
        canObserve: canObserve,
      }
    },

    'skillObserveSet': async function (args) {
      const name = args !== null && typeof args === 'object' && typeof args.name === 'string' ? args.name : ''
      if (name.length === 0) return { error: '缺少技能名称' }
      const observing = args !== null && typeof args === 'object' && args.observing === true
      const settings = await readRepoSettings()
      if (typeof settings.governanceRoot !== 'string' || settings.governanceRoot.length === 0) return { error: '尚未设置治理根目录，无法记录观察状态' }
      const view = await resolveView(ctx, args)
      if (view.skills === undefined) return { error: '技能注册表不可用：当前预设或宿主组合未挂载 skill 服务' }
      const definition = await view.skills.get(name, { cwd: view.cwd, scope: view.scope })
      if (definition === undefined) return { error: '未找到技能 "' + name + '"' }
      const source = String(definition.source)
      const provider = String(definition.provider)
      const hasPath = typeof definition.path === 'string' && definition.path.length > 0
      const isPackaged = source === 'custom' && provider === 'dsh-manager'
      const isFileSkill = hasPath && EDITABLE_SOURCES.indexOf(source) !== -1
      if (!isPackaged && !isFileSkill) return { error: '该技能不可观察（只读来源或缺少文件路径）' }
      // 1) 先写观察文件（失败则不触碰运行时）
      const observations = await readSkillObservations(settings.governanceRoot)
      const existing = observations.skills[name]
      const entry = {
        observing: observing,
        enabledAt: observing ? new Date().toISOString() : (existing !== undefined && typeof existing.enabledAt === 'string' ? existing.enabledAt : null),
        disabledAt: observing ? null : new Date().toISOString(),
        optimizedAt: existing !== undefined && typeof existing.optimizedAt === 'string' ? existing.optimizedAt : null,
        revision: existing !== undefined && Number.isInteger(existing.revision) && existing.revision > 0 ? existing.revision : 0,
        entries: existing !== undefined && Array.isArray(existing.entries) ? existing.entries : [],
      }
      observations.skills[name] = entry
      await writeSkillObservations(settings.governanceRoot, observations)
      // 2) 插件技能：运行时重注册注入/移除约定块（即时生效）
      if (isPackaged) {
        const result = reRegisterPackagedSkill(view.skills, packagedSkillRegistry, name, observing)
        if (result.ok !== true) return { error: '观察状态已记录，但运行时注入失败：' + result.error + '（下次热重载后生效）', observing: observing }
        return { ok: true, name: name, observing: observing, injected: 'runtime' }
      }
      // 3) 文件技能：直接改 SKILL.md（追加/移除约定块）
      try {
        const text = await readFile(definition.path, 'utf8')
        const nextText = observing ? injectObserveBlock(text) : removeObserveBlock(text)
        if (nextText !== text) await writeFile(definition.path, nextText, 'utf8')
        return { ok: true, name: name, observing: observing, injected: 'file', path: definition.path }
      } catch (error) {
        return { error: '观察状态已记录，但文件写入失败：' + (error instanceof Error ? error.message : String(error)), observing: observing }
      }
    },

    'skillObserveList': async function () {
      const settings = await readRepoSettings()
      const observations = await readSkillObservations(settings.governanceRoot)
      const skills = {}
      for (const key of Object.keys(observations.skills)) {
        const entry = observations.skills[key]
        skills[key] = {
          observing: entry.observing === true,
          pendingSuggestions: countPendingSuggestions(entry),
          entryCount: Array.isArray(entry.entries) ? entry.entries.length : 0,
        }
      }
      return { skills: skills }
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
      const definition = writable.definition
      const input = args !== null && typeof args === 'object' ? args : {}
      const wantModel = input.modelOn === true
      const wantUser = input.userOn === true
      const raw = await readFile(definition.path, 'utf8')
      const next = mutateInvocationFrontmatter(raw, wantModel, wantUser)
      if (next !== raw) {
        await atomicWrite(definition.path, next)
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
      return serialized(async function () {
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
      })
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

    // ---- 本地仓库面板（0.9.0：多根目录）----

    'repoSettingsGet': async function () {
      const settings = await readRepoSettings()
      return { ok: true, settings: settings }
    },

    'repoSettingsSet': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const current = await readRepoSettings()
      const services = input.services !== null && typeof input.services === 'object' ? input.services : current.services
      const aiExplain = input.aiExplain !== null && typeof input.aiExplain === 'object' ? input.aiExplain : current.aiExplain
      const settings = await writeRepoSettings({ roots: input.roots, governanceRoot: input.governanceRoot, rootTypes: input.rootTypes, services: services, aiExplain: aiExplain })
      return { ok: true, settings: settings }
    },


    // 0.35.1：支持 { force: true } 跳过 SWR 缓存强制重扫（reload 按钮 / repoInvalidate 变更路径），
    // 恢复「用户主动刷新 / 服务注册变更后必须拿到最新数据」的原语义。
    'repoScan': async function (args) {
      const force = args !== null && typeof args === 'object' && args.force === true
      const now = Date.now()
      if (!force && repoScanCache !== null) {
        if (now - repoScanCache.ts < REPO_SCAN_TTL_MS) return repoScanCache.data
        void refreshRepoScanInBackground()
        return repoScanCache.data
      }
      // 0.35.3：缓存尚未就绪但启动预热/后台刷新进行中——等待同一次构建，不另起全量扫描。
      if (!force && repoScanRefreshing) {
        await refreshRepoScanInBackground()
        if (repoScanCache !== null) return repoScanCache.data
      }
      const data = await buildRepoScan()
      repoScanCache = { ts: Date.now(), data: data }
      return data
    },

    'repoGitStates': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const paths = Array.isArray(input.paths) ? input.paths.filter(function (p) { return typeof p === 'string' && p.length > 0 }) : []
      const results = await Promise.all(paths.map(async function (p) { const st = await gitState(p); return [p, st] }))
      const states = {}
      for (const entry of results) states[entry[0]] = entry[1]
      return { ok: true, states: states }
    },

    'repoFetch': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少项目路径' }
      return fetchRepo(path)
    },

    'repoDetail': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少项目路径' }
      let st = null
      try { st = await stat(path) } catch (error) { return { error: '项目目录不存在：' + path } }
      if (st === null || !st.isDirectory()) return { error: '项目路径不是目录：' + path }
      // 0.16.1：三层缓存（内存 SWR → 磁盘指纹 → 全量重建）
      const now = Date.now()
      const mem = repoDetailCache.get(path)
      if (mem !== undefined && mem !== null && now - mem.ts < REPO_DETAIL_SWR_MS) {
        return mem.data
      }
      const settings = await readRepoSettings()
      const fp = await computeRepoFingerprint(path)
      if (mem !== undefined && mem !== null) {
        if (repoFingerprintCoreEqual(fp, mem.fp)) {
          // 重数据没变：只刷新 dirty 标记，不重算
          patchRepoDetailDirty(mem.data, fp.dirty)
          mem.ts = now
          return mem.data
        }
        // 内容已变：先回旧值，后台单飞重算（stale-while-revalidate）
        void refreshRepoDetailInBackground(path, settings)
        return mem.data
      }
      // 磁盘缓存：指纹一致则直接复用（进程重启后也秒开）
      const disk = await readRepoDetailDiskCache(settings.governanceRoot)
      const entry = disk.entries[path]
      if (entry !== undefined && entry !== null && entry.fp !== null && entry.fp !== undefined && fp.isRepo === true && repoFingerprintCoreEqual(fp, entry.fp)) {
        const data = patchRepoDetailDirty(entry.data, fp.dirty)
        repoDetailCacheSet(path, { ts: now, data: data, fp: entry.fp })
        return data
      }
      // 全量构建
      const data = await buildRepoDetail(path)
      const coreFp = repoFingerprintCore(await computeRepoFingerprint(path))
      repoDetailCacheSet(path, { ts: Date.now(), data: data, fp: coreFp })
      disk.entries[path] = { fp: coreFp, ts: Date.now(), data: data }
      await writeRepoDetailDiskCache(settings.governanceRoot, disk)
      return data
    },

    'skillDetail': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少技能路径' }
      let st = null
      try { st = await stat(path) } catch (error) { return { error: '技能目录不存在：' + path } }
      if (st === null || !st.isDirectory()) return { error: '技能路径不是目录：' + path }
      return buildSkillDetail(path)
    },

    'aiExplainWarmup': async function () {
      if (aiWarmupRunning === true) return { ok: true, started: false, reason: 'already-running' }
      aiWarmupRunning = true
      void (async function () {
        let idleRounds = 0
        try {
          // 0.15.1：队列低于上限时持续补货（而非等整批清空），
          // 让灰色未处理条目尽快全部入队；连续 3 轮无新货且队列清空才收工。
          while (idleRounds < 3) {
            if (aiQueue.length < 25) {
              const queued = await collectWarmupHashes(AI_WARMUP_CAP - aiQueue.length)
              if (queued === 0 && aiQueue.length === 0 && aiPumping === false) idleRounds += 1
              else if (queued > 0) idleRounds = 0
            } else if (aiQueue.length === 0 && aiPumping === false) {
              idleRounds += 1
            }
            await new Promise(function (resolve) { setTimeout(resolve, 8000) })
          }
        } finally {
          aiWarmupRunning = false
        }
      })().catch(function (e) { console.error('[dsh-manager] aiExplainWarmup error:', e instanceof Error ? e.message : String(e)) })
      return { ok: true, started: true }
    },

    'aiExplainRequest': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      let hash = typeof input.hash === 'string' ? input.hash.trim() : ''
      const path = typeof input.path === 'string' ? input.path.trim() : ''
      const retry = input.retry === true
      if (hash.length === 0 || path.length === 0) return { error: '缺少 commit hash 或项目路径' }
      if (llm === undefined) return { error: 'AI 服务不可用（宿主未挂载 llm 服务）' }
      hash = await resolveFullHash(path, hash)
      const settings = await readRepoSettings()
      if (settings.aiExplain.enabled !== true) return { error: 'AI 讲解已在设置中关闭' }
      const cache = await readAiCache(settings.governanceRoot)
      if (retry === true) {
        // 删除成功/失败缓存并落盘，保证重试真的重新请求（0.15.1）
        delete cache.explanations[hash]
        try { await writeAiCache(settings.governanceRoot, cache) } catch (writeError) {}
        // F3-6：作废仍在途的旧任务——代次 +1 后，旧任务在写缓存前发现代次变化即放弃。
        aiGeneration.set(hash, (aiGeneration.get(hash) || 0) + 1)
        aiRunning.delete(hash)
        aiFailedAt.delete(hash)
        aiForce.add(hash)
        for (let i = aiQueue.length - 1; i >= 0; i--) if (aiQueue[i].hash === hash) aiQueue.splice(i, 1)
        enqueueAiItemFront({ hash: hash, path: path })
        pumpAiQueue()
        return { ok: true, state: 'queued', text: '', error: '' }
      }
      const cached = cache.explanations[hash]
      if (aiForce.has(hash) !== true && cached !== undefined) {
        if (cached.ok === true) {
          return { ok: true, state: 'done', data: { summary: cached.summary, points: cached.points, impact: cached.impact, subject: cached.subject, stat: cached.stat } }
        }
        return { ok: true, state: 'error', text: '', error: typeof cached.error === 'string' ? cached.error : 'AI 讲解生成失败', data: { subject: cached.subject, stat: cached.stat } }
      }
      const running = aiRunning.get(hash)
      if (running !== undefined) return { ok: true, state: running.state, text: running.text || '', error: running.error || '' }
      if (aiForce.has(hash) === true || aiQueue.some(function (i) { return i.hash === hash })) return { ok: true, state: 'queued', text: '', error: '' }
      enqueueAiItemFront({ hash: hash, path: path })
      pumpAiQueue()
      return { ok: true, state: 'queued', text: '', error: '' }
    },

    'aiExplainDebug': async function () {
      const settings = await readRepoSettings()
      const cache = await readAiCache(settings.governanceRoot)
      const failedEntries = Object.keys(cache.explanations).filter(function (k) { return cache.explanations[k] !== null && typeof cache.explanations[k] === 'object' && cache.explanations[k].ok !== true })
      return {
        ok: true,
        queue: aiQueue.length,
        running: aiRunning.size,
        warmupRunning: aiWarmupRunning,
        cacheEntries: Object.keys(cache.explanations).length,
        cacheFailed: failedEntries.length,
        queueHashes: aiQueue.slice(0, 10).map(function (i) { return i.hash }),
        runningHashes: Array.from(aiRunning.keys()).slice(0, 10),
      }
    },

    // 0.28.0：清空 AI 讲解持久化缓存（_governance/ai-explanations.json）。
    // 已入队/生成中的条目不受影响；清空后下次预热/点击会重新生成。
    'aiExplainClearCache': async function () {
      const settings = await readRepoSettings()
      if (typeof settings.governanceRoot !== 'string' || settings.governanceRoot.length === 0) return { error: '尚未设置治理根目录' }
      const cache = await readAiCache(settings.governanceRoot)
      const cleared = Object.keys(cache.explanations).length
      await writeAiCache(settings.governanceRoot, { explanations: {}, updatedAt: '' })
      return { ok: true, cleared: cleared }
    },

    'aiProvidersList': async function () {
      if (llm === undefined || typeof llm.listProviders !== 'function') return { ok: true, providers: [], error: 'AI 服务不可用' }
      try {
        const list = llm.listProviders()
        const providers = []
        for (const p of Array.isArray(list) ? list : []) {
          const id = typeof p.id === 'string' ? p.id : ''
          const name = typeof p.name === 'string' && p.name.length > 0 ? p.name : id
          if (id.length === 0) continue
          // 0.16.0：只展示已经配置好 key 且能解析到非空值的供应商
          if (!(await providerHasKey(id))) continue
          let models = []
          try {
            const ms = await llm.listModels(id)
            for (const m of (Array.isArray(ms) ? ms : [])) {
              const mid = typeof m.id === 'string' ? m.id : ''
              const mname = typeof m.name === 'string' && m.name.length > 0 ? m.name : mid
              if (mid.length === 0) continue
              let efforts = []
              try {
                if (typeof llm.resolveModelInfo === 'function') {
                  const info = await llm.resolveModelInfo(id, mid)
                  if (info !== null && typeof info === 'object' && info.reasoning !== null && typeof info.reasoning === 'object' && Array.isArray(info.reasoning.efforts)) {
                    efforts = info.reasoning.efforts.map(function (e) { return { id: e.id, name: e.name } })
                  }
                }
              } catch (error) { efforts = [] }
              if (efforts.length === 0) efforts = [{ id: 'off', name: 'Off' }]
              models.push({ id: mid, name: mname, efforts: efforts })
            }
          } catch (error) { models = [] }
          providers.push({ id: id, name: name, models: models })
        }
        return { ok: true, providers: providers }
      } catch (error) {
        return { ok: true, providers: [], error: error instanceof Error ? error.message : String(error) }
      }
    },

    'aiExplainStatus': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const hashes = Array.isArray(input.hashes) ? input.hashes.filter(function (h) { return typeof h === 'string' && h.length > 0 }) : (typeof input.hash === 'string' && input.hash.length > 0 ? [input.hash] : [])
      if (hashes.length === 0) return { ok: true, states: {} }
      const settings = await readRepoSettings()
      const cache = await readAiCache(settings.governanceRoot)
      const resolveKey = function (hash) {
        if (cache.explanations[hash] !== undefined || aiRunning.has(hash) || aiQueue.some(function (i) { return i.hash === hash })) return hash
        const prefix = hash.toLowerCase()
        if (prefix.length < 40) {
          for (const key of Object.keys(cache.explanations)) if (key.indexOf(prefix) === 0) return key
          for (const key of aiRunning.keys()) if (key.indexOf(prefix) === 0) return key
          for (const item of aiQueue) if (String(item.hash || '').indexOf(prefix) === 0) return item.hash
        }
        return hash
      }
      const states = {}
      for (const hash of hashes) {
        const key = resolveKey(hash)
        if (aiForce.has(key) !== true) {
          const cached = cache.explanations[key]
          if (cached !== undefined) {
            if (cached.ok === true) {
              states[hash] = { state: 'done', data: { summary: cached.summary, points: cached.points, impact: cached.impact, subject: cached.subject, stat: cached.stat } }
            } else {
              states[hash] = { state: 'error', text: '', error: typeof cached.error === 'string' ? cached.error : 'AI 讲解生成失败' }
            }
            continue
          }
        }
        const running = aiRunning.get(key)
        if (running !== undefined) { states[hash] = { state: running.state, text: running.text || '', error: running.error || '' }; continue }
        if (aiForce.has(key) === true || aiQueue.some(function (i) { return i.hash === key })) { states[hash] = { state: 'queued', text: '', error: '' }; continue }
        states[hash] = { state: 'none', text: '', error: '' }
      }
      return { ok: true, states: states }
    },

    'repoSetVisibility': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      const cloudRepo = typeof input.cloudRepo === 'string' && input.cloudRepo.length > 0 ? input.cloudRepo : ''
      const visibility = input.visibility === 'private' ? 'private' : 'public'
      if (cloudRepo.length === 0) return { error: '缺少 cloudRepo，无法修改可见性' }
      try {
        await runGh(['repo', 'edit', cloudRepo, '--visibility', visibility, '--accept-visibility-change-consequences'])
      } catch (error) {
        return { error: '修改 GitHub 可见性失败：' + (error instanceof Error ? error.message : String(error)) }
      }
      const settings = await readRepoSettings()
      const reposJson = await readReposJson(settings.governanceRoot)
      if (reposJson !== null && Array.isArray(reposJson.repos)) {
        let changed = false
        for (const r of reposJson.repos) {
          if (r !== null && typeof r === 'object' && (r.path === path || r.cloudRepo === cloudRepo)) {
            r.private = visibility === 'private'
            changed = true
          }
        }
        if (changed) {
          reposJson.updatedAt = new Date().toISOString()
          await atomicWrite(reposJsonPath(settings.governanceRoot), JSON.stringify(reposJson, null, 2) + '\n')
        }
      }
      await updateReposMdVisibility(settings.governanceRoot, path, cloudRepo, visibility === 'private')
      return { ok: true, private: visibility === 'private', cloudRepo: cloudRepo, reposMdUpdated: true }
    },

    'repoDeleteSkill': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少技能路径' }
      const settings = await readRepoSettings()
      if (typeof settings.governanceRoot !== 'string' || settings.governanceRoot.length === 0) return { error: '尚未设置治理根目录' }
      const skillRoot = join(settings.governanceRoot, 'skill仓库')
      const relPath = relative(skillRoot, path)
      if (relPath.length === 0 || relPath.startsWith('..') || relPath.startsWith('.') || path === skillRoot) {
        return { error: '非法的技能路径（必须在 skill仓库 内）' }
      }
      await rm(path, { recursive: true, force: true })
      let current = dirname(path)
      while (current !== skillRoot && current.startsWith(skillRoot)) {
        try { await rmdir(current) } catch (error) { break }
        current = dirname(current)
      }
      const skillsPath = join(skillRoot, 'SKILLS.md')
      const text = await readFile(skillsPath, 'utf8')
      const relBack = relPath.split('/').join('\\')
      const relFwd = relPath.replace(/\\/g, '/')
      const eol = text.indexOf('\r\n') !== -1 ? '\r\n' : '\n'
      const lines = text.split(/\r?\n/)
      // F3-9：不再依赖固定第 4 列——只要某行任一单元格精确等于该技能相对路径
      // （兼容 / 与 \ 两种分隔符）即视为该技能行删除；表头/分隔线/空行/非表格行保留。
      const nextLines = lines.filter(function (line) {
        const t = line.trim()
        if (t.length === 0 || !line.includes('|')) return true
        if (t.startsWith('| 技能名') || t.startsWith('|---') || t.startsWith('| ---')) return true
        const cols = line.split('|').map(function (c) { return c.trim() })
        return !cols.some(function (c) { return c === relBack || c === relPath || c === relFwd })
      })
      await atomicWrite(skillsPath, nextLines.join(eol) + (nextLines.length > 0 ? eol : ''))
      return { ok: true }
    },

    'repoListDirs': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少目录路径' }
      let entries = []
      try { entries = await readdir(path, { withFileTypes: true }) } catch (error) { return { ok: true, dirs: [] } }
      const dirs = []
      for (const e of entries) {
        if (!e.isDirectory() || e.name === 'node_modules' || e.name === '.git') continue
        if (REPO_EXCLUDE_DIRS.has(e.name)) continue
        const dir = join(path, e.name)
        const det = await detectProjectDir(dir)
        if (!det.isProject) dirs.push(e.name)
      }
      return { ok: true, dirs: dirs }
    },

    'repoCreateDir': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少目录路径' }
      if (/[\\/:*?"<>|]/.test(path.split(/[\\/]/).pop() || '')) return { error: '目录名包含非法字符' }
      try {
        await mkdir(path, { recursive: false })
        return { ok: true }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    },

    'repoGetProxy': async function () {
      async function getProxy(key) {
        try {
          const { stdout } = await execFileAsync('git', ['config', '--global', '--get', key], { timeout: 5000 })
          return String(stdout || '').trim()
        } catch (error) {
          return ''
        }
      }
      const httpProxy = await getProxy('http.proxy')
      const httpsProxy = await getProxy('https.proxy')
      return { ok: true, httpProxy: httpProxy, httpsProxy: httpsProxy }
    },

    'repoScanPluginPackages': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const path = typeof input.path === 'string' && input.path.length > 0 ? input.path : ''
      if (path.length === 0) return { error: '缺少项目路径' }
      return { ok: true, packages: await scanPluginPackages(path) }
    },

    'repoCopySkillToGlobal': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const src = typeof input.src === 'string' && input.src.length > 0 ? input.src : ''
      const name = typeof input.name === 'string' && input.name.length > 0 ? input.name : ''
      if (src.length === 0 || name.length === 0) return { error: '缺少技能路径或名称' }
      const safeName = safeSkillName(name)
      if (safeName === null) return { error: '技能名称不合法（禁止路径分隔符、控制字符或以点开头）' }
      return copySkillDir(src, join(dshHome(), 'skills', safeName))
    },

    'repoCopySkillToProject': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const src = typeof input.src === 'string' && input.src.length > 0 ? input.src : ''
      const name = typeof input.name === 'string' && input.name.length > 0 ? input.name : ''
      const cwd = typeof input.cwd === 'string' && input.cwd.length > 0 ? input.cwd : ''
      if (src.length === 0 || name.length === 0 || cwd.length === 0) return { error: '缺少技能路径、名称或目标项目' }
      const safeName = safeSkillName(name)
      if (safeName === null) return { error: '技能名称不合法（禁止路径分隔符、控制字符或以点开头）' }
      return copySkillDir(src, join(cwd, '.dsh', 'skills', safeName))
    },

    // ---- 本地服务面板（0.12.0：配置在 _governance/services.json，面板直接 spawn）----

    'serviceSettingsGet': async function () {
      const settings = await readRepoSettings()
      return { ok: true, settings: { enabled: settings.services.enabled, confirmStart: settings.services.confirmStart, aiExplain: settings.aiExplain } }
    },

    'serviceSettingsSet': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const current = await readRepoSettings()
      const services = { enabled: current.services.enabled, confirmStart: current.services.confirmStart }
      if (typeof input.enabled === 'boolean') services.enabled = input.enabled
      if (typeof input.confirmStart === 'boolean') services.confirmStart = input.confirmStart
      const aiExplain = input.aiExplain !== null && typeof input.aiExplain === 'object' ? input.aiExplain : current.aiExplain
      const settings = await writeRepoSettings({ roots: current.roots, governanceRoot: current.governanceRoot, rootTypes: current.rootTypes, services: services, aiExplain: aiExplain })
      return { ok: true, settings: { enabled: settings.services.enabled, confirmStart: settings.services.confirmStart, aiExplain: settings.aiExplain } }
    },

    'serviceScan': async function () {
      const settings = await readRepoSettings()
      const config = await readServicesConfig(settings.governanceRoot)
      const state = await readServicesState()
      const now = Date.now()
      const projects = []
      // 并行探活 + 2s 状态缓存（0.17.0）：避免 5s 轮询与 1s TCP 探活串行叠加。
      const pending = []
      for (const key of Object.keys(config.services)) {
        const entries = config.services[key]
        if (!Array.isArray(entries)) continue
        // 0.17.5：条目为空（用户删光服务项）的项目也要保留在面板里，
        // 注册状态以 services.json 的键存在为准，不因条目为空而消失。
        const name = key.split('/').filter(function (s) { return s.length > 0 }).pop() || key
        const rows = entries.map(function (entry) {
          const stateKey = serviceStateKey(key, entry.name)
          const cached = svcStatusCache.get(stateKey)
          if (cached !== undefined && now - cached.ts < SERVICES_STATUS_CACHE_MS) return Promise.resolve(cached.status)
          return computeServiceStatus(key, entry, state.services[stateKey] || null).then(function (status) {
            svcStatusCache.set(stateKey, { ts: Date.now(), status: status })
            return status
          })
        })
        pending.push(Promise.all(rows).then(function (rows) { projects.push({ path: key, name: name, services: rows }) }))
      }
      await Promise.all(pending)
      projects.sort(function (a, b) { return a.path.localeCompare(b.path) })
      return { ok: true, settings: settings, servicesConfig: config, projects: projects }
    },

    'serviceRegister': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      if (rawPath.length === 0) return { error: '缺少项目路径' }
      let statResult = null
      try { statResult = await stat(rawPath) } catch (error) { return { error: '项目目录不存在：' + rawPath } }
      if (!statResult.isDirectory()) return { error: '项目路径不是目录：' + rawPath }
      const pathKey = normalizeServicePath(rawPath)
      const settings = await readRepoSettings()
      if (typeof settings.governanceRoot !== 'string' || settings.governanceRoot.length === 0) return { error: '尚未设置治理根目录，无法写 services.json' }
      const config = await readServicesConfig(settings.governanceRoot)
      if (config.error !== undefined) return { error: config.error }
      if (Array.isArray(config.services[pathKey])) return { ok: true, registered: true, path: pathKey, services: config.services[pathKey] }
      // 注册只建空条目（Q12）；默认名在项目内去重。
      const existing = new Set()
      for (const otherKey of Object.keys(config.services)) {
        for (const e of config.services[otherKey] || []) if (e !== null && typeof e === 'object' && typeof e.name === 'string') existing.add(otherKey + '|' + e.name)
      }
      let base = '新服务'
      let name = base
      let n = 2
      while (existing.has(pathKey + '|' + name)) { name = base + n; n += 1 }
      const entry = { name: name, cwd: rawPath, command: '', args: [], env: {}, port: null, autoStart: false, autoRestart: false, detached: false, healthUrl: null, envFile: '', startTimeoutMs: SERVICE_DEFAULT_START_TIMEOUT_MS, note: '' }
      config.services[pathKey] = [entry]
      await writeServicesConfig(settings.governanceRoot, config.services)
      return { ok: true, registered: true, path: pathKey, services: [entry] }
    },

    'serviceConfigSet': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      if (rawPath.length === 0) return { error: '缺少项目路径' }
      if (!Array.isArray(input.services)) return { error: 'services 必须是数组' }
      let statResult = null
      try { statResult = await stat(rawPath) } catch (error) { return { error: '项目目录不存在：' + rawPath } }
      if (!statResult.isDirectory()) return { error: '项目路径不是目录：' + rawPath }
      const pathKey = normalizeServicePath(rawPath)
      const entries = []
      const seen = new Set()
      const seenPorts = new Map()
      for (const item of input.services) {
        const v = validateServiceEntry(item)
        if (v.error !== undefined) return { error: v.error }
        if (seen.has(v.entry.name)) return { error: '服务名 "' + v.entry.name + '" 在项目内重复' }
        seen.add(v.entry.name)
        if (v.entry.port !== null) {
          if (seenPorts.has(v.entry.port)) return { error: '端口 ' + v.entry.port + ' 在项目内被多个服务使用（' + seenPorts.get(v.entry.port) + ' 与 ' + v.entry.name + '）' }
          seenPorts.set(v.entry.port, v.entry.name)
        }
        let cwdOk = false
        try { await access(v.entry.cwd); cwdOk = true } catch (error) {}
        if (!cwdOk) return { error: '工作目录不存在：' + v.entry.cwd }
        // 0.28.0 P2-3：保存时就校验独立运行命令可解析（shell 操作符 / 命令存在性 / .cmd 重写），
        // 提前到编辑保存阶段报错，而不是启动时才失败。占位条目（command 空）与含 %VAR% 的
        // 命令（无法离线校验，% 展开后才知道）跳过。
        if (v.entry.detached === true && v.entry.command.length > 0 && v.entry.command.indexOf('%') === -1) {
          const dr = await resolveDetachedCommand(v.entry)
          if (dr.error !== undefined) return { error: '服务 "' + v.entry.name + '" 无法独立运行：' + dr.error }
        }
        entries.push(v.entry)
      }
      const settings = await readRepoSettings()
      if (typeof settings.governanceRoot !== 'string' || settings.governanceRoot.length === 0) return { error: '尚未设置治理根目录，无法写 services.json' }
      const config = await readServicesConfig(settings.governanceRoot)
      if (config.error !== undefined) return { error: config.error }
      // 0.20.0 P2：跨项目端口冲突校验 + 命令存在性提醒（不阻断保存，只返回 warnings）。
      for (const otherKey of Object.keys(config.services)) {
        if (otherKey === pathKey) continue
        const otherList = config.services[otherKey]
        if (!Array.isArray(otherList)) continue
        for (const oe of otherList) {
          if (oe === null || typeof oe !== 'object' || oe.port === null || oe.port === undefined) continue
          const op = Number(oe.port)
          if (!Number.isInteger(op) || op <= 0) continue
          for (const ne of entries) {
            if (ne.port !== null && Number(ne.port) === op) return { error: '端口 ' + ne.port + ' 已被项目 ' + otherKey + ' 的服务 "' + oe.name + '" 使用，请修改端口' }
          }
        }
      }
      const warnings = []
      for (const ne of entries) {
        const tok = commandFirstToken(ne.command)
        if (tok.length > 0 && !(await isCommandInPath(tok))) warnings.push('服务 "' + ne.name + '" 的启动命令 "' + tok + '" 未在 PATH 中找到，可能无法启动')
      }
      config.services[pathKey] = entries
      await writeServicesConfig(settings.governanceRoot, config.services)
      // 编辑/保存后，停止不再存在于配置里的服务（避免孤儿进程）。
      const keepNames = new Set(entries.map(function (e) { return e.name }))
      const state = await readServicesState()
      const prefix = pathKey + '|'
      let stateDirty = false
      for (const key of Object.keys(state.services)) {
        if (!key.startsWith(prefix)) continue
        const name = key.slice(prefix.length)
        if (keepNames.has(name)) continue
        const info = state.services[key]
        if (info !== null && typeof info === 'object' && Number.isInteger(Number(info.pid))) await stopServicePidGraceful(Number(info.pid), 5000)
        delete state.services[key]
        stateDirty = true
      }
      if (stateDirty) await writeServicesState(state.services)
      invalidateServiceStatusCache()
      return { ok: true, path: pathKey, services: entries, warnings: warnings }
    },

    'serviceUnregister': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      if (rawPath.length === 0) return { error: '缺少项目路径' }
      const pathKey = normalizeServicePath(rawPath)
      const settings = await readRepoSettings()
      if (typeof settings.governanceRoot !== 'string' || settings.governanceRoot.length === 0) return { error: '尚未设置治理根目录，无法写 services.json' }
      const config = await readServicesConfig(settings.governanceRoot)
      if (config.error !== undefined) return { error: config.error }
      if (!Array.isArray(config.services[pathKey])) return { ok: true, removed: false }
      // 二次确认在客户端；这里先自动停该项目全部服务，再移除注册。
      const state = await readServicesState()
      await stopAllServicesForPath(pathKey, state)
      await writeServicesState(state.services)
      delete config.services[pathKey]
      await writeServicesConfig(settings.governanceRoot, config.services)
      invalidateServiceStatusCache()
      return { ok: true, removed: true }
    },

    'serviceStart': async function (args) {
      const target = await resolveServiceTarget(args, { requireEnabled: true, enabledMessage: '服务管理总开关已关闭，无法启动服务' })
      if (target.error !== undefined) return { error: target.error }
      return doStartService(target.settings, target.pathKey, target.name)
    },

    'serviceStop': async function (args) {
      const target = await resolveServiceTarget(args, {})
      if (target.error !== undefined) return { error: target.error }
      const pathKey = target.pathKey
      const entry = target.entry
      const name = target.name
      const key = serviceStateKey(pathKey, name)
      const state = await readServicesState()
      const info = state.services[key] || null
      if (info !== null && info !== undefined && isPidAlive(Number(info.pid))) {
        const result = await stopServicePidGraceful(Number(info.pid), 5000)
        if (result.stopped !== true) {
          // 0.17.0：停止失败保留状态条目，UI 显示错误，不再假装已停止。
          const status = entry === undefined ? { name: name, running: true, portUp: false, pid: Number(info.pid), startedAt: info.startedAt } : await computeServiceStatus(pathKey, entry, info)
          return { error: '停止失败：' + (result.error || '未知错误'), stopped: false, status: status }
        }
      }
      delete state.services[key]
      await writeServicesState(state.services)
      invalidateServiceStatusCache(key)
      return { ok: true, stopped: true, error: null, status: entry === undefined ? { name: name, running: false, portUp: false, pid: null, startedAt: null } : await computeServiceStatus(pathKey, entry, null) }
    },

    'serviceExternalKill': async function (args) {
      const target = await resolveServiceTarget(args, { requireEntry: true })
      if (target.error !== undefined) return { error: target.error }
      const entry = target.entry
      if (!Number.isInteger(entry.port) || entry.port < 1) return { error: '该服务未配置探活端口，无法定位外部占用进程' }
      // 0.23.0：杀前重查——不信任客户端快照中的 externalPid，重新反查当前占用端口的进程。
      const pid = await findPidByPort(entry.port)
      if (pid === null) {
        invalidateServiceStatusCache()
        return { ok: true, alreadyFree: true }
      }
      const pinfo = await getProcessInfo(pid)
      if (pinfo === null || pinfo === undefined || typeof pinfo.commandLine !== 'string' || pinfo.commandLine.trim().length === 0) {
        return { error: '无法读取该进程的命令行，无法确认其不是本服务进程，已拒绝误杀', pid: pid }
      }
      if (relateExternalProcess(entry, pinfo.commandLine) === true) {
        return { error: '当前占用端口的进程就是本服务自身进程，请使用「停止服务」而非「杀死外部进程」', pid: pid, name: pinfo.name }
      }
      const result = await stopServicePidGraceful(pid, 5000)
      if (result.stopped !== true) {
        return { error: '杀死进程失败：' + (result.error || '未知错误'), pid: pid, name: pinfo.name }
      }
      invalidateServiceStatusCache()
      return { ok: true, killed: true, pid: pid, name: pinfo.name }
    },

    'serviceRestart': async function (args) {
      const target = await resolveServiceTarget(args, { requireEnabled: true, enabledMessage: '服务管理总开关已关闭，无法重启服务' })
      if (target.error !== undefined) return { error: target.error }
      const pathKey = target.pathKey
      const name = target.name
      const key = serviceStateKey(pathKey, name)
      const state = await readServicesState()
      const info = state.services[key] || null
      if (info !== null && info !== undefined && isPidAlive(Number(info.pid))) {
        const result = await stopServicePidGraceful(Number(info.pid), 5000)
        if (result.stopped !== true) return { error: '停止失败：' + (result.error || '未知错误') }
        // 等待进程树真正退出（最多 8s），避免端口未释放导致启动失败。
        const deadline = Date.now() + 8000
        while (isPidAlive(Number(info.pid)) && Date.now() < deadline) await new Promise(function (resolve) { setTimeout(resolve, 250) })
        delete state.services[key]
        await writeServicesState(state.services)
        invalidateServiceStatusCache(key)
      } else {
        delete state.services[key]
        await writeServicesState(state.services)
        invalidateServiceStatusCache(key)
      }
      return doStartService(target.settings, pathKey, name)
    },

    'serviceStartAll': async function (args) {
      const target = await resolveServiceTarget(args, { requireName: false, requireEnabled: true, enabledMessage: '服务管理总开关已关闭，无法启动服务' })
      if (target.error !== undefined) return { error: target.error }
      const pathKey = target.pathKey
      const entries = target.entries
      const results = []
      for (const entry of entries) {
        if (entry === null || typeof entry !== 'object') continue
        if (typeof entry.command !== 'string' || entry.command.trim().length === 0) {
          results.push({ name: entry.name, ok: false, error: '尚未配置启动命令' })
          continue
        }
        const r = await doStartService(target.settings, pathKey, entry.name)
        results.push({ name: entry.name, ok: r.ok === true, error: r.error })
      }
      return { ok: true, results: results }
    },

    'serviceStopAll': async function (args) {
      const target = await resolveServiceTarget(args, { requireName: false })
      if (target.error !== undefined) return { error: target.error }
      const pathKey = target.pathKey
      const entries = target.entries
      const state = await readServicesState()
      const results = []
      for (const entry of entries) {
        if (entry === null || typeof entry !== 'object') continue
        const key = serviceStateKey(pathKey, entry.name)
        const info = state.services[key] || null
        if (info !== null && info !== undefined && isPidAlive(Number(info.pid))) {
          const result = await stopServicePidGraceful(Number(info.pid), 5000)
          if (result.stopped !== true) {
            results.push({ name: entry.name, ok: false, error: '停止失败：' + (result.error || '未知错误') })
            continue
          }
        }
        delete state.services[key]
        invalidateServiceStatusCache(key)
        results.push({ name: entry.name, ok: true })
      }
      await writeServicesState(state.services)
      return { ok: true, results: results }
    },

    'serviceLogGet': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      if (rawPath.length === 0 || name.length === 0) return { error: '缺少项目路径或服务名' }
      const pathKey = normalizeServicePath(rawPath)
      // 0.25.0：独立运行服务日志直写文件（fd），读取侧懒归档+截断控制体积。
      // 0.28.0 P2-1：返回 detached 标志，客户端据此提示「此日志由服务进程直写，无面板时间戳」。
      let detached = false
      const settings = await readRepoSettings()
      const config = await readServicesConfig(settings.governanceRoot)
      if (config.error === undefined) {
        const list = config.services[pathKey]
        const entry = Array.isArray(list) ? list.find(function (e) { return e !== null && typeof e === 'object' && e.name === name }) : undefined
        if (entry !== undefined && entry.detached === true) {
          detached = true
          await maybeRotateDetachedLog(pathKey, name)
        }
      }
      const result = await readServiceLogTail(pathKey, name, input.maxBytes)
      if (result.error !== undefined) return { error: '读取日志失败：' + result.error }
      return { ok: true, exists: result.exists, text: result.text, total: result.total, detached: detached, path: serviceLogFilePath(pathKey, name) }
    },

    'serviceLogClear': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      if (rawPath.length === 0 || name.length === 0) return { error: '缺少项目路径或服务名' }
      await clearServiceLog(normalizeServicePath(rawPath), name)
      return { ok: true, cleared: true }
    },

    // ---- 0.20.0：本地服务 AI 增强（复用 aiExplain 设置，供应商/模型/思考等级同 AI 讲解）----

    'serviceAiDiagnose': async function (args) {
      const target = await resolveServiceTarget(args, { requireEntry: true })
      if (target.error !== undefined) return { error: target.error }
      const settings = target.settings
      if (settings.aiExplain.enabled !== true) return { error: 'AI 服务助手未启用（可在服务面板设置中开启）' }
      if (llm === undefined || typeof llm.stream !== 'function') return { error: 'AI 服务不可用' }
      const pathKey = target.pathKey
      const entry = target.entry
      const logTail = await readServiceLogTail(pathKey, entry.name, 8192)
      const logText = logTail.exists === true ? logTail.text : ''
      const ruleDiag = summarizeStartupFailure(logText, entry.port)
      const prompt = [
        '项目路径：' + entry.cwd,
        '启动命令（已脱敏）：' + maskCommandLine(entry.command + (Array.isArray(entry.args) && entry.args.length > 0 ? ' ' + entry.args.join(' ') : '')),
        '端口：' + (entry.port === null || entry.port === undefined ? '未配置' : String(entry.port)),
        '健康检查：' + (typeof entry.healthUrl === 'string' && entry.healthUrl.length > 0 ? entry.healthUrl : '未配置'),
        '环境变量（已脱敏）：' + JSON.stringify(maskSecretEnv(entry.env)),
        '日志尾部：\n' + (logText.slice(-8192) || '（无日志）'),
        ruleDiag.length > 0 ? '规则诊断参考：' + ruleDiag : '',
        '请输出 JSON：{"cause":"最可能的原因（中文，1-2 句）","fix":"具体修复建议（中文，说清楚该改哪一项配置）"}',
      ].join('\n\n')
      const run = await runLlmWithTimeout(llm, settings.aiExplain, '你是本地服务排错助手。基于给定的服务配置与日志，用中文输出简洁准确的启动失败诊断。只输出 JSON，不要输出任何其他文字。', prompt, AI_DIAG_TIMEOUT_MS, null)
      if (run.error !== undefined) return { error: 'AI 诊断失败：' + run.error }
      const parsed = parseAiJsonObject(run.text)
      const cause = typeof parsed.cause === 'string' ? parsed.cause.trim() : ''
      const fix = typeof parsed.fix === 'string' ? parsed.fix.trim() : ''
      const body = (cause.length > 0 ? '可能原因：' + cause : '') + (fix.length > 0 ? '\n修复建议：' + fix : '')
      if (body.trim().length === 0) return { error: 'AI 未返回有效诊断内容，请重试' }
      return { ok: true, text: body }
    },

    'serviceLogAi': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      const name = typeof input.name === 'string' ? input.name.trim() : ''
      if (rawPath.length === 0 || name.length === 0) return { error: '缺少项目路径或服务名' }
      const settings = await readRepoSettings()
      if (settings.aiExplain.enabled !== true) return { error: 'AI 服务助手未启用（可在服务面板设置中开启）' }
      if (llm === undefined || typeof llm.stream !== 'function') return { error: 'AI 服务不可用' }
      const pathKey = normalizeServicePath(rawPath)
      const maxBytes = Number.isInteger(input.maxBytes) && input.maxBytes > 0 ? Math.min(input.maxBytes, 64 * 1024) : 32 * 1024
      const logTail = await readServiceLogTail(pathKey, name, maxBytes)
      if (logTail.exists !== true || String(logTail.text || '').trim().length === 0) return { error: '日志为空，无法生成 AI 摘要' }
      const prompt = '请用中文总结以下服务日志：\n1. 这个服务在做什么；\n2. 有没有异常；\n3. 如果有异常，可能的原因是什么。\n\n日志内容：\n' + String(logTail.text).slice(-maxBytes)
      const run = await runLlmWithTimeout(llm, settings.aiExplain, '你是本地服务日志分析助手。输出简洁准确的中文摘要，分点回答。', prompt, AI_DIAG_TIMEOUT_MS, null)
      if (run.error !== undefined) return { error: 'AI 摘要失败：' + run.error }
      if (String(run.text || '').trim().length === 0) return { error: 'AI 未返回有效摘要，请重试' }
      return { ok: true, text: run.text.trim() }
    },

    'serviceAiDraft': async function (args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const rawPath = typeof input.path === 'string' && input.path.trim().length > 0 ? input.path.trim() : ''
      if (rawPath.length === 0) return { error: '缺少项目路径' }
      let statResult = null
      try { statResult = await stat(rawPath) } catch (error) { return { error: '项目目录不存在：' + rawPath } }
      if (!statResult.isDirectory()) return { error: '项目路径不是目录：' + rawPath }
      const settings = await readRepoSettings()
      if (settings.aiExplain.enabled !== true) return { error: 'AI 服务助手未启用（可在服务面板设置中开启）' }
      if (llm === undefined || typeof llm.stream !== 'function') return { error: 'AI 服务不可用' }
      const [pkg, readme] = await Promise.all([readPackageInfo(rawPath), readReadmeInfo(rawPath)])
      let envExample = ''
      // 0.34.2 F3-2：只读取 .env.example（模板文件），绝不把真实 .env 中的密钥送进 LLM。
      try { const t = await readFile(join(rawPath, '.env.example'), 'utf8'); if (typeof t === 'string' && t.trim().length > 0) envExample = t.slice(0, 3000) } catch (error) {}
      const parts = []
      if (pkg !== null) parts.push('package.json：' + JSON.stringify(pkg))
      if (readme !== null) parts.push('README（截取）：\n' + (readme.text || '').slice(0, 6000))
      if (envExample.length > 0) parts.push('.env.example（截取，注意不要把真实密钥写进 env 建议值）：\n' + envExample)
      parts.push('请输出 JSON：{"name":"服务名（英文短名）","command":"启动命令（如 node server.js）","args":["参数数组，可空"],"env":{"KEY":"VALUE"},"port":数字或 null,"healthUrl":null 或 "http://127.0.0.1:PORT/health"}')
      const prompt = '项目目录：' + rawPath + '\n\n' + (parts.length > 0 ? parts.join('\n\n') : '（没有找到 package.json / README / .env.example）') + '\n\n请基于项目内容给出本地服务配置草稿。只输出 JSON，不要输出任何其他文字。'
      const run = await runLlmWithTimeout(llm, settings.aiExplain, '你是本地服务配置助手。根据项目文件推断启动命令、参数、环境变量与端口，只输出 JSON。', prompt, AI_DIAG_TIMEOUT_MS, null)
      if (run.error !== undefined) return { error: 'AI 生成配置失败：' + run.error }
      const parsed = parseAiJsonObject(run.text)
      if (typeof parsed.command !== 'string' || parsed.command.trim().length === 0) return { error: 'AI 未返回有效配置草稿（缺少 command），请重试' }
      const draft = {
        name: typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim().slice(0, 64) : basename(rawPath).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64),
        command: parsed.command.trim(),
        args: Array.isArray(parsed.args) ? parsed.args.map(function (a) { return String(a) }).slice(0, 20) : [],
        env: parsed.env !== null && typeof parsed.env === 'object' && !Array.isArray(parsed.env) ? parsed.env : {},
        port: Number.isInteger(Number(parsed.port)) && Number(parsed.port) >= 1 && Number(parsed.port) <= 65535 ? Number(parsed.port) : null,
        healthUrl: typeof parsed.healthUrl === 'string' && parsed.healthUrl.length > 0 ? parsed.healthUrl : null,
      }
      return { ok: true, draft: draft }
    },
  }

  // 0.20.0：解析 AI 返回的 JSON 对象（宽容提取第一个 {...}）。
  function parseAiJsonObject(text) {
    try {
      const m = /(\{[\s\S]*\})/.exec(String(text || ''))
      if (m !== null) {
        const parsed = JSON.parse(m[1])
        if (parsed !== null && typeof parsed === 'object') return parsed
      }
    } catch (error) {}
    return {}
  }

  // 0.18.0：启动时清理超过 7 天的服务日志（fire-and-forget，不阻塞启动）。
  cleanupOldServiceLogs().catch(function () {})

  // 0.35.3：启动时后台预热 repoScan SWR 缓存（fire-and-forget，不阻塞启动）——
  // 浏览器启动后首次打开本地仓库面板直接命中缓存，避免 7-8s 全量扫描等待。
  // 代价仅一次异步扫描；用户整个会话不打开面板时该次扫描白费（可接受）。
  void refreshRepoScanInBackground()

  // 0.27.0：handler 统一包装——args 默认空对象 + 异常转 {error}（路由层不再产出 500 业务错误）。
  function wrapHandler(fn) {
    return async function (rawArgs) {
      const args = rawArgs !== null && typeof rawArgs === 'object' ? rawArgs : {}
      try {
        return await fn(args)
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }
  for (const key of Object.keys(handlers)) {
    if (typeof handlers[key] === 'function') handlers[key] = wrapHandler(handlers[key])
  }

  ctx.effect(() => {
    const dispose = webServer.register({
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
          const result = SERVICE_MUTATING_METHODS.has(method)
            ? await serializedSvc(function () { return fn(body.args) })
            : await fn(body.args)
          return sendJson(res, 200, result)
        } catch (error) {
          return sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    return () => { dispose() }
  }, 'dsh-manager: /api/dsh-manager route')

  // 本地服务进程生命周期（0.12.0，Q5）：默认服务随 dsh 停止。
  // 0.24.0 v2：标记 detached 的服务独立运行——
  //   1) 启动对账：非独立残留 pid 统一 taskkill /T /F 清掉（身份无法确认的未知进程不杀，仅删记录防 PID 复用误杀）；
  //      detached 且身份验证通过（命令行+端口匹配）→ 接管保留；验证失败 → 不杀不接管，仅删记录。
  //   2) dispose：统一杀非独立服务；detached 保留状态条目供下次接管。
  ctx.effect(() => {
    let disposed = false
    readRepoSettings().then(function (settings) {
      if (disposed) return
      return readServicesConfig(settings.governanceRoot).then(function (config) {
        if (disposed) return
        return readServicesState().then(function (state) {
          if (disposed) return
          return Promise.all(Object.keys(state.services).map(async function (key) {
            const info = state.services[key]
            if (info === null || typeof info !== 'object') { delete state.services[key]; return }
            const pid = Number(info.pid)
            if (!Number.isInteger(pid) || pid <= 0) { delete state.services[key]; return }
            if (!isPidAlive(pid)) { delete state.services[key]; return }
            const entry = findServiceEntryByKey(config, key)
            const isDetached = entry !== undefined ? entry.detached === true : info.detached === true
            if (isDetached) {
              // 独立服务：身份验证通过才接管；PID 复用/命令行不可读 → 不杀不接管，仅删记录。
              if (entry !== undefined && await verifyAdoptedService(entry, pid)) {
                state.services[key] = { pid: pid, startedAt: Number.isInteger(Number(info.startedAt)) ? Number(info.startedAt) : Date.now(), detached: true }
                if (typeof entry.cwd === 'string' && entry.cwd.length > 0) {
                  // 0.25.0：接管标记必须直写文件（appendDetachedLogLine），走 appendServiceLogText
                  // 会触发 rename-rotation 让被接管进程的 fd 分叉到 .1。
                  appendDetachedLogLine(entry.cwd, entry.name, '----- dsh 重启后接管运行中的进程 pid=' + pid + '（此后的日志不再由面板捕获）-----\n').catch(function () {})
                }
              } else {
                delete state.services[key]
              }
              return
            }
            // 非独立：旧行为清理残留。为避免 PID 复用误杀，仅当能确认是本服务进程时才杀；
            // 无法确认（命令行不可读/不匹配）时只删记录，不杀未知进程。
            if (entry === undefined) { delete state.services[key]; return }
            let related = null
            try {
              const pinfo = await getProcessInfo(pid)
              related = pinfo !== null && pinfo !== undefined ? relateExternalProcess(entry, pinfo.commandLine) : null
            } catch (error) { related = null }
            if (related !== true) { delete state.services[key]; return }
            await stopServicePid(pid)
            delete state.services[key]
          })).then(function () {
            if (disposed) return
            return writeServicesState(state.services).then(function () {
              if (disposed) return
              // 0.19.0 P1 autoStart：对账后按 services.json 自动拉起 autoStart 服务。
              // 已被接管的 detached 服务 doStartService 会返回 alreadyRunning，自动跳过。
              if (settings.services.enabled !== true) return
              if (config.error !== undefined) return
              const tasks = []
              for (const pathKey of Object.keys(config.services)) {
                const entries = config.services[pathKey]
                if (!Array.isArray(entries)) continue
                for (const entry of entries) {
                  if (entry !== null && typeof entry === 'object' && entry.autoStart === true && typeof entry.command === 'string' && entry.command.trim().length > 0) {
                    tasks.push(doStartService(settings, pathKey, entry.name).catch(function (e) { return { name: entry.name, ok: false, error: e instanceof Error ? e.message : String(e) } }))
                  }
                }
              }
              return Promise.all(tasks)
            })
          })
        })
      })
    }).catch(function () {})
    return function () {
      disposed = true
      readServicesState().then(function (state) {
        return killAllServices(state).then(function () {
          // 0.24.0：dispose 后只保留 detached 条目（killAllServices 已删掉被杀条目）。
          return writeServicesState(state.services)
        }).catch(function () {})
      }).catch(function () {})
      closeServiceLogStreams()
    }
  }, 'dsh-manager: services lifecycle')
}
