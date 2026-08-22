# CHANGELOG-local

本文件登记**未发布版本**的本地修改（已发布变更见 CHANGELOG.md）。
格式：`日期 - 类型 - 描述`，类型 ∈ {feat, fix, chore, docs}。

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
