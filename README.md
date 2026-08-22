# @deepseek-ai/dsh-manager

> **⚠️ 版本适配标注**：本包当前版本 **0.35.5**，与 **DSH `0.1.0-rc.7`** 的 web 端配套（在 rc7 web profile 上开发并验证）。
> 它和目前**最新版 DSH 存在一定差距**（DSH 后续版本可能已调整宿主接口/技能注册契约，本包未随新版本适配）。
> **建议使用 rc7 web 端的用户安装本版本**；若你的 DSH 高于 rc.7，请先确认兼容性或等待适配版本。

DSH Web 的管理面板合集（**静态插件包**，0.6.0 起由 `@deepseek-ai/dsh-skill-manager` 更名合并而来）。

一个包覆盖五大模块：

| 模块 | 说明 |
|---|---|
| **Skills 管理** | 技能目录汇总、Agent/用户调用开关、回收站、备注/别名、拼音匹配、配置编辑、**观察与自优化开关** |
| **部署补丁管理** | 目录驱动的 replace/script/override 三类补丁引擎（快照 + 链重放 + 事务 + RECOVERY.md + CLI 兜底） |
| **本地仓库面板** | 多根目录扫描、GitHub 克隆/镜像、git 状态与 fetch、仓库详情、Skill 仓库同步、AI 讲解 |
| **服务面板** | 本地服务识别、静默启动配置（venv launcher）、进程/端口/健康阶梯测试、日志、AI 诊断 |
| **随包治理技能集** | 6 个随包分发的技能：local-governance / dsh-repo-clone / dsh-review / service-config / skill-optimize / dsh-plugin-lifecycle |

## 随包技能集（治理与工作流）

`skills/` 目录随包自动扫描注册（0.34.5 起目录即真相，新增技能只需建目录放 SKILL.md），构成一套完整的本地治理工作流：

| 技能 | 职责 |
|---|---|
| `local-governance` | 本地治理体系总纲：装配清单（MANIFEST.md）、仓库注册表（REPOS.md）、机器账本（repos.json）、归档/装配/升级/回滚、更新后审核钩子与待办提醒 |
| `dsh-repo-clone` | 克隆远端仓库到本地 DSH 目录树 + 登记治理账本（代理检查、schannel 应急、克隆后快速分析与 DSH 插件装配询问） |
| `dsh-review` | 审核/复核项目更新：读待审核队列 → 定位 diff → 一审 7 维 → 二审源码证伪 → 修复前评估 → 修复验证并写回 |
| `service-config` | 给本地项目配置服务面板的服务：识别类型 → 生成静默启动配置 → 写入 services.json → 阶梯测试 |
| `skill-optimize` | 处理技能观察记录并落地技能优化（去噪评估 → 最小方案 → 用户确认 → 落地 → 写回），判据为 writing-for-agents |
| `dsh-plugin-lifecycle` | DSH 插件全生命周期：从零到发布/退役（仅模型自动调用） |

配套机制：**更新后主动询问审核**（代码/配置变更发版后询问立即/推迟，登记/克隆静默入队 `_governance/pending-reviews.json`）；**技能观察与自优化**（面板卡片「启动优化检测」开关，任务结束统一复盘一次，收尾只记录、修改永远过用户确认，状态存 `_governance/skill-observations.json`）。

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
- **拼音 / 首字母匹配**：备注名与中文技能原名在 `/` 菜单里支持拼音全拼前缀、拼音有序子序列模糊、
  音节首字母前缀（如 `kaoda`、`kaod`、`kd`、`kdw` 均可命中"拷打我"）；面板搜索同样支持
  拼音/首字母**子串**过滤。拼音由宿主端 `pinyin-pro` 一次性转换并随 `notesGet`/`catalog`
  下发为普通字符串字段，客户端零新增依赖。匹配层级：原文前缀 > 原文模糊 > 全拼前缀 >
  首字母前缀 > 全拼模糊；无别名但原名含中文、被拼音命中的技能在菜单里显示为裸原名
- **击键零 RPC 缓存**：`/` 菜单源按会话客户端缓存（catalog+notesGet 并行拉取、6 秒 TTL、
  过期后台刷新 stale-while-revalidate），命中时候选同步返回
- **观察开关（0.35.2）**：每个技能卡片「启动优化检测」开关（默认全关）——插件技能运行时注入
  观察约定块（不污染包内文件）、全局/项目技能直改 SKILL.md 文件；任务结束统一复盘一次并追加
  记录到 `_governance/skill-observations.json`；优化建议累积后由 `skill-optimize` 处理
- **面板秒显缓存（0.35.4/0.35.5）**：catalog 快照按 (sessionId, cwd) 缓存并持久化到
  sessionStorage——面板重开先秒显旧数据再后台刷新，页面刷新后仍秒显

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

## 本地仓库面板（0.9.0：多根目录）

侧边栏第三个按钮 → 本地仓库面板。把本地仓库纳入治理视图：

- **多根目录**：`settings.json` 配置 `roots[]`，扫描时跳过 `node_modules/.git/_governance/_snapshots`；
  未登记的仓库自动探测 git 远端与 GitHub 元数据（`git remote get-url` + `gh repo view`）
- **GitHub 镜像**：登记为 mirror 的仓库可一键 `git fetch` / 严格更新；支持仓库可见性切换、删除、目录管理
- **克隆新项目**：面板生成含仓库信息的指令填入输入框 → 发给 agent 执行（配套 `dsh-repo-clone` 技能
  标准化克隆 + 治理登记 + 克隆后快速分析与 DSH 插件装配询问）
- **Skill 仓库分组**：扫描 `_governance/skill仓库/` 下 本地/插件/项目 三组技能，可复制到全局或项目
- **仓库详情**：三层缓存（内存 SWR → 磁盘指纹 → 全量），展示 git 状态、提交历史、README、AI 讲解
- **AI 讲解**：`aiExplainWarmup/Request/Status` 系列——选中仓库后流式生成讲解（需配置 AI provider）
- **性能（0.35.0/0.35.1/0.35.3）**：repoScan host 侧 SWR 缓存（15s TTL + force 强制重扫）+
  启动后台预热——冷启动首次打开从 7-8s 变秒开，刷新按钮与服务面板注册变更即时生效

## 服务面板（service-config）

侧边栏第四个按钮 → 服务面板。为本地项目配置**静默启动**的本地服务：

- **识别**：按项目特征识别服务类型（Node / Python venv / 前后端一体 / 多服务）
- **配置生成**：生成静默启动配置（venv launcher 弹窗 → base python + PYTHONPATH），写入 `services.json`
- **阶梯测试**：启动后按 进程 → 端口 → healthUrl 三级验证，失败接 AI 诊断
- **运行管理**：启动/停止/重启/全部启停、日志查看与轮转、崩溃自动重启退避、detached 进程懒归档
- **配套技能**：`service-config` 技能把「配置服务 / 让服务静默启动」这类需求标准化

## 治理体系（local-governance）

本包携带完整的本地治理工作流（`local-governance` 技能为总纲），账本集中在 `_governance/` 目录：

| 文件 | 用途 |
|---|---|
| `MANIFEST.md` | 装配资产清单：包名/装配方式/装配版本/归档版本/路径/上游/备注 |
| `REPOS.md` | 仓库注册表：所有本地仓库的状态总账（人工可读） |
| `repos.json` | 机器账本：面板读取的仓库真相（v2 schema，type ∈ {local, mirror}） |
| `pending-reviews.json` | 待审核队列：更新后按流程入队，`dsh-review` 审核写回 done |
| `skill-observations.json` | 技能观察记录：观察开关状态 + 优化建议，`skill-optimize` 消费 |

核心纪律：**版本只增不覆盖**、**账实一致**（目录实况 = repos.json = REPOS.md 三者一致）、
**更新后主动询问审核**（代码/配置变更类询问立即/推迟；登记/克隆静默入队不打扰）。

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
├── package.json      # dsh.bundle + dsh.client 双声明（files 白名单见下）
├── cordis.patch.yml  # bundle 补丁层：向 profile 组合插入本包行
├── lib/
│   ├── index.js      # 宿主半边：/api/dsh-manager 路由（webServer），全部 rpc 实现
│   ├── client.js     # 浏览器半边：__ModuleLoader__ 入口，4 按钮 + 4 面板 + CSS
│   ├── service-core.js  # 服务面板引擎（识别/配置/启停/日志/诊断）
│   ├── repo-core.js     # 本地仓库引擎（扫描/检测/详情/git 状态）
│   └── ai-core.js       # AI 讲解引擎（provider/流式/缓存）
├── skills/           # 随包技能（6 个，自动扫描注册：目录即真相）
│   ├── local-governance/  dsh-repo-clone/  dsh-review/
│   ├── service-config/    skill-optimize/  dsh-plugin-lifecycle/
├── examples/         # 示例补丁（*.dsh-patch.json，随 tarball 分发但不自动安装）
├── scripts/          # CLI 兜底与验证脚本（不打包进 tarball）
└── README.md
```

- **宿主半边**（`lib/index.js`）：普通 Cordis 插件，`inject: ['webServer']`，注册
  `POST /api/dsh-manager`（`{ method, args }` → JSON），实现约 60 个方法：
  - 技能管理：`catalog` / `config` / `save` / `setInvocation` / `trash` / `trashList` /
    `trashRestore` / `trashDelete` / `notesGet` / `notesSave` / `skillDetail` /
    `skillObserveGet` / `skillObserveSet` / `skillObserveList`
  - 补丁引擎：`patchScan` / `patchEnable` / `patchDisable` / `patchImport` /
    `patchCategoryAdd` / `patchCategoryRename` / `patchCategoryDelete` / `patchDelete` /
    `patchSettingsGet` / `patchSettingsSet`
  - 本地仓库：`repoSettingsGet` / `repoSettingsSet` / `repoScan` / `repoGitStates` /
    `repoFetch` / `repoDetail` / `repoSetVisibility` / `repoDeleteSkill` /
    `repoListDirs` / `repoCreateDir` / `repoGetProxy` / `repoScanPluginPackages` /
    `repoCopySkillToGlobal` / `repoCopySkillToProject`
  - 服务：`serviceSettingsGet` / `serviceSettingsSet` / `serviceScan` / `serviceRegister` /
    `serviceConfigSet` / `serviceUnregister` / `serviceStart` / `serviceStop` /
    `serviceExternalKill` / `serviceRestart` / `serviceStartAll` / `serviceStopAll` /
    `serviceLogGet` / `serviceLogClear` / `serviceAiDiagnose` / `serviceLogAi` / `serviceAiDraft`
  - AI 讲解：`aiExplainWarmup` / `aiExplainRequest` / `aiExplainDebug` /
    `aiExplainClearCache` / `aiProvidersList` / `aiExplainStatus`
  - `catalog` 对中文技能原名、`notesGet`/`notesSave` 对备注名附带 `pinyin`/`initials`
    字段（`pinyin-pro` 转换，按输入串缓存，保存备注时整表失效；纯英文无字段，转换失败静默降级）
  - **写入路径（重要）**：写操作都是“用户点击 UI 按钮”发起的用户动作，不是模型动作，
    因此不走模型面的沙箱 `ctx.fs`（它按部署默认模式拒绝工作区外写入），而是与内置
    `dsh-settings-file` 一致，作为受信任宿主行直接用 `node:fs` 写入；边界由两道闸门收紧——
    写入路径只来自 skills 注册表（不接受前端路径）、仅 `user-dsh/project-dsh/project-agents/user-agents`
    可写可移入回收站。写文件用临时文件 + rename 原子替换；备注是单文件读改写，用模块级队列串行化
- **回收站**：`~/.dsh/skills-trash/<id>.json`，每条含 name/source/path/content/deletedAt。
  移入 = 内容完整备份后移除原文件（空目录一并清理）；还原 = 内容写回原路径（目标已存在则拒绝）；
  彻底删除 = 移除条目文件。条目 id 有白名单校验（防路径穿越）
- **浏览器半边**（`lib/client.js`）：`window.__ModuleLoader__.load({...})` 包装（与官方
  `dsh.client` 包同款），React 取自平台模块表，用同源 `fetch` 调用宿主路由；UI 包含四个
  侧边栏按钮与四个面板——「补丁」（order -2）→ 补丁面板，「Skills」（order -1）→ 技能面板，
  「本地仓库」（order 0）→ 本地仓库面板，「服务」（order 1）→ 服务面板
- **通信面**：不走 Typert/Remote（那需要把描述符编译进部署的 `dsh-api-remotes`），
  而是与已内置的社区插件市场（dsh-webui-market-plugin）同款的自定义 webServer 路由。
  宿主侧路由对所有请求做同源校验
- **备注存储**：`~/.dsh/skills-notes.json`（模型只读 `SKILL.md`，永远读不到该文件）

## 安装（dsh plugin → pnpm 转发器）

**仓库根目录携带当前最新版 tarball**（如 `deepseek-ai-dsh-manager-0.35.5.tgz`，随版本更新提交），
克隆仓库即可直接安装，无需自行打包：

```powershell
# 1) 克隆仓库（或直接从 GitHub 下载仓库内的 .tgz）
git clone https://github.com/as1350/dsh-manager
cd dsh-manager

# 2) 装进 web profile（dsh plugin 会把参数原样转发给 profile 目录里的 pnpm，
#    并在安装成功后自动把本包名追加进 dsh.profile.bundles）
dsh plugin --profile web add .\deepseek-ai-dsh-manager-0.35.5.tgz

# 3) 重启 web（组合与 client-modules 扫描都发生在启动时）
dsh web
```

> 想从 GitHub 网页安装：打开仓库 → 点击 `deepseek-ai-dsh-manager-0.35.5.tgz` → Download →
> 对下载文件执行 `dsh plugin --profile web add .\下载路径\deepseek-ai-dsh-manager-0.35.5.tgz`。
> 包名/版本会随更新变化，以仓库内实际 tgz 文件名为准。

安装后 profile 里会发生：

1. `$DSH_HOME/profiles/web/node_modules/@deepseek-ai/dsh-manager/` 就位；
2. `$DSH_HOME/profiles/web/package.json` 的 `dsh.profile.bundles` 末尾追加
   `@deepseek-ai/dsh-manager`（由 `dsh plugin` 的 reconcile 步骤自动完成）；
3. 启动时该 bundle 的 `cordis.patch.yml` 把行 `{ id: dsh-manager, name: '@deepseek-ai/dsh-manager' }`
   插入组合 → 宿主半边注册路由；`client-modules` 扫描到 `dsh.client` 声明后把
   `lib/client.js` 作为 `/plugins/@deepseek-ai/dsh-manager/client.js` 注入 `window.__DSH_BOOT__`；
4. 宿主半边启动时自动扫描 `skills/` 目录，把 6 个随包技能注册进技能注册表
   （`registerPackagedSkills`：frontmatter 的 name/description/whenToUse/invocation 元数据透传，
   逐条 try/catch 隔离，坏条目只 warn 不拖垮整体）。

宿主依赖（`skills` / `sessions` / `agents` / `agentPresets` / `webServer`）全部由
dsh-base + dsh-web-app bundle 提供；Node 侧模块解析走 `$DSH_HOME/profiles/node_modules`
回退符号链接场。运行时 npm 依赖仅 `pinyin-pro` 与 `js-yaml`（由 profile 的 pnpm 随安装解析）；
peerDependencies 仅作文档，`autoInstallPeers: false` 下不会被安装。

## 升级（直接加装，无需先删）

```powershell
# 包名相同，装上更高版本 tgz 即覆盖升级（无需 remove）：
dsh plugin --profile web add .\deepseek-ai-dsh-manager-0.35.5.tgz
# 重启 dsh web 生效（备注/回收站/补丁状态/观察记录都在 ~/.dsh 与 _governance，与包无关，零损失）
```

> 仓库内 tgz 随版本更新；升级时以仓库根目录实际携带的最新 tgz 为准。
> 版本纪律：每次发布**只增不覆盖**——新版本号只出现一次，历史版本归档于
> `_governance/MANIFEST.md` 与本地 `_snapshots/`，不回写旧版本。

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
# 重启 dsh web 生效（技能随包消失，本地数据如备注/补丁/治理账本均保留在 ~/.dsh 与 _governance）
```

## 挂载后验证

1. 重启后宿主启动日志无本包报错（route 注册失败、client bundle 缺失都会 loud throw）；
2. 刷新页面：侧边栏底部出现 **补丁 / Skills / 本地仓库 / 服务** 四个按钮；
3. 打开 Skills 面板确认技能分组、Agent/用户开关、观察开关、删除按钮、备注编辑、配置弹窗正常，
   且**随包 6 技能**（local-governance / dsh-repo-clone / dsh-review / service-config /
   skill-optimize / dsh-plugin-lifecycle）出现在插件组；
4. 打开补丁面板确认类别分组、状态徽标、启用/禁用/导入/删除/类别管理、提醒模式开关、可执行总闸正常；
5. 打开本地仓库面板确认多根目录扫描、git 状态、GitHub 镜像分组、Skill 仓库分组正常；
6. 打开服务面板确认服务识别/配置/启停/日志正常；
7. 开/关开关与保存配置：直接落盘生效（不受模型面沙箱限制）。

## 行为语义（与底层 @deepseek-ai/dsh-skill 一致）

- `Agent 可调用` ← frontmatter `disable-model-invocation`（缺省=允许）
- `用户可调用` ← frontmatter `user-invocable`（缺省=允许）
- 二者独立。`user 开 + agent 关`：用户仍可 `/技能名` 强制调用（宿主注入正文），agent 不能自主调用。
- 仅 `user-dsh / project-dsh / project-agents / user-agents` 可编辑/删除；`bundled / runtime / custom`
  内容只读，但 **0.8.6 起有配置文件路径的技能可在面板「解锁」后切换调用权限**（写回该技能文件，
  重装包后还原）；跨预设作用域的技能一律仅查看。
- 备注仅用户可见：存于 `~/.dsh/skills-notes.json`，模型只读 `SKILL.md`，永远不会看到备注。
- 观察约定块（`<!-- dsh-observe:start -->`…）：插件技能运行时注入（不污染包内文件）、
  文件技能直改 SKILL.md 末尾；「启动优化检测」开关 off 时精确移除。

## 开发备注

- `lib/` 是唯一源码；本包不依赖 TypeScript / 构建器，改完直接 `pnpm pack`（npm pack 在仓库目录执行）。
- 模块划分：`index.js`（宿主 rpc + 技能/补丁/仓库/服务编排）、`client.js`（浏览器 UI）、
  `service-core.js`（服务引擎）、`repo-core.js`（仓库引擎，含 repoScan 缓存）、
  `ai-core.js`（AI 讲解引擎）。
- `skills/` 注册约定（0.34.5+）：目录即真相——新增随包技能只需建 `skills/<name>/SKILL.md`，
  自动扫描注册；frontmatter 元数据（name/description/whenToUse/invocation/resourceBase）逐项透传。
- `scripts/smoke-test.mjs`（不打包进 tarball）：真实 cordis Context + mock 注册表 + 真实磁盘写入的
  **冒烟测试**，覆盖技能管理（拼音字段、回收站、备注、只读来源拒绝）、补丁引擎全链路（目录驱动/
  启用禁用往返/收养/多文件事务/干跑回滚/链共存/前置互斥/override/script 总闸/类别/丢失态/
  RECOVERY.md）、仓库与服务引擎。运行方式见脚本头注释。
- `scripts/trial-boot.ps1` 是一次性 DSH_HOME 试装验证脚本（不打包进 tarball）：真实执行
  `dsh plugin --profile web add <tgz>` → 启动 web profile → 校验 ready 行、client bundle 服务、
  部署补丁标记、boot manifest 注入、catalog 路由、跨源拒绝、notes 往返落盘，全部通过后清理临时目录。
- 部署补丁 CLI 脚本 `scripts/reapply-deployment-patches.ps1`（纯 ASCII、幂等、自保护、原子写）：
  无参数查状态、`-restore` 一键还原官方快照、`-apply` 重打 clean 补丁——补丁面板的 CLI 兜底。
- 升级安装同一 tarball 的新版本后重启即可；`dsh plugin` 会在每次 add/update 后重新 reconcile bundle 列表。
- 通信路由 `/api/dsh-manager` 与宿主路由同源校验逻辑见 `lib/index.js` 末尾注释。
