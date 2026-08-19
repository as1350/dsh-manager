# Changelog

格式：`版本 - 日期 - 类型`，类型 ∈ {feat, fix, chore, docs}。
版本号遵循 `主.次.修`，每次变更只增不覆盖（见 local-governance 铁律）。


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
