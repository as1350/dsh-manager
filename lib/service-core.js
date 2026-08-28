// 0.29.0：从 lib/index.js 拆出的纯逻辑函数（无插件状态）。行为与拆分前完全一致。
import { readFile, writeFile, access, rm, rename, stat, mkdir, readdir, appendFile, unlink } from 'node:fs/promises'
import { join, dirname, resolve, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { homedir } from 'node:os'
import net from 'node:net'

const execFileAsync = promisify(execFile)

const SERVICES_LOG_DIRNAME = 'logs'

function commandFirstToken(command) {
  const s = String(command || '').trim()
  if (s.length === 0) return ''
  if (s[0] === '"' || s[0] === "'") {
    const q = s[0]
    const end = s.indexOf(q, 1)
    return end > 1 ? s.slice(1, end) : s
  }
  const m = /^([^\s/\\]+)/.exec(s)
  return m !== null ? m[1] : s.split(/\s+/)[0]
}

function decodeServiceLogChunk(buf) {
  let text = buf.toString('utf8')
  if (text.indexOf('\uFFFD') >= 0) {
    try { text = new TextDecoder('gbk').decode(buf) } catch (error) {}
  }
  return text
}

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function dshManagerDir() {
  return join(dshHome(), 'dsh-manager')
}

function envLinesToObject(text) {
  const env = {}
  String(text || '').split(/\r?\n/).forEach(function (line) {
    const s = line.trim()
    if (s.length === 0 || s[0] === '#') return
    const i = s.indexOf('=')
    if (i <= 0) return
    const k = s.slice(0, i).trim()
    let v = s.slice(i + 1).trim()
    if (v.length >= 2 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) v = v.slice(1, -1)
    if (k.length > 0) env[k] = v
  })
  return env
}

// ---- 0.25.0：独立运行（detached）服务静默启动 ----
// 弹窗根因（子代理实测）：shell:true + detached:true 时，cmd.exe 中介被 detached 创建，
// 不继承父控制台、又无 CREATE_NO_WINDOW → 自行分配一个可见控制台窗口。
// 修复：detached 服务去掉 shell，直接 spawn 可执行文件（windowsHide + 文件 fd stdio）。
// 普通服务（detached:false）保持 shell:true 现状（实测无窗，零回归）。
function expandEnvVars(text) {
  return String(text || '').replace(/%([^%]+)%/g, function (m, name) {
    const v = process.env[name]
    return v !== undefined && v !== null ? String(v) : m
  })
}

// 0.17.7：启动前端口预检 + 失败日志诊断。netstat 解析 LISTENING 行拿到占用 PID。
async function findPidByPort(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null
  try {
    const { stdout } = await execFileAsync('netstat', ['-ano'], { timeout: 5000 })
    const re = new RegExp('^\\s*TCP\\s+\\S*:' + port + '\\s+\\S+\\s+LISTENING\\s+(\\d+)\\s*$', 'im')
    const m = String(stdout).match(re)
    if (m !== null && m[1] !== undefined) return Number(m[1])
    return null
  } catch (error) {
    return null
  }
}

async function findProcessName(pid) {
  try {
    const { stdout } = await execFileAsync('tasklist', ['/FI', 'PID eq ' + pid, '/FO', 'CSV', '/NH'], { timeout: 5000 })
    const m = String(stdout).match(/^"([^"]+)"/m)
    return m !== null && m[1] !== undefined ? m[1] : null
  } catch (error) {
    return null
  }
}

// 引号外出现 & | > < 即视为 shell 操作符（独立运行模式不做 shell 解释，直接拒绝）。
function findShellOperator(text) {
  const s = String(text || '')
  let inDq = false
  let inSq = false
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (inDq) {
      if (c === '\\' && i + 1 < s.length) { i += 2; continue }
      if (c === '"') inDq = false
      i += 1; continue
    }
    if (inSq) {
      if (c === "'") inSq = false
      i += 1; continue
    }
    if (c === '"') { inDq = true; i += 1; continue }
    if (c === "'") { inSq = true; i += 1; continue }
    if (c === '&' || c === '|' || c === '>' || c === '<') return c
    i += 1
  }
  return null
}

function formatServiceLogTime(ts) {
  const d = new Date(ts)
  const p = function (n, w) { return String(n).padStart(w || 2, '0') }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
}

async function isCommandInPath(cmd) {
  if (typeof cmd !== 'string' || cmd.length === 0) return false
  // 显式路径形式（C:\...、.\script.bat、./server.js）不查 PATH。
  if (cmd.indexOf('\\') !== -1 || cmd.indexOf('/') !== -1 || cmd[0] === '.') return true
  try {
    await execFileAsync('where', [cmd], { timeout: 5000 })
    return true
  } catch (error) {
    return false
  }
}

// 进程存活探测：Windows 上 process.kill(pid, 0) 仅抛 ESRCH 表示已死；
// EPERM（无权限）也视为存活。非整数 pid 一律判死。
function isPidAlive(pid) {
  const n = Number(pid)
  if (!Number.isInteger(n) || n <= 0) return false
  try {
    process.kill(n, 0)
    return true
  } catch (error) {
    return error !== undefined && error !== null && error.code === 'EPERM'
  }
}

async function loadEnvFile(cwd, envFile) {
  if (typeof envFile !== 'string' || envFile.trim().length === 0) return { env: {} }
  const file = resolve(cwd, envFile.trim())
  let text = ''
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    return { error: '环境变量文件读取失败（' + file + '）：' + (error instanceof Error ? error.message : String(error)) }
  }
  return { env: envLinesToObject(text) }
}

// 掩码命令行中的敏感值（--token xxx / KEY=value / --password=xxx），超长截断。
function maskCommandLine(cmdline) {
  let text = String(cmdline || '')
  text = text.replace(/(--[a-z0-9_-]*(?:token|key|secret|password|auth)[a-z0-9_-]*)(=|\s+)(\S+)/gi, '$1$2***')
  text = text.replace(/(\b(?:token|key|secret|password|auth)=)(\S+)/gi, '$1***')
  if (text.length > 600) text = text.slice(0, 600) + '…'
  return text
}

function normalizeServicePath(path) {
  return String(path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '')
}

function probeTcpPort(port, timeoutMs) {
  return new Promise(function (resolve) {
    let settled = false
    const socket = net.connect({ host: '127.0.0.1', port: port })
    const finish = function (ok) {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(timeoutMs)
    socket.on('connect', function () { finish(true) })
    socket.on('timeout', function () { finish(false) })
    socket.on('error', function () { finish(false) })
  })
}

// 0.25.1 P0-2：普通服务走 shell:true，args 数组 join 前必须给含空白/特殊字符的参数
// 重新加双引号，否则 cmd.exe 会把「hello world」重新拆成两段（客户端 parseArgs 保存时已剥掉引号）。
// 0.28.0 P2-8：先展开 %VAR%（与 detached 直 spawn 的 expandEnvVars 语义一致——同一参数
// 两种模式行为不再分裂；未定义变量原样保留）。单引号在两种模式下都是字面字符（cmd 与
// Windows argv 都不把 ' 当引号），无需特殊处理。
function quoteCmdArg(arg) {
  const s = expandEnvVars(String(arg))
  if (s.length === 0) return '""'
  if (/[\s"&|<>^]/.test(s)) return '"' + s.replace(/"/g, '\\"') + '"'
  return s
}

// 0.38.0：外部进程与本服务配置的匹配等级（matchExternalProcess）：
//   'cwd'   工作目录子串命中（强）
//   'cmd'   完整启动命令（command + args）命中（强）
//   'name'  服务名词边界命中（强，name ≥ 5 字符）
//   'exe'   仅「命令行首词 exe 基名 == 配置命令首词」命中（弱——node==node 太宽，
//           只能作为展示性「相关」提示，不能作为自动接管/归属判定依据）
//   null    无法确认（命令行不可读 / 未命中任何规则）
// 注意：commandLine 参数要求非空字符串（调用方负责判空，见下面两个包装函数）。
function matchExternalProcess(entry, commandLine) {
  // norm：小写 + 反斜杠统一为正斜杠 + 连续空白压成单空格（外部命令行常有双空格差异）。
  const norm = function (s) { return String(s || '').toLowerCase().replace(/\\/g, '/').replace(/\s+/g, ' ') }
  const escapeRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
  const cl = norm(commandLine)
  const cwd = norm(entry.cwd)
  const fullCmd = norm([entry.command].concat(Array.isArray(entry.args) ? entry.args : []).join(' '))
  const name = norm(entry.name)
  // 0.34.2 F2-2：cwd 太短（盘符根/单字符目录）不参与子串匹配；服务名改为词边界匹配且至少
  // 5 字符，避免 "web"/"server"/"app" 这类通用名把任意进程误判为本服务（误判会被杀或被接管）。
  if (cwd.length > 3 && cl.indexOf(cwd) !== -1) return 'cwd'
  if (fullCmd.length > 0 && cl.indexOf(fullCmd) !== -1) return 'cmd'
  if (name.length >= 5 && new RegExp('(^|[^a-z0-9])' + escapeRe(name) + '($|[^a-z0-9])').test(cl)) return 'name'
  // 0.25.0：独立运行服务直 spawn 的完整 exe 路径（如 D:\...\node.exe server.js）与配置的
  // 裸命令（node server.js）在字符串上不匹配——补「命令行首词的 exe 基名 == 配置命令首词」判定，
  // 保证 dsh 重启后 verifyAdoptedService 能正确接管（否则接管失败会导致独立服务失联）。
  // 0.38.0：降级为「弱匹配」——只影响展示提示，不再参与非 detached 服务的自动接管。
  const clExe = String(cl).split(' ')[0] || ''
  const clBase = clExe.split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '')
  const cmdFirst = norm(commandFirstToken(entry.command))
  if (clBase.length > 0 && cmdFirst.length > 0 && clBase === cmdFirst) return 'exe'
  return null
}

// 判断外部进程是否与本服务配置相关：true=像是外部启动的本服务（任一规则）/ false=疑似其他程序占用 / null=无法确认。
function relateExternalProcess(entry, commandLine) {
  if (typeof commandLine !== 'string' || commandLine.trim().length === 0) return null
  return matchExternalProcess(entry, commandLine) !== null
}

// 0.38.0：强匹配（cwd / 完整命令 / 服务名词边界）——只有强匹配才允许对非 detached 服务自动接管，
// 避免「node==node」这类弱匹配把同运行时的无关进程纳入管理后被误停/误杀。
// 返回：true=强匹配 / false=不匹配或仅弱匹配 / null=无法确认。
function relateExternalProcessStrong(entry, commandLine) {
  if (typeof commandLine !== 'string' || commandLine.trim().length === 0) return null
  const m = matchExternalProcess(entry, commandLine)
  return m === 'cwd' || m === 'cmd' || m === 'name'
}

// .cmd/.bat 不能直接 spawn（EINVAL）。npm/pnpm/yarn 标准 shim 是
// `"%dp0%\node_modules\<pkg>\bin\<entry>.js|cjs"` —— 读出入口脚本路径，改写为 node 直跑。
async function resolveCmdEntryScript(cmdPath) {
  let text = ''
  try { text = await readFile(cmdPath, 'utf8') } catch (error) {
    return { error: '无法读取 .cmd 命令文件（' + cmdPath + '）：' + (error instanceof Error ? error.message : String(error)) }
  }
  const raw = String(text)
  // 0.26.0 P0-B：shim 文件里字面文本是 %~dp0 或 %dp0（% 后直接跟 \，不存在「%~dp0%」），
  // 且本机 npm.cmd/npx.cmd 是 SET 变量风格（SET "VAR=%~dp0\node_modules\...\cli.js"），
  // 其中可能先出现辅助脚本（如 npm-prefix.js）后出现真正入口（npm-cli.js）。
  // 策略：先收集 SET VAR=...js 映射，再从文件末尾往前找「带 %* 的执行行」引用了哪个 VAR；
  // 没有 SET 映射（corepack 直写风格）则取文件里最后一个 %~dp0/%dp0\...\.js 引用。
  const setAssignments = new Map()
  for (const mm of raw.matchAll(/SET\s+"([A-Za-z0-9_]+)=((?:%~dp0|%dp0)\\[^"\r\n]+?\.(?:js|cjs))"/gi)) {
    setAssignments.set(String(mm[1]).toUpperCase(), mm[2])
  }
  let chosen = null
  const lines = raw.split(/\r?\n/)
  for (let i = lines.length - 1; i >= 0 && chosen === null; i -= 1) {
    const line = lines[i]
    if (line.indexOf('%*') === -1) continue
    for (const mm of line.matchAll(/%([A-Za-z0-9_]+)%/g)) {
      const hit = setAssignments.get(String(mm[1]).toUpperCase())
      if (hit !== undefined) { chosen = hit; break }
    }
  }
  if (chosen === null) {
    let last = null
    for (const mm of raw.matchAll(/((?:%~dp0|%dp0)\\[^"\r\n]+?\.(?:js|cjs))/gi)) last = mm[1]
    chosen = last
  }
  if (chosen === null) {
    return { error: '无法解析 .cmd 命令的入口脚本（' + cmdPath + '）：仅支持 npm/pnpm/yarn 标准 shim 格式；请改用直接可执行文件（如 node <脚本>）' }
  }
  const rel = String(chosen).replace(/^%+~?dp0%?\\?/i, '')
  const entry = resolve(dirname(cmdPath), rel)
  try { await access(entry) } catch (error) {
    return { error: '.cmd 入口脚本不存在：' + entry + '（' + cmdPath + '）' }
  }
  return { path: entry }
}

// 把独立运行服务的 command+args 解析成可直接 spawn 的 {command, args, shell:false}。
// 0.25.1 P0-1：只对 command 字段做 %VAR% 展开 / shell 操作符检测 / 切词（取可执行文件与内联参数）；
// args 数组原样追加（仅逐项展开 %VAR%），直接交给 spawn 数组参数——Windows argv 数组天然
// 支持空格参数，绝不能再拼成字符串重切（会把「hello world」拆成两段），也绝不对 args 做操作符检测。
async function resolveDetachedCommand(entry) {
  const cmdExpanded = expandEnvVars(entry.command)
  const op = findShellOperator(cmdExpanded)
  if (op !== null) return { error: '独立运行模式不支持 shell 操作符（' + op + '）：请拆成单个命令（如 command=node + args=server.js），或关闭「独立运行」' }
  const tokens = tokenizeCommandLine(cmdExpanded)
  if (tokens.length === 0) return { error: '启动命令为空' }
  const exe = tokens[0]
  const inlineArgs = tokens.slice(1)
  const args = inlineArgs.concat((Array.isArray(entry.args) ? entry.args : []).map(expandEnvVars))
  let resolved = exe
  const pathLike = exe.indexOf('\\') !== -1 || exe.indexOf('/') !== -1 || exe[0] === '.'
  if (!pathLike) {
    try {
      const { stdout } = await execFileAsync('where', [exe], { timeout: 5000, windowsHide: true })
      const lines = String(stdout).split(/\r?\n/).map(function (l) { return l.trim() }).filter(function (l) { return l.length > 0 })
      if (lines.length === 0) return { error: '命令不存在：' + exe + '（不在 PATH 中）。请使用完整路径（如 C:\\...\\node.exe）或先安装该命令' }
      // 0.26.0 P0-A：where 会把无扩展名的 POSIX sh（如 npm/pnpm/npx）排在 .cmd 前面，
      // 直 spawn 无扩展名文件必挂；优先选带 Windows 可执行扩展名（.exe/.cmd/.bat）的行。
      const winExe = lines.find(function (l) { return /\.(?:exe|cmd|bat)$/i.test(l) })
      resolved = winExe !== undefined ? winExe : lines[0]
    } catch (error) {
      return { error: '命令不存在：' + exe + '（不在 PATH 中）。请使用完整路径或先安装该命令' }
    }
  }
  const lower = String(resolved).toLowerCase()
  if (lower.endsWith('.cmd') || lower.endsWith('.bat')) {
    const cli = await resolveCmdEntryScript(resolved)
    if (cli.error !== undefined) return cli
    return { spawn: { command: process.execPath, args: [cli.path].concat(args), shell: false } }
  }
  return { spawn: { command: resolved, args: args, shell: false } }
}

function serviceLogFilePath(path, name) {
  const key = serviceStateKey(path, name)
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 12)
  const slug = String(name || 'svc').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24) || 'svc'
  return join(servicesLogDir(), 'svc-' + hash + '-' + slug + '.log')
}

function serviceStateKey(path, name) {
  return normalizeServicePath(path) + '|' + name
}

function servicesLogDir() {
  return join(dshManagerDir(), SERVICES_LOG_DIRNAME)
}

async function stopServicePid(pid) {
  return terminatePid(pid, { force: true })
}

async function stopServicePidGraceful(pid, waitMs) {
  return terminatePid(pid, { graceMs: waitMs })
}

function summarizeStartupFailure(logText, port) {
  const text = String(logText || '')
  if (text.length === 0) return ''
  const parts = []
  if (/EADDRINUSE/i.test(text)) {
    parts.push('端口冲突（EADDRINUSE）' + (Number.isInteger(port) && port > 0 ? '：端口 ' + port + ' 已被占用' : ''))
  }
  if (/Cannot find module/i.test(text)) parts.push('依赖缺失（Cannot find module）：请先在项目目录运行 npm install / pnpm install')
  if (/不是内部或外部命令|is not recognized as an internal or external command/i.test(text)) parts.push('命令不存在：请检查启动命令是否为可执行命令')
  if (/SyntaxError|ReferenceError|TypeError/.test(text)) parts.push('脚本错误：请检查程序代码或启动参数')
  if (parts.length === 0) {
    const firstLine = text.split(/\r?\n/).find(function (line) { return line.trim().length > 0 })
    if (firstLine !== undefined) parts.push('日志首行：' + firstLine.trim())
  }
  return parts.length > 0 ? '日志诊断：' + parts.join('；') : ''
}

// 0.27.0：停止进程的唯一实现——可选优雅阶段（先 /T 发 WM_CLOSE 等待 graceMs，再 /T /F 强杀兜底）。
// 历史教训（0.23.0）：taskkill exit 128 也可能是「无法优雅终止」，绝不能当作已停止，仅凭 /not found/ 判定。
async function terminatePid(pid, opts) {
  const o = opts || {}
  const n = Number(pid)
  if (!Number.isInteger(n) || n <= 0) return { stopped: false }
  if (!isPidAlive(n)) return { stopped: false }
  if (o.force !== true) {
    try {
      await execFileAsync('taskkill', ['/PID', String(n), '/T'], { timeout: 4000 })
    } catch (error) {
      if (error !== undefined && error !== null && /not found/i.test(String(error.message || error))) return { stopped: true }
      // 其它错误不立即返回，下面仍有强杀兜底。
    }
    const deadline = Date.now() + (Number.isInteger(o.graceMs) && o.graceMs > 0 ? o.graceMs : 5000)
    while (isPidAlive(n) && Date.now() < deadline) await new Promise(function (resolve) { setTimeout(resolve, 250) })
    if (!isPidAlive(n)) return { stopped: true }
  }
  try {
    await execFileAsync('taskkill', ['/PID', String(n), '/T', '/F'], { timeout: 8000 })
    return { stopped: true }
  } catch (error) {
    // 进程已经不存在 = 停止成功；其它错误如实返回 stopped:false（0.17.0 修复：不再吞错）。
    if (error !== undefined && error !== null && /not found/i.test(String(error.message || error))) return { stopped: true }
    return { stopped: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// 引号感知切分（与 client.parseArgs 语义一致）：双引号内 \" 转义、单引号原样、未闭合引号整段作一个参数。
function tokenizeCommandLine(text) {
  const tokens = []
  const s = String(text || '')
  let cur = ''
  let i = 0
  let inDq = false
  let inSq = false
  while (i < s.length) {
    const c = s[i]
    if (inDq) {
      if (c === '\\' && i + 1 < s.length) { cur += s[i + 1]; i += 2; continue }
      if (c === '"') { inDq = false; i += 1; continue }
      cur += c; i += 1; continue
    }
    if (inSq) {
      if (c === "'") { inSq = false; i += 1; continue }
      cur += c; i += 1; continue
    }
    if (c === '"') { inDq = true; i += 1; continue }
    if (c === "'") { inSq = true; i += 1; continue }
    if (/\s/.test(c)) {
      if (cur.length > 0) { tokens.push(cur); cur = '' }
      i += 1; continue
    }
    cur += c; i += 1
  }
  if (cur.length > 0) tokens.push(cur)
  return tokens
}
export { commandFirstToken, decodeServiceLogChunk, dshHome, dshManagerDir, envLinesToObject, expandEnvVars, findPidByPort, findProcessName, findShellOperator, formatServiceLogTime, isCommandInPath, isPidAlive, loadEnvFile, maskCommandLine, normalizeServicePath, probeTcpPort, quoteCmdArg, relateExternalProcess, relateExternalProcessStrong, resolveCmdEntryScript, resolveDetachedCommand, serviceLogFilePath, serviceStateKey, servicesLogDir, stopServicePid, stopServicePidGraceful, summarizeStartupFailure, terminatePid, tokenizeCommandLine, SERVICES_LOG_DIRNAME }
