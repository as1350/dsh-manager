# CHANGELOG-local

本文件登记**未发布版本**的本地修改（已发布变更见 CHANGELOG.md）。
格式：`日期 - 类型 - 描述`，类型 ∈ {feat, fix, chore, docs}。

## 2026-08-22 - fix
- 0.34.2 发布内容（明细已登记 CHANGELOG.md）：代码审查 75 项发现落地 34 项修复（S1×6 + S2×26 + S3×2，遗留 41 项 S3 延后）、F1-8 二审补全 resolveCustomSkillDir codeGeneration 收紧、client.js VERSION 对齐 0.34.2。
- 装配方式切换：目录复制 → file: tgz 快照装配（`deepseek-ai-dsh-manager-0.34.2.tgz`，_snapshots 归档 + 项目文件夹分发副本）。

## 2026-08-21 - feat
- 服务面板服务行新增「打开」按钮：有 `port` 的服务在操作区显示「打开」，点击 `window.open('http://127.0.0.1:' + svc.port, '_blank', 'noopener')` 新标签页打开对应端口网址（按钮 title 显示完整 URL）。
  - 改动文件：`lib/client.js`（本地仓库 + profiles/web 已安装副本各 3 处：中文文案 `service.open`='打开'、英文文案 `service.open`='Open'、`serviceRow` actions 区新增按钮）。
  - 未改 host（`lib/index.js` 无改动），client bundle 由 host 按文件 SHA1 前缀实时生成 rev，`Cache-Control: no-cache`，面板刷新即生效，无需重启。
