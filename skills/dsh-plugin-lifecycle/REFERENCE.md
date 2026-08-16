# REFERENCE — DSH 插件生命周期参考手册

> 本文件是 `dsh-plugin-lifecycle` 的下沉参考：正文步骤遇到"详见 REFERENCE"或卡住时按节查阅。技术内容源自 dsh-super-injector（@dsh-external/dsh-super-injector v0.3.x）与已归档的 dsh-static-plugin-packaging / dsh-plugin-production-line 技能，均为本机实测沉淀。

## 1. 官方装配机制（dsh plugin add 实际怎么工作）

1. `dsh plugin --profile <name> <args...>` 是 pnpm 转发器：在 `$DSH_HOME/profiles/<name>` 跑 pnpm（首次自动从模板初始化），然后对账 `dsh.profile.bundles`——每个安装的依赖若 package.json 声明了 `dsh.bundle.patch`，按包的真实名追加进 bundle 列表；无 bundle 声明的包只作为普通依赖安装（有警告）。
2. 启动时：bundle patches 按 `dsh.profile.bundles` 顺序叠在空 root 上 → 再叠 profile 的 `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` 覆盖。bundle 的 patch 是普通 patch 列表：`- insert: - id: <唯一id>, name: '<包名>'`。行 id 必须在整个组合中唯一。
3. 浏览器名册：`client-modules` 扫描活的 Loader entries，找声明了 `dsh.client`（platform: "web"）且 `exports["./client"]`（字符串或 `{ default }`）的包；在 `/plugins/<包名>/client.js?rev=…` 提供 bundle，并把 `window.__DSH_BOOT__` 注入 index.html。图 entry id = 包名 → 组合行的 name 必须与包名**完全一致**。
4. 浏览器 entry 通过 `window.__ModuleLoader__.load({ id, factory })` 加载。shell 内置模块表提供：react、react/jsx-runtime、react-dom、@deepseek-ai/cordis、@deepseek-ai/dsh-client-ui-slots、@deepseek-ai/dsh-client-web-react、@deepseek-ai/dsh-client-ui-primitives。require 其它东西前先查当前表。
5. 外部包的模块解析：启动时 harness 用 symlink 覆盖 dsh 应用的全部依赖闭包到 `$DSH_HOME/profiles/node_modules`，Node 从 store 安装的包向上找父目录可达。因此：运行时 import 必须在应用依赖闭包内；harness 包只声明为 peerDependencies（autoInstallPeers: false 时 pnpm 不会去拉）。

## 2. 传输选型（host ↔ client 通信）

- `harness.handle` / `host.call`：**动态插件 runner 专用，静态包不可用**；
- api-proxy RPC 表：关闭/编译进部署，外部包加不了端点；
- Typert remotes：host SRC 发现存在，但 Node 22/24 无原生装饰器，客户端贡献通常编在 `@deepseek-ai/dsh-api-remotes` 的 client bundle 里——外部包不可行；
- **推荐：host webServer 上的包私有路由 + 浏览器同源 fetch**（内置 market 插件同款，完全在外部包能力范围内）。

同源校验：每个请求都做 `new URL(req.headers.origin).host === req.headers.host`（不只是写操作；浏览器对 fetch POST 总会带 Origin，缺 Origin 的请求按 CSRF 拒绝）。

## 3. 沙箱教训：用户点击触发的写入

`ctx.get('fs')` 是**模型面**文件系统接缝，不是插件存储 API：

- 无会话调用时按部署默认策略解析——workspace-write 拒绝工作区外写入，插件会得到 `file access denied under workspace-write mode`；
- 官方升级通道（approveEscalation）需要开放的 agent 回合 + 审批通道——浏览器点击场景不可用；
- 正确模型：浏览器里用户点击 = **用户动作，非模型动作**。作为受信任的 host 行，用原生 `node:fs` 直接写（dsh-settings-file 等内置 host provider 就是这么干的）。边界自设：
  1. 目标路径来自受信注册表查询（如 `skills.get(name).path`），绝不来自请求体；
  2. 显式来源 allowlist 拒绝只读 provider（bundled/runtime/custom）；
  3. 原子写（临时文件 + rename）；共享读改写存储用模块级队列串行化。
- 用户私有数据（绝不能进模型上下文）放自己的 sidecar 文件（如 `~/.dsh/<pkg>-notes.json`），绝不写进模型消费的文件（如 SKILL.md）。

## 4. 四形态细节 + client 两步构建 + slot 用法

### 形态速查

- **toolkit**：注册工具；骨架 apply() 里 `ctx.tools.register` + defineTool；高性能铁律：schema 精简（description 短句、详解放 tool result/静态引导），工具面 ≥5 时启用首轮锚定（骨架注释块，system-prompt/assemble Waterfall 过滤器）。
- **daemon-loop**：`inject: ['timer', 'llm']`；`ctx.setInterval` 驱动 → `ctx.llm.stream` 决策 → 行动；日志写 `~/.dsh/super-injector/<短名>.log`。
- **ui-panel / hybrid**：host 工具 + webServer 前缀路由 + client 面板；client 必须 `export const inject = ['slots']`，register 必须带 name 字段（= slot 名，缺了报 `slot undefined is not declared`）。

### client 两步构建

host：`bash scripts/build.sh`（tsc → lib/）；client：`npm run build:client`（tsdown → lib/client.js，banner `window.__ModuleLoader__.load(...)`）。**缺 client 构建 → 注入预检会拦截**（前端必挂）。

### slot 用法（client）

已知 slot：`conversation.view`、`settings.plugin.item`、`settings.plugins.tab`、`settings.section`、`settings.general.item`、`conversation.session.header.actions`、`conversation.session.header.utilities`、`conversation.input.dock`、`conversation.composer.dock`、`sidebar.footer.action`、`shell.overlay`。

注册模式：`ctx.slots.inject('<slot>', () => ctx.slots.register({ name: '<slot>', id, order, label, component }))`，全部挂 `ctx.effect`。

## 5. 内化路径（/ingest）

任意文件夹（代码/脚本/配置/文档，非插件形态）→ 注入器 UI（设置 → 插件）或 `POST /super-injector/api/ingest` → 新建 agent 会话，AI 分析内容 → 选形态 → dev_scaffold_plugin → 构建 → 注入 → 自检。返回新会话 id，完成后在会话列表可见。

## 6. 动态 → 静态移植对照表

| 动态插件 | 静态包 |
|---|---|
| `harness.handle(method, fn)` 方法体 | dispatch 表 `{ method: async (args) => … }`，闭包 ctx，wire 形状不变（`{error}` / `{ok}` / 数据对象） |
| `host.call(method, args)` | `fetch('/api/<ns>', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({method, args}) })` |
| `styles.insert(css)` | `<style>` 标签，在 ctx.effect 内插入 + 清理 |
| `ctx.interval` / `ctx.timeout` | `window.setInterval` / `window.setTimeout` |
| `locale.register` / `slots.inject` / `slots.register` | 原样保留（面向真实浏览器服务） |
| 模块级 port/store 模式 | 保留；slot 组件 props 来自 slot 渲染器，不从 apply 传 |

## 7. 验证阶梯（从轻到重，别跳级直接装）

1. **语法**：`node --check lib/index.js lib/client.js`；
2. **功能冒烟**：把包复制进 `$DSH_HOME/profiles/node_modules/<scope>/<name>`，脚本 import **包根 specifier**（exports 子路径锁：不要 import `pkg/lib/…`），用真实 `@deepseek-ai/cordis` Context + mock 服务（含捕获型 webServer）mount `{ apply, inject, name }`，驱动路由断言全部方法 + 错误/404/403/无 Origin 路径；
3. **打包**：`pnpm pack`，核对 tarball 只含 files 白名单；
4. **重型试装（trial boot）**：临时 DSH_HOME（profiles/web 模板 + `nodeLinker: hoisted` + `autoInstallPeers: false`）→ `dsh plugin --profile web add <tgz>` → 用真实 bin.js 后台启动 → 等 `dsh web: http://` 就绪行（Loader 树落定后才打印，坏 patch/缺服务/坏 client 声明会在它之前失败）→ HTTP 检查（`/plugins/<pkg>/client.js` 200、`/` 含包名、POST 业务 JSON、跨域/无 Origin 403）→ 杀进程树删临时目录。写临时文件用 `[System.IO.File]::WriteAllText`（`Set-Content -Encoding UTF8` 的 BOM 会炸 manifest 的原始 JSON.parse）；
5. **注入器轻量验证**：`dev_inject_plugin` 返回 host ✓ / client ✓（或预期跳过）+ `dev_plugin_status` 显示 active——**日常迭代用这个**，重型阶梯留给"要交付/要发布"。

## 8. 踩坑表

- 用户点击触发的 UI 写入绝不走 `ctx.fs` → 用 `node:fs`（§3）；
- PowerShell `Set-Content -Encoding UTF8` 写 BOM → 用 `[System.IO.File]::WriteAllText`；
- `.ps1` 脚本里非 ASCII 内容不可靠（解析错误/静默吞行）→ 验证脚本纯 ASCII；
- `dsh` 是 `.cmd` shim → `Start-Process` 用不了，用真实 bin.js 入口；
- exports 子路径锁 → 只 import 包根；
- Node 22/24 无原生装饰器 → 别在纯 JS host 代码里用 `@Remote`；
- `dsh plugin add` 相对路径锚定调用 cwd → 传绝对路径/tgz 绝对路径；
- pnpm 警告缺 peer 正常（autoInstallPeers: false）——**运行时真的 import 的**必须在依赖闭包内，否则启动失败；
- `client-modules` / `typert-loader` 按进程缓存 verdict → 插件集变化要重启才生效；
- profile manifest 由对账步骤以 2 空格 JSON 重写 → 别手改；
- **注入器补充**：client 操作必须用完整包名（processOne 精确匹配，短名静默失败）；资源注册必须挂 `ctx.effect`（否则热重载 duplicate/僵尸残留）；重载匹配串含包名；匹配注入器自身必须走自重载（match 含 `dsh-super-injector`），普通路径会拒绝；构建产物新鲜度预检不过会阻断重载（先修复再重载）；注入 ≠ 生产化——`dev_install_package` 才落 bundles。

## 9. 命令速查

### 注入器生命周期工具

| 工具 | 作用 |
|---|---|
| `dev_scaffold_plugin` | 生成四形态骨架（toolkit / daemon-loop / ui-panel / hybrid） |
| `dev_build_plugin` | 构建打包（探测 DSH_CHECKOUT → tsc host → tsdown client → npm pack → tgz） |
| `dev_inject_plugin` | 运行时注入（免重启，开发态） |
| `dev_reload_package` | 整包热重载（清缓存 → import → 重建 fiber，失败回滚；含自重载） |
| `dev_install_package` | 双路径生产化（profile bundles + junction + loader.create，重启后官方接管） |
| `dev_release_plugin` | GitHub Release（v<version> + tgz 附件 + notes） |
| `dev_uninject_plugin` | 运行时卸载注入的插件（fiber 全清理 → 清清单 → 删 junction；bundle 插件写 disabled 防加回） |
| `dev_injected_list` | 列出注入清单（registry.json） |
| `dev_plugin_status` / `dev_self_test` | 装配清单与全链路自检（8 项） |

### 官方安装 / 移除（无注入器 / 分发场景）

```powershell
pnpm pack
dsh plugin --profile web add .\pkg-name-0.1.0.tgz   # 安装，重启生效
dsh plugin --profile web remove @scope/pkg-name      # 移除，重启生效
```

### 组合面规则

- bundle patch 插入的是 **profile 根部的 host 行**——client-modules 只扫根组合里 fiber 活的 entry；不要放进 preset realm；
- host 半提供 Cordis 服务时必须留在 root realm；**更优：不发布服务**（纯路由注册规避命名冲突与 realm 规则）。

## 10. 卸载与删除细节（分支 C 的参考）

### 按通道的删除对照

| 插件来源 | 删除动作 | 重启？ |
|---|---|---|
| 运行时注入（dev_inject_plugin） | `dev_uninject_plugin <包名子串>` | 否 |
| 官方 bundle（dsh plugin add） | `dsh plugin --profile <名> remove <完整包名>` | 是（彻底生效） |
| 双路径（dev_install_package 生产化过） | 先 `dev_uninject_plugin`（运行时）再官方 remove（配置） | 是（配置层彻底） |
| 动态单文件（evolve .mjs） | 删除源文件（不经注入器） | 否 |
| agent 预设（如 router-standard） | 删除 `~/.dsh/.agent-presets/<名>` 目录 | 否 |

### 注意

- `dev_uninject_plugin` 对官方 bundle 插件只写 **disabled 条目**（运行时禁用，防 include.refresh 加回），不是配置层移除——彻底移除要走官方 remove；
- **注入器自身受保护**：`dev_uninject_plugin` 拒绝匹配 dsh-super-injector；要卸它走官方 remove + 清理 node_modules 链接与 patch 残留（INSTALL.md §7 有完整步骤）；
- 删除后验证：`dev_plugin_status` 无此包 / `dev_injected_list` 无此名 / profile package.json 依赖与 bundles 无残留；
- **绝不删插件源目录来"卸载"**——junction 悬空会让注入器重启恢复失败；
- 匹配串过短会误伤（如 "git"）——先 `dev_injected_list` / `dev_plugin_status` 列候选让用户确认。
