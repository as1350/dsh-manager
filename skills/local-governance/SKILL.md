---
name: local-governance
description: 维护 DSH 本地治理体系——装配资产清单（_governance/MANIFEST.md）、仓库注册表（_governance/REPOS.md）、技能总账本（本地Skill仓库/SKILLS.md），以及本地包的归档/装配/升级/回滚流程。用户要求"更新清单/管理本地仓库/升级本地包/打快照"时调用。
---

# local-governance — DSH 本地治理技能

## 职责范围

本技能管理**本地仓库治理体系**，不直接管 DSH 装配本身（那是注入器/官方通道的事），只保证"账本"与"实况"一致：

| 账本 | 路径 | 管什么 |
|---|---|---|
| MANIFEST.md | `D:\Desktop\Dsh\本地项目\_governance\MANIFEST.md` | 装配资产（包/预设）：版本、快照、来源、维护状态 |
| REPOS.md | `D:\Desktop\Dsh\本地项目\_governance\REPOS.md` | 仓库注册表：所有本地仓库的路径/用途/云端状态 |
| SKILLS.md | `D:\Desktop\Dsh\本地项目\本地Skill仓库\SKILLS.md` | 技能总账本：技能名/源路径/来源 |

归档快照：`D:\Desktop\Dsh\本地项目\_snapshots\<包名>\`（纯 tgz，无文档）。
装配真相：`~/.dsh/profiles/web/package.json`（file: 指向归档）。

## 铁律（每次操作必须遵守）

1. **账实一致**：任何归档/装配/仓库变更后，必须同步更新对应账本，否则视为未完成；
2. **旧版本不删**：归档版本列只追加，不删除（回滚载体）；
3. **接管维护必记分叉点**：本地维护改 ✅ 时，必须记录分叉 commit 与改动摘要；
4. **值域严格**：MANIFEST「装配方式」∈ {file: tgz, link:, 目录复制, 未装配}；SKILLS.md「来源」∈ {上游路径, 自建}；
5. **自检**：更新账本后检查列数一致、版本号格式 `^\d+\.\d+\.\d+$`、归档路径存在。

## 标准流程

### A. 新快照入库
1. 构建（宿主 tsc + client tsdown，产物进 `lib/`）；
2. `npm pack --pack-destination D:\Desktop\Dsh\本地项目\_snapshots\<包名>\`；
3. MANIFEST.md：「归档版本」列追加新版本，「归档文件路径」更新；
4. 若同时变更装配 → 走流程 B。

### B. 升级已装配包
1. 改 `~/.dsh/profiles/web/package.json` 的 `file:` 路径指向新快照；
2. profile 目录执行 `pnpm install`（注意：若 pnpm 复用旧 link 解析，需清除 `node_modules/.pnpm/lock.yaml` 与 `.package-map.json` 残留后重装）；
3. 验证 `node_modules\<包>` 为实体目录、lockfile 记录 tarball integrity；
4. MANIFEST.md：「装配方式/装配版本」更新；
5. 提醒用户重启 DSH 并验证 `dev_plugin_status`。

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

## 环境事实（勿重复探测）

- 工作区根：`D:\Desktop\Dsh`（沙箱 workspace-write 覆盖）；
- DSH checkout（构建工具链）：`D:\Desktop\Dsh\DSH-官方`（DSH_CHECKOUT 需显式设置，注入器探测不到）；
- 已装 DSH 类型源：`C:\Users\ThinkBook\AppData\Roaming\npm\node_modules\@deepseek-ai\dsh\node_modules`（无 checkout 时 junction 借用）；
- 已装配注入器：`@dsh-external/dsh-super-injector`（file: tgz 快照，重启生效）。
