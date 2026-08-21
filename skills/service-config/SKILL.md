---
user-invocable: false
name: service-config
description: 给本地项目配置 dsh-manager 服务面板的服务。识别服务类型（Node / Python venv / 前后端一体 / 多服务），生成静默启动配置（venv launcher 弹窗 → base python + PYTHONPATH），写入 services.json，启动并阶梯测试（进程 → 端口 → healthUrl），失败接 AI 诊断，测试后停止。用户要求"配置服务 / 生成服务配置 / 让服务静默启动 / 服务启动弹窗 / 给 X 项目配服务 / 自动测试服务"时触发。
---

# 服务配置（service-config）

给本地项目配置 dsh-manager 服务面板的服务，端到端跑通：**识别 → 静默化 → 确认 → 写入 → 阶梯测试 → 失败诊断 → 测试后停止**。

## 流程

### 0. 前置确认
- 项目路径存在（`stat` 通过且为目录）。
- 服务面板 AI 助手已启用（`readRepoSettings().aiExplain.enabled === true`；未启用先告知用户去面板「AI 服务助手」设置开启）。
- 服务面板地址 `http://127.0.0.1:3080/api/dsh-manager`，POST body `{method, args}`，请求头 `Origin: http://127.0.0.1:3080`。

**完成标准**：路径可 stat、AI 可用（或已明确告知用户）。

### 1. 识别服务类型（确定性探测，AI 只兜底）
按「探测规则表」扫描项目目录，产出**服务清单草稿**（每个服务含 command/args/env/port/healthUrl/detached）。规则覆盖不到的类型（纯二进制、docker-compose、拿不准）→ 停下来问用户，**不硬猜**。

**完成标准**：每个探测出的服务都有一份完整草稿；类型结论有文件证据支撑。

### 2. 静默化（静默 = command 指向最终干活的 exe）
按「静默配方」逐服务处理，保证面板启动不弹控制台窗口。

**完成标准**：每个服务的 command 都是最终 exe 的绝对路径（venv 项目 = base python + `PYTHONPATH` 环境变量）；不再有 venv launcher / bat / npm 包装层。

### 3. 用户确认草稿
一次性展示全部服务草稿（可编辑项：command/args/env/port/healthUrl/detached），**全部服务一起确认**，不要逐个确认。env 密钥值只显示占位不回填。

**完成标准**：用户明确同意或修改后同意。

### 4. 写入 services.json（全量替换）
调 `serviceConfigSet`，**一次传该项目全部服务**——它是全量替换语义，漏传会把已有服务覆盖掉。

**完成标准**：返回 `ok:true` 且返回列表与确认内容一致（逐个字段核对）。

### 5. 阶梯测试 + 测试后停止
按「阶梯测试」启动每个服务并逐级验证；测完**必须停止**（Q5 原则），不把服务留在运行态。

**完成标准**：每个服务达到它应有的等级（有 healthUrl 必须 200，否则至少端口监听）；全部测完且全部已停止。

### 6. 失败 → AI 诊断一轮
某服务启动失败/未达预期 → 调 `serviceAiDiagnose`（喂日志）拿 cause/fix 展示给用户。**不自动改配置重试**（改配置是用户的决定）。

**完成标准**：失败项都有 cause/fix 文本输出；是否改配置由用户拍板。

### 7. 汇报
总结：识别出的类型、写入的服务清单、测试结果、已停止的服务、遗留注意点（如代理池是否为空）。

**完成标准**：用户知道每个服务怎么配的、测了什么、现在什么状态。

## 探测规则表

| 信号 | 结论 |
|---|---|
| `.venv\pyvenv.cfg` 存在 | Python venv。读 `home` 行得 base python 目录；`site-packages = .venv\Lib\site-packages` |
| `package.json` 存在 | Node 项目。查 `main` / `scripts.start` / 顶层 `server.js`、`app.js` |
| `webui\server.py` + `webui\static\` | 前后端一体（FastAPI 伺服静态页 + API），单进程 uvicorn |
| `start.bat` 先起 A 再起 B | 多服务（A、B 是两个独立 entry），逐条解析 bat 里的最终命令 |
| `.env.example` / `.env` | 环境变量名清单（值脱敏，不写真实密钥） |
| `requirements.txt` | Python 依赖线索 |
| 无以上任何信号 | 停下来问用户，不硬猜 |

## 静默配方

面板 spawn 固定 `windowsHide:true`，但**只盖住直接子进程**——弹窗来自孙进程：

- **venv launcher 弹窗**：`.venv\Scripts\python.exe`（~274KB）只是启动器，会再起 base python（孙进程不继承隐藏标志）→ 黑窗口。
  **解法**：`command = <pyvenv.cfg home>\python.exe`（绝对路径），`env.PYTHONPATH = <项目>\.venv\Lib\site-packages`。
- **exe 直启**（node.exe、真 python、任意 exe）：command 直接指 exe 绝对路径即静默，无需处理。
- **bat / npm run**：会再 spawn 孙进程 → 拆成最终 exe + args 数组。

## API 与坑

- `serviceConfigSet {path, services:[...]}`：**全量替换**该 path 的服务列表（踩过：只传新服务把旧的覆盖丢了）。
- 保存时绝对路径 command 会报 warning「未在 PATH 中找到」——**误报**，detached 直启正常，忽略。
- entry 字段：`name/cwd/command/args/env/port/autoStart/autoRestart/detached/healthUrl/envFile/startTimeoutMs`；服务型项目 detached 用 `true`。
- 配置落盘：`D:\Desktop\Dsh\本地项目\_governance\services.json`，结构 `{services:{pathKey:[entry...]}}`。
- PowerShell 脚本里 `$n:` 会被当变量名 → 用 `${n}` 或 `-f` 格式化。
- **测试只做本地验证**：不触发业务动作（不点注册、不调业务 API）；测完自动停止（注册机/API 服务有真实副作用）。

## 验证过的样例

### 样例 1：grok-register（Python venv + 前后端一体 + 多服务）
`D:\Desktop\Dsh\反代项目\注册机\grok-register`
- 探测：`pyvenv.cfg` → home `D:\A_work\编程语言\python\py31210`；`webui\server.py` + `static\` → 前后端一体；`start.bat` 先起 relay → 多服务。
- 服务 1 `grok-register`：command = `D:\A_work\编程语言\python\py31210\python.exe`，args = `[-m, uvicorn, webui.server:app, --host, 127.0.0.1, --port, 8799]`，env = `{PYTHONPATH: <项目>\.venv\Lib\site-packages}`，port = 8799，healthUrl = `http://127.0.0.1:8799/`，detached = true。
- 服务 2 `proxy-relay`：command 同 base python，args = `[proxy_relay.py]`，env 同 PYTHONPATH，port = 10809，healthUrl = `http://127.0.0.1:10810/status`，detached = true。
- 阶梯测试：8799 `/` → 200；`/api/status` → `proxy_ctrl_alive:true`；10810 `/status` → JSON。

### 样例 2：freebuff（Node 单服务）
`D:\Desktop\Dsh\反代项目\ds-freebuff2api`
- 探测：`package.json` + 顶层 `server.js` → Node 单服务。
- 服务 `freebuff`：command = `node`，args = `[server.js]`，port = 8787，detached = true（node 直启天然静默）。
