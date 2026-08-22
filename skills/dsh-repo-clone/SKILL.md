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
   - **schannel 故障**（报 `schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`）
     = Windows 默认 SSL 后端经本地代理握手失败 → 加 `-c http.sslBackend=openssl`
     重试（单次生效，不改全局配置）。
3. **校验**：`git -C <目录> log --oneline -1`（最新提交）、`branch --show-current`（分支）、
   `submodule status`（输出为空 = 无子模块，入账时在 notes 注明）。
4. **入账**：按 local-governance 流程 G 写 `_governance/repos.json` 与 `_governance/REPOS.md`：
   - 上游镜像 → `type=mirror`、`upstream=<owner/repo>`、`cloudRepo=""`；
   - 字段值域、notes 惯例、updatedAt 一律以 local-governance 为准；
   - 写完校验 repos.json 仍可被 JSON 解析。

5. **队列登记**：克隆属登记类变更，按 **dsh-review** 技能的队列约定**静默入队**——
   向 `_governance/pending-reviews.json` 追加一条 `type=clone` 记录（字段 schema 以 dsh-review 为准），**不询问**用户。

## 完成判据

目录实况（最新提交 / 分支 / 子模块）= repos.json 条目 = REPOS.md 行，三者一致；且克隆已静默入队（pending-reviews.json 有本次记录）。

## 环境事实

- 本机全局已设 `http.sslBackend=openssl`（2026-08-22 根治 schannel 经代理握手失败）；
  步骤 2 的应急分支仅在配置丢失或换机时启用。
