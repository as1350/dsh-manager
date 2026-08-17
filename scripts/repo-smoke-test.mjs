// dsh-manager 本地仓库面板 RPC 冒烟测试（0.9.0）
// 运行前把本文件复制到 $DSH_HOME/profiles/web/node_modules/ 下，再 node repo-smoke-test.mjs
import { Context } from '@deepseek-ai/cordis'
import { apply, inject, name } from '@deepseek-ai/dsh-manager'
import { mkdtemp, mkdir, writeFile, readFile, readdir, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = await mkdtemp(join(tmpdir(), 'dsh-repo-smoke-'))
process.env.DSH_HOME = home
const root1 = join(home, 'root1')
const projA = join(root1, 'projA')
const projB = join(root1, 'projB')
const nested = join(root1, '分类', 'nestedProj')
await mkdir(join(projA, 'subpkg'), { recursive: true })
await mkdir(join(projB, '.git'), { recursive: true })
await mkdir(nested, { recursive: true })
await writeFile(join(projA, 'package.json'), '{"name":"projA"}\n', 'utf8')
await writeFile(join(projA, 'subpkg', 'package.json'), '{"name":"subpkg"}\n', 'utf8')
await writeFile(join(nested, 'package.json'), '{"name":"nestedProj"}\n', 'utf8')
const root2 = join(home, 'root2')
const mirrorProj = join(root2, '优化插件', 'mirrorProj')
await mkdir(mirrorProj, { recursive: true })
await writeFile(join(mirrorProj, 'package.json'), '{"name":"mirrorProj"}\n', 'utf8')
await mkdir(join(root1, '_governance'), { recursive: true })
await mkdir(join(root1, '_snapshots'), { recursive: true })
await writeFile(join(root1, '_governance', '.keep'), '', 'utf8')
await writeFile(join(root1, '_snapshots', '.keep'), '', 'utf8')
const skillRoot = join(root1, 'skill仓库')
await mkdir(join(skillRoot, '.git'), { recursive: true })
const sk1 = join(skillRoot, 'local', 'a-skill')
const sk2 = join(skillRoot, 'plugins', 'demo-plugin', 'b-skill')
const sk3 = join(skillRoot, 'projects', 'owner', 'cat', 'c-skill')
await mkdir(sk1, { recursive: true })
await mkdir(sk2, { recursive: true })
await mkdir(sk3, { recursive: true })
await writeFile(join(sk1, 'SKILL.md'), '---\nname: a-skill\ndescription: A\n---\n\n# A\n', 'utf8')
await writeFile(join(sk2, 'SKILL.md'), '---\nname: b-skill\ndescription: B\n---\n\n# B\n', 'utf8')
await writeFile(join(sk3, 'SKILL.md'), '---\nname: c-skill\ndescription: C\n---\n\n# C\n', 'utf8')

const skills = { async snapshot() { return { complete: true, skills: [] } }, async get() { return undefined } }
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
    const headers = { host: 'localhost:3080' }
    if (origin !== null) headers.origin = origin
    const req = { headers, on: (ev, cb) => { if (ev === 'data') queueMicrotask(() => cb(body)); else if (ev === 'end') queueMicrotask(() => { cb() }); else if (ev === 'error') {} return req } }
    let status = 0, payload = ''
    const res = { writeHead: (s) => { status = s }, end: (p) => { payload = p; resolve({ status, body: JSON.parse(payload) }) } }
    Promise.resolve(registered.handler(req, res)).catch(reject)
  })
}

function assert(cond, label) { if (!cond) throw new Error('FAIL: ' + label); console.log('PASS:', label) }

async function exists(p) { try { await access(p); return true } catch { return false } }

// 1. settings
let r = await call('repoSettingsSet', { roots: [root1, root2], governanceRoot: root1, rootTypes: { [root1]: 'local', [root2]: 'mirror' } })
assert(r.status === 200 && r.body.ok === true && r.body.settings.roots.length === 2, 'repoSettingsSet 保存多个 root')
r = await call('repoSettingsGet', {})
assert(r.body.ok === true && r.body.settings.roots[0] === root1 && r.body.settings.governanceRoot === root1 && r.body.settings.rootTypes[root2] === 'mirror', 'repoSettingsGet 读回 rootTypes')

// 2. repoScan
r = await call('repoScan', {})
assert(r.status === 200 && r.body.ok === true, 'repoScan ok')
assert(r.body.projects.some((p) => p.name === 'projA' && p.hasPkg === true && p.hasGit === false), 'repoScan 识别 package.json 项目')
assert(r.body.projects.some((p) => p.name === 'projB' && p.hasGit === true), 'repoScan 识别 .git 项目')
assert(r.body.projects.some((p) => p.name === 'nestedProj' && p.rel === '分类/nestedProj'), 'repoScan 递归识别分类目录下的项目')
assert(!r.body.projects.some((p) => p.name === '_governance' || p.name === '_snapshots'), 'repoScan 排除治理/快照目录')
assert(r.body.projects.some((p) => p.name === 'skill仓库'), 'repoScan 把 skill仓库（.git 仓库）识别为本地项目')
assert(r.body.projects.find((p) => p.path === projA).type === 'local', '治理根下项目默认 local')
assert(r.body.projects.find((p) => p.path === mirrorProj).type === 'mirror', 'rootTypes 为 mirror 的根下项目识别为镜像')
assert(r.body.mirrors.some((p) => p.path === mirrorProj), 'repoScan mirrors 列表包含镜像项目')
assert(r.body.skillGroups.length === 3, 'repoScan 返回三个技能分组')
assert(r.body.skillGroups.reduce((n, g) => n + g.skills.length, 0) === 3, 'repoScan 识别 3 个技能')
assert(r.body.skillGroups.find((g) => g.key === 'local').skills[0].name === 'a-skill', 'repoScan 本地技能名称来自 frontmatter')

// 2b. repoListDirs / repoCreateDir / repoGetProxy
r = await call('repoListDirs', { path: root1 })
assert(r.body.ok === true && r.body.dirs.includes('分类'), 'repoListDirs 返回一级分类目录')
assert(!r.body.dirs.includes('projA') && !r.body.dirs.includes('projB') && !r.body.dirs.includes('skill仓库'), 'repoListDirs 排除项目目录（.git/package.json/.dsh）')
r = await call('repoCreateDir', { path: join(root1, '新建分类') })
assert(r.body.ok === true && await exists(join(root1, '新建分类')), 'repoCreateDir 创建新分类目录')
r = await call('repoGetProxy', {})
assert(r.body.ok === true && typeof r.body.httpProxy === 'string' && typeof r.body.httpsProxy === 'string', 'repoGetProxy 返回代理设置')

// 3. repoGitStates
r = await call('repoGitStates', { paths: [projA, projB] })
assert(r.body.ok === true && r.body.states[projA].isRepo === false && r.body.states[projB].isRepo === true, 'repoGitStates 区分 git 状态')

// 4. repoScanPluginPackages
r = await call('repoScanPluginPackages', { path: projA })
assert(r.body.ok === true && r.body.packages.some((p) => p.relative === '') && r.body.packages.some((p) => p.relative === 'subpkg'), 'repoScanPluginPackages 根包+子包')

// 5. copySkillToGlobal / copySkillToProject（含跳过）
r = await call('repoCopySkillToGlobal', { src: sk1, name: 'a-skill' })
assert(r.body.ok === true && r.body.skipped !== true, 'copySkillToGlobal 首次复制')
assert(await exists(join(home, 'skills', 'a-skill', 'SKILL.md')), 'copySkillToGlobal 文件落盘')
r = await call('repoCopySkillToGlobal', { src: sk1, name: 'a-skill' })
assert(r.body.ok === false && r.body.skipped === true, 'copySkillToGlobal 已存在跳过')
r = await call('repoCopySkillToProject', { src: sk1, name: 'a-skill', cwd: projA })
assert(r.body.ok === true && r.body.skipped !== true, 'copySkillToProject 首次复制')
assert(await exists(join(projA, '.dsh', 'skills', 'a-skill', 'SKILL.md')), 'copySkillToProject 文件落盘')
r = await call('repoCopySkillToProject', { src: sk1, name: 'a-skill', cwd: projA })
assert(r.body.ok === false && r.body.skipped === true, 'copySkillToProject 已存在跳过')

// 6. repoDeleteSkill（删除镜像技能目录 + 更新 SKILLS.md）
{
  const delSkillDir = join(skillRoot, 'local', 'del-skill')
  await mkdir(delSkillDir, { recursive: true })
  await writeFile(join(delSkillDir, 'SKILL.md'), '---\nname: del-skill\n---\n\n# Del\n', 'utf8')
  const skillsPath = join(skillRoot, 'SKILLS.md')
  await writeFile(skillsPath, '| 技能名 | 源路径(权威) | 仓库内路径 | 来源类型 | 归属项目 |\n|---|---|---|---|---|\n| del-skill | D:\\source\\del-skill | local\\del-skill | 自建 | D:\\source |\n', 'utf8')
  r = await call('repoDeleteSkill', { path: delSkillDir, name: 'del-skill' })
  assert(r.body.ok === true, 'repoDeleteSkill 删除技能 → ok')
  assert(!await exists(delSkillDir), 'repoDeleteSkill 目录已删除')
  const skillsText = await readFile(skillsPath, 'utf8')
  assert(!skillsText.includes('del-skill'), 'repoDeleteSkill 已从 SKILLS.md 移除记录')
}

// 7. repoFetch on non-repo -> ok false
r = await call('repoFetch', { path: projA })
assert(r.body.ok === false, 'repoFetch 非仓库返回 ok:false 不抛错')

await root.ctx?.fiber?.dispose?.()
console.log('ALL REPO PASS (temp home:', home + ')')