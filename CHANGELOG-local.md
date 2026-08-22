# CHANGELOG-local

本文件登记**未发布版本**的本地修改（已发布变更见 CHANGELOG.md）。
格式：`日期 - 类型 - 描述`，类型 ∈ {feat, fix, chore, docs}。

## 2026-08-22 - fix
- 服务行/项目头「⋯」更多菜单边界检测 + 自动翻转：菜单固定 `top:calc(100%+4px)` 向下展开，服务列表底部项（`.skm-repo-list` 滚动容器 + `.skm-dialog` `overflow:hidden` 裁剪）菜单被底部截断。
  - 修复：`ServicePanel` 新增 `rowMenuPos`/`projMenuPos` state、`menuWrapRef`/`menuElRef`/`projWrapRef`/`projElRef` refs、`applyMenuPlacement` 测量函数 + `attachScrollReposition` 滚动重算（`getBoundingClientRect()` 计算下方/上方空间）+ 两个 `useEffect`（依赖 `[rowMenu,tick]` / `[projMenu,tick]`，tick=5s 轮询自动重算）。
  - **测量基准以最近的滚动容器可视矩形为准**（从 wrap 向上找第一个 `overflow-y:auto/scroll` 容器，服务列表即 `.skm-repo-list`；找不到才退回 `window.innerHeight`）——初版误用视口高度，弹窗容器底部远在视口底部之上导致方向判断失效（未配置区打开后列表变长、最后一项被挤到容器底部时必现）。
  - 翻转决策：下方够→向下；上方够→向上（`.skm-menu-up` = `top:auto; bottom:calc(100%+4px)`）；两侧都不够→选空间大的一侧 + inline `maxHeight` + `overflowY:auto` 限高滚动（下限 40px 保证至少一项可见可滚）。滚动容器 scroll 事件监听重算，滚动中菜单位置保持正确。
  - 改动文件：`lib/client.js`（本地仓库 + profiles/web 已安装副本同步，4485→4552 行），`node --check` 通过，服务端 bundle 已含改动（F5 生效）。0.34.2 tgz 已用新 client.js 重打包，16 文件与已安装副本一致；中间版备份 `_snapshots\...tgz.bak-pre-menu-flip`、最终版备份 `_snapshots\...tgz.bak-pre-container-rect`。

## 2026-08-22 - feat
- 服务行「打开」按钮文案改为「管理页面」：中文 `service.open`='打开'→'管理页面'、英文 'Open'→'Manage Page'（按钮行为不变，仍点击打开服务端口网址）。改 `lib/client.js` 文案字典（本地仓库 + profiles/web 已安装副本同步），`node --check` 通过，服务端 bundle 已含改动（F5 生效）。0.34.2 tgz 重打包同步，备份 `_snapshots\...tgz.bak-pre-label-manage-page`。

## 2026-08-22 - fix
- 0.34.2 发布内容（明细已登记 CHANGELOG.md）：代码审查 75 项发现落地 34 项修复（S1×6 + S2×26 + S3×2，遗留 41 项 S3 延后）、F1-8 二审补全 resolveCustomSkillDir codeGeneration 收紧、client.js VERSION 对齐 0.34.2。
- 装配方式切换：目录复制 → file: tgz 快照装配（`deepseek-ai-dsh-manager-0.34.2.tgz`，_snapshots 归档 + 项目文件夹分发副本）。

## 2026-08-22 - feat
- 「打开」按钮增强：服务**未运行时按钮置灰不可点**（`disabled: !running`），运行时才可点击打开对应端口网址。改 `lib/client.js` serviceRow actions 区（本地仓库 + profiles/web 已安装副本同步），`node --check` 通过，服务端 bundle 已含该改动。
- 0.34.2 tgz 同步修正：检查发现 `deepseek-ai-dsh-manager-0.34.2.tgz` 内 client.js 有第一版「打开」按钮但缺 `disabled: !running` 增强（打包时机在两次修改之间），已用当前生效的 client.js 重打包 tgz，16 个文件与已安装副本全部一致；原 tgz 备份至 `_snapshots\deepseek-ai-dsh-manager-0.34.2.tgz.bak-pre-disabled`。

## 2026-08-21 - feat
- 服务面板服务行新增「打开」按钮：有 `port` 的服务在操作区显示「打开」，点击 `window.open('http://127.0.0.1:' + svc.port, '_blank', 'noopener')` 新标签页打开对应端口网址（按钮 title 显示完整 URL）。
  - 改动文件：`lib/client.js`（本地仓库 + profiles/web 已安装副本各 3 处：中文文案 `service.open`='打开'、英文文案 `service.open`='Open'、`serviceRow` actions 区新增按钮）。
  - 未改 host（`lib/index.js` 无改动），client bundle 由 host 按文件 SHA1 前缀实时生成 rev，`Cache-Control: no-cache`，面板刷新即生效，无需重启。
