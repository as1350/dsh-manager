# CHANGELOG-local

本文件登记**未发布版本**的本地修改（已发布变更见 CHANGELOG.md）。
格式：`日期 - 类型 - 描述`，类型 ∈ {feat, fix, chore, docs}。

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
