# Changelog

格式：`版本 - 日期 - 类型`，类型 ∈ {feat, fix, chore, docs}。
版本号遵循 `主.次.修`，每次变更只增不覆盖（见 local-governance 铁律）。


## 0.37.4 - 2026-08-26 - fix
- 弹层关闭时机修正（对齐 freebuff2api 同款修复）：全部 13 处对话框遮罩（skills/patch/repo/service 四主面板 + clone/detail/AI/设置/编辑器/日志/扩展/强杀确认）与 2 类行内菜单背景层的关闭判定从 `onClick`（松开触发）改为 `onMouseDown`（按下触发）——按下点在弹层内则无论何处松开都不关闭，按下点在遮罩上立即关闭；根除「窗口内按下拖到窗口外松手被误关」与菜单「按住拖拽误关」。`lib/client.js` 16 处替换，VERSION 常量同步 0.37.4。

## 0.37.3 - 2026-08-24 - docs
- 技能文档优化（审核优化流程落地，6 处 SKILL.md 增补）：local-governance 流程 A 步骤 7 自检 VERSION 常量标注位置（lib/client.js 需手动同步）、流程 G「更新镜像」模板补 porcelain 非空停下待裁决判据 + 版本标识取法链（describe > 仓库 VERSION 文件 > 源码内版本常量 > 短SHA）、流程 I 入队补「重读文件尾部、只尾部追加勿整文件重写」并发写纪律；dsh-review 步骤 0 补上下文明确时跳过询问豁免、步骤 3 补未导出内部函数实测法（源码截取+常量注入 node 执行）；dsh-repo-clone 步骤 2 补克隆后统一 remote 规范（set-url 剥尾斜杠 + 镜像补 upstream 同址）。

## 0.37.2 - 2026-08-24 - fix
- 审核修复：`lib/client.js:16` 硬编码 `VERSION` 常量在 0.37.1 发版时未随 `package.json` 递增（面板标题显示 v0.37.0，四件套不一致）。对齐为 0.37.2；按铁律 6（已装配版本禁止原地覆盖 tgz）递增发版。

## 0.37.1 - 2026-08-24 - fix
- 修复仓库面板自动分类对**带尾斜杠 origin URL** 的解析缺陷：`cloudRepoFromRemote` 原正则 `/github\.com[:/]([^/]+\/[^/]+?)$/` 以 `$` 锚定行尾且不容忍尾斜杠，导致 `git clone https://github.com/owner/repo/`（地址栏复制带尾斜杠）的仓库探测返回空串，被误判为「本地项目」（实例：GeekezBrowser）。现改为先剥尾斜杠再剥 `.git` 后缀（`replace(/\/+$/, '')`），兼容 `…/`、`….git`、`….git/`、ssh、纯 URL 全形态。
- 改动文件：`lib/repo-core.js:48`（一行）；已验证 6 组用例（尾斜杠/.git/纯 URL/ssh/空串/混合）全部正确。

## 0.37.0 - 2026-08-24 - feat
- 服务面板服务卡片新增「管理页面网址 (manageUrl)」配置输入框：「管理页面」按钮优先跳转该网址（校验 http(s):// 开头、≤300 字符），留空回退 `http://127.0.0.1:<端口>`。
- 「端口」字段改名「服务端口 (API/TCP)-仅用于端口进程探活，无法修改启动端口」（中英双语），明确其仅用于 TCP 端口探活、不可改启动端口的语义。
- AI 配置助手补全：serviceAiDraft 草稿新增 manageUrl/note/envFile/startTimeoutMs（prompt schema + host 解析 + 前端 fillDraft 映射），service-config 技能 entry 字段清单与三字段正交说明同步补齐。

## 0.36.2 - 2026-08-24 - fix
- 修复 `dsh-manager` 在 AI 队列错误处理时抛出 `ReferenceError: gen is not defined` 导致 `dsh web` 宿主崩溃的缺陷（提升 `gen` 变量声明至 `try` 块外部）。
- 服务面板视图支持卡片/列表切换及项目置顶星标功能。

## 0.36.1 - 2026-08-23 - docs
- 技能优化（第二轮，消费观察账本 2 条 pending）：
  - local-governance 流程 G「常见 agent 指令模板」补**删除仓库模板**：删目录 → repos.json 删条目 + updatedAt → REPOS.md 删行 → **pending-reviews.json 中该仓库悬空 clone/registry 记录同步移除（或标 skipped 注原因）**，避免悬空待审（icon 仓库删除实证）；
  - skill-optimize 步骤 2 补**剔除证据跨记录判据**（剔除理由可引用他条记录/机制现状：同源重复次数、机制版本缓解、他条实测证伪，不要求单条建议自证）；步骤 5 补**多技能可合并单次发版**（同一版本号带出全部技能变更）。

## 0.36.0 - 2026-08-23 - feat
- 技能优化落地（skill-optimize 消费观察账本 8 条 pending，经 writing-for-agents 去噪后 4 技能 12 处增补）：
  - dsh-repo-clone：步骤 3 补**沙箱伪错误判据**（pwsh 报 `sh.exe` Win32 error 5 而目录 .git 完整且 `git rev-parse` 通过 → 直接以 git 校验为准继续，两次实测命中）；步骤 4 补**新根判据**（目标根不在 repos.json roots 时同步追加，与 settings.json roots 一致）；
  - dsh-review：schema id 形态补记（release: 版本号 / observe: r-YYYYMMDD-<技能名>-NN / clone、registry: <repo>-<type>-<日期>）；observe 处理节步骤 3 补**跨技能入账归属**（按建议内容所指技能入账，不按留痕 id 技能）；步骤 1 补**多仓 diff 判据**（子模块/多仓库按仓分别 diff）；步骤 2 第 5 维补 registry/clone 无打包动作判据；步骤 4 补**自我审核外部证据判据**（本人产物每条结论附可独立复现证据）；
  - local-governance：流程 A 补 **EPERM 处理**（npm pack cache 锁 → `--cache` 重定向重试）与**收尾自检**（四件套一致 + git status 干净）；流程 B 补**技能副本同步**（包内 skills/ 变更时复制 ~/.agents/skills 同名副本，防副本 first-wins 服务旧内容）；
  - service-config：步骤 0 补 aiExplain.enabled 检查途径（settings.json 直读或面板 RPC）；「API 与坑」补『启动命令未在 PATH 中找到』误报示例（绝对路径 exe 属 token 切分误报）；步骤 5 补服务管理总开关前置检查。
- 剔除 3 条噪音建议（dismissed 留审计）：repo-clone-002 s4 加载通道（机制层议题，0.35.9 已缓解）；dsh-review-003 s1 步骤 0 补句（-004 审核实测未复现）；local-gov-001 s1 MANIFEST notes（建议自评可不改，0.35.7 已缓解）。

## 0.35.9 - 2026-08-23 - feat
- 观察机制收尾留痕改「队列复盘」（grilling 设计树定案：S2 留痕 + S1 批审组合，替代"收尾 4 步复盘直写账本"的软约定）：约定块文本改为——收尾写一条观察留痕（1-3 行，引用 SKILL.md 小节，无发现写 no-op 占位）→ 追加到 pending-reviews.json（type=observe，status=pending，id=r-YYYYMMDD-<技能名>-NN，summary 填留痕全文）→ 由 dsh-review 攒批审核后正式入账 skill-observations.json。**没写留痕即违约，队列缺失条目就是证据**——失败从静默变可见（原机制失败无痕：账本不写是唯一表现，宿主与模型都无法感知"该复盘而没复盘"）。每任务开销从 4 步降到 1 步留痕，评审判断从任务收尾的自觉动作移到治理流程批处理（成本按批摊销，低性能机器可用）；dsh-review 新增 observe 类条目处理（no-op 直接 done / 有效内容整理入账 / 模糊/重复/过拟合剔除并注原因）。
- 一次任务统一只写一条留痕、覆盖全部被观察技能、不直接改 SKILL.md 的约定保留。

## 0.35.8 - 2026-08-22 - fix
- 观察开关跨会话/跨进程失效修复（用户报告：另一个会话开的开关，本会话不生效）：根因是注入只落在切换会话视图解析出的单一目标上（插件技能=进程内存重注册、跨进程丢失；文件技能=只改 definition.path），启动补注循环也只覆盖包内注册，同名技能在别的会话被用户文件副本（~/.agents/skills 等 user-agents 源，first-wins 可能压过包内注册）摘下时约定块永远缺失。修复：观察状态以账本（skill-observations.json）为唯一事实源，文件副本成为同步层——新增 `syncObserveBlockInCopies`：启动时按账本对全部候选副本（~/.dsh/skills/<name>/SKILL.md、~/.agents/skills/<name>/SKILL.md、<cwd>/.dsh/skills/<name>/SKILL.md）幂等补（observing=true）/删（observing=false）约定块；`skillObserveSet` 对插件技能与文件技能均同步全部候选副本并返回 `files` 字段。任何会话/进程服务到的正文观察状态与账本一致。
- 本地服务面板滚动条与弹性布局修复：在 .skm-content CSS 类中增加 min-height: 0，解决当配置项目/服务数量较多（如 4 个以上项目或服务卡片）时，由于 Flex 容器未限制最小高度导致最下方服务条目（如 sub2api-backend）被弹窗框截断且无法触发纵向滚动的 Bug。

## 0.35.7 - 2026-08-22 - feat
- 本地仓库面板「拉取更新」镜像模板 v3（writing-for-agents 二审后重构）：upstream 缺失自动补配（按 repos.json 该条目 upstream 字段，与 origin 同址）；reset 前工作区脏检查守卫（mirror 纪律，非空停下待裁决）；版本标识统一取法与格式（git describe --tags > VERSION/version 文件 > 短 SHA，格式「<版本>[+N] (<短SHA>)」）；更新总结上提为无条件步骤（不再挂在装配分支下）；治理落账字段明确（repos.json 顶层 updatedAt + lastChecked/lastSync/notes 前置摘要，REPOS.md 用 UTC+8 时间）；装配判定短路化（MANIFEST/profile 均无则跳过）；装配升级按 MANIFEST「装配方式」四分支（file: tgz / link: 直连 / registry 固定版本 / 目录复制预设），收尾统一 dev_reload_package 或重启 DSH 并询问审核；流程 I 入队格式固化（id=<repo>-sync-<日期>，type=registry）；汇报扩为四段（新增治理落账清单）。

## 0.35.6 - 2026-08-22 - feat
- 本地仓库面板「拉取更新」模板完善（镜像全链路）：指令从纯 git 更新扩展为「镜像更新 → 装配检查 → 装配升级 → 更新总结」——更新镜像后自动判断项目是否为已装配插件（读 _governance/MANIFEST.md 与 profile package.json 的 dependencies/dsh.profile.bundles + dev_plugin_status）；已装配且版本变化则按 local-governance 流程 A/B 构建/tgz 快照/profile 切换/pnpm 重装/热重载或重启并更新 MANIFEST，用 git log 旧HEAD..新HEAD 总结更新内容；按流程 I 镜像同步静默入队，装配升级完成后询问立即审核或推迟；未装配则仅汇报镜像同步结果。

## 0.35.5 - 2026-08-22 - fix
- Skills 面板秒显缓存持久化（修复 0.35.4 缓存易失）：`skillCatalogCache` 落 sessionStorage（标签页级，key `dsh-manager:skillCatalogCache:v1`）——页面/标签页重载后 apply 重建、内存态缓存归零导致秒显失效（实测重开 Skills 面板变空白 1-3s 才填充），持久化后刷新仍可秒显旧数据再后台刷新；读写均 try/catch 防存储不可用（隐私模式/iframe 限制）；缓存 key 含 v1 版本号防结构漂移；会话/工作目录变化 key 不匹配仍自动失效，reloadTick 仍强制重拉。

## 0.35.5 - 2026-08-22 - docs
- README.md 全面审查更新（GitHub 仓库文档过时）：补齐 0.9.0–0.35.x 全部能力——新增「随包技能集（6 技能）」「本地仓库面板」「服务面板」「治理体系」四章，Skills 管理章补观察开关与秒显缓存，安装/升级章版本号 0.10.2 → 0.35.5，宿主 rpc 方法清单更新为当前约 60 个（含 skillObserve*/repo*/service*/aiExplain*），目录结构补 skills/、examples/、lib 五文件，挂载验证补四个按钮与随包技能检查。纯文档，无行为变更。
- README 顶部加版本适配标注：本包 0.35.5 与 **DSH 0.1.0-rc.7** web 端配套验证，与最新版 DSH 存在差距，建议 rc7 web 端用户使用。

## 0.35.4 - 2026-08-22 - feat
- Skills 面板秒显缓存（前端）：catalog 快照按 (sessionId, cwd) 缓存（`skillCatalogCache`）——面板重开先秒显上次数据再后台刷新，消除组件卸载导致的 50-150ms 白屏等待；会话/工作目录变化时缓存 key 不匹配自动失效；reloadTick 刷新按钮仍强制重拉。

## 0.35.3 - 2026-08-22 - feat
- 本地仓库面板首开提速（启动预热）：host `apply()` 启动时后台预热 `repoScan` SWR 缓存（fire-and-forget，不阻塞启动）——浏览器启动后**首次**打开面板直接命中缓存，7-8s 全量扫描等待变为秒开（此前缓存只在面板打开过之后才存在，冷启动首开必全量）。
- `refreshRepoScanInBackground` 返回进行中的 promise + `repoScanRefreshPromise`：缓存未就绪但预热/后台刷新进行中时，`repoScan` handler 等待同一次构建（防止启动预热与首开面板双路并行全量扫描）。
- 代价：每次启动一次异步全量扫描；会话内不打开面板时该次扫描白费（可接受）。不改 F4-4 前端按需加载决策，不改变 0.35.1 force 强制重扫语义。

## 0.35.2 - 2026-08-22 - feat
- 技能观察与自优化机制（grilling 方案落地）：
  - host：新增 `skillObserveGet/Set/List` rpc + `_governance/skill-observations.json` 单一事实源（version 1，skills 按名索引：observing/enabledAt/disabledAt/optimizedAt/revision/entries，pendingSuggestions 实时计算，entries 复盘内容由 agent 写入、host 原样保留）；
  - 注入分层：插件技能（source=custom, provider=dsh-manager）= 注册时运行时注入观察约定块——`registerPackagedSkills` 增加注册状态 registry，`skillObserveSet` 对插件技能**先 dispose 旧注册再重注册**（dsh-skill register 同名 first-wins，不能直接覆盖），开关即时生效、不污染包内 SKILL.md；文件技能（EDITABLE_SOURCES 且有 path）= 开关 on/off 直接改 SKILL.md 追加/移除 `<!-- dsh-observe:start -->` 约定块（幂等、精确匹配）；
  - client：Skill 面板每张技能卡片新增「观察」开关（默认全关），乐观更新 + 失败提示，catalog 行透传 observing/pendingSuggestions；
  - 新增包内技能 `skill-optimize`：观察记录消费与优化落地——读队列 → 加载 writing-for-agents 判据 → 逐条去噪（no-op/单次过拟合/重复/相关性丧失，剔除必给原因）→ 合并同类出最小方案 → 用户确认 → 落地（插件走 local-governance 发版、全局/项目直改文件、保留观察约定块）→ 验证 → 写回 handled/optimizedAt/revision；
  - local-governance：「待审核提醒」扩展为「顺带提醒」——待审核数 + 待优化建议数合并一句话提醒；
  - 种子：`_governance/skill-observations.json` 预置当前全部技能 observing:false。

## 0.35.1 - 2026-08-22 - fix
- 0.35.0 审核修复：`repoScan` SWR 缓存支持 `{ force: true }` 强制重扫——reload 刷新按钮与 `repoInvalidate`（服务面板注册状态变更→仓库面板重扫）路径改走强制刷新，恢复「用户主动刷新 / 注册变更后必须拿到最新数据」的原语义（此前 15s 缓存会吞掉刷新意图，角标最长滞后 15s）。

## 0.35.0 - 2026-08-22 - feat
- 本地仓库面板加载提速（fix）：`repoScan` 加 host 侧 SWR 缓存（15s TTL）——面板每次打开无条件全量重扫（4 根目录递归 + 未登记仓库 gh 网络探测 + 全仓库 git spawn）导致首次/页面态丢失后 7-8s 加载；现新鲜缓存直接回、过期先回旧值 + 后台单飞重扫（与 repoDetail 三层缓存同款模式），折叠再开与隔时再开均秒回。
- dsh-repo-clone 克隆后快速分析 + 装配询问（feat）：克隆完成必做快速查看（package.json / README 头部 / cordis.patch.yml / lib 入口），输出 3–5 行摘要；按 4 特征判定 DSH 插件（`dsh` 配置 / cordis.patch.yml / `@deepseek-ai/cordis` peerDeps / `__ModuleLoader__` 或 `ctx.effect`），是则询问用户是否装配（`link:` 直连或构建后 `file: tgz` 快照，按 local-governance 流程），否则仅汇报。

## 0.34.9 - 2026-08-22 - docs
- 按 writing-for-agents 规范重构 `dsh-review` 技能（行为零变化）：
  - description 触发词收敛为「审核、复核」（原 7 个同义变体砍掉 5 个，同分支只留一词）；
  - 删除与 local-governance 流程 I 重复的「追加规则/提醒规则」——入队决策单一事实源归流程 I，本技能只留指针；
  - 步骤 2/3 补明确完成判据：七维度逐条给结论（无问题也要写明）、二审无未归类条目（原「确认清单稳定」模糊）；
  - 否定式指令改正面表述（「列全候选项由用户选」「只改最小范围」等）；
  - 环境事实收敛为队列路径 + 常见受审仓库，移除与审核无关的账本路径。
- 队列 schema、四步审核流程、触发语义均未变。

## 0.34.8 - 2026-08-22 - feat
- 更新后审核机制：新增 `dsh-review` 技能——待审核队列消费方与 schema 单一事实源（`_governance/pending-reviews.json`），四步审核流程（一审全角度 → 二审源码证伪 → 修复前评估 → 修复验证 + 队列更新），步骤 0 读队列让用户按需选审核范围（当前/全部/指定 id）。
- local-governance 技能：新增铁律 9「更新后审核钩子」+「待审核提醒」小节 + 流程 I「更新后审核钩子」——代码/配置变更或发版完成后主动询问"立即审核 / 推迟入队"；登记/克隆类静默入队不询问；本技能每次被调用时顺带提醒待审核数。
- dsh-repo-clone 技能：步骤 5 新增队列登记——克隆完成按 dsh-review 约定静默入队（type=clone），不询问。
- 队列种子：`_governance/pending-reviews.json` 预置 0.34.6、0.34.7 两条 `status=pending` 记录（可立即体验审核流程，作为审计起点）。
- 包内技能注册无需改代码：自动扫描（0.34.5+）约定下，skills/ 放目录即注册。

## 0.34.7 - 2026-08-22 - fix
- dsh-plugin-lifecycle 恢复模型自动调用：SKILL.md frontmatter 移除 `disable-model-invocation: true`。0.34.6 起注册开始解析 invocation 后，该行与 `user-invocable: false` 组合成双禁（modelInvocable:false + userInvocable:false），技能完全不可达；移除后为仅模型自动调用（`user-invocable: false` 保留——用户显式调用仍不可用，需要时可再移除该行）。镜像副本（skill仓库 `plugins\dsh-manager\dsh-plugin-lifecycle\SKILL.md`）已同步。

## 0.34.6 - 2026-08-22 - fix
- 复核 0.34.5 扫描改造（全角度审查 + 二审剔除虚假问题后）修复包内技能注册的 frontmatter 元数据丢失：
  - **invocation 透传**：此前注册忽略 frontmatter 的 `disable-model-invocation` / `user-invocable`，一律落默认 `{modelInvocable:true, userInvocable:true}`——`dsh-plugin-lifecycle`（作者意图 user-invoked）被错误地变为模型可自动调用、`service-config` 的 `user-invocable:false` 失效。现解析两字段：`disable-model-invocation: true` → `modelInvocable:false`（仅用户显式调用）；`user-invocable: false` → `userInvocable:false`（仅模型自动路由）。
  - **resourceBase 补传**：注册新增 `resourceBase: {kind:'directory', path:<技能目录>}`，修复 `dsh-plugin-lifecycle` 正文相对引用 `REFERENCE.md` 加载时无基准目录的问题（此前加载提示只有“provider 管理资源”，模型无法解析相对路径）。
  - **whenToUse 透传**：frontmatter 的 whenToUse 随注册进入目录摘要（catalog 本就支持该字段，此前被丢弃）。
  - **frontmatter 解析健壮性**：meta 改从 `splitFrontmatter` 的 fm 行解析（兼容 BOM/CRLF），替代 `parseFrontmatterMeta` 的 `^---\n` 正则——CRLF/BOM 文件此前整段失配、description 静默回退成技能名；description 空串回退 name，避免 `validateRuntimeSkill` 抛「requires a description」吞掉整条注册。
  - 行为影响：修复后 `dsh-plugin-lifecycle` 按作者意图变为 user-invoked（不再出现在模型自动目录，用户显式调用仍可用）；`service-config` 保持模型可见、用户显式调用被拒；`dsh-repo-clone` / `local-governance` 无相关字段，行为不变。
- 历史定性：以上均为 0.8.0 引入 `registerPackagedSkills` 以来的遗留（非 0.34.5 回归），本次随复核一并修正；安装副本与源码 hash 一致、版本四件套一致等已核项未见问题。

## 0.34.5 - 2026-08-22 - feat
- 包内技能注册从硬编码白名单改为**自动扫描** `skills/` 直接子目录（目录即真相）：`registerPackagedSkills` 不再维护 `PACKAGED` 数组，改为 `readdirSync` 枚举 + 逐目录读 `SKILL.md`，注册名取 `frontmatter.name ?? 目录名`，按名排序注册。
  - 新增包内技能只需建目录 `skills/<name>/SKILL.md`，无需第二处登记（根治 0.34.3 漏登白名单类问题）；
  - 扫描约定与 `discoverPresetSkillPreviews` / 官方 `dsh-skill-filesystem` 一致：depth=1 只认 `SKILL.md`，逐条 try/catch 隔离，坏条目仅 warn 不拖垮整体；
  - 注册通道不变（`ctx.get('skills').register()` runtime 注入 + `ctx.effect` 生命周期清理），技能位置/打包/分发链路不变。

## 0.34.4 - 2026-08-22 - fix
- 修复 0.34.3 遗漏：包内技能注册白名单（`registerPackagedSkills` 的 `PACKAGED` 数组）未加入 `dsh-repo-clone`，导致新技能虽随包分发但从未注册进运行时技能表，Skills 面板与 agent 技能目录均不可见。补登白名单条目并同步 client VERSION。

## 0.34.3 - 2026-08-22 - feat
- 新增插件技能 `dsh-repo-clone`（`skills/dsh-repo-clone/SKILL.md`）：克隆远端仓库并登记治理账本的标准流程——①代理检查（已设置直接用，缺失先问用户软件名与端口再设 global proxy）②克隆（默认 `--recurse-submodules`；遇 schannel `SEC_E_NO_CREDENTIALS` 加 `-c http.sslBackend=openssl` 单次重试）③校验（最新提交/分支/submodule status）④按 local-governance 流程 G 写 repos.json + REPOS.md（schema 单一事实源在 local-governance，不重复定义）。
- 本地仓库面板「拉取新Github项目」指令模板改为技能引用：内联的代理决策树与登记字段要求移入技能，模板只携带任务参数（仓库地址/识别类型/目标目录/当前代理），消除模板与技能的双份维护。
- 随版收编本日早前本地改动（原登记 CHANGELOG-local）：⋯ 菜单边界检测自动翻转（滚动容器矩形基准 + 翻转 + 限高滚动）；「打开」按钮改「管理页面」文案且未运行时置灰。
- 环境：全局 `git config --global http.sslBackend openssl` 根治 schannel 经本地代理握手失败；技能内保留单次 `-c` 应急分支作保险丝。

## 0.34.2 - 2026-08-22 - fix
- 代码审查 75 项发现的落地修复（审查文档：`D:\Desktop\Dsh\总结文档\dsh-manager-代码审查总结.md` / `dsh-manager-修复报告.md`）：
  - S1×6 全部修复：F1-1 COMPANION_RE 收紧（禁 `.` / `..` 路径穿越）、F1-2 移除快照共享破坏的无条件 deleteSnapshot、F2-1 日志流 error 监听、F2-2 外部进程匹配收紧（cwd>3 + 词边界 + name≥5）、F3-1 safeSkillName 校验、F3-2 只读 .env.example。
  - S2×26 全部修复：readBody 10MB 上限 / readNotesStore 静默降级 / doDisable 事务回滚 / patchScan 串行化 / vm codeGeneration 两处收紧（runScriptTransform + resolveCustomSkillDir）/ 服务操作 serializedSvc 串行化 / PID 复用核验 / 端口复检 / healthUrl port 守卫 / port 校验 / 行缓冲 1MB 上限 / AI 命令脱敏 / externalKill 核验 / AI 预热 catch / AI 代次计数 / repoScan 并发 5 / repoDetail 缓存淘汰 / repoDeleteSkill 解析 / rpc 120s / AI 轮询清理 / 'none' 终态 / 面板按需加载 / 镜像轮询并发 3 / i18n card.saveFailed。
  - S3×2：F3-12 setInvocation 复用 writableDefinition 等；遗留 41 项 S3 延后（详见修复报告）。
  - F1-8 二审补全：resolveCustomSkillDir 的 runInNewContext 补 `codeGeneration: { strings: false, wasm: false }`（与 runScriptTransform 对称）。
- client.js VERSION 0.34.1 → 0.34.2 对齐（随升版修正 F4-1 类漂移）。
- 装配方式：目录复制 → file: tgz 快照装配（`deepseek-ai-dsh-manager-0.34.2.tgz`）。

## 0.34.1 - 2026-08-21 - docs
- local-governance 流程 A 第 3 步固化「项目文件夹同一时间只保留最新一个 tgz」：复制新版本前先删除目录内所有旧版本 `<包名>-*.tgz`（已跟踪的用 `git rm`）。
- 清理：dsh-manager 项目目录移除 26 个旧版本 tgz（0.10.2–0.27.0），只保留 0.34.0 分发副本；旧版本仍在 `_snapshots` 归档（回滚载体不受影响）。

## 0.34.0 - 2026-08-20 - feat
- 本地修改登记闭环：local-governance 新增铁律 7/8 与流程 H（本地改动必须登记 `CHANGELOG-local.md`、使用本地维护分支并遵守 `git pull --rebase` 上游同步纪律）。
- 本地仓库面板：local 项目详情页新增「未登记提交」提示，展示未登记到 `CHANGELOG-local.md` 的 outgoing 提交，并提供「登记本地修改」按钮生成补登指令写入会话输入框。
- `lib/repo-core.js` 新增 `uncoveredOutgoing(doc, commits)`；`repoDetail` 响应新增 `unregisteredOutgoing` 字段。
- 修复热重载残留：`/api/dsh-manager` 路由注册改挂 `ctx.effect`（dispose 自动清理），避免重复 exact route 导致 dsh-manager 热重载失败。

## 0.33.0 - 2026-08-20 - feat
- 服务面板 P0 全套优化：① 信息架构——AI 设置 + 服务开关收进标题栏「⚙ 设置」弹窗，主面板只留服务列表；项目路径缩写为相对治理根的路径（完整路径进 tooltip）；未配置服务的项目统一收进底部可折叠区（默认收起）；② 交互——全部去掉 window.confirm 原生弹窗（启动服务直接执行，清 AI 缓存/清日志/删服务/项目级全部停止改内嵌两段确认），新增面板级「全部启动/全部停止」跨项目操作，新增全局搜索框（按项目名/路径/服务名/说明/命令过滤）；③ 按钮收纳——服务行主操作收敛为启动/停止切换 + ⋯ 菜单（重启/日志/编辑，外部进程进 ⋯ 菜单 kill），项目头收敛为全部启动/全部停止 + AI 配置 + ⋯ 菜单（新增/移除）；④ 视觉——服务行左侧 3px 状态条 + 彩色圆点（绿=运行/橙=启动中/灰=停止/红=外部占用），运行中项目置顶。

## 0.32.0 - 2026-08-20 - feat
- 服务面板优化（A+B+C）：① 服务条目新增「说明」字段（note，编辑弹窗可填，服务行显示灰字说明，host validateServiceEntry/computeServiceStatus/serviceRegister 全链路透传）；② 数据清理——未配置服务的项目折叠成一行精简卡片，sub2api 占位条目已删；③ 视觉减法——服务行 badge 收敛为状态/健康/退出码/运行时长（autoStart/autoRestart/detached/envSensitive/pid 不再挂在行上，配置仍可在编辑弹窗查看）。

## 0.31.0 - 2026-08-20 - feat
- 服务面板：每个项目卡片在「新增服务」左侧新增「AI 配置」按钮——点击把「用 service-config 生成静默配置并测试」的指令写入当前会话输入框（复用 repo 面板 writeDraft 机制，`conversationService.input.for(actx).actions.setDraft`），随后自动关闭面板并聚焦会话输入框，用户回车即可发送。
- 本地仓库面板：所有「写入指令到输入框」动作（拉取更新/初始化 Git/同步/镜像更新/删除技能等）成功后同样自动关闭面板并聚焦输入框，回到会话主页直接发送。

## 0.30.0 - 2026-08-20 - feat
- 新增插件自带技能 `service-config`：给本地项目配置 dsh-manager 服务面板的服务（识别服务类型 → 生成静默启动配置 → 写入 services.json → 阶梯测试 → 失败 AI 诊断 → 测试后停止），随插件装配自动注册（provider: dsh-manager），随卸载消失。

## 0.29.0 - 2026-08-20 - chore
- 拆文件（行为零变化，端点回归前后一致）：
  - 新增 `lib/service-core.js`（28 个服务域纯函数 + `SERVICES_LOG_DIRNAME`）：命令解析/环境展开/日志格式/进程与端口探测/优雅与强制停止等无状态工具。
  - 新增 `lib/repo-core.js`（16 个仓库域纯函数）：git 封装（runGit/runGh/gitState/gitLogEntries）、README/package/frontmatter 读取、本地更新文档解析、提交素材构建。
  - 新增 `lib/ai-core.js`（7 个 AI 域纯函数 + `AI_CACHE_FILENAME`）：normalizeAiExplain/缓存读写/讲解输出解析/prompt 构建/atomicWrite。
  - `lib/index.js` 移除 51 个函数 + 2 常量，改为从三个模块 import；插件状态（队列/缓存/日志流/接管退避）与全部 handler 仍留在 index.js，行为不变。
  - 拆分准则：仅迁「无模块级可变状态」的纯函数，脚本自动闭包补全依赖并阻断引用状态者；依赖节点内置 API 的模块自带 import 与 execFileAsync。

## 0.28.0 - 2026-08-20 - feat
- P2 服务健壮性修复：
  - P2-6：`cleanupOldServiceLogs` 跳过运行中 detached 服务的日志文件（子进程 fd 直写，删除会让其继续写已删除 inode，日志永久丢失；从 services-state 收集正在运行的 detached 服务日志名，清理时跳过）。
  - P2-7：`getProcessInfo` 按 pid 30s 缓存（external 分支每次扫描都跑 tasklist + wmic/PowerShell 两个子进程，开销大；缓存上限 200，满时淘汰最老一半）。
  - P2-2：`clearServiceLog` 对运行中 detached 服务改为截断当前文件 + 只删滚动档 .1/.2（原 rm 全部文件会让子进程写已删除 inode）。
  - P2-8：`quoteCmdArg` 先展开 `%VAR%`（与 detached 直 spawn 的 expandEnvVars 语义一致，同一参数两种模式行为不再分裂；未定义变量原样保留）。
  - P2-3：`serviceConfigSet` 保存时即校验 detached 命令可解析性（shell 操作符 / 命令存在性 / .cmd 重写），提前到编辑保存阶段报错而非启动时失败；占位条目（command 空）与含 `%VAR%` 命令跳过。
  - P2-1：`serviceLogGet` 返回 `detached` 标志，日志弹窗对独立运行服务显示「此日志由服务进程直写，无面板时间戳与 out/err 标记」提示。
- AI 讲解设置区新增「清空缓存」按钮（host `aiExplainClearCache` 清空 `_governance/ai-explanations.json`，返回清除条数；客户端确认后调用并提示结果）。

## 0.27.0 - 2026-08-20 - chore
- 低风险代码重构（简洁性/可维护性），不改任何业务行为：
  - 提取 `resolveServiceTarget(args, opts)`：serviceStart/Stop/ExternalKill/Restart/StartAll/StopAll/AiDiagnose 七个 handler 的 path/name 解析 + 读设置 + 读配置 + 定位条目统一收敛（约 80 行重复样板消除；错误文案统一为「缺少项目路径 / 缺少项目路径或服务名 / 未找到已注册的服务」）。
  - 提取 `runLlmWithTimeout(llm, aiSettings, system, prompt, timeoutMs, onDelta)`：AI 讲解队列、AI 诊断、AI 日志摘要、AI 配置助手四个 LLM 调用点的 AbortController + 定时器 + try/catch/finally 样板统一收敛。
  - 提取 `terminatePid(pid, {graceMs, force})`：优雅停止（taskkill /T 发 WM_CLOSE 等待 graceMs 再 /T /F 强杀）与强制停止的唯一实现；`stopServicePidGraceful`/`stopServicePid` 变为薄包装，逻辑不再分裂两处。
  - 提取 `writeServiceLog(path, name, text, {detached})`：日志写入唯一路由（detached 直写文件 / 非 detached 流式），spawnService 启停分隔线与 scheduleAutoRestart 崩溃通知全部改走该路由，杜绝再犯「直写与流式混用导致 rename 分叉」。
  - 新增 `wrapHandler`：路由层统一「args 默认空对象 + handler 异常转 {error}」，业务错误不再以 HTTP 500 形态返回（客户端 rpc 无感，错误形态更一致）。
  - client.js 的 zh/en i18n 字典从「按功能段挤在少数几行」改为每键一行（434 键 × 2），后续追加/审查不再需要行内锚点替换。


## 0.26.0 - 2026-08-20 - feat
- P0-A：`resolveDetachedCommand` 的 `where` 解析改为优先选带 `.exe/.cmd/.bat` 扩展名的行——`where npm` 会把无扩展名 POSIX sh 排在 `.cmd` 前面，直 spawn 无扩展名文件必挂；修复后独立运行的 npm/pnpm/npx 可用。
- P0-B：`resolveCmdEntryScript` 正则改为 `((?:%~dp0|%dp0)\\[^"\r\n]+?\.(?:js|cjs))`——shim 字面文本是 `%~dp0`/`%dp0`（无尾部 `%`），且兼容本机 npm.cmd/npx.cmd 的 `SET "VAR=%~dp0\..."` 变量风格与 pnpm.CMD 的 corepack 直写风格；此前所有 .cmd 都无法解析。
- P1-1：`maybeRotateDetachedLog` 加 60s 节流 + 轮换 `.1→.2`（丢最旧 `.2`），防止 3s 轮询反复归档导致 `.1` 无限增长。
- P1-2：`readServiceLogTail` 统一走 `decodeServiceLogChunk`（UTF-8 优先、含替换符回退 GBK），detached 直写日志的 GBK 中文不再乱码。
- P1-3：detached 服务会话中途状态丢失 → `computeServiceStatus` external 分支检测到端口在监听且命令行匹配（`relateExternalProcess`）时，`adoptDetachedMidSession` 自动接管回托管（写回 state + 日志标记），带 5 分钟失败冷却；不匹配仍按「外部运行中」显示。
- P1-4：`scheduleAutoRestart` 对 detached 服务的崩溃通知改走 `appendDetachedLogLine`（直写文件），不再走会触发 rename 脆弱点的 `appendServiceLogText`。


## 0.25.1 - 2026-08-20 - fix
- 修复 P0 参数处理缺陷（args 含空格/特殊字符被拆坏）：
  - 独立运行（detached）：`resolveDetachedCommand` 改为只解析 command 字段（取 exe + 内联参数），args 数组原样追加（仅逐项展开 %VAR%），直接交给 spawn 数组参数，不再拼接字符串重切；shell 操作符检测只作用于 command 字段，args 里的 `>`/`&`/`|` 不再误判。
  - 普通服务（shell:true）：新增 `quoteCmdArg`，args 数组 join 前给含空白/特殊字符的参数重新加双引号（内部 `"` 转义 `\"`），修复 0.19.0 起「args 支持引号」在 shell 模式下未真正生效的问题。
  - detached 启动分隔线改显示真实 spawn 命令（exe + args 数组）。


## 0.25.0 - 2026-08-20 - feat
- 独立运行（detached）服务静默启动，不再弹出 node/cmd 控制台窗口：
  - 弹窗根因（子代理实测 Node v24.18.0）：`shell:true + detached:true` 时 cmd.exe 中介被 detached 创建，不继承父控制台又无 CREATE_NO_WINDOW → 自行分配可见控制台窗口；`windowsHide` 的 CREATE_NO_WINDOW 压不住。
  - 修复：detached 服务去掉 shell，直 spawn 可执行文件（`windowsHide:true + detached:true`）；普通服务（detached:false）保持 shell:true 现状（实测无窗，零回归）。
  - 命令解析（`resolveDetachedCommand`）：展开 `%VAR%`（process.env）→ 引号外检测 `& | > <` shell 操作符并明确报错拒绝 → 引号感知切分（`tokenizeCommandLine`，与 client.parseArgs 语义一致）→ `where` 定位 PATH 命令 / 完整路径直接使用。
  - `.cmd/.bat` 命令（npm/pnpm/yarn 标准 shim）自动改写为 `node <cli.js>` 直跑（`resolveCmdEntryScript` 解析 `%dp0%\node_modules\<pkg>\bin\<entry>.js|cjs`）；解析失败明确报错，不弹窗。
  - 日志直写文件：detached 服务 stdout/stderr 直接挂日志文件 fd（O_APPEND，`openSync`），dsh 退出后写文件永不 EPIPE（修复 0.24.0 潜在债：管道读端关闭后服务写日志可能崩溃），且独立进程持有的继承句柄让日志在 dsh 重启接管后持续记录。
  - 分隔线直写（`appendDetachedLogLine`）：detached 服务的启动/退出分隔线与接管标记一律直接 `appendFile`，绝不走 `appendServiceLogText`——后者首次调用触发 `rotateServiceLogStream` 把 file rename 成 file.1，而子进程 fd 开在 rename 之前的 inode 上，导致子进程输出全部落到 .1 与当前文件分叉（实测 8 条 tick 全进 .1、当前文件只剩分隔线）。
  - 读取侧懒归档+截断（`maybeRotateDetachedLog`，serviceLogGet 前调用）：文件超过 256KB 时旧内容追加到 `.1` 后当前文件清空（原地截断不 rename，子进程 fd 不受影响），控制体积。
  - 接管匹配修复（`relateExternalProcess`）：直 spawn 的完整 exe 路径（`D:\...\node.exe server.js`）与配置裸命令（`node server.js`）字符串不匹配，0.24.0 的 `verifyAdoptedService` 会在 dsh 重启后误判「不可接管」导致独立服务失联——新增「命令行首词 exe 基名 == 配置命令首词」判定（node.exe→node），保证重启接管成立。
  - `doStartService` 捕获 spawnService 抛错（detached 命令不合法/.cmd 无法重写/日志文件打不开/envFile 读取失败）转为 `{error}` 返回，不再让 handler 整体 500。
  - client：`service.detached.title` tooltip 更新说明（静默启动/日志直写/.cmd 改写/不支持 shell 操作符）。

- 服务独立运行（v2：dsh 关闭/重启后继续存活并被接管）：
  - 服务条目新增 `detached` 选项（客户端编辑器「独立运行」开关）；`spawnService` 用 `detached: true` 启动，进程进入独立进程组，不随 dsh 退出而终止。
  - dispose 不再杀 detached 服务：`killAllServices` 跳过 `info.detached === true` 的条目并保留状态；dispose 写回时只保留 detached 条目（`writeServicesState(state.services)` 而非 `{}`）。
  - 启动对账改为「验证后接管」：detached 且 pid 存活 → `verifyAdoptedService`（命令行匹配 + 端口监听匹配）通过则保留状态条目并写日志标记「dsh 重启后接管运行中的进程（此后的日志不再由面板捕获）」；验证失败（PID 复用/命令行不可读）→ 不杀不接管，仅删记录。
  - 非独立残留 pid 仍清理，但加了 PID 复用防护：命令行能确认不是本服务进程（`relateExternalProcess === false`）时只删记录不杀未知进程。
  - autoStart 不受影响：已被接管的 detached 服务 `doStartService` 返回 alreadyRunning 自动跳过。
  - host 新增 `findServiceEntryByKey` / `verifyAdoptedService`；`validateServiceEntry`/`readServicesConfig`/`serviceRegister`/`doStartService` 状态写入/`computeServiceStatus` 返回值均带 `detached`。
  - client：编辑器新增「独立运行」开关（variant=warn），服务行新增「独立」黄色徽章（tooltip 说明独立语义），i18n zh/en 新增 `service.detached(.title)`，`service.hint` 更新。
  - 已知边界：接管后的进程不再有实时日志捕获（日志文件保留接管前的记录）；接管后 dsh 不在父进程位置，崩溃自动重启（autoRestart）不再生效。

## 0.23.0 - 2026-08-20 - feat
- 杀死外部进程（用户要求 1+2）：
  - 「外部占用进程详情」弹窗底部新增红色「杀死进程」按钮；服务行「查看进程」左侧也新增同款按钮，两者走同一确认流程。
  - 杀前重查：host `serviceExternalKill` 不信任客户端快照的 externalPid，重新 `findPidByPort(port)` 反查当前占用进程；端口已释放返回 `{ok:true,alreadyFree:true}`。
  - 优雅优先：`stopServicePidGraceful(pid,5000)`（先 taskkill 发 WM_CLOSE 等 5s 再强杀）。
  - 分级确认：`externalRelated===true` 普通确认；`false/unknown` 显示红色警示（可能是其他程序占用）。
  - 成功后清空 svcStatusCache 并刷新面板；仍不接管、不写状态文件、不触发 autoRestart。
  - host 新增 handler `serviceExternalKill`；client 新增 `serviceExternalKill` port 方法、`killConfirm` 状态、`doKillExternal`、确认框与 CSS `.skm-cfg-actions`。
  - 修复优雅停止误判（影响 serviceStop/serviceRestart/serviceStopAll/serviceExternalKill）：taskkill 无 /F 失败时也返回 exit 128（如进程只能强杀），旧代码把 `error.code === 128` 一律当「进程已不存在」返回成功、跳过强杀，导致进程存活却报已停止；现改为仅凭 `not found` 消息判定已停止，其余失败继续强杀兜底 / 如实报错。

## 0.22.0 - 2026-08-20 - feat
- 外部占用进程详情（A+B+C）：
  - 行内信息：外部运行中的服务行现在直接显示占用进程名 + PID（`外部运行中 · node.exe（PID 1234）`），不再只靠 tooltip。
  - 身份判断：根据占用进程命令行与本服务配置（工作目录/启动命令/服务名）比对，显示三态徽章——「像是外部启动的本服务」（绿）、「疑似被其他程序占用」（红）、「无法确认进程身份」（黄）。
  - 详情弹窗：外部状态新增「查看进程」按钮，打开只读详情（进程名/PID/端口/判断依据/掩码后的命令行），延续「不接管」决策（无停止按钮）。
  - host 新增 `getProcessInfo`（tasklist 进程名 + wmic 命令行，失败回退 PowerShell Get-CimInstance）、`maskCommandLine`（掩码 token/key/secret/password/auth 值并截断 600 字符）、`relateExternalProcess`（身份判断）；`computeServiceStatus` 返回新增 `externalName`/`externalCommandLine`（已掩码）/`externalRelated`。

## 0.21.0 - 2026-08-20 - feat
- 外部进程只读识别：已注册服务若面板记录的 pid 不在运行、但配置的探活端口被其他进程占用，`computeServiceStatus` 返回 `state='external'` + `externalPid`（netstat 反查）；服务行显示黄色「外部运行中」徽章（tooltip 说明端口/PID、命令行手动启动、面板不管理），并禁用启动/停止/重启/日志按钮（编辑仍可用）；明确不做接管（不写状态文件、不纳入 autoRestart/日志/优雅停止，避免误杀无关进程）。

## 0.20.0 - 2026-08-20 - feat
- 本地服务模块「个人开发者最实用清单」全部落地：
  - 启动中状态 + 启动超时：`computeServiceStatus` 返回 `state`（running/starting/stopped）；进程存活但端口/健康检查未就绪时显示「启动中」；`doStartService` 按 `startTimeoutMs`（默认 30000ms，可配 1-300s）等待就绪，超时返回明确错误并保留运行状态。
  - 优雅停止：新增 `stopServicePidGraceful`（先 `taskkill /PID x /T` 发 WM_CLOSE，等待最多 5s，仍存活再 `/F` 强杀）；服务停止/重启/项目停止/全部停止均走优雅路径；dispose 与启动对账保持快速强杀。
  - HTTP 健康检查：服务条目新增 `healthUrl`（完整 http(s) 地址或相对端口的 `/path`），`computeServiceStatus` 增加 `healthUp`；服务行显示「健康正常/健康异常」徽章。
  - 配置模板：编辑弹窗新增 Node / Python / npm 三个模板按钮，一键填充 command+args。
  - envFile 加载：服务条目新增 `envFile`（相对 cwd 解析），启动时读取 KEY=value 并合并（显式 env 覆盖文件值）；读取失败阻止启动并提示。
  - 配置校验：`serviceConfigSet` 保存前检查同项目/跨项目端口冲突（冲突直接报错阻止保存），并检查 command 首词是否在 PATH（不在则返回 warnings，面板以提醒形式展示）。
  - 日志 error 高亮：日志查看器把含 error/fail/exception/EADDRINUSE/unhandled 的行标红加粗。
  - 启动失败 AI 诊断：新增 `serviceAiDiagnose`；启动失败后客户端自动调用，把日志尾部 8KB + 配置（env 脱敏）发给 LLM，输出「可能原因 + 修复建议」；仅失败时调用，规则诊断继续兜底。
  - 日志 AI 摘要：日志弹窗新增「AI 摘要」按钮（`serviceLogAi`），把日志尾部发给 LLM，输出「做什么/有无异常/可能原因」中文摘要。
  - 配置 AI 助手：新增服务编辑弹窗「AI 帮我填」（`serviceAiDraft`）；读项目 package.json/README/.env.example，LLM 生成 name/command/args/env/port/healthUrl 草稿，用户确认后填入编辑器。
  - AI 服务助手设置：服务面板新增「AI 服务助手」设置区，与本地仓库「AI 讲解设置」共用 aiExplain 配置（供应商只显示已配 key 的；模型/思考等级下拉；maxTokens 固定 1600 不暴露）。
- 服务行新增「含敏感变量」标记（env 键含 TOKEN/KEY/SECRET/PASSWORD/AUTH）。

## 0.19.0 - 2026-08-19 - feat
- 服务生命周期自动化（P1）：
  - `autoStart`：服务条目新增「开机自启」开关；dsh 启动时在服务对账清理残留 pid 后，按 services.json 自动拉起 autoStart 服务（总开关关闭则不拉起）。
  - `autoRestart`：服务条目新增「崩溃重启」开关；进程异常退出（exit code != 0）且 pid 匹配时，按退避自动重启（5 分钟窗口最多 5 次，延迟 2s/4s/8s/16s/30s 封顶，超出停止并在日志写入说明）。手动停止/重启会先删状态，不会误触发。
  - 批量操作：项目头新增「全部启动 / 全部停止」；host 新增 `serviceStartAll`/`serviceStopAll`。
- 编辑器与配置健壮性（P2）：
  - `args` 解析支持双引号/单引号与转义，`--name "hello world"` 不再被拆成两段。
  - 工作目录输入框提供 datalist 候选（治理根/已配置根目录/已注册项目目录）。
  - `services.json` 解析失败不再静默清空：读配置返回 `error`，所有写操作（注册/保存/移除/启动/停止/重启/批量）被拦截，面板顶部显示「配置文件损坏，已阻止写入：…」。
- 面板服务行新增「开机自启」「崩溃重启」徽章，编辑弹窗内用开关控制。

## 0.18.0 - 2026-08-19 - feat
- 服务日志系统完善（P0+P1+P2）：
  - P0 可观测性：日志行级本地时间戳 + `[out]/[err]` 分流；stdout/stderr 行缓冲切分（跨 chunk 断行不丢半行）；UTF-8 优先解码、含 U+FFFD 时回退 GBK，缓解中文乱码；启动/退出分隔线（含 pid、命令、退出码、signal）。
  - P1 生命周期与可靠性：进程退出监听把 `lastExitCode`/`lastExitAt` 落盘到 services-state.json（手动停止会先删状态，pid 不匹配自动跳过，不污染）；面板在已停止服务上显示红色「上次异常退出 code=x」徽章；日志滚动保留三段（.log/.log.1/.log.2，各 256KB）；host 启动时清理超过 7 天的日志文件。
  - P2 查看器体验：日志弹窗新增搜索过滤（匹配行数）、暂停/恢复、清空、下载、加载更多（32KB→2MB 翻倍，host 合并读取 .2/.1/.log 三个窗口）；查看器打开时支持暂停自动刷新。
- `spawnService` 改为 `shell: true`（cmd.exe /c 解析整条命令行）：修复命令内嵌双引号时进程立即退出的问题（此前 args 数组拼接经 Windows 参数引号转义会改坏内嵌引号）。
- `serviceLogGet` 读取上限从 512KB 提升到 2MB，并合并当前文件与两个滚动窗口（最旧优先）。

## 0.17.7 - 2026-08-19 - feat
- 启动前端口预检：服务配置了端口时，点「启动」先解析 netstat 看该端口是否已被 LISTENING；被占用直接返回「端口 X 已被进程 <name>（PID y）占用。请先停止占用进程（taskkill /PID y /F），或修改本服务的监听端口后重试」，不再等到进程退出。
- 启动失败自动诊断：进程立即退出后等日志落盘，读日志尾部自动识别 `EADDRINUSE`（端口冲突）、`Cannot find module`（依赖缺失）、`不是内部或外部命令`/`is not recognized...`（命令不存在）、`SyntaxError/ReferenceError/TypeError`（脚本错误），把关键原因直接拼进错误提示；识别不了则回退原文案。

## 0.17.6 - 2026-08-19 - fix
- 统一服务面板空状态 UI：不再渲染 `command` 为空的「新服务」占位行；未配置任何服务条目时只显示项目头 + 「+ 新增服务」「移除注册」（与 `services: []` 项目的形态一致）。占位条目保留在 services.json，新增服务保存时仍会自动清理。

## 0.17.5 - 2026-08-19 - fix
- 修复「删除项目最后一个服务条目后项目从本地服务面板消失」：`serviceScan` 不再跳过 `services: []` 的项目（注册状态以 services.json 键存在为准，条目为空也应保留在面板，仍可「添加服务」）。
- 移除 0.17.2/0.17.3 加入的临时诊断日志（svcDebugLog / route-enter / route-body），host 恢复干净。

## 0.17.4 - 2026-08-19 - fix
- **真正根因修复**：`saveEditor` 内局部变量 `let port = null`（端口数字）把模块级 `const port`（rpc 通信对象）遮蔽了，导致 `port.serviceConfigSet` 永远同步抛 `Cannot read properties of null (reading 'serviceConfigSet')`——这就是「保存一直卡在保存中」的真正原因（setBusy 已执行，同步异常没人接住，0.17.3 的 try/catch 才让它浮出水面）。
  - 局部变量改名为 `svcPort`，entry 用 `port: svcPort`，模块级 port 不再被遮蔽。

## 0.17.3 - 2026-08-19 - fix
- 继续诊断「保存卡保存中」：0.17.2 日志证明用户点保存时请求未到达 serviceConfigSet（无 start 记录），但客户端 v0.17.2 确认已更新、35s 超时也未解除。
  - host 路由入口增加 `route-enter` / `route-body` 日志（区分「请求没到 webServer」还是「卡在 readBody」）；
  - client `rpc` 的 JSON.stringify 包 try/catch 转 Promise.reject；
  - client `saveEditor` 对 `port.serviceConfigSet` 调用包 try/catch，同步异常也会解除 busy 并显示「保存请求构造失败：…」。

## 0.17.2 - 2026-08-19 - fix
- 继续排查「新增服务保存一直卡在保存中」：服务端直测 serviceConfigSet（name=1/command=1）全部正常返回 ok，问题需区分「请求未到达 host」还是「客户端旧版未刷新」。
  - host `serviceConfigSet` 增加临时诊断日志：每步写入 `~/.dsh/dsh-manager/service-config-debug.log`（start/stat-ok/validated/settings-ok/written/done/error，含 path、serviceCount、services 摘要、entry 摘要），用于定位卡点；
  - 面板标题旁已有版本号 `v0.17.2`（确认客户端是否真正刷新到新版本）。

## 0.17.1 - 2026-08-19 - fix
- 修复「新增服务点保存一直显示保存中」：新增服务时把项目里 `command` 为空的「新服务」占位条目一起提交，host 校验返回「启动命令不能为空」，而错误提示只显示在面板内容区（被编辑器弹窗遮住）。现在：
  - 新增服务时自动过滤掉 command 为空的占位条目，只提交有效条目 + 新条目；
  - opError/notice 同步显示在编辑器弹窗内部，不再被遮挡；
  - rpc 增加 30s AbortController 超时，请求悬挂也会自动解除「保存中…」并显示错误。

## 0.17.0 - 2026-08-19 - feat
- 本地服务面板 Phase A（可观测性 + 可靠性基础）：
  - 服务日志捕获：`spawnService` 不再 `stdio:'ignore'`，stdout/stderr 一起追加到滚动日志 `~/.dsh/dsh-manager/logs/svc-<hash>-<name>.log`（256KB 封顶，超出自动滚存 `.1`）；服务行新增「日志」按钮，弹层每 3s 自动刷新并自动滚底。
  - 重启按钮：host 新增 `serviceRestart`（停止 → 等待进程树退出 ≤8s → 复用启动管线），服务行一键重启。
  - 运行时长显示：运行中服务显示「已运行 Xm/Ys」。
  - 修复 stopServicePid 吞错：`taskkill` 非 128 错误现在返回 `stopped:false` 并保留状态条目，UI 如实显示「停止失败」，不再假装已停止。
  - 扫描并行化 + 2s 状态缓存：`serviceScan` 对每个服务并行探活（原来串行，每个带端口运行服务最多等 1s）；启动/停止/配置变更即时失效缓存。
- 启动失败提示引导查看日志。

## 0.16.1 - 2026-08-19 - fix
- repoDetail 三层缓存（解决「重开面板 5 分钟后首次点卡片慢」）：
  - host 模块级内存 SWR：命中 20s 内直接返回；过期且指纹未变时只刷新 dirty 标记不重算；指纹变了先回旧值后台单飞重算。
  - 磁盘持久化 `_governance/repo-detail-cache.json`：进程重启后命中指纹直接复用，不再重新 git log/读文件。
  - 指纹 = `head + upstream + branch + remote` 四个决定重数据的分量；`dirty` 单独用 `git status --porcelain` 刷新，改文件不触发全量重建。
  - 只有项目真的更新（新提交 / upstream 移动 / 切分支 / 换 remote）才全量重建；快进增量复用历史留作后备（当前全量重建 ~1s，不引入祖先判断复杂度）。

## 0.16.0 - 2026-08-19 - feat
- AI 讲解设置面板升级：
  - 供应商下拉**只显示已配置好 API key 且能解析到非空值的供应商**（从 `settings.yaml` 的 `llm-pi-ai.providers.<id>.apiKeyEnv` 经 credentials 服务校验，不再列出全部 7 个供应商）。
  - 下拉选项文本去重：`name` 与 `id` 相同或仅空格/连字符差异（如 `deepseek v4 flash` vs `deepseek-v4-flash`）时只显示 `name`，不再出现「opencode-go（opencode-go）」式重复。
  - 第三个控件从「最大输出 token 数字输入」改为**模型思考等级下拉**（选项来自模型能力 `reasoning.efforts`，如 deepseek-v4-flash 支持 off/high/max）；`maxTokens` 固定默认 1600，不再暴露 UI。
  - 三个控件均增加文字标签（供应商 / 模型 / 思考等级）。
- host `llmGenerateText` 支持 `reasoningEffort`：非 off 时向 `ctx.llm.stream` 传递 `reasoningEffort`（off=不传，保持默认行为）。
- 设置迁移：旧配置 maxTokens=800 自动迁移为 1600；新增 `aiExplain.reasoningEffort` 默认 `off`。

## 0.15.2 - 2026-08-19 - fix
- 修复「点击 AI 讲解面板右上角重试按钮瞬间显示失败」：客户端把排队响应 `{state:'queued', error:''}` 误判为顶层错误（空字符串也算 string），重试实际已入队却被 UI 立即标记失败。现仅当 `error` 非空且 `ok !== true` 才按错误处理，重试后正确显示「排队中/生成中」。

## 0.15.1 - 2026-08-19 - fix
- AI 讲解失败重试修复：重试现在会**先删除磁盘缓存并落盘**、清空失败冷却、标记强制重新生成，真正重新请求；失败条目点击后不再自动重试，而是直接展示真实失败原因 + 原始提交信息，右上角重试按钮重新排队。
- 失败也持久化：失败条目写入 `_governance/ai-explanations.json`（`ok:false` + error + attemptedAt），刷新/重进面板后仍显示红色状态点与失败原因，不再误显示为灰色「待生成」。
- 预热补货策略优化：从「每轮 ≤50 条、等整批清空再下一轮」改为「队列低于 25 条时持续补货到 50」，灰色未处理条目会尽快全部入队，不再出现大批灰色长期不动。
- 详情卡秒开优化：浏览器启动/面板打开时后台预热 `repoDetail` 缓存（限并发 3、失败跳过），重进面板后首次点项目卡片也能秒开；缓存过期仍秒开 + 后台刷新（stale-while-revalidate）。
- AI 讲解设置 provider/model 改为**下拉选择**：选项来自宿主 `ctx.llm.listProviders()/listModels()`（仅已配置供应商）；切换 provider 自动带出该供应商第一个模型。
- 模型空输出防护：LLM 返回空内容视为失败并记录原因，不再写入空讲解缓存。

## 0.15.0 - 2026-08-19 - feat
- 详情面板的更新简介 / 本地更新 / 最近历史中的**每条提交都可点击**，弹出「AI 更新讲解」面板（560×420，覆盖在详情面板之上）：
  - 内容：中文「摘要 1–2 句 + 要点 3–5 条 + 对使用者的影响」；输入材料 = 提交信息 + `git show --stat` 文件清单 + diff（≤300 行带全文，否则每文件前 40 行、总量 ≤600 行）。
  - 生成走 `ctx.llm.stream`（provider `opencode-go` / model `deepseek-v4-flash`，思考强度默认，超时 120s，串行队列）；输出 JSON 解析，失败自动展示原始提交信息 + 错误原因，右上角固定重试按钮。
  - 浏览器启动（prefetchRepo 完成后）自动预热：repoScan → 收集全部卡片 incoming/outgoing/history 的 commit hash → 去重剔除已缓存 → 最近优先 ≤50/轮串行后台生成；点击未生成条目插队优先。
  - 缓存持久化 `_governance/ai-explanations.json`（按 commit hash，含生成时间/模型/原始 stat），跨会话复用；面板条目状态点（绿=已生成/黄=生成中/红=失败/灰=点击生成）。
  - 插件设置新增「AI 讲解设置」：enabled / provider / model / maxTokens，默认 opencode-go + deepseek-v4-flash + 800。
- 本地更新展示（GitHub 项目卡片详情新增「本地更新」区块）：
  - 约定优于强制：人工文档 = 项目根 `CHANGELOG-local.md`，条目锚点 `### [commit <hash>] <标题>`；面板以文档条目为主行展示（可点击 AI 讲解），git `@{u}..HEAD` 未覆盖提交自动兜底，自由段落（问题背景/工作流）折叠展示；本地项目同理（维护笔记区块）。
  - host 解析 CHANGELOG-local.md 并随 repoDetail 返回；AI 讲解优先把匹配条目内容喂给模型。
- 详情加载提速：repoDetail 内 git 状态/日志/README/package/localDoc 并行读取；去掉 gh 网络探测回退（type 只用 repos.json + rootType 兜底）；客户端按 path 缓存 repoDetail（45s TTL），二次点击≈0。
- 短 commit hash 归一化：文档条目的 7 位 hash 经 `git rev-parse` 归一到 40 位，与 AI 缓存键对齐；`aiExplainStatus` 支持短 hash 前缀匹配。
- 已知取舍：预热 ≤50 条串行、每条约 40–60s（模型带推理），全部生成完约 30 分钟；打开未缓存条目需等待在飞条目完成 + 生成。


- 技能卡片也支持点击弹出详情面板：展示技能介绍（frontmatter name/description 或正文首段）+ 技能内容（SKILL.md 全文，大高度可滚动）。
- host 新增 `skillDetail` 端点（SKILL.md/SKILL.txt/SKILL 读取 + YAML frontmatter 解析）；详情面板交互排除区扩展到 button/select/input/textarea/a（避免点技能应用表单误触详情）。

## 0.13.1 - 2026-08-19 - fix
- 项目详情面板移除「悬停 2 秒触发」，只保留点击卡片（按钮区除外）触发；点击后仍在鼠标位置显示圆形加载光标。

## 0.13.0 - 2026-08-19 - feat
- 新增「项目详情」面板：点击项目卡片，或悬停非按钮区域 2 秒，鼠标位置出现圆形加载光标，随后弹出约 80% 大小的详情面板（覆盖在当前面板之上，900×610）。
- 详情内容：更新简介（GitHub项目=落后提交 incoming；本地项目=未推送提交 outgoing）、最近更新历史（10 条）、项目介绍（README 标题+摘要+可展开全文）、包信息（package.json）、Git 状态（分支/远端/工作区/领先落后）。
- host 新增 `repoDetail` 端点：结构化 `git log` 解析、README 提取、package.json 读取；卡片按钮区域不触发详情（hover/click 均排除）。

## 0.12.2 - 2026-08-19 - feat
- 「GitHub项目」tab 的镜像卡片新增「注册服务/已注册」角标（与本地项目卡片一致）：点「注册服务」只建空条目；点「已注册」跳「本地服务」面板。
- 乐观更新与跨面板同步同时覆盖 `mirrors` 数组（`patchProjectLocal` / `patchRepoRegistered` 对 projects+mirrors 双数组打补丁）。

## 0.12.1 - 2026-08-19 - fix
- 修复「注册服务/已注册」角标跨面板不同步：在「本地服务」面板移除注册后，立即同步 repoPreload 缓存并通知「本地仓库」面板重扫（共享 `repoInvalidateStore`），无需重新打开仓库面板。
- 修复「注册服务/已注册」「私有/公开」角标点击到状态变化的延迟：改为乐观 UI 即时翻转 + 操作期间禁用角标；`repoScan` 对已登记仓库（repos.json 含 cloudRepo/private）跳过 git/gh 探测，全量重扫从数秒降到约 1.3s。

## 0.12.0 - 2026-08-19 - feat
- 新增「本地服务」面板（侧边栏第四个按钮，独立于本地仓库面板）：
  - 服务配置集中存 `D:\Desktop\Dsh\本地项目\_governance\services.json`（键=项目绝对路径正斜杠；面板直接写，agent 只生成模板）。
  - 运行时状态存 `~/.dsh/dsh-manager/services-state.json`（pid/startedAt）；host 启动对账清残留、host dispose 统一杀树（服务随 dsh 停止）。
  - 进程语义：Windows `cmd.exe /c <command> <args>` spawn、cwd+合并 env、stdio ignore；停止 `taskkill /PID <pid> /T /F`；配 port 才 TCP 127.0.0.1 探活。
  - 总开关 + 启动确认弹窗（settings.json `services:{enabled,confirmStart}`，默认开）。
  - 每项目命名服务列表 `{name,cwd,command,args,env,port?}`；校验 cwd 存在/command 非空/port 1-65535/name 项目内唯一。
- 本地仓库面板：
  - 项目识别改为「文件规则」：目录含 .git/.dsh 或顶层有非隐藏、非 README* 普通文件 → 项目卡（grok-register 等裸目录现在可见）；否则视为分类目录继续递归。
  - 自动分类：有第三方 origin → GitHub项目；无 origin 或 as1350 自己的 origin → 本地项目；删除根目录 rootType 手动下拉。
  - 项目卡右上角新增「注册服务/已注册」角标：注册只建空条目，已注册角标点击跳「本地服务」面板。
- 启动失败（进程立即退出）仅卡片错误提示，不自动重启；v2 规划（日志/健康/重启/独立存活/启动顺序）已写入 BACKLOG.md。

## 0.11.0 - 2026-08-19 - feat
- 本地仓库面板：切换公开/私有后自动同步人读账本 REPOS.md 对应行的「云端状态」，不再生成「请同步 REPOS.md」的 agent 指令草稿（`repoSetVisibility` 内新增 `updateReposMdVisibility`，客户端 `setVisibility` 移除 `draft`）。

## 0.10.3 - 2026-08-19 - fix
- 本地仓库面板「GitHub项目」tab 卡片网格缺纵向滚动：镜像根在列表末尾的项目被视口裁掉、无法下滑（如 `反代项目` 下 ds-freebuff2api/sub2api 仅存数据、面板不可见）。为 `.skm-repo-grid` 补 `overflow-y:auto; min-height:0`，与「本地项目/Skill仓库」tab 滚动行为一致。
## 0.10.2 - 2026-08-17 - chore/docs
- 更新流程新增 `CHANGELOG.md`：每次 bump 必须追加条目。
- `package.json` `files` 纳入 `CHANGELOG.md`，随包分发。
- local-governance 技能：归档/装配流程补入 CHANGELOG 更新步骤。

## 0.10.1 - 2026-08-17 - fix
- 本地仓库面板性能优化：页面加载即预取（内存态）、面板秒开、`repoScan`/`repoGitStates` 并行化、移除探测缓存。
- `skill仓库`（.git 仓库）纳入「本地项目」列表；克隆因私有锁定。
- 分类克隆交互：排除项目目录、分类名不带 `\` 显示、按钮改名「拉取新Github项目」。

## 0.10.0 - 2026-08-17 - feat/chore
- 版本策略正式化：local-governance 铁律新增「版本只增不覆盖」。
- 归纳 0.9.0 累积功能到 0.10.0：
  - 多根目录递归扫描 + rootTypes（本地项目 / GitHub项目镜像）分类
  - 自动探测 `cloudRepo` 与公开/私有（git remote + gh）
  - GitHub 可见性切换（`gh repo edit`，同步 repos.json）
  - 本地项目卡片：GitHub 页、克隆命令、公开/私有徽标、拉取更新
  - GitHub 项目卡片：GitHub 页、克隆命令、「拉取更新 / 无需更新」
  - 切换治理根（二次确认）
  - 克隆到分类目录（无限递归、添加新分类、「克隆到该目录」）
  - 删除本地 Skill 仓库技能 + 更新 SKILLS.md
  - 应用到 全局 / 项目 / 插件包

## 0.9.0 - 2026-08-17 - feat
- 新增「本地仓库」面板（第三个面板）：
  - 多根目录管理
  - 本地项目 / GitHub项目 / 本地Skill仓库 三个 Tab
  - 指令写入当前输入框交给 agent 执行（git/账本写入）
- 扩展 `local-governance` 技能（repos.json v2 / 多根目录 / 指令模板）。

## 0.8.7 - 2026-08-16 - fix
- 插件徽标显示「插件：dsh-manager」（注册带 provider）。
