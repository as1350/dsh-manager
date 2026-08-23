# CHANGELOG-local

本文件登记**未发布版本**的本地修改（已发布变更见 CHANGELOG.md）。
格式：`日期 - 类型 - 描述`，类型 ∈ {feat, fix, chore, docs}。

## 2026-08-24 - fix（随 0.37.2 发布，明细见 CHANGELOG.md）
- 审核修复：`lib/client.js` VERSION 常量未随发版递增，对齐为 0.37.2。

## 2026-08-24 - fix（随 0.37.1 发布，明细见 CHANGELOG.md）
- 修复 `cloudRepoFromRemote` 对带尾斜杠 origin URL 的解析缺陷（`lib/repo-core.js`），仓库面板不再把此类仓库误判为「本地项目」。

## 2026-08-24 - feat（随 0.37.0 发布，明细见 CHANGELOG.md）
- 服务面板服务卡片：端口字段改名「服务端口 (API/TCP)-仅用于端口进程探活，无法修改启动端口」（中英双语）；新增「管理页面网址 manageUrl」配置输入框；「管理页面」按钮跳转改为优先 manageUrl、留空回退 http://127.0.0.1:端口。
- 改动文件：`lib/client.js`（i18n、编辑器表单、草稿/保存/列表映射、按钮跳转、搜索）、`lib/index.js`（validateServiceEntry / readServicesConfig / computeServiceStatus / serviceRegister 默认条目新增 manageUrl 字段与校验）。
- AI 配置助手补全：`serviceAiDraft`（AI 帮我填）草稿新增 manageUrl/note/envFile/startTimeoutMs（prompt schema + host 解析 + client fillDraft 映射）；service-config 技能补 entry 字段清单与「port/healthUrl/manageUrl 三字段正交」说明；「AI 配置」指令文案同步加 manageUrl。

## 2026-08-24 - fix（随 0.36.2 发布，明细见 CHANGELOG.md）
- 修复 AI 队列错误处理时 `gen` 变量定义域导致的 `ReferenceError` 致命崩溃错误（`lib/index.js`）。
- 服务面板新增「项目置顶星标」与「卡片/列表」视图切换持久化功能（`lib/client.js`）。

## 2026-08-23 - docs（随 0.36.1 发布，明细见 CHANGELOG.md）
- 第二轮技能优化（消费观察账本 2 条 pending）：local-governance 流程 G 补删除仓库模板（repos.json/REPOS.md 联动 + pending-reviews 悬空 clone/registry 记录同步移除）；skill-optimize 补剔除证据跨记录判据 + 多技能可合并单次发版。

## 2026-08-23 - feat（随 0.36.0 发布，明细见 CHANGELOG.md）
- 4 技能 SKILL.md 优化落地（skill-optimize 消费观察账本 8 条 pending，writing-for-agents 去噪后 12 处增补）：dsh-repo-clone 沙箱伪错误判据/新根判据；dsh-review schema id 形态补记/跨技能入账归属/多仓 diff/registry-clone 打包跳过/自我审核外部证据；local-governance 流程 A/B 发版链固化（EPERM `--cache` 重定向 + 收尾四件套自检 + 包内 skills/ 变更时同步 ~/.agents/skills 副本）；service-config aiExplain 检查途径/『启动命令未在 PATH 中找到』误报示例/总开关前置检查。剔除 3 条噪音建议（dismissed 留审计）。

## 2026-08-23 - feat（随 0.35.9 发布，明细见 CHANGELOG.md）
- 观察机制收尾留痕改「队列复盘」：约定块文本改为收尾 1 步留痕入队（type=observe，id=r-YYYYMMDD-<技能名>-NN，summary=留痕全文，无发现写 no-op 占位）+ 没写即违约（队列缺失条目即证据）；dsh-review 新增 observe 类条目处理（攒批评审：no-op done / 有效整理入账 skill-observations.json / 模糊重复过拟合剔除注原因）。

## 2026-08-22 - fix（随 0.35.8 发布，明细见 CHANGELOG.md）
- 观察开关跨会话/跨进程失效修复：观察状态以账本为唯一事实源，文件副本成为同步层（新增 `skillCopyCandidates` + `syncObserveBlockInCopies`）——启动时按账本对 ~/.dsh/skills、~/.agents/skills、<cwd>/.dsh/skills 全部同名副本幂等补/删约定块，skillObserveSet 对插件/文件技能均同步全部候选副本（返回 files）；根治 first-wins 注册被用户副本摘下时约定块缺失。
- Skills 面板滚动条与弹性布局修复（.skm-content min-height: 0）。

## 2026-08-22 - feat（随 0.35.7 发布，明细见 CHANGELOG.md）
- 本地仓库面板「拉取更新」镜像模板 v3 重构：upstream 补配/脏区守卫/版本标识规范/总结无条件化/治理字段明确/装配四分支/收尾归位/入队格式固化/四段汇报。

## 2026-08-22 - feat（随 0.35.6 发布，明细见 CHANGELOG.md）
- 本地仓库面板「拉取更新」镜像模板完善：镜像更新后自动检查是否已装配插件（MANIFEST + profile dependencies/bundles + dev_plugin_status），是则按 local-governance 流程 A/B 升级装配并总结更新内容（git log 旧..新），按流程 I 静默入队（registry）且装配升级后询问审核。

## 2026-08-22 - fix（随 0.35.5 发布，明细见 CHANGELOG.md）
- Skills 面板秒显缓存持久化到 sessionStorage：修复 0.35.4 内存态缓存随页面/标签页重载丢失（重开 Skills 面板空白 1-3s）；刷新后仍秒显旧数据再后台刷新；读写 try/catch 防存储不可用。

## 2026-08-22 - feat（随 0.35.4 发布，明细见 CHANGELOG.md）
- Skills 面板秒显缓存：catalog 快照按 (sessionId, cwd) 前端缓存，重开面板先秒显旧数据再后台刷新；会话/工作目录变化自动失效；reloadTick 仍强制重拉。

## 2026-08-22 - feat（随 0.35.3 发布，明细见 CHANGELOG.md）
- 本地仓库面板首开提速：host 启动时后台预热 repoScan SWR 缓存（fire-and-forget）——冷启动首次打开面板从 7-8s 变秒开；refreshRepoScanInBackground 返回进行中 promise，缓存未就绪时 handler 等待预热完成，防双路并行全量扫描。

## 2026-08-22 - feat（随 0.35.2 发布，明细见 CHANGELOG.md）
- 技能观察与自优化机制：skillObserveGet/Set/List rpc + _governance/skill-observations.json 单一事实源；插件技能运行时注入观察约定块（注册 registry + 先 dispose 再重注册，即时生效）；文件技能直改 SKILL.md 追加/移除约定块；Skill 面板卡片「观察」开关；新增 skill-optimize 技能（去噪评估/最小方案/用户确认/落地/写回）；local-governance 顺带提醒扩展（待审核 + 待优化合并）；种子全技能 observing:false。

## 2026-08-22 - fix（随 0.35.1 发布，明细见 CHANGELOG.md）
- 0.35.0 审核修复：repoScan 缓存支持 force 强制重扫（reload 按钮 / repoInvalidate 路径恢复原语义）。

## 2026-08-22 - feat（随 0.35.0 发布，明细见 CHANGELOG.md）
- 本地仓库面板 repoScan SWR 缓存（15s TTL，过期先回旧值后台重扫）——根治每次打开面板 7-8s 全量重扫。
- dsh-repo-clone 新增步骤 6：克隆后快速分析（项目摘要）+ DSH 插件判定 + 询问用户是否装配。

## 2026-08-22 - docs（随 0.34.9 发布，明细见 CHANGELOG.md）
- dsh-review 技能按 writing-for-agents 规范重构：触发词收敛（审核/复核）、删除与 local-governance 流程 I 重复的入队规则、步骤 2/3 判据补齐、否定式改正面表述；行为零变化。

## 2026-08-22 - feat（随 0.34.4–0.34.8 发布，明细见 CHANGELOG.md）
- 0.34.4：修复包内技能注册白名单漏登 dsh-repo-clone（PACKAGED 补登；版本只增不覆盖）。
- 0.34.5：包内技能注册改自动扫描 skills/ 目录（目录即真相，替代硬编码白名单；readdirSync + splitFrontmatter/parseFrontmatterMeta，逐条 try/catch 隔离）。
- 0.34.6：复核后修复注册透传 frontmatter 元数据（invocation 的 disable-model-invocation/user-invocable、whenToUse、resourceBase 基准目录；meta 解析兼容 BOM/CRLF、description 空串回退）。
- 0.34.7：dsh-plugin-lifecycle 恢复模型自动调用（移除 disable-model-invocation，保留 user-invocable:false → 仅模型可调用）。
- 0.34.8：新增 dsh-review 审核技能 + 待审核队列机制（_governance/pending-reviews.json 种子 0.34.6/0.34.7；local-governance 铁律 9/待审核提醒/流程 I 询问钩子；dsh-repo-clone 步骤 5 克隆静默入队）。

## 2026-08-22 - feat（随 0.34.3 发布，明细见 CHANGELOG.md）
- ⋯ 菜单边界检测自动翻转修复：以最近滚动容器可视矩形为测量基准 + `.skm-menu-up` 翻转 + 两侧不足时限高滚动；「打开」按钮改「管理页面」文案且未运行时置灰。
- 新增插件技能 `dsh-repo-clone`（skills/dsh-repo-clone）：克隆远端仓库标准流程——代理检查（已设直接用/未设问端口）→ 克隆（schannel SEC_E_NO_CREDENTIALS 时 `-c http.sslBackend=openssl` 单次重试）→ 校验（log/branch/submodule）→ 按 local-governance 流程 G 入账。
- 本地仓库面板「拉取新Github项目」指令模板改为技能引用：内联的代理决策树与登记要求移入 dsh-repo-clone 技能，模板只携带任务参数（URL/类型/目标目录/当前代理），消除模板与技能双份维护。
- 环境：全局 git `http.sslBackend=openssl` 根治 schannel 经本地代理握手失败。

## 2026-08-22 - fix
- 0.34.2 发布内容（明细已登记 CHANGELOG.md）：代码审查 75 项发现落地 34 项修复（S1×6 + S2×26 + S3×2，遗留 41 项 S3 延后）、F1-8 二审补全 resolveCustomSkillDir codeGeneration 收紧、client.js VERSION 对齐 0.34.2。
- 装配方式切换：目录复制 → file: tgz 快照装配（`deepseek-ai-dsh-manager-0.34.2.tgz`，_snapshots 归档 + 项目文件夹分发副本）。

## 2026-08-21 - feat
- 服务面板服务行新增「打开」按钮：有 `port` 的服务在操作区显示「打开」，点击 `window.open('http://127.0.0.1:' + svc.port, '_blank', 'noopener')` 新标签页打开对应端口网址（按钮 title 显示完整 URL）。
  - 改动文件：`lib/client.js`（本地仓库 + profiles/web 已安装副本各 3 处：中文文案 `service.open`='打开'、英文文案 `service.open`='Open'、`serviceRow` actions 区新增按钮）。
  - 未改 host（`lib/index.js` 无改动），client bundle 由 host 按文件 SHA1 前缀实时生成 rev，`Cache-Control: no-cache`，面板刷新即生效，无需重启。
