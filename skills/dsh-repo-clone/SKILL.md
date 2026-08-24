---
name: dsh-repo-clone
description: 克隆远端 Git/GitHub 仓库到本地 DSH 目录树并登记治理账本。触发：克隆仓库、clone GitHub 项目、拉取新 Github 项目、镜像上游仓库到本地（插件集/技能集/本地项目/反代项目等分类目录）。
---

# dsh-repo-clone — 克隆远端仓库并入账

把一个远端仓库变成「已登记的本地仓库」：代理就绪 → 克隆 → 校验 → 入账。
登记规范以 **local-governance** 技能为单一事实源，本技能不复述其 schema。

## 步骤

1. **代理检查**（`git config --get http.proxy` / `git config --get https.proxy`）：
   - 已设置 → 直接使用，不再询问；
   - 有缺失 → 先问用户是否开启代理软件及软件名，查得端口后设
     `git config --global http.proxy http://127.0.0.1:<端口>`（https 同）；用户明确无代理 → 跳过。
2. **克隆**：`git clone --recurse-submodules <url> <目标目录>`
   - 目标目录已存在且非空 → 停下问用户；
   - **克隆后统一 remote 规范**：`git remote set-url origin <规范URL>`（剥尾斜杠/`.git` 后缀，防面板误分类）；镜像仓库另 `git remote add upstream <同址URL>`（供流程 G `git fetch upstream`）；
   - **schannel 故障**（报 `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`）
     = Windows 默认 SSL 后端经本地代理握手失败 → 加 `-c http.sslBackend=openssl`
     重试（单次生效，不改全局配置）。
3. **校验**：`git -C <目录> log --oneline -1`（最新提交）、`branch --show-current`（分支）、
   `submodule status`（输出为空 = 无子模块，入账时在 notes 注明）；
   - **沙箱伪错误判据**（实测两次命中）：pwsh 报 `sh.exe` 信号管道错误（Win32 error 5）而目录已含完整
     `.git` 且 `git rev-parse` 通过时，属沙箱命名管道限制产物，**直接以 git 校验为准继续**，不重试克隆。
4. **入账**：按 local-governance 流程 G 写 `_governance/repos.json` 与 `_governance/REPOS.md`：
   - 上游镜像 → `type=mirror`、`upstream=<owner/repo>`、`cloudRepo=""`；
   - 字段值域、notes 惯例、updatedAt 一律以 local-governance 为准；
   - 写完校验 repos.json 仍可被 JSON 解析；
   - **新根判据**：目标目录所在根不在 `repos.json.roots` 时，同步追加该根（与 `settings.json`
     roots/rootTypes 保持一致），否则账实不一致。

5. **队列登记**：克隆属登记类变更，按 **dsh-review** 技能的队列约定**静默入队**——
   向 `_governance/pending-reviews.json` 追加一条 `type=clone` 记录（字段 schema 以 dsh-review 为准），**不询问**用户。
6. **快速分析 + 装配询问**（克隆完成后必做）：
   - 快速查看项目：读 `package.json`（name/description/`dsh` 字段/peerDependencies）、README 头部、检查
     `cordis.patch.yml` 与 `lib/` 入口，输出 3–5 行摘要（项目类型 / 用途 / 技术栈 / 是否 DSH 插件）；
   - **DSH 插件判定**（满足任一即视为 DeepSeek Harness 相关插件）：
     `package.json` 含 `dsh` 配置（`dsh.bundle` / `dsh.client`）｜存在 `cordis.patch.yml`｜
     peerDependencies 含 `@deepseek-ai/cordis`｜代码出现 `window.__ModuleLoader__` 或 `ctx.effect` 插件生命周期；
   - 是 DSH 插件 → **询问用户是否装配**：按 local-governance 装配流程执行（`link:` 直连克隆目录，或构建后
     `file: tgz` 快照入库），用户确认后装配并更新 MANIFEST.md；
   - 不是 DSH 插件 → 汇报摘要即可，不询问装配。

## 完成判据

目录实况（最新提交 / 分支 / 子模块）= repos.json 条目 = REPOS.md 行，三者一致；且克隆已静默入队（pending-reviews.json 有本次记录）；克隆已完成快速分析，DSH 插件已按用户选择装配或明确不装配。

## 环境事实

- 本机全局已设 `http.sslBackend=openssl`（2026-08-22 根治 schannel 经代理握手失败）；
  步骤 2 的应急分支仅在配置丢失或换机时启用。
