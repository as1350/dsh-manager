# @deepseek-ai/dsh-manager

DSH Web 的管理面板合集（Skills 管理 + 部署补丁管理）——**静态插件包**（0.6.0 起由
`@deepseek-ai/dsh-skill-manager` 更名合并而来）。

## Skills 管理

按 全局 / 项目 / 插件 / 预设 / 系统内置 五组汇总当前技能目录（0.8.5 起把「插件 / 预设」拆为两组：
`custom` + 全局作用域 = 插件，`custom` + 预设作用域 = 预设），展示并**独立切换**每个技能的
`Agent 可调用` 与 `用户可调用` 两个开关（直接改写技能文件的 frontmatter），支持：
- 查看与编辑技能配置文件（可编辑来源可保存，只读来源只能外部打开）
- **回收站**：卡片删除按钮（二次点击确认）把技能**移入回收站**；左侧导航「系统内置」下方新增
  「回收站」组，可**还原**或**彻底删除**（彻底删除需二次确认，不可恢复）
- **每技能一条用户备注**（卡片下半区，标题 + 内容；仅用户可见，模型不会读取）
- **备注名即 `/` 菜单别名**：面板里给技能写的备注名会注册为 `/` 触发菜单的「技能别名」源——
  模糊匹配（同命令源算法）、仅"用户可调用"开启的技能参与、原名已命中时不重复出现；
  选中别名行后输入框写入 `/技能原名 `；面板内搜索框同样支持按备注名过滤
- **拼音 / 首字母匹配（0.5.0）**：备注名与中文技能原名在 `/` 菜单里支持拼音全拼前缀、
  拼音有序子序列模糊、音节首字母前缀（如 `kaoda`、`kaod`、`kd`、`kdw` 均可命中"拷打我"）；
  面板搜索同样支持拼音/首字母**子串**过滤。拼音由宿主端 `pinyin-pro` 一次性转换并随
  `notesGet`/`catalog` 下发为普通字符串字段，客户端零新增依赖、零 bundler、bundle 体积不变。
  匹配层级：原文前缀 > 原文模糊 > 全拼前缀 > 首字母前缀 > 全拼模糊；无别名但原名含中文、
  被拼音命中的技能在菜单里显示为裸原名
- **击键零 RPC 缓存（0.5.1）**：`/` 菜单源改为按会话客户端缓存（catalog+notesGet 并行拉取、
  6 秒 TTL、过期后台刷新 stale-while-revalidate），命中时候选同步返回，把"空结果自动关闭"
  前的等待压到一帧内

## 部署补丁管理（0.7.0：目录驱动）

侧边栏 **Skills 上方**新增「补丁」按钮（同款样式）→ 目录驱动的补丁面板。补丁是一个**声明文件 +
 可选配套文件**的集合，放在补丁目录里即被识别：

```
~/.dsh/dsh-manager/patches/
├── *.dsh-patch.json        声明文件（根目录 =「默认」类别；一级子目录 = 类别）
├── *.dsh-patch.js          script 类型的纯函数配套（module.exports = { apply(text) }）
├── <name>.override/        override 类型配套：目录内单个名为 file 的整文件替换
├── .state/files/<sha1(abs)>.json   每目标文件的机器状态（官方快照 + 启用链 + 校验和）
├── .state/snapshots/<sha256>        官方快照（文件名 = 内容 sha256 hex）
└── RECOVERY.md             人类可读恢复手册（dsh 打不开时的复原指南）
```

- **三类补丁**：
  - `replace`：在目标文件内做「查找 → 替换」对（每个 find 必须恰好出现 `count` 次，否则拒绝写入）
  - `script`：运行一个无 IO 的纯函数（`*.dsh-patch.js`），受「允许可执行补丁」总闸控制，只能从面板启用
  - `override`：用目录内一个整文件覆盖部署目标（同文件自动排他）
- **多文件事务**：一个补丁可声明 `files[]`，启用 = 先全部快照 → 逐个原子写 → 失败回滚已写文件
- **官方快照 + 链重放**：每目标文件保存「官方原版快照 + 启用链」。同一文件上多个补丁靠**链重放**
  共存（先干跑裁定）；官方升级只影响被更新文件上的补丁，任一文件失配 → 整补丁「已丢失」
- **前置/互斥**：补丁可声明 `prerequisites`（前置须已启用）与 `conflicts`（互斥不可同时启用）
- **收养（adoption）**：磁盘上已带标记但无状态文件的补丁（如历史版本已应用的），扫描时自动
  反向推导官方快照、补写状态
- **导入与拖放**：面板支持导入 `*.dsh-patch.json`（结构校验 + id 唯一性 + 类别归属）与拖放文件
- **可执行总闸**：`settings.allowExecutable` 默认开启，可整体禁用 script 类补丁
- **状态永不缓存**：每次打开面板现场读盘判定——已启用 / 未启用 / **已丢失（官方升级覆盖）**；
  手动覆盖升级同样如实反映；官方代码重构时拒绝写入并提示
- **原子写**：临时文件 + rename，运行中的服务器永不读到半写状态；启用/禁用后**刷新浏览器即生效**
  （内置 bundle 按请求读盘，无需重启服务器）
- **提醒模式开关**：默认「面板内轮询」（不打扰）；可切「后台轮询 + 按钮角标」（补丁丢失时按钮亮红点）
- **RECOVERY.md**：每次状态变更后原子重写，列出「已启用补丁 → 官方备份绝对路径」，并提供一键还原命令
- CLI 兜底：`scripts/reapply-deployment-patches.ps1`（幂等、自保护、原子写）——面板不可用时
  仍可查状态 / 还原快照 / 重打干净补丁（见下文「部署补丁（CLI 兜底）」）

**声明文件 schema 示例**（`*.dsh-patch.json`，`file` 为部署根内相对路径）：

```json
{
  "id": "slash-seed",
  "name": "斜杠播种",
  "description": "空输入框默认 /，裸 / 视为空不发送，发送后重置回 /",
  "apply": "refresh",
  "prerequisites": [],
  "conflicts": [],
  "files": [
    {
      "file": "node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js",
      "kind": "replace",
      "marker": "dsh-skill-manager-seed",
      "pairs": [
        { "find": "draft = \"\";", "replace": "draft = \"/\"; // dsh-skill-manager-seed", "count": 1 }
      ]
    }
  ]
}
```

`kind` 允许 `replace` / `script` / `override`：
- `replace`：`pairs[]`（每个 find 必须恰好出现 `count` 次）+ 可选 `marker`
- `script`：`script` 指向同目录的 `*.dsh-patch.js`（`module.exports = { apply(text) }`）
- `override`：`override` 指向同目录 `<name>.override/`，其内单个文件名为 `file`

## 定位定义（在 harness 架构中的归类）

**一句话**：dsh-manager 是一个**安装树外（out-of-tree）的双面（dual-face）web profile bundle 插件**——
宿主半边是一条 webServer 路由注册行，浏览器半边是一个 client 模块入口（纯 UI 槽位插件），
两端通过包私有同源 HTTP 路由通信。

四层拆解：

1. **组合层**：profile bundle patch 层（`dsh.bundle.patch` 声明）。由 `dsh plugin` 以 npm 包形式装入
   `$DSH_HOME/profiles/web` 并被 reconcile 进 `dsh.profile.bundles` 栈；启动时该补丁向 profile 组合根
   **插入一条宿主平面行**。它与 dsh-base / dsh-web-app 同属一个补丁栈，但位于安装树外、
   由 profile 自己的 pnpm 管理，依赖经 `$DSH_HOME/profiles/node_modules` 回退场解析。
2. **宿主半边**：普通 Cordis 行，`inject: ['webServer']`。属于**传输面注册型宿主行**：
   不 provide 任何 Cordis 服务（因此不参与服务注册冲突审计，也不受 preset isolate realm 规则约束），
   消费宿主平面的 webServer 注册一条包私有路由；业务上只读消费宿主注册表
   （skills / sessions / agents / agentPresets），并借助宿主 fs 服务读写技能配置文件。
   生命周期 = 进程组合生命周期（boot 激活，无 per-session 挂载，无审批流程）。
3. **浏览器半边**：经 `dsh.client: { platform: 'web' }` + `exports["./client"]` 声明被 client-modules
   扫描进 `window.__DSH_BOOT__` 入口图的 **client module entry**（即部署所称的 “dsh.client 行”，
   与 ui-skill / ui-workspace 同族），由浏览器内核以插件形式采纳；`inject: ['slots']` 的纯 UI
   槽位插件——向 `sidebar.footer.action` 与 `shell.overlay` 注册组件、向 locale 注册字典、注入页面级样式。
4. **通信面**：包私有同源 HTTP 路由——既不是 api-proxy 的固定 RPC 表，也不是 Typert 编译期
   Remote 描述符，更不是动态插件的 harness.handle / host.call；与内置插件市场同构。

**与“动态插件”的关系**：本包是动态插件 `skmgr` 的**静态固化形态**——同一份业务代码，但从
“运行进程内、会话拥有、需审批的 Dynamic Package”变为“磁盘上的 npm 包、profile 拥有、
随启动组合加载的 bundle 层”。动态形式随进程退出消失，静态形式随安装持久。

## 目录结构（lib/ 即产物，无构建步骤）

```
dsh-manager/
├── package.json      # dsh.bundle + dsh.client 双声明
├── cordis.patch.yml  # bundle 补丁层：向 profile 组合插入本包行
├── lib/
│   ├── index.js      # 宿主半边：/api/dsh-manager 路由（webServer），技能管理 + 补丁引擎
│   └── client.js     # 浏览器半边：__ModuleLoader__ 入口，补丁/Skills 双按钮 + 双面板
└── README.md
```

- **宿主半边**（`lib/index.js`）：普通 Cordis 插件，`inject: ['webServer']`，注册
  `POST /api/dsh-manager`（`{ method, args }` → JSON），实现
  `catalog` / `config` / `save` / `setInvocation` / `trash` / `trashList` / `trashRestore` /
  `trashDelete` / `notesGet` / `notesSave` 十个技能管理方法，以及目录驱动的补丁引擎方法：
  `patchScan` / `patchEnable` / `patchDisable` / `patchImport` / `patchCategoryAdd` /
  `patchCategoryRename` / `patchCategoryDelete` / `patchDelete` / `patchSettingsGet` /
  `patchSettingsSet`（目录扫描 + 现场读盘状态判定 + 多文件事务 + 快照/链重放 + 前置互斥 +
  原子写 + 部署根自动定位 + RECOVERY.md 自动重写）。
  `catalog` 对中文技能原名、`notesGet`/`notesSave` 对备注名附带 `pinyin`/`initials`
  字段（`pinyin-pro` 转换，按输入串缓存，保存备注时整表失效；纯英文无字段，转换失败静默降级）。
  **写入路径（重要）**：这里的写操作都是“用户点击 UI 按钮”发起的用户动作，不是模型动作，
  因此不走模型面的沙箱 `ctx.fs`（它按部署默认模式拒绝工作区外写入），而是与内置
  `dsh-settings-file` 一致，作为受信任宿主行直接用 `node:fs` 写入；边界由两道闸门收紧——
  写入路径只来自 skills 注册表（不接受前端路径）、仅 `user-dsh/project-dsh/project-agents/user-agents`
  可写可移入回收站。写文件用临时文件 + rename 原子替换；备注是单文件读改写，用模块级队列串行化。
- **回收站**：`~/.dsh/skills-trash/<id>.json`，每条含 name/source/path/content/deletedAt。
  移入 = 内容完整备份后移除原文件（空目录一并清理）；还原 = 内容写回原路径（目标已存在则拒绝）；
  彻底删除 = 移除条目文件。条目 id 有白名单校验（防路径穿越）。
- **浏览器半边**（`lib/client.js`）：`window.__ModuleLoader__.load({...})` 包装（与官方
  `dsh.client` 包同款），React 取自平台模块表，用同源 `fetch` 调用宿主路由；UI 包含两个
  侧边栏按钮与两个面板——「补丁」（Skills 上方，order -2）→ 补丁面板（类别分组/状态徽标/
  启用/禁用/导入/删除/类别管理/提醒模式开关/可执行总闸/部署根展示），「Skills」（order -1）→
  技能面板（四组导航、双半区大卡片、开关、删除、备注编辑、配置弹窗）。补丁面板开着时每 6 秒
  现场轮询；提醒模式 B 下后台每 15 秒轮询并在按钮上显示丢失红点。
- **通信面**：不走 Typert/Remote（那需要把描述符编译进部署的 `dsh-api-remotes`），
  而是与已内置的社区插件市场（dsh-webui-market-plugin）同款的自定义 webServer 路由。
  宿主侧路由对所有请求做同源校验。
- **备注存储**：`~/.dsh/skills-notes.json`（模型只读 `SKILL.md`，永远读不到该文件）。

## 安装（dsh plugin → pnpm 转发器）

**仓库根目录携带当前最新版 tarball**（如 `deepseek-ai-dsh-manager-0.8.6.tgz`，随版本更新提交），
克隆仓库即可直接安装，无需自行打包：

```powershell
# 1) 克隆仓库（或直接从 GitHub 下载仓库内的 .tgz）
git clone https://github.com/as1350/dsh-manager
cd dsh-manager

# 2) 装进 web profile（dsh plugin 会把参数原样转发给 profile 目录里的 pnpm，
#    并在安装成功后自动把本包名追加进 dsh.profile.bundles）
dsh plugin --profile web add .\deepseek-ai-dsh-manager-0.8.6.tgz

# 3) 重启 web（组合与 client-modules 扫描都发生在启动时）
dsh web
```

> 想从 GitHub 网页安装：打开仓库 → 点击 `deepseek-ai-dsh-manager-0.8.6.tgz` → Download →
> 对下载文件执行 `dsh plugin --profile web add .\下载路径\deepseek-ai-dsh-manager-0.8.6.tgz`。
> 包名/版本会随更新变化，以仓库内实际 tgz 文件名为准。

安装后 profile 里会发生：

1. `$DSH_HOME/profiles/web/node_modules/@deepseek-ai/dsh-manager/` 就位；
2. `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 末尾追加
   `@deepseek-ai/dsh-manager`（由 `dsh plugin` 的 reconcile 步骤自动完成）；
3. 启动时该 bundle 的 `cordis.patch.yml` 把行 `{ id: dsh-manager, name: '@deepseek-ai/dsh-manager' }`
   插入组合 → 宿主半边注册路由；`client-modules` 扫描到 `dsh.client` 声明后把
   `lib/client.js` 作为 `/plugins/@deepseek-ai/dsh-manager/client.js` 注入 `window.__DSH_BOOT__`。

宿主依赖（`skills` / `sessions` / `agents` / `agentPresets` / `webServer`）全部由
dsh-base + dsh-web-app bundle 提供；Node 侧模块解析走 `$DSH_HOME/profiles/node_modules`
回退符号链接场。运行时 npm 依赖仅 `pinyin-pro`（由 profile 的 pnpm 随安装解析）；
peerDependencies 仅作文档，`autoInstallPeers: false` 下不会被安装。

## 升级（直接加装，无需先删）

```powershell
# 包名相同，装上更高版本 tgz 即覆盖升级（无需 remove）：
dsh plugin --profile web add .\deepseek-ai-dsh-manager-0.8.6.tgz
# 重启 dsh web 生效（备注/回收站/补丁状态都在 ~/.dsh，与包无关，零损失）
```

> 仓库内 tgz 随版本更新；升级时以仓库根目录实际携带的最新 tgz 为准。

## 部署补丁（补丁面板为主通道，CLI 脚本为兜底）

**完全平等原则**：引擎不内置任何补丁定义、不自动创建任何补丁文件——目录里的每个
`.dsh-patch.json` 都是用户/agent 自己放进去的普通文件，删除即删除、绝不复活。

内置管线有两处硬编码（触发字符 `/`/`@`、输入框初始内容），插件 API 够不着，本包在
`examples/` 目录附带两个**示例补丁**（纯数据文件，随 tarball 分发但不会自动安装）：
打开补丁面板 → 「导入」选择 `examples/` 下两个文件（或直接复制到
`~/.dsh/dsh-manager/patches/`）即可获得：

**示例一 · 顿号触发**（`dunhao-trigger` → `dsh-client-ui-input-trigger/lib/client.js`）：
触发字符硬编码为 `/` 与 `@`。补丁把 `detectTrigger` 中的 `、`（U+3001）归一化为 `/`——
中文输入法下敲 `、` 也能打开菜单，选中候选项后输入框照常写入 `/技能原名 `。

**示例二 · 斜杠播种**（`slash-seed` → `dsh-client-ui-conversation/lib/client.js`）：
空输入框默认存在一个可见的 `/`——不敲触发字符，直接打字即可识别技能/命令。配套语义：
裸 `/` 视为空（Enter/发送按钮不发送孤立字符）、发送成功后重置回 `/`、未发送的草稿仍会优先恢复、
hero 大输入框保持原样。想正常聊天：按一下 Backspace 删掉 `/` 即可。

**使用须知**：

- **改 id 前先禁用**：状态链按补丁 id 记录，启用中直接改声明文件的 `id` 会让旧 id 残留在链里
  （同文件其它补丁禁用时报"链成员缺失：<旧id>"）。正确顺序：禁用 → 改 id → 重新启用。
- **删除损坏声明不清理伴随文件**：声明文件 JSON 损坏后删除时，引擎无法得知其
  `.dsh-patch.js` / override 目录的名字，伴随文件会残留（无害，可手动删除）。
- **"标记在、状态无"的恢复出口**：script/override 补丁在状态丢失（如 `.state` 被清）后会显示
  「已丢失」且拒绝二次启用；此时**禁用** = 把当前磁盘内容刷新为新官方基线（文件不动），
  补丁回到「未启用」，之后可重新启用或删除。

- **主通道**：侧边栏「补丁」面板——类别分组、现场读盘状态判定、一键启用/禁用、导入/删除/
  类别管理、丢失提示、提醒模式开关、可执行总闸。启用/禁用后**刷新浏览器即生效**（内置 bundle 按请求读盘）。
- **CLI 兜底**：面板不可用时（如插件本身装不上）使用目录驱动脚本（三种模式）：

```powershell
# 无参数：报告每个补丁的 id / 类别 / 状态（applied / adopted / lost / clean），并打印 RECOVERY.md 路径
powershell -ExecutionPolicy Bypass -File .\scripts\reapply-deployment-patches.ps1

# -restore：dsh 打不开时的救命通道——把 .state/snapshots 里所有官方快照复制覆盖回目标文件，
#            然后清空全部机器状态与快照（原子写，每个恢复的文件都会打印）
powershell -ExecutionPolicy Bypass -File .\scripts\reapply-deployment-patches.ps1 -restore

# -apply：重打所有 clean 补丁（replace/override；含 script 的补丁跳过，只能从面板启用）。
#         逐文件校验（find 出现次数、override 配套文件存在）通过后才原子写入，并写机器状态；
#         任一文件校验失败则整补丁跳过并打印原因
powershell -ExecutionPolicy Bypass -File .\scripts\reapply-deployment-patches.ps1 -apply
```

脚本幂等、自保护（目标文件缺失/出现次数不符时拒绝写入）、原子写（`.dshskm-tmp` + Move-Item）。
- **`dsh` 升级会用官方原版整体替换这些文件**，补丁随之丢失（不影响其它功能，只是退回原版
  行为）——面板会把状态如实显示为「已丢失」，重新启用即可；官方代码重构时会拒绝写入并提示，
  CLI `-apply` 遇到 lost 会打印警告提示从面板禁用后重新启用。

## 卸载

```powershell
dsh plugin --profile web remove @deepseek-ai/dsh-manager
# 重启 dsh web 生效
```

## 挂载后验证

1. 重启后宿主启动日志无本包报错（route 注册失败、client bundle 缺失都会 loud throw）；
2. 刷新页面：侧边栏底部出现 **补丁** 与 **Skills** 两个按钮（补丁在 Skills 上方，Settings 上方同列）；
3. 打开补丁面板确认补丁类别分组、状态徽标、启用/禁用/导入/删除/类别管理、提醒模式开关、
   可执行总闸、部署根展示都正常；
4. 打开 Skills 面板确认四组技能、Agent/用户开关、删除按钮、卡片下半区备注编辑、配置弹窗（保存/外部打开）都正常；
5. 开/关开关与保存配置：现在直接落盘生效（0.2.0 起不再受模型面沙箱限制）。

## 行为语义（与底层 @deepseek-ai/dsh-skill 一致）

- `Agent 可调用` ← frontmatter `disable-model-invocation`（缺省=允许）
- `用户可调用` ← frontmatter `user-invocable`（缺省=允许）
- 二者独立。`user 开 + agent 关`：用户仍可 `/技能名` 强制调用（宿主注入正文），agent 不能自主调用。
- 仅 `user-dsh / project-dsh / project-agents / user-agents` 可编辑/删除；`bundled / runtime / custom`
  内容只读，但 **0.8.6 起有配置文件路径的技能可在面板「解锁」后切换调用权限**（写回该技能文件，
  重装包后还原）；跨预设作用域的技能一律仅查看。
- 备注仅用户可见：存于 `~/.dsh/skills-notes.json`，模型只读 `SKILL.md`，永远不会看到备注。

## 开发备注

- `lib/` 是唯一源码；本包不依赖 TypeScript / 构建器，改完直接 `pnpm pack`。
- `scripts/smoke-test.mjs`（不打包进 tarball）：真实 cordis Context + mock 注册表 + 真实磁盘写入的
  **168 项断言**冒烟测试，覆盖全部方法与 404/403 路径。技能管理 46 项断言（含拼音字段、回收站、
  备注、只读来源拒绝等）；补丁引擎第 9 节 66 项断言覆盖目录驱动全链路：目录与示例补丁（含目标文件
  路径 targets 字段）/ 启用禁用往返 /
  收养 / 多文件事务 / 干跑回滚 / 同文件链共存与重叠冲突 / 前置互斥 / override / script 可执行总闸 /
  类别与删除 / 丢失态 / RECOVERY 手册与设置。运行方式见脚本头注释（需把包复制进
  `$DSH_HOME/profiles/node_modules` 模拟安装解析链）。
- `scripts/trial-boot.ps1` 是一次性 DSH_HOME 试装验证脚本（不打包进 tarball）：真实执行
  `dsh plugin --profile web add <tgz>` → 启动 web profile → 校验 ready 行、client bundle 服务
  （版本标记 + 别名源 + 拼音 + 缓存 + 补丁面板代码标记）、部署两个补丁的标记、boot manifest
  注入、catalog 路由、跨源拒绝、notes 往返落盘（含拼音字段）、delete 端点，以及目录驱动补丁引擎的
  **patchScan 收养判定 / 禁用启用往返（不重启服务器直接抓 bundle 验证"刷新即生效"）/
  类别与导入/缺失目标拒绝启用/删除/RECOVERY.md/设置往返**，全部通过后清理临时目录。
- 部署补丁 CLI 脚本 `scripts/reapply-deployment-patches.ps1`（纯 ASCII、幂等、自保护、原子写）：
  无参数查状态、`-restore` 一键还原官方快照、`-apply` 重打 clean 补丁——补丁面板的 CLI 兜底，
  见上文「部署补丁」。
- 升级安装同一 tarball 的新版本后重启即可；`dsh plugin` 会在每次 add/update 后重新 reconcile bundle 列表。
- 通信路由 `/api/dsh-manager` 与宿主路由同源校验逻辑见 `lib/index.js` 末尾注释。
