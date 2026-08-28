// dsh-manager 外部进程匹配分级单元测试（0.38.0）
// lib/service-core.js 零 dsh 依赖（仅 node 内置模块），可直接运行：
//   node scripts/unit-match.mjs
// 覆盖：relateExternalProcess（旧语义兼容：任一规则=相关）与
// relateExternalProcessStrong（强匹配：cwd/完整命令/服务名；exe 基名弱匹配不算）。
import { relateExternalProcess, relateExternalProcessStrong } from '../lib/service-core.js'

let pass = 0
let fail = 0

function assert(cond, label) {
  if (cond) { pass += 1; console.log('PASS:', label) }
  else { fail += 1; console.log('FAIL:', label) }
}

// —— 通用入口：cwd 强匹配（配置工作目录出现在命令行里）——
{
  const entry = { cwd: 'D:\\dev\\account-manager', command: 'node src/index.js', name: 'account-manager' }
  const cl = 'node D:\\dev\\account-manager\\src\\index.js --port 8080'
  assert(relateExternalProcess(entry, cl) === true, 'cwd 命中 → relate=true')
  assert(relateExternalProcessStrong(entry, cl) === true, 'cwd 命中 → strong=true')
}

// —— 完整命令强匹配（command+args 子串）——
{
  const entry = { cwd: 'D:\\dev\\other', command: 'node', args: ['server.js'], name: 'anything-service' }
  const cl = 'node server.js --host 0.0.0.0'
  assert(relateExternalProcess(entry, cl) === true, '完整命令命中 → relate=true')
  assert(relateExternalProcessStrong(entry, cl) === true, '完整命令命中 → strong=true')
}

// —— 服务名词边界强匹配（脚本路径含服务名）——
{
  const entry = { cwd: 'D:\\dev\\elsewhere', command: 'node x.js', name: 'account-manager' }
  const cl = 'node C:\\tools\\account-manager\\bin\\serve.js'
  assert(relateExternalProcess(entry, cl) === true, '服务名命中 → relate=true')
  assert(relateExternalProcessStrong(entry, cl) === true, '服务名命中 → strong=true')
}

// —— 弱匹配：仅 exe 基名相同（node==node），relate 相关但 strong 必须为 false ——
// 这正是 0.38.0 的关键分级：普通服务不能凭这条自动接管（防误纳管同运行时的无关进程）。
{
  const entry = { cwd: 'D:\\dev\\account-mgr', command: 'node server.js', name: 'account-manager' }
  const cl = 'node C:\\unrelated\\someother.js' // 无 cwd/命令/服务名，仅首词同为 node
  assert(relateExternalProcess(entry, cl) === true, '仅 exe 基名命中 → relate=true（弱相关）')
  assert(relateExternalProcessStrong(entry, cl) === false, '仅 exe 基名命中 → strong=false（不接管）')
}

// —— 无关进程：不同运行时 → 完全不相关 ——
{
  const entry = { cwd: 'D:\\dev\\account-mgr', command: 'node server.js', name: 'account-manager' }
  const cl = 'python C:\\other\\app.py'
  assert(relateExternalProcess(entry, cl) === false, '无关进程 → relate=false')
  assert(relateExternalProcessStrong(entry, cl) === false, '无关进程 → strong=false')
}

// —— 命令行不可读：空串 → null（保持「无法确认」，不误判为无关）——
{
  const entry = { cwd: 'D:\\dev\\account-mgr', command: 'node server.js', name: 'account-manager' }
  assert(relateExternalProcess(entry, '') === null, '空命令行 → relate=null')
  assert(relateExternalProcessStrong(entry, '') === null, '空命令行 → strong=null')
}

// —— 0.34.2 收紧回归：cwd 太短（盘符根）不参与子串匹配 ——
// 隔离方法：命令行含 'c:/' 子串、且用不同运行时（python vs node）切断 exe 弱匹配。
{
  const entry = { cwd: 'C:\\', command: 'node server.js', name: 'account-manager' }
  const cl = 'python c:/somewhere/server.py'
  assert(relateExternalProcess(entry, cl) === false, 'cwd=盘符根不参与匹配 → relate=false')
}

// —— 0.34.2 收紧回归：服务名 <5 字符不参与词边界匹配 ——
// 隔离方法：命令行含 'web' 字样但不含 cwd，且用不同运行时切断 exe 弱匹配。
{
  const entry = { cwd: 'D:\\dev\\else', command: 'node x.js', name: 'web' }
  const cl = 'python C:\\projects\\web-app\\server.py'
  assert(relateExternalProcess(entry, cl) === false, '服务名<5 字符不命中 → relate=false')
  // 对照：同名但 ≥5 字符时应命中（词边界 'web-app'）。
  const entry2 = { cwd: 'D:\\dev\\else', command: 'node x.js', name: 'web-app' }
  assert(relateExternalProcess(entry2, cl) === true, '服务名≥5 字符命中 → relate=true')
  assert(relateExternalProcessStrong(entry2, cl) === true, '服务名≥5 字符命中 → strong=true')
}

// —— 大小写 / 反斜杠 / 双空白归一化 ——
{
  const entry = { cwd: 'D:\\Dev\\Account-Manager', command: 'node  src\\index.js', name: 'account-manager' }
  const cl = 'node  D:\\DEV\\account-manager\\src\\index.js'
  assert(relateExternalProcess(entry, cl) === true, '大小写/反斜杠/双空格归一化后命中 → relate=true')
  assert(relateExternalProcessStrong(entry, cl) === true, '归一化后仍强匹配 → strong=true')
}

// —— detached 服务语义回归：exe 基名弱匹配对 detached 仍算「相关」（0.25.0 保证重启接管）——
// relateExternalProcess 语义未变；relateExternalProcessStrong 只用于非 detached 自动接管。
{
  const entry = { cwd: 'D:\\dev\\daemon', command: 'node daemon.js', name: 'daemon-service' }
  const cl = 'node D:\\dev\\daemon\\daemon.js' // cwd+命令都命中，属强匹配，不依赖 exe 规则
  assert(relateExternalProcessStrong(entry, cl) === true, 'daemon 完整路径命中 → strong=true')
}

console.log('')
console.log(fail === 0 ? `ALL ${pass} PASS` : `${fail} FAILED (${pass} passed)`)
process.exit(fail === 0 ? 0 : 1)
