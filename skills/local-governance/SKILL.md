---
name: local-governance
description: 维护 DSH 本地治理体系——装配资产清单（_governance/MANIFEST.md）、仓库注册表（_governance/REPOS.md）、机器账本（_governance/repos.json）、技能总账本（skill仓库/SKILLS.md），以及本地包的归档/装配/升级/回滚、本地修改登记（CHANGELOG-local.md）和本地仓库面板指令执行流程。用户要求"更新清单/管理本地仓库/升级本地包/打快照/本地仓库面板/登记本地修改"时调用。
---

# local-governance — DSH 本地治理技能

## 职责范围

本技能管理**本地仓库治理体系**，不直接管 DSH 装配本身（那是注入器/官方通道的事），只保证"账本"与"实况"一致：

| 账本 | 路径 | 管什么 |
|---|---|---|
| MANIFEST.md | `D:\Desktop\Dsh\本地项目\_governance\MANIFEST.md` | 装配资产（包/预设）：版本、快照、来源、维护状态 |
| REPOS.md | `D:\Desktop\Dsh\本地项目\_governance\REPOS.md` | 仓库注册表（人读）：所有本地仓库的路径/用途/云端状态 |
| repos.json | `D:\Desktop\Dsh\本地项目\_governance\repos.json` | 仓库注册表（机器读）：多根目录 + 仓库字段真相 |
| SKILLS.md | `D:\Desktop\Dsh\本地项目\skill仓库\SKILLS.md` | 技能总账本：技能名/源路径/来源 |
| CHANGELOG.md | `D:\Desktop\Dsh\本地项目\dsh-manager\CHANGELOG.md` | 项目更新日志：版本/日期/类型/说明 |
| 本地维护日志 | 各受管仓库根目录 `CHANGELOG-local.md` | 本地改动登记：`### [commit <hash>] <标题>` 条目 + 笔记段落 |

归档快照：`D:\Desktop\Dsh\本地项目\_snapshots\<包名>\`（纯 tgz，无文档）。
装配真相：`~/.dsh/profiles/web/package.json`（file: 指向归档）。

## 铁律（每次操作必须遵守）

1. **账实一致**：任何归档/装配/仓库变更后，必须同步更新对应账本，否则视为未完成；
2. **旧版本不删**：归档版本列只追加，不删除（回滚载体）；
3. **接管维护必记分叉点**：本地维护改 ✅ 时，必须记录分叉 commit 与改动摘要；
4. **值域严格**：MANIFEST「装配方式」∈ {file: tgz, link:, 目录复制, 未装配}；SKILLS.md「来源」∈ {上游路径, 自建}；
5. **自检**：更新账本后检查列数一致、版本号格式 `^\d+\.\d+\.\d+$`、归档路径存在。
6. **版本只增不覆盖**：任何已打包/已装配的包发生代码或功能变更（含修复、文案、UI 调整）后，必须递增版本号——新增功能/接口/面板 → 次版本；缺陷修复/文案/小调整 → 修订版本。**禁止原地覆盖同名 tgz**；每次 bump 后重新走 A/B 流程并同步 MANIFEST/README/profile。
7. **本地改动必登记**：任何受管仓库发生本地改动（代码/UI/配置/文档）后，必须在该仓库根目录 `CHANGELOG-local.md` 登记对应 commit（`### [commit <hash>] <标题>`），否则视为未完成；
8. **分支与同步纪律**：本地改动提交到本地维护分支（如 `local-custom`），不直接改 `main/master`；拉取上游用 `git pull --rebase <远端> <上游分支>`（本项目惯例 `git pull --rebase origin main`），冲突停下问用户并在文档笔记段记录；
9. **更新后审核钩子**：任何代码/配置变更或发版完成后，按 **dsh-review** 技能规则**主动询问**用户"立即审核 / 推迟入队"；登记/克隆类变更**静默入队不询问**；本技能每次被调用时先检查待审核队列并顺带提醒待审核数。

## 顺带提醒（每次进入本技能先做）

1. 读 `_governance/pending-reviews.json`：存在 `status=pending` 的项 → 提醒"还有 **N** 项待审核更新（最早：<summary>），说『审核』即可开始"；
2. 读 `_governance/skill-observations.json`：存在 `pendingSuggestions > 0` 的技能 → 提醒"**M** 个技能有待处理优化建议（<技能名>…），说『优化』即可进入 skill-optimize"；
3. 两类提醒合并成一句话顺带说出，不打断主流程；
4. 队列 schema 单一事实源 = **dsh-review** 技能；观察记录 schema 单一事实源 = **skill-optimize** 技能；本技能只读计数与追加条目，不复述字段。

## 标准流程

### A. 新快照入库
1. 构建（宿主 tsc + client tsdown，产物进 `lib/`）；
2. `npm pack --pack-destination D:\Desktop\Dsh\本地项目\_snapshots\<包名>\`；
3. **复制最新 tgz 到项目文件夹**（`D:\Desktop\Dsh\本地项目\<项目>\<包名>-<版本>.tgz`），随仓库提交——分发副本，他人可直接 `dsh add <tgz>`。**同一时间项目文件夹只保留最新一个 tgz**：复制前先删除目录内所有旧版本 `<包名>-*.tgz`（已被 git 跟踪的用 `git rm`），避免堆积；
4. MANIFEST.md：「归档版本」列追加新版本，「归档文件路径」更新；
5. 更新 `CHANGELOG.md`（追加条目：版本/日期/类型/说明）；
6. 若同时变更装配 → 走流程 B。

### B. 升级已装配包
1. 改 `~/.dsh/profiles/web/package.json` 的 `file:` 路径指向新快照；
2. profile 目录执行 `pnpm install`（注意：若 pnpm 复用旧 link 解析，需清除 `node_modules/.pnpm/lock.yaml` 与 `.package-map.json` 残留后重装）；
3. 验证 `node_modules\<包>` 为实体目录、lockfile 记录 tarball integrity；
4. MANIFEST.md：「装配方式/装配版本」更新；
5. 更新 `CHANGELOG.md`（追加条目：版本/日期/类型/说明）；
6. 同步项目文件夹内的最新 tgz（复制 + 提交，见流程 A 第 3 步）；
7. 提醒用户重启 DSH 并验证 `dev_plugin_status`。

### C. 回滚
1. `file:` 改回归档旧版本 tgz → `pnpm install` → 重启；
2. MANIFEST.md：「装配版本」回退。

### D. 预设升级
1. 删旧 `~/.dsh/.agent-presets\<id>`（ESM 缓存规则：删旧建新，勿原地覆盖）；
2. 从来源项目复制新 preset 目录；
3. MANIFEST.md：预设行「装配版本」更新。

### E. 接管上游包维护（fork）
1. 本地 clone/fork 上游 → 双 remote（origin=自己的 fork，upstream=原作者）；
2. 构建 → 快照入库 → 装配切换；
3. MANIFEST.md：「本地维护」✅ + 「分叉点」commit + 「本地改动摘要」；
4. REPOS.md：新增/更新该仓库行。

### F. 技能登记
- 新增/移动技能 → SKILLS.md 增删行（三列：技能名/源路径/来源）。

### G. 本地仓库面板（repos.json / 多根目录）

本地仓库面板负责**只读展示 + 生成指令**；以下写操作由 agent 执行，面板不直接改 repos.json/账本/git：

| 操作 | 执行方 |
|---|---|
| 读写 `~/.dsh/dsh-manager/settings.json`（roots/governanceRoot） | 面板 |
| 扫描目录、`git status`、`git fetch` | 面板（只读） |
| 复制技能到 `~/.dsh/skills/<name>` 或 `<workspace>/.dsh/skills/<name>` | 面板（目标已存在则跳过） |
| 删除 skill仓库 镜像技能目录 + 更新 SKILLS.md | 面板（二次确认后执行） |
| 用户切换公开/私有时更新 repos.json 的 `private` 字段 | 面板（`gh repo edit` 成功后） |
| 解析克隆地址、检测 git 代理、选择分类目录、生成克隆指令 | 面板 |
| `git clone --recurse-submodules`、设置 git 代理、克隆后登记 repos.json/REPOS.md | agent |
| 初始化/登记/修改 repos.json（除 private 即时字段）、REPOS.md、MANIFEST | agent |
| git init/commit/push/pull/reset/submodule、`gh repo create`、skill仓库 的提交/推送 | agent |
| 应用技能到插件包（复制+打包/提交/升版本/账本） | agent |

**repos.json v2 schema**（机器真相；面板通常只读它，仅在用户切换公开/私有时直接更新 `private` 字段）：

```json
{
  "version": 2,
  "roots": ["D:/Desktop/Dsh/本地项目", "D:/Desktop/Dsh/插件集"],
  "updatedAt": "ISO8601",
  "repos": [
    {
      "id": "dsh-manager",
      "path": "D:/Desktop/Dsh/本地项目/dsh-manager",
      "type": "local",
      "git": true,
      "cloudRepo": "as1350/dsh-manager",
      "upstream": "",
      "private": false,
      "lastChecked": "ISO8601",
      "lastSync": "ISO8601",
      "notes": ""
    }
  ]
}
```

- `type`: `local`（自管项目，推自己 GitHub）或 `mirror`（上游镜像，严格等于上游）；
- `path` 一律绝对路径；`git:false` 表示尚未初始化 Git；
- `cloudRepo` 为空 = 未创建远端；`private:true` 时克隆命令锁定；
- 所有 `repos` 条目合并归入中央 `_governance/repos.json`，不按根目录拆账。

**常见 agent 指令模板**（面板写入输入框，agent 按此执行）：

- **初始化/新增根目录**：扫描所有 roots 下一级目录，识别项目（含 `.git` 或 `package.json` 或 `.dsh`，排除 `_governance`/`_snapshots`/`skill仓库`）→ 创建/更新 repos.json + REPOS.md。
- **初始化 Git 并登记**：`git init` + 初始提交 → repos.json `git=true` + REPOS.md。
- **同步到 GitHub（已有远端）**：先提交未提交变更 → `git push origin <分支>` → 更新 `lastSync` + REPOS.md。
- **创建仓库并推送**：`gh repo create <name> --source --push --public|--private` → 写 `cloudRepo` + REPOS.md。
- **拉取更新（本地项目 behind）**：`git pull origin <分支>` → 冲突停下问用户 → 更新 `lastSync` + REPOS.md。
- **更新镜像**：`git fetch upstream && git reset --hard upstream/<分支>` → submodule 更新 → 更新 `lastSync` + REPOS.md。镜像不允许保留本地改动；需要本地改动时先转为 `type:local` 另立项目维护。
- **转为本地项目**：调整 remote → repos.json `type=local` + REPOS.md。
- **登记本地修改**：检测 outgoing 中未被 `CHANGELOG-local.md` 覆盖的 commit → 生成指令要求 agent 补登 `### [commit <hash>] <标题>` 并提交文档。
- **应用到插件包**：复制技能目录到 `<项目>/<插件包>/skills/<技能名>/` → 按 dsh-plugin-lifecycle 打包/提交/升版本/更新 MANIFEST。

**完成判据**：repos.json 与目录实况一致；每个仓库条目都有正确 `type/git/cloudRepo`；REPOS.md 跟 repos.json 同步更新；所有命令不推送未确认分支、不覆盖已有技能目录。

### H. 本地修改登记

适用于所有 `type: local` 的受管仓库（含 upstream 上游的本地维护项目）。

1. `cd <项目>`，确认当前在本地维护分支（如 `local-custom`；不存在则基于 main 创建并记录分叉点）；
2. 完成本地改动（代码/UI/配置/文档）；
3. 提交业务改动，`git rev-parse --short HEAD` 取 hash；
4. 在项目根 `CHANGELOG-local.md` 追加 `### [commit <hash>] <标题>` 条目，附 1–3 条改动摘要；
5. 提交 `CHANGELOG-local.md`；
6. 推送自己的远端分支（如 `git push origin local-custom`），不直接推上游 main/master；
7. 同步上游：`git pull --rebase origin main`，冲突停下问用户，并在文档笔记段记录 rebase 与冲突处理；
8. 按仓库面板要求更新 `lastSync` / `REPOS.md`（如适用）。

**完成判据**：每一个本地业务 commit 都能在 `CHANGELOG-local.md` 找到对应登记；本地维护分支已推送；上游同步完成后无未解决冲突。

### I. 更新后审核钩子（待审核队列）

在**任何更新落地后**执行（含流程 A/B/D/E 发版、流程 H 本地修改、本地仓库面板指令中的代码/配置变更）：

1. **判断变更类型**：
   - 代码/配置变更或发版（release / patch / code-change）→ 主动询问用户："本次更新（<summary>）是否立即审核？我可以按 dsh-review 执行；或推迟记入待审核队列。"
   - 登记/克隆类（registry / clone）→ **不询问**，直接静默入队。
2. **按用户选择**：
   - 立即审核 → 加载 dsh-review 技能，按其中四步流程执行本次审核；
   - 推迟 → 按 dsh-review 队列 schema 追加一条 `status=pending` 记录（id/type/summary/repo/repoId/commits/fromVersion/toVersion/createdAt），写回 pending-reviews.json 并更新 `updatedAt`；
3. 队列写入后不需要额外提醒——后续本技能被调用时"待审核提醒"会顺带展示数量。

## 环境事实（勿重复探测）

- 工作区根：`D:\Desktop\Dsh`（沙箱 workspace-write 覆盖）；
- DSH checkout（构建工具链）：`D:\Desktop\Dsh\DSH-官方`（DSH_CHECKOUT 需显式设置，注入器探测不到）；
- 已装 DSH 类型源：`C:\Users\ThinkBook\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules`（无 checkout 时 junction 借用）；
- 已装配注入器：`@dsh-external/dsh-super-injector`（file: tgz 快照，重启生效）。
