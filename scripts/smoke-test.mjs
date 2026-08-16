// dsh-manager 冒烟测试（0.7.0）：
// 真实 cordis Context + mock 注册表，通过注册出的 webServer 路由完整调用
// catalog/config/save/setInvocation/trash/trashList/trashRestore/trashDelete/notesGet/notesSave
// 与 patchScan/patchEnable/patchDisable/patchImport/patchCategory*/patchSettings*/patchDelete。
// 关键点：写路径走真实 node:fs（用户动作，不走沙箱 ctx.fs），
// 测试会真实创建/移走/还原/删除临时技能文件，并验证 notes 与回收站落盘。
// 0.5.0 新增：catalog/notesGet 的拼音字段（pinyin-pro）、纯英文无字段、缓存随保存刷新。
// 0.7.0 新增：目录驱动补丁引擎——对临时假部署树（DSH_DEPLOYMENT_ROOT）做
// 目录与种子/启用禁用/收养/多文件事务/干跑回滚/同文件链共存/前置互斥/
// override/script/类别与删除/丢失态/恢复手册与设置的全链路断言。
//
// 运行方式（模块解析需要 profiles 回退场）：
//   1) 把包复制到 $DSH_HOME/profiles/node_modules/@deepseek-ai/dsh-manager
//   2) 把本文件复制到 $DSH_HOME/profiles/node_modules/ 下
//   3) node .smoke-test.mjs
import { Context } from '@deepseek-ai/cordis'
import { apply, inject, name } from '@deepseek-ai/dsh-manager'
import { mkdtemp, writeFile, readFile, access, mkdir, unlink, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// —— 隔离所有真实写入：DSH_HOME 指向临时家目录，技能文件也放临时目录 ——
const home = await mkdtemp(join(tmpdir(), 'dsh-skm-smoke-'))
process.env.DSH_HOME = home
const skillsDir = join(home, 'skills', 'demo-skill')
await mkdir(skillsDir, { recursive: true })
const skillPath = join(skillsDir, 'SKILL.md')
await writeFile(skillPath, '---\ndescription: demo\n---\n\n# Demo\n', 'utf8')

const skills = {
  async snapshot() {
    return {
      complete: true,
      skills: [{
        name: 'demo-skill',
        description: '演示技能',
        whenToUse: null,
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'user-dsh',
        provider: 'skill-filesystem',
      }, {
        name: '拷问技能',
        description: '拷问',
        whenToUse: null,
        invocation: { modelInvocable: true, userInvocable: true },
        source: 'user-dsh',
        provider: 'skill-filesystem',
      }],
    }
  },
  async get(skillName) {
    if (skillName === '拷问技能') return { name: '拷问技能', description: '拷问', source: 'user-dsh', provider: 'skill-filesystem', path: skillPath }
    if (skillName !== 'demo-skill') return undefined
    return { name: 'demo-skill', description: '演示技能', source: 'user-dsh', provider: 'skill-filesystem', path: skillPath }
  },
}

const root = new Context()
root.provide('skills', skills)
root.provide('sessions', { get: () => undefined })
root.provide('agents', { get: () => undefined })
root.provide('agentPresets', { standingKeyFor: async () => undefined, serviceFor: async () => undefined })

let registered = null
root.provide('webServer', { register: (spec) => { registered = spec } })

const fiber = root.plugin({ apply, inject, name })
await fiber
if (registered === null || registered.path !== '/api/dsh-manager') throw new Error('route not registered')

function call(method, args, origin = 'http://localhost:3080') {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ method, args })
    let ended = false
    const headers = { host: 'localhost:3080' }
    if (origin !== null) headers.origin = origin
    const req = {
      headers,
      on: (ev, cb) => {
        if (ev === 'data') queueMicrotask(() => cb(body))
        else if (ev === 'end') queueMicrotask(() => { if (!ended) { ended = true; cb() } })
        else if (ev === 'error') {}
        return req
      },
    }
    let status = 0
    let payload = ''
    const res = {
      writeHead: (s) => { status = s },
      end: (p) => { payload = p; resolve({ status, body: JSON.parse(payload) }) },
    }
    Promise.resolve(registered.handler(req, res)).catch(reject)
  })
}

function assert(cond, label) { if (!cond) throw new Error('FAIL: ' + label); console.log('PASS:', label) }

// 1. catalog
{
  const { status, body } = await call('catalog', { sessionId: null, cwd: null })
  assert(status === 200 && body.complete === true && body.skills.length === 2, 'catalog')
  assert(body.skills[0].modelInvocable === true && body.skills[0].source === 'user-dsh', 'catalog 映射')
  const cjk = body.skills.find((s) => s.name === '拷问技能')
  const latin = body.skills.find((s) => s.name === 'demo-skill')
  assert(cjk !== undefined && cjk.namePinyin === 'kaowenjineng' && cjk.nameInitials === 'kwjn', 'catalog 中文原名拼音字段')
  assert(latin !== undefined && latin.namePinyin === undefined && latin.nameInitials === undefined, 'catalog 纯英文名无拼音字段')
}

// 2. config（node:fs 真实读取）
{
  const { status, body } = await call('config', { name: 'demo-skill' })
  assert(status === 200 && body.editable === true && body.content.includes('description: demo'), 'config 读取')
}

// 3. save —— 真实写盘（沙箱修复验证点）
{
  const next = '---\ndescription: edited\n---\n\n# Edited\n'
  const { status, body } = await call('save', { name: 'demo-skill', content: next })
  assert(status === 200 && body.ok === true, 'save → ok')
  const onDisk = await readFile(skillPath, 'utf8')
  assert(onDisk === next, 'save 真实写入磁盘')
}

// 4. setInvocation 关 Agent → 写盘；开回 → 删除行；双开 → 不写
{
  await writeFile(skillPath, '---\ndescription: demo\n---\n\n# Demo\n', 'utf8')
  let r = await call('setInvocation', { name: 'demo-skill', modelOn: false, userOn: true })
  assert(r.status === 200 && r.body.ok === true, 'setInvocation 关 Agent → ok')
  let text = await readFile(skillPath, 'utf8')
  assert(text.includes('disable-model-invocation: true') && !text.includes('user-invocable'), 'disable-model-invocation 落盘')

  r = await call('setInvocation', { name: 'demo-skill', modelOn: true, userOn: false })
  text = await readFile(skillPath, 'utf8')
  assert(!text.includes('disable-model-invocation') && text.includes('user-invocable: false'), '开关翻转落盘')

  // 双开 = 恢复默认（允许），会把已设置的 off 标志行移除
  r = await call('setInvocation', { name: 'demo-skill', modelOn: true, userOn: true })
  text = await readFile(skillPath, 'utf8')
  assert(r.body.ok === true && !text.includes('user-invocable') && !text.includes('disable-model-invocation'), '双开恢复默认落盘')

  // 无任何标志的文件上双开 → 不写盘
  await writeFile(skillPath, '---\ndescription: demo\n---\n\n# Demo\n', 'utf8')
  const before = await readFile(skillPath, 'utf8')
  r = await call('setInvocation', { name: 'demo-skill', modelOn: true, userOn: true })
  assert(r.body.ok === true && (await readFile(skillPath, 'utf8')) === before, '双开（无标志）不写盘')
}

// 5. trash —— 移入回收站（真实移走文件 + 清空目录 + 内容备份落盘）
{
  const r = await call('trash', { name: 'demo-skill' })
  assert(r.status === 200 && r.body.ok === true && typeof r.body.id === 'string', 'trash → ok（返回条目 id）')
  let gone = false
  try { await access(skillPath); } catch { gone = true }
  assert(gone, 'SKILL.md 已移走')
  let dirGone = false
  try { await access(skillsDir); } catch { dirGone = true }
  assert(dirGone, '空技能目录已清理')

  // 回收站条目落盘且内容完整备份
  const trashEntry = JSON.parse(await readFile(join(home, 'skills-trash', r.body.id + '.json'), 'utf8'))
  assert(trashEntry.content.includes('description: demo'), '回收站条目含完整内容备份')
  assert(trashEntry.path === skillPath, '回收站条目记录原路径')

  // trashList 可见
  const list = await call('trashList', {})
  assert(list.body.ok === true && list.body.items.length === 1 && list.body.items[0].id === r.body.id, 'trashList 列出条目')
  assert(typeof list.body.items[0].file === 'string' && list.body.items[0].file.includes('skills-trash'), 'trashList 返回备份文件路径')

  // 还原 → 文件回到原路径、内容一致、回收站清空
  const restored = await call('trashRestore', { id: r.body.id })
  assert(restored.body.ok === true, 'trashRestore → ok')
  assert((await readFile(skillPath, 'utf8')).includes('description: demo'), '还原后内容一致')
  const list2 = await call('trashList', {})
  assert(list2.body.items.length === 0, '还原后回收站为空')
}

// 5b. trash：目录里有别的文件 → 保留目录，只移走 SKILL.md
{
  await mkdir(skillsDir, { recursive: true })
  await writeFile(skillPath, 'x', 'utf8')
  await writeFile(join(skillsDir, 'keep.txt'), 'keep', 'utf8')
  const r = await call('trash', { name: 'demo-skill' })
  assert(r.body.ok === true, 'trash（目录含其它文件）→ ok')
  let dirKept = true
  try { await access(skillsDir); } catch { dirKept = false }
  assert(dirKept, '非空目录保留')

  // 还原 → 冲突（原目录中已有文件？无——SKILL.md 不在，写回即可）
  const restored = await call('trashRestore', { id: r.body.id })
  assert(restored.body.ok === true && (await readFile(skillPath, 'utf8')) === 'x', '非空目录中还原成功')

  // 再移入回收站，制造目标冲突，验证还原拒绝
  await call('trash', { name: 'demo-skill' })
  const conflict = await call('trashRestore', { id: r.body.id })
  // 上面 trash 后又生成了新 id；先取最新条目制造冲突
  const list = await call('trashList', {})
  const newest = list.body.items[0]
  await writeFile(newest.path, 'blocker', 'utf8')
  const conflict2 = await call('trashRestore', { id: newest.id })
  assert(typeof conflict2.body.error === 'string' && conflict2.body.error.includes('已存在'), '目标冲突时拒绝还原')

  // 彻底删除
  await unlink(newest.path)
  const perm = await call('trashDelete', { id: newest.id })
  assert(perm.body.ok === true, 'trashDelete → ok')
  const list3 = await call('trashList', {})
  assert(list3.body.items.length === 0, '彻底删除后回收站为空')
}

// 5c. 回收站 id 校验（防路径穿越）
{
  const bad = await call('trashDelete', { id: '../evil' })
  assert(typeof bad.body.error === 'string', '非法 id 拒绝彻底删除')
  const bad2 = await call('trashRestore', { id: 'a/b' })
  assert(typeof bad2.body.error === 'string', '非法 id 拒绝还原')
  const missing = await call('trashDelete', { id: 'notexist' })
  assert(typeof missing.body.error === 'string', '不存在的条目返回业务错误')
}

// 6. notes 往返（写入临时 DSH_HOME/skills-notes.json）
{
  let r = await call('notesGet')
  assert(r.status === 200 && r.body.ok === true && Object.keys(r.body.notes).length === 0, 'notesGet 初始为空')

  r = await call('notesSave', { name: 'demo-skill', title: '我的标题', content: '只有我看得见的内容\n第二行' })
  assert(r.body.ok === true && r.body.notes['demo-skill']?.title === '我的标题', 'notesSave 落库')

  r = await call('notesGet')
  assert(r.body.notes['demo-skill']?.content.includes('第二行'), 'notesGet 读回')

  r = await call('notesSave', { name: 'other-skill', title: '', content: 'x' })
  assert(r.body.notes['other-skill']?.content === 'x' && r.body.notes['demo-skill']?.title === '我的标题', '备注按技能合并')

  const persisted = JSON.parse(await readFile(join(home, 'skills-notes.json'), 'utf8'))
  assert(persisted.notes['demo-skill']?.title === '我的标题', 'notes 真实落盘文件')

  // 6b. 拼音字段（0.5.0）：全拼/首字母/多音字/纯英文降级/缓存刷新
  r = await call('notesSave', { name: 'demo-skill', title: '拷打我', content: 'x' })
  assert(r.body.notes['demo-skill']?.aliasPinyin === 'kaodawo' && r.body.notes['demo-skill']?.aliasInitials === 'kdw', '备注名拼音字段（拷打我 → kaodawo/kdw）')
  r = await call('notesSave', { name: 'demo-skill', title: '重庆', content: 'x' })
  assert(r.body.notes['demo-skill']?.aliasPinyin === 'chongqing', '多音字 重庆 → chongqing')
  r = await call('notesSave', { name: 'demo-skill', title: 'grill me', content: 'x' })
  assert(r.body.notes['demo-skill']?.aliasPinyin === undefined && r.body.notes['demo-skill']?.aliasInitials === undefined, '纯英文标题无拼音字段')
  r = await call('notesSave', { name: 'demo-skill', title: '我的标题', content: 'x' })
  assert(r.body.notes['demo-skill']?.aliasPinyin === 'wodebiaoti', '缓存随保存刷新')

  r = await call('notesSave', { name: '', title: 't', content: 'c' })
  assert(typeof r.body.error === 'string', 'notesSave 缺名报错')
}

// 7. 只读来源拒绝写/删
{
  const originalGet = skills.get
  skills.get = async (n) => (n === 'demo-skill' ? { name: 'demo-skill', source: 'bundled', provider: 'x', path: skillPath } : undefined)
  const r = await call('setInvocation', { name: 'demo-skill', modelOn: false, userOn: true })
  assert(typeof r.body.error === 'string', '只读来源拒绝开关')
  const d = await call('trash', { name: 'demo-skill' })
  assert(typeof d.body.error === 'string', '只读来源拒绝移入回收站')
  skills.get = originalGet
}

// 8. 未知方法 / 跨源 / 无 Origin
{
  assert((await call('nope', {})).status === 404, '未知方法 → 404')
  assert((await call('catalog', {}, 'http://evil.example')).status === 403, '跨源 → 403')
  assert((await call('catalog', {}, null)).status === 403, '无 Origin → 403')
}

// 9. 部署补丁引擎（0.7.0）：目录驱动全链路（临时假部署树 fakeRoot）
{
  const fakeRoot = join(home, 'fake-deployment')
  const trigRel = 'node_modules/@deepseek-ai/dsh-client-ui-input-trigger/lib/client.js'
  const convRel = 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js'
  const trigDir = join(fakeRoot, ...trigRel.split('/').slice(0, -1))
  const convDir = join(fakeRoot, ...convRel.split('/').slice(0, -1))
  await mkdir(trigDir, { recursive: true })
  await mkdir(convDir, { recursive: true })
  const trigPath = join(trigDir, 'client.js')
  const convPath = join(convDir, 'client.js')
  // 官方原样 fake 文件：包含两个种子补丁的全部 find 串，且各出现次数与 count 一致；
  // 另含 MF_A/MF_B/MF_C/MF_D 与 G_A/G_B 供第 9d–9i 各节复用。均为合法 JS。
  const trigOrig = 'const WHITESPACE = /\\s/u;\nfunction boundaryOk(draft, index, ch) { return true }\nconst detectTrigger = (draft, caret, guard) => {\n\tif (guard.tier === "frozen") return null;\n\tfor (let i = caret - 1; i >= 0; i--) {\n\t\tconst ch = draft.charAt(i);\n\t\tif (WHITESPACE.test(ch)) return null;\n\t\tif (ch !== "/" && ch !== "@") continue;\n\t\tif (guard.tier === "claimed" && ch === "/") continue;\n\t\tif (!boundaryOk(draft, i, ch)) continue;\n\t\treturn {\n\t\t\ttrigger: ch,\n\t\t};\n\t}\n\treturn null;\n};\n// fixture markers MF_B\n'
  const convOrig = 'var InputMachine = class {\n\tdraft = "";\n};\nfunction onEnterReview() {\n\tconst trimmed = draft.trim();\n\tif (trimmed === "") return [];\n\treturn [trimmed];\n}\nthis.adopt("");\nthis.adopt("");\nthis.adopt("");\nconst empty = draft.trim() === "" && attachments.length === 0;\nrender(empty);\nif (this.snapshot.draft.trim() === "" && this.imageIds.length > 0) {\n\tloadImages();\n}\nif (inputState.draft === "" && storedDraft !== "") inputActions.setDraft(storedDraft);\n// fixture markers MF_A MF_C MF_D G_A G_B\n'
  await writeFile(trigPath, trigOrig, 'utf8')
  await writeFile(convPath, convOrig, 'utf8')
  process.env.DSH_DEPLOYMENT_ROOT = fakeRoot

  const patchesDir = join(home, 'dsh-manager', 'patches')
  const rel = (p) => join('node_modules', '@deepseek-ai', ...p.split('/'))
  const nodeDir = (p) => join(fakeRoot, 'node_modules', '@deepseek-ai', ...p.split('/'))
  function imp(category, fileName, manifest) {
    return call('patchImport', { category, fileName, content: JSON.stringify(manifest) })
  }
  function replaceFile(relPath, pairs) {
    return { file: relPath, kind: 'replace', pairs }
  }
  const slashSeedPairs = [
    { find: 'draft = "";', replace: 'draft = "/"; // dsh-skill-manager-seed: empty composer starts with a slash prefix', count: 1 },
    { find: 'this.adopt("");', replace: 'this.adopt("/");', count: 3 },
    { find: 'if (trimmed === "") return [];', replace: 'if (trimmed === "" || trimmed === "/") return [];', count: 1 },
    { find: 'const empty = draft.trim() === "" && attachments.length === 0;', replace: 'const empty = (draft.trim() === "" || draft.trim() === "/") && attachments.length === 0;', count: 1 },
    { find: 'if (this.snapshot.draft.trim() === "" && this.imageIds.length > 0) {', replace: 'if ((this.snapshot.draft.trim() === "" || this.snapshot.draft.trim() === "/") && this.imageIds.length > 0) {', count: 1 },
    { find: 'if (inputState.draft === "" && storedDraft !== "") inputActions.setDraft(storedDraft);', replace: 'if ((inputState.draft === "" || inputState.draft === "/") && storedDraft !== "") inputActions.setDraft(storedDraft);', count: 1 },
  ]
  const dunhaoPairs = [
    { find: 'if (ch !== "/" && ch !== "@") continue;', replace: 'if (trig !== "/" && trig !== "@") continue;', count: 1 },
    { find: 'if (guard.tier === "claimed" && ch === "/") continue;', replace: 'if (guard.tier === "claimed" && trig === "/") continue;', count: 1 },
    { find: 'if (!boundaryOk(draft, i, ch)) continue;', replace: 'if (!boundaryOk(draft, i, trig)) continue;', count: 1 },
    { find: 'trigger: ch,', replace: 'trigger: trig,', count: 1 },
    { find: 'const ch = draft.charAt(i);', replace: 'const ch = draft.charAt(i);\n\t\t\t\tconst trig = ch === "\\u3001" ? "/" : ch; // dunhao-trigger-patch: normalize U+3001 to slash', count: 1 },
  ]
  const patchedConv = slashSeedPairs.reduce((t, p) => t.split(p.find).join(p.replace), convOrig)
  const stateFilesDir = join(patchesDir, '.state', 'files')

  // —— 9a 目录与示例补丁：引擎不内置任何补丁（完全平等），由测试手动放置两个示例声明 ——
  await mkdir(patchesDir, { recursive: true })
  await writeFile(join(patchesDir, 'slash-seed.dsh-patch.json'), JSON.stringify({ id: 'slash-seed', name: '斜杠播种', description: '示例补丁', apply: 'refresh', files: [{ file: convRel, kind: 'replace', marker: 'dsh-skill-manager-seed', pairs: slashSeedPairs }] }, null, 2), 'utf8')
  await writeFile(join(patchesDir, 'dunhao-trigger.dsh-patch.json'), JSON.stringify({ id: 'dunhao-trigger', name: '顿号触发', description: '示例补丁', apply: 'refresh', files: [{ file: trigRel, kind: 'replace', marker: 'dunhao-trigger-patch', pairs: dunhaoPairs }] }, null, 2), 'utf8')
  let r = await call('patchScan')
  assert(r.status === 200 && r.body.ok === true && r.body.patches.length === 2, '扫描列出两个示例补丁')
  assert(r.body.categories.indexOf('默认') !== -1, '类别含默认')
  assert(typeof r.body.root === 'string' && r.body.root.includes('fake-deployment'), '扫描返回部署根')
  assert(r.body.patches.every((p) => p.state === 'clean'), '初始状态均为 clean')
  assert(r.body.patches.every((p) => Array.isArray(p.targets) && p.targets.length === 1 && p.targets[0] === (p.id === 'slash-seed' ? convRel : trigRel)), '扫描返回目标文件路径 targets')
  assert(r.body.settings.allowExecutable === true, '默认允许可执行补丁')

  // —— 9b 启用/禁用种子往返 ——
  r = await call('patchEnable', { id: 'slash-seed' })
  assert(r.body.ok === true && r.body.state === 'applied', '启用 slash-seed → applied')
  let convText = await readFile(convPath, 'utf8')
  assert(convText.includes('dsh-skill-manager-seed') && convText.includes('draft = "/"'), 'slash-seed 真实写入磁盘')
  r = await call('patchEnable', { id: 'slash-seed' })
  assert(r.body.ok === true && r.body.already === true, '重复启用 → already')
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 'slash-seed').state === 'applied', '扫描确认 slash-seed applied')
  assert(r.body.patches.find((p) => p.id === 'dunhao-trigger').state === 'clean', '扫描确认 dunhao-trigger clean')
  r = await call('patchDisable', { id: 'slash-seed' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, '禁用 slash-seed 逐字节还原')
  assert((await readdir(stateFilesDir)).length === 0, '禁用后 .state/files 已清空')
  r = await call('patchEnable', { id: 'dunhao-trigger' })
  assert(r.body.ok === true, '启用 dunhao-trigger → ok')
  assert((await readFile(trigPath, 'utf8')).includes('dunhao-trigger-patch'), '顿号补丁真实写入磁盘')
  r = await call('patchDisable', { id: 'dunhao-trigger' })
  assert(r.body.ok === true && (await readFile(trigPath, 'utf8')) === trigOrig, '禁用 dunhao-trigger 还原')

  // —— 9c 收养（已打标记、无 .state）——
  await writeFile(convPath, patchedConv, 'utf8')
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 'slash-seed').state === 'applied', '有标记无状态 → 收养为 applied')
  assert((await readdir(stateFilesDir)).length === 1, '收养后出现 1 个状态文件')
  r = await call('patchDisable', { id: 'slash-seed' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, '收养后禁用还原原文')
  assert((await readdir(stateFilesDir)).length === 0, '收养禁用后状态清空')

  // —— 9d 多文件补丁（事务启用两个目标文件）——
  r = await imp('默认', 'multi.dsh-patch.json', { id: 'multi-test', name: 'Multi Test', description: 'multi', apply: 'refresh', files: [
    replaceFile(convRel, [{ find: 'MF_A', replace: 'MF_A_PATCHED', count: 1 }]),
    replaceFile(trigRel, [{ find: 'MF_B', replace: 'MF_B_PATCHED', count: 1 }]),
  ] })
  assert(r.body.ok === true && r.body.id === 'multi-test', '导入 multi-test → ok')
  r = await call('patchEnable', { id: 'multi-test' })
  assert(r.body.ok === true, '启用 multi-test → ok')
  convText = await readFile(convPath, 'utf8')
  const trigText = await readFile(trigPath, 'utf8')
  assert(convText.includes('MF_A_PATCHED') && trigText.includes('MF_B_PATCHED'), 'multi 两目标文件都含 PATCHED')
  r = await call('patchDisable', { id: 'multi-test' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig && (await readFile(trigPath, 'utf8')) === trigOrig, 'multi 禁用两文件还原')

  // —— 9e 事务干跑回滚/冲突：第二条 find 失配 → error、两文件不动 ——
  r = await imp('默认', 'conflict.dsh-patch.json', { id: 'conflict-test', name: 'Conflict', files: [
    replaceFile(convRel, [{ find: 'MF_A', replace: 'X', count: 1 }]),
    replaceFile(trigRel, [{ find: 'NOT_EXIST_STR', replace: 'Y', count: 1 }]),
  ] })
  assert(r.body.ok === true, '导入 conflict-test → ok')
  r = await call('patchEnable', { id: 'conflict-test' })
  assert(typeof r.body.error === 'string', '干跑失败 → error')
  assert((await readFile(convPath, 'utf8')) === convOrig && (await readFile(trigPath, 'utf8')) === trigOrig, '干跑失败两文件未改')

  // —— 9f 同文件链共存（p1/p2）+ 重叠冲突（p3）——
  await imp('默认', 'p1.dsh-patch.json', { id: 'p1', name: 'P1', files: [replaceFile(convRel, [{ find: 'MF_A', replace: 'FIXTURE_ONE', count: 1 }])] })
  await imp('默认', 'p2.dsh-patch.json', { id: 'p2', name: 'P2', files: [replaceFile(convRel, [{ find: 'MF_C', replace: 'MF_C_2', count: 1 }])] })
  await imp('默认', 'p3.dsh-patch.json', { id: 'p3', name: 'P3', files: [replaceFile(convRel, [{ find: 'MF_A', replace: 'MF_A_X', count: 1 }])] })
  r = await call('patchEnable', { id: 'p1' })
  assert(r.body.ok === true, '启用 p1 → ok')
  r = await call('patchEnable', { id: 'p2' })
  assert(r.body.ok === true, '同文件链共存启用 p2 → ok')
  convText = await readFile(convPath, 'utf8')
  assert(convText.includes('FIXTURE_ONE') && convText.includes('MF_C_2'), 'p1 与 p2 标记共存')
  r = await call('patchDisable', { id: 'p1' })
  assert(r.body.ok === true, '启用链中禁 p1 → ok')
  convText = await readFile(convPath, 'utf8')
  assert(convText.includes('MF_C_2') && !convText.includes('FIXTURE_ONE'), '禁 p1 后 p2 仍生效且不含 p1 标记')
  r = await call('patchDisable', { id: 'p2' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, '禁 p2 后全文还原')
  // 重叠冲突：p1 已启用时（MF_A 已被消费）再启 p3 → 干跑失败
  await call('patchEnable', { id: 'p1' })
  r = await call('patchEnable', { id: 'p3' })
  assert(typeof r.body.error === 'string', '重叠替换在共存链上 → error')
  await call('patchDisable', { id: 'p1' })
  assert((await readFile(convPath, 'utf8')) === convOrig, '重叠冲突清理后还原原文')

  // —— 9g 前置/互斥 ——
  await imp('默认', 'dep-a.dsh-patch.json', { id: 'dep-a', name: 'DepA', files: [replaceFile(convRel, [{ find: 'G_A', replace: 'G_A_DA', count: 1 }])] })
  await imp('默认', 'dep-b.dsh-patch.json', { id: 'dep-b', name: 'DepB', prerequisites: ['dep-a'], files: [replaceFile(convRel, [{ find: 'G_B', replace: 'G_B_DB', count: 1 }])] })
  await imp('默认', 'excl-x.dsh-patch.json', { id: 'excl-x', name: 'ExclX', conflicts: ['dep-a'], files: [replaceFile(convRel, [{ find: 'G_A', replace: 'G_A_X', count: 1 }])] })
  r = await call('patchEnable', { id: 'dep-b' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('前置'), '缺前置 → 拒绝含“前置”')
  r = await call('patchEnable', { id: 'dep-a' })
  assert(r.body.ok === true, '启用 dep-a → ok')
  r = await call('patchEnable', { id: 'dep-b' })
  assert(r.body.ok === true, '前置就绪后启用 dep-b → ok')
  r = await call('patchEnable', { id: 'excl-x' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('互斥'), '与已启用补丁互斥 → 拒绝含“互斥”')
  await call('patchDisable', { id: 'dep-b' })
  await call('patchDisable', { id: 'dep-a' })
  assert((await readFile(convPath, 'utf8')) === convOrig, '清理前置/互斥补丁后还原原文')

  // —— 9h override（目录内单个 file 整文件覆盖）——
  await mkdir(join(patchesDir, 'ov1.override'), { recursive: true })
  await writeFile(join(patchesDir, 'ov1.override', 'file'), 'OVERRIDDEN_CONTENT_V1', 'utf8')
  r = await imp('默认', 'ov1.dsh-patch.json', { id: 'ov1', name: 'Ov1', files: [{ file: trigRel, kind: 'override', override: 'ov1.override' }] })
  assert(r.body.ok === true, '导入 override 补丁 → ok')
  r = await call('patchEnable', { id: 'ov1' })
  assert(r.body.ok === true && (await readFile(trigPath, 'utf8')) === 'OVERRIDDEN_CONTENT_V1', 'override 启用后整文件覆盖')
  r = await call('patchDisable', { id: 'ov1' })
  assert(r.body.ok === true && (await readFile(trigPath, 'utf8')) === trigOrig, 'override 禁用后还原原文')

  // —— 9i script（可执行补丁受全局开关控制）——
  await writeFile(join(patchesDir, 't1.dsh-patch.js'), 'module.exports = { apply: function(text){ return text.replace(/MF_D/g, "MF_D_SCRIPTED") } };\n', 'utf8')
  r = await imp('默认', 't1.dsh-patch.json', { id: 't1', name: 'T1', files: [{ file: convRel, kind: 'script', script: 't1.dsh-patch.js' }] })
  assert(r.body.ok === true, '导入 script 补丁 → ok')
  await call('patchSettingsSet', { allowExecutable: false })
  r = await call('patchEnable', { id: 't1' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('可执行'), '可执行总闸关闭 → 拒绝含“可执行”')
  await call('patchSettingsSet', { allowExecutable: true })
  r = await call('patchEnable', { id: 't1' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')).includes('MF_D_SCRIPTED'), '总闸开启后 script 补丁生效')
  r = await call('patchDisable', { id: 't1' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, 'script 禁用后还原原文')

  // —— 9j 类别与删除（'实验' 走完整生命周期；'默认' 不可增删改）——
  r = await call('patchCategoryAdd', { name: '实验' })
  assert(r.body.ok === true, '新增类别 实验 → ok')
  r = await call('patchCategoryAdd', { name: '实验' })
  assert(typeof r.body.error === 'string', '重复建类 → error')
  r = await imp('实验', 'cat-p.dsh-patch.json', { id: 'cat-p', name: 'CatP', files: [replaceFile(convRel, [{ find: 'MF_A', replace: 'MF_A_CAT', count: 1 }])] })
  assert(r.body.ok === true && r.body.category === '实验', '导入到类别 实验 → ok')
  r = await call('patchCategoryDelete', { name: '实验' })
  assert(typeof r.body.error === 'string', '非空类别不可删 → error')
  r = await call('patchDelete', { id: 'cat-p' })
  assert(r.body.ok === true, '删除 cat-p → ok')
  r = await call('patchCategoryDelete', { name: '实验' })
  assert(r.body.ok === true, '空类别可删 → ok')
  r = await call('patchCategoryRename', { oldName: 'nope', newName: 'x' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('不存在'), '重命名不存在的类别 → error')
  r = await call('patchCategoryAdd', { name: '默认' })
  assert(typeof r.body.error === 'string', '不能创建 默认 → error')
  r = await call('patchCategoryRename', { oldName: '默认', newName: 'x' })
  assert(typeof r.body.error === 'string', '不能重命名 默认 → error')
  r = await call('patchCategoryDelete', { name: '默认' })
  assert(typeof r.body.error === 'string', '不能删除 默认 → error')

  // —— 9k 丢失态：官方改动 → lost → 禁用刷新快照 → clean ——
  await call('patchEnable', { id: 'slash-seed' })
  await writeFile(convPath, 'externally-changed', 'utf8')
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 'slash-seed').state === 'lost', '官方外部改动 → lost')
  r = await call('patchDisable', { id: 'slash-seed' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === 'externally-changed', 'lost 禁用刷新快照、文件保持现状')
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 'slash-seed').state === 'clean', 'lost 禁用后 → clean')

  // —— 9l RECOVERY.md 与设置往返 ——
  await call('patchEnable', { id: 'dunhao-trigger' })
  const recovery = await readFile(join(patchesDir, 'RECOVERY.md'), 'utf8')
  assert(recovery.includes('补丁状态与恢复手册') && recovery.includes('dunhao-trigger'), 'RECOVERY 手册含标题与已启用补丁')
  r = await call('patchSettingsSet', { alertMode: 'badge' })
  assert(r.body.ok === true && r.body.settings.alertMode === 'badge', '设置提醒模式 badge')
  r = await call('patchSettingsGet')
  assert(r.body.settings.alertMode === 'badge', '设置读回 badge')
  assert(typeof (await call('patchSettingsSet', { alertMode: 'loud' })).body.error === 'string', '非法提醒模式拒绝')
  r = await call('patchSettingsSet', { alertMode: 'panel' })
  assert(r.body.ok === true, '提醒模式回 panel')

  // —— 收尾：禁用全部启用中的补丁，断言最终全部 clean ——
  await call('patchDisable', { id: 'dunhao-trigger' })
  r = await call('patchScan')
  assert(r.body.patches.every((p) => p.state === 'clean'), '收尾后全部补丁 clean')
  delete process.env.DSH_DEPLOYMENT_ROOT
}

// 10. 非UI问题修复回归（删除/启用守卫、sha 判定、根失配、导入查重、script 标记防二次应用）
{
  const fakeRoot = join(home, 'fake-deployment')
  const trigRel = 'node_modules/@deepseek-ai/dsh-client-ui-input-trigger/lib/client.js'
  const convRel = 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js'
  const convPath = join(fakeRoot, ...convRel.split('/'))
  const trigPath = join(fakeRoot, ...trigRel.split('/'))
  const patchesDir = join(home, 'dsh-manager', 'patches')
  const stateFilesDir = join(patchesDir, '.state', 'files')
  const trigOrig = 'const WHITESPACE = /\\s/u;\nfunction boundaryOk(draft, index, ch) { return true }\nconst detectTrigger = (draft, caret, guard) => {\n\tif (guard.tier === "frozen") return null;\n\tfor (let i = caret - 1; i >= 0; i--) {\n\t\tconst ch = draft.charAt(i);\n\t\tif (WHITESPACE.test(ch)) return null;\n\t\tif (ch !== "/" && ch !== "@") continue;\n\t\tif (guard.tier === "claimed" && ch === "/") continue;\n\t\tif (!boundaryOk(draft, i, ch)) continue;\n\t\treturn {\n\t\t\ttrigger: ch,\n\t\t};\n\t}\n\treturn null;\n};\n// fixture markers MF_B\n'
  const convOrig = 'var InputMachine = class {\n\tdraft = "";\n};\nfunction onEnterReview() {\n\tconst trimmed = draft.trim();\n\tif (trimmed === "") return [];\n\treturn [trimmed];\n}\nthis.adopt("");\nthis.adopt("");\nthis.adopt("");\nconst empty = draft.trim() === "" && attachments.length === 0;\nrender(empty);\nif (this.snapshot.draft.trim() === "" && this.imageIds.length > 0) {\n\tloadImages();\n}\nif (inputState.draft === "" && storedDraft !== "") inputActions.setDraft(storedDraft);\n// fixture markers MF_A MF_C MF_D G_A G_B\n'
  await writeFile(trigPath, trigOrig, 'utf8')
  await writeFile(convPath, convOrig, 'utf8')
  process.env.DSH_DEPLOYMENT_ROOT = fakeRoot
  const imp = (category, fileName, manifest) => call('patchImport', { category, fileName, content: JSON.stringify(manifest) })
  const rep = (relPath, pairs) => ({ file: relPath, kind: 'replace', pairs })

  // —— 10a 重复 id 的补丁必须能删除（byId 之外也要可定位）——
  await writeFile(join(patchesDir, 'dup-a.dsh-patch.json'), JSON.stringify({ id: 'dup-x', name: 'DupA', files: [rep(convRel, [{ find: 'MF_A', replace: 'MF_A_DUPA', count: 1 }])] }), 'utf8')
  await writeFile(join(patchesDir, 'dup-b.dsh-patch.json'), JSON.stringify({ id: 'dup-x', name: 'DupB', files: [rep(convRel, [{ find: 'MF_C', replace: 'MF_C_DUPB', count: 1 }])] }), 'utf8')
  let r = await call('patchScan')
  assert(r.body.patches.filter((p) => p.id === 'dup-x').length === 2, '重复 id 两个条目都在列表')
  r = await call('patchDelete', { id: 'dup-x' })
  assert(r.body.ok === true, '删除重复 id 的其中一份 → ok')
  r = await call('patchScan')
  assert(r.body.patches.filter((p) => p.id === 'dup-x').length === 1, '删一份后剩一份且唯一')
  r = await call('patchDelete', { id: 'dup-x' })
  assert(r.body.ok === true, '删除剩下一份 → ok')
  assert((await call('patchScan')).body.patches.every((p) => p.id !== 'dup-x'), '重复条目彻底清空')

  // —— 10b 损坏 JSON 必须能删除 ——
  await writeFile(join(patchesDir, 'broken.dsh-patch.json'), '{ not valid json', 'utf8')
  r = await call('patchScan')
  assert(r.body.patches.some((p) => p.id === 'broken.dsh-patch.json' && p.state === 'error'), '损坏 JSON 显示 error')
  r = await call('patchDelete', { id: 'broken.dsh-patch.json' })
  assert(r.body.ok === true, '删除损坏 JSON → ok')
  assert((await call('patchScan')).body.patches.every((p) => p.id !== 'broken.dsh-patch.json'), '损坏 JSON 已删除')

  // —— 10c lost 守卫：点启用报错、删除被拒、禁用刷新后可删 ——
  await imp('默认', 'lost-del.dsh-patch.json', { id: 'lost-del', name: 'LostDel', files: [rep(convRel, [{ find: 'MF_A', replace: 'MF_A_LD', count: 1 }])] })
  r = await call('patchEnable', { id: 'lost-del' })
  assert(r.body.ok === true, '启用 lost-del → ok')
  await writeFile(convPath, 'externally-changed-again', 'utf8')
  r = await call('patchEnable', { id: 'lost-del' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('已丢失'), '已丢失点启用 → 明确报错（非 already）')
  r = await call('patchDelete', { id: 'lost-del' })
  assert(typeof r.body.error === 'string', '已丢失删除 → 拒绝')
  r = await call('patchDisable', { id: 'lost-del' })
  assert(r.body.ok === true, 'lost 禁用刷新状态')
  r = await call('patchDelete', { id: 'lost-del' })
  assert(r.body.ok === true, '刷新后删除 → ok')
  await writeFile(convPath, convOrig, 'utf8')

  // —— 10d 扫描不再重放脚本（sha 判定）：删除脚本文件后仍 applied ——
  await writeFile(join(patchesDir, 't2.dsh-patch.js'), 'module.exports = { apply: function(text){ return text.replace(/MF_D/g, "MF_D_T2") } };\n', 'utf8')
  await imp('默认', 't2.dsh-patch.json', { id: 't2', name: 'T2', files: [{ file: convRel, kind: 'script', script: 't2.dsh-patch.js' }] })
  r = await call('patchEnable', { id: 't2' })
  assert(r.body.ok === true, '启用 t2 → ok')
  await unlink(join(patchesDir, 't2.dsh-patch.js'))
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 't2').state === 'applied', '删除脚本文件后扫描仍 applied（sha 判定不重放）')
  r = await call('patchDisable', { id: 't2' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, 't2 禁用还原原文')

  // —— 10e script+marker：状态缺失 → lost，拒绝二次启用；禁用提供恢复出口 ——
  await writeFile(join(patchesDir, 't3.dsh-patch.js'), 'module.exports = { apply: function(text){ return text.replace(/MF_D/g, "MF_D_T3") + "// T3MARK" } };\n', 'utf8')
  await imp('默认', 't3.dsh-patch.json', { id: 't3', name: 'T3', files: [{ file: convRel, kind: 'script', script: 't3.dsh-patch.js', marker: 'T3MARK' }] })
  r = await call('patchEnable', { id: 't3' })
  assert(r.body.ok === true, '启用带标记 script → ok')
  for (const f of await readdir(stateFilesDir)) await unlink(join(stateFilesDir, f))
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 't3').state === 'lost', 'script 标记在但状态缺失 → lost（防二次应用）')
  r = await call('patchEnable', { id: 't3' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('状态缺失'), '标记在状态缺失 → 拒绝启用')
  const beforeReset = await readFile(convPath, 'utf8')
  assert(beforeReset.includes('T3MARK'), '恢复前文件仍含标记')
  r = await call('patchDisable', { id: 't3' })
  assert(r.body.ok === true && r.body.reset === true, '无状态禁用 → ok 且 reset（恢复出口）')
  assert((await readFile(convPath, 'utf8')) === beforeReset, '恢复出口不修改文件内容')
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 't3').state === 'clean', '恢复出口后补丁 clean')
  r = await call('patchDelete', { id: 't3' })
  assert(r.body.ok === true, '清理 t3 → ok')
  await writeFile(convPath, convOrig, 'utf8')

  // —— 10f 部署根失配 → lost + 启用拒绝 + 禁用刷新 ——
  await imp('默认', 'root-p.dsh-patch.json', { id: 'root-p', name: 'RootP', files: [rep(convRel, [{ find: 'MF_C', replace: 'MF_C_ROOT', count: 1 }])] })
  r = await call('patchEnable', { id: 'root-p' })
  assert(r.body.ok === true, '启用 root-p → ok')
  {
    const stateFiles = await readdir(stateFilesDir)
    assert(stateFiles.length >= 1, 'root-p 状态文件存在')
    for (const f of stateFiles) {
      const p = join(stateFilesDir, f)
      const st = JSON.parse(await readFile(p, 'utf8'))
      if (Array.isArray(st.chain) && st.chain.includes('root-p')) { st.root = 'C:/some-other-root'; await writeFile(p, JSON.stringify(st), 'utf8') }
    }
  }
  r = await call('patchScan')
  assert(r.body.patches.find((p) => p.id === 'root-p').state === 'lost', '状态 root 与部署根不符 → lost')
  r = await call('patchEnable', { id: 'root-p' })
  assert(typeof r.body.error === 'string', '根失配启用 → 拒绝')
  r = await call('patchDisable', { id: 'root-p' })
  assert(r.body.ok === true, '根失配禁用 → 刷新为当前根')
  await call('patchDelete', { id: 'root-p' })
  assert((await call('patchScan')).body.patches.every((p) => p.id !== 'root-p'), 'root-p 已删除')

  // —— 10g 导入查重必须覆盖重复条目（byId 之外）——
  await writeFile(join(patchesDir, 'd1.dsh-patch.json'), JSON.stringify({ id: 'trip', name: 'D1', files: [rep(convRel, [{ find: 'MF_A', replace: 'MF_A_D1', count: 1 }])] }), 'utf8')
  await writeFile(join(patchesDir, 'd2.dsh-patch.json'), JSON.stringify({ id: 'trip', name: 'D2', files: [rep(convRel, [{ find: 'MF_C', replace: 'MF_C_D2', count: 1 }])] }), 'utf8')
  r = await imp('默认', 'd3.dsh-patch.json', { id: 'trip', name: 'D3', files: [rep(convRel, [{ find: 'MF_D', replace: 'MF_D_D3', count: 1 }])] })
  assert(typeof r.body.error === 'string' && r.body.error.includes('重复'), '导入与重复 id 冲突 → 拒绝')
  await call('patchDelete', { id: 'trip' })
  await call('patchDelete', { id: 'trip' })
  assert((await call('patchScan')).body.patches.every((p) => p.id !== 'trip'), 'trip 重复条目清理')

  // —— 10i 完全平等：删除补丁后引擎不复活（无内建补丁、无补种）——
  await call('patchDelete', { id: 'dunhao-trigger' })
  r = await call('patchScan')
  assert(r.body.patches.every((p) => p.id !== 'dunhao-trigger'), '删除 dunhao-trigger 后扫描不再出现')
  r = await call('patchScan')
  assert(r.body.patches.every((p) => p.id !== 'dunhao-trigger'), '再次扫描确认不复活')

  // —— 10j 目标文件被外部删除后禁用：不复活文件、只清理状态 ——
  await imp('默认', 'del-file.dsh-patch.json', { id: 'del-file', name: 'DelFile', files: [rep(convRel, [{ find: 'MF_A', replace: 'MF_A_DF', count: 1 }])] })
  r = await call('patchEnable', { id: 'del-file' })
  assert(r.body.ok === true, '启用 del-file → ok')
  await unlink(convPath)
  r = await call('patchDisable', { id: 'del-file' })
  assert(r.body.ok === true, '目标被外部删除后禁用 → ok')
  let convGone = false
  try { await access(convPath) } catch { convGone = true }
  assert(convGone === true, '禁用不复活被删文件')
  await writeFile(convPath, convOrig, 'utf8')
  await call('patchDelete', { id: 'del-file' })

  // —— 10k 多文件补丁部分状态：启用报"不一致"而非假 already ——
  await imp('默认', 'part.dsh-patch.json', { id: 'part-m', name: 'PartM', files: [
    rep(convRel, [{ find: 'MF_A', replace: 'MF_A_PM1', count: 1 }]),
    rep(trigRel, [{ find: 'MF_B', replace: 'MF_B_PM2', count: 1 }]),
  ] })
  r = await call('patchEnable', { id: 'part-m' })
  assert(r.body.ok === true, '启用 part-m → ok')
  for (const f of await readdir(stateFilesDir)) {
    const p = join(stateFilesDir, f)
    const st = JSON.parse(await readFile(p, 'utf8'))
    if (Array.isArray(st.chain) && st.chain.includes('part-m') && String(st.path).includes('conversation')) await unlink(p)
  }
  r = await call('patchEnable', { id: 'part-m' })
  assert(typeof r.body.error === 'string' && r.body.error.includes('不一致'), '部分状态时启用 → 报状态不一致')
  r = await call('patchDisable', { id: 'part-m' })
  assert(r.body.ok === true, 'part-m 禁用 → ok')
  await writeFile(convPath, convOrig, 'utf8')
  await call('patchDelete', { id: 'part-m' })

  // —— 10l 同补丁重复文件条目 → 结构校验拒绝 ——
  r = await imp('默认', 'dupfile.dsh-patch.json', { id: 'dupfile', name: 'DupFile', files: [
    rep(convRel, [{ find: 'MF_A', replace: 'MF_A_DF1', count: 1 }]),
    rep(convRel, [{ find: 'MF_C', replace: 'MF_C_DF2', count: 1 }]),
  ] })
  assert(typeof r.body.error === 'string' && r.body.error.includes('重复'), '同补丁重复文件条目 → 拒绝')

  // —— 10m 沙箱私有全局名：脚本声明 __text__ 不遮蔽引擎传参 ——
  await writeFile(convPath, convOrig, 'utf8')
  await writeFile(join(patchesDir, 't4.dsh-patch.js'), 'var __text__ = "SHADOWED"; module.exports = { apply: function(t){ return t.replace(/MF_D/g, "MF_D_SHADOWOK") } };\n', 'utf8')
  await imp('默认', 't4.dsh-patch.json', { id: 't4', name: 'T4', files: [{ file: convRel, kind: 'script', script: 't4.dsh-patch.js' }] })
  r = await call('patchEnable', { id: 't4' })
  assert(r.body.ok === true, '启用遮蔽测试脚本 → ok')
  const shadowText = await readFile(convPath, 'utf8')
  assert(shadowText.includes('MF_D_SHADOWOK') && !shadowText.includes('SHADOWED'), '脚本声明 __text__ 不遮蔽引擎传参')
  r = await call('patchDisable', { id: 't4' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, '遮蔽测试清理还原')
  await call('patchDelete', { id: 't4' })

  // —— 10n 损坏的状态/设置文件：扫描不 500，状态自愈 ——
  await writeFile(convPath, convOrig, 'utf8')
  r = await call('patchEnable', { id: 'slash-seed' })
  assert(r.body.ok === true, '启用 slash-seed 准备损坏测试')
  for (const f of await readdir(stateFilesDir)) await writeFile(join(stateFilesDir, f), '{ broken state json', 'utf8')
  r = await call('patchScan')
  assert(r.body.ok === true, '损坏状态文件后扫描仍 ok（不 500）')
  assert(r.body.patches.find((p) => p.id === 'slash-seed').state === 'applied', '损坏状态 → 收养自愈仍 applied')
  await writeFile(join(home, 'dsh-manager.json'), '{ broken settings json', 'utf8')
  r = await call('patchScan')
  assert(r.body.ok === true && r.body.settings.allowExecutable === true && r.body.settings.alertMode === 'panel', '损坏设置文件 → 默认设置且不 500')
  r = await call('patchDisable', { id: 'slash-seed' })
  assert(r.body.ok === true && (await readFile(convPath, 'utf8')) === convOrig, '损坏测试清理还原')

  // —— 10o 空类别可见 / 导入与数组上限 / 同名损坏定位 ——
  r = await call('patchCategoryAdd', { name: '空类' })
  assert(r.body.ok === true, '新建空类别 → ok')
  r = await call('patchScan')
  assert(r.body.categories.indexOf('空类') !== -1, '空类别文件夹在扫描中可见（可向其导入）')
  r = await call('patchCategoryDelete', { name: '空类' })
  assert(r.body.ok === true, '删除空类别 → ok')
  r = await imp('默认', 'huge.dsh-patch.json', { id: 'huge', name: 'Huge', description: 'x'.repeat(1000100) })
  assert(typeof r.body.error === 'string' && r.body.error.includes('过大'), '超大导入内容 → 拒绝（1MB 上限）')
  const manyConflicts = []
  for (let i = 0; i < 60; i++) manyConflicts.push('c' + i)
  r = await imp('默认', 'manyc.dsh-patch.json', { id: 'manyc', name: 'ManyC', conflicts: manyConflicts, files: [rep(convRel, [{ find: 'MF_A', replace: 'MF_A_MC', count: 1 }])] })
  assert(typeof r.body.error === 'string', 'conflicts 超 50 项 → 拒绝')
  const brokenName = 'same-broken.dsh-patch.json'
  await mkdir(join(patchesDir, '夹一'), { recursive: true })
  await writeFile(join(patchesDir, brokenName), '{ bad1', 'utf8')
  await writeFile(join(patchesDir, '夹一', brokenName), '{ bad2', 'utf8')
  r = await call('patchDelete', { id: brokenName })
  assert(typeof r.body.error === 'string' && r.body.error.includes('多个同名'), '多个同名损坏文件 → 拒绝唯一定位')
  await unlink(join(patchesDir, brokenName))
  await unlink(join(patchesDir, '夹一', brokenName))

  // —— 10h 回归收尾：无 applied/lost 残留 ——
  r = await call('patchScan')
  assert(r.body.patches.every((p) => p.state === 'clean' || p.state === 'error'), '回归收尾无 applied/lost')
  delete process.env.DSH_DEPLOYMENT_ROOT
}

await root.ctx?.fiber?.dispose?.()
console.log('ALL PASS (temp home:', home + ')')
