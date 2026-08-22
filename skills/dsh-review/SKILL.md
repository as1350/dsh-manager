---
name: dsh-review
description: 复核/审核最近或队列中的项目更新——读待审核队列（_governance/pending-reviews.json）→ 定位更新 → 一审（全角度排查）→ 二审（源码证伪剔除虚假问题）→ 修复前评估 → 修复验证与队列更新。触发：审核、复核、复查、检查更新、review 更新、开始审核、审一下。
---

# dsh-review — 更新审核

对"更新后审核"的完整流程：先读 `_governance/pending-reviews.json` 队列确定审核对象，再对每项执行四步审核（一审 → 二审 → 修复前评估 → 修复验证）。本技能是**待审核队列的消费方与 schema 单一事实源**（写入方 local-governance / dsh-repo-clone 只引用本约定，不复述字段）。

## 待审核队列（schema 单一事实源）

路径：`D:\Desktop\Dsh\本地项目\_governance\pending-reviews.json`

```json
{
  "version": 1,
  "updatedAt": "ISO8601",
  "items": [
    {
      "id": "唯一 id（建议用版本号或 r-YYYYMMDD-NN）",
      "type": "release | patch | code-change | registry | clone",
      "summary": "一句话摘要",
      "repo": "仓库绝对路径",
      "repoId": "repos.json 中的 id，如 dsh-manager",
      "commits": ["源改动 commit hash", "分发副本 commit hash"],
      "fromVersion": "0.34.5",
      "toVersion": "0.34.6",
      "createdAt": "ISO8601",
      "status": "pending | done | skipped",
      "reviewedAt": null,
      "reviewNotes": ""
    }
  ]
}
```

- status 含义：`pending`=待审；`done`=已审完（**保留在队列作审计痕迹，不删除**）；`skipped`=用户选择跳过（原因写进 reviewNotes）。
- 追加规则（写入方遵守，此处为约定）：代码/配置变更与发版 → 完成后**主动询问**"立即审核/推迟入队"；登记/克隆类 → **静默入队不询问**。
- 提醒规则：local-governance 被调用时顺带提醒待审核数；用户说"审核/复核"即进入本技能。

## 步骤 0：读队列确定审核对象

1. 读 pending-reviews.json；文件不存在或 items 为空 → 告知"当前没有待审核更新"并停下；
2. 列出全部 `status=pending` 的项：id / type / summary / createdAt / 版本范围；
3. 询问用户审核范围：**当前项 / 全部 / 指定 id**（把候选项列全让用户选，不得擅自决定）。

## 步骤 1：定位更新内容

对每个选定项：
- 有 commits 列表 → 直接用它定位；否则 `git -C <repo> log --oneline <fromVersion 对应 commit>..<toVersion 对应 commit>`；
- 读关键 diff：`git -C <repo> diff <from>..<to> -- <相关文件>`；
- 记录：变更主题、涉及文件、版本变化。

## 步骤 2：一审（全角度排查）

按维度逐项检查，不得缺省（可增补）：
1. **实现正确性**：输入/输出契约、边界条件、异常路径；
2. **数据流透传**：数据/字段从源头到消费端是否完整，有无中间环节被丢弃；
3. **兼容性与回归**：与旧版本行为差异；结合 git 历史判定"本次引入"还是"历史遗留"（历史遗留标引入版本）；
4. **契约耦合**：被改动调用的外部 API（类型定义、校验规则、生命周期语义）是否匹配；
5. **打包/装配/版本**：版本四件套一致、打包产物与源码一致、装配副本正确；
6. **运行时行为**：热重载、幂等、清理、冲突；
7. **治理一致性**：账本、镜像副本、文档是否同步。

每条问题附四要素：**位置（文件:行号）· 证据（源码/日志/实测）· 影响 · 等级（高/中/低）**。

## 步骤 3：二审（源码证伪，剔除虚假问题）

对一审每条问题回源码逐行复核，逐条标注：
- **真实**：保留，附证据链；
- **虚假**：剔除，必须归入四类之一——非回归（历史遗留且既有行为如此）/ 设计如此 / 已有防护 / 影响可忽略。
历史遗留问题**单独成组并标引入版本**，与本次回归分开；确认清单稳定后进入修复。

## 步骤 4：修复前评估

对每个真实问题：
1. 列出修复方案的副作用与**外部可见行为变化**；
2. 若涉及行为/设计变更（非纯 bug 修复）→ 先向用户说明预期变化并确认，再动手；
3. 划定最小修复范围，禁止顺手扩大改动。

## 步骤 5：修复验证 + 队列更新

1. 实施修复（最小 diff）；
2. 验证：语法检查 + 复现（修复前失败→修复后通过）+ 热重载/运行时 + 回归清单；
3. 涉及代码/配置 → 按 local-governance 流程 A/B 发版落地（铁律 6：版本只增不覆盖）；
4. 写回队列：该项 `status=done`、`reviewedAt`=当前时间、`reviewNotes`=结论（真实问题、修复版本、遗留说明）；skipped 项写原因；
5. 存在高等级问题 → 审核报告写 `_governance/review-reports/<id>.md`。

## 完成判据

选定的每一项都有结论：`done`（含 reviewNotes）或 `skipped`（含原因）；队列已写回；有真实问题则修复已按发布流程落地并告知用户。

## 环境事实（勿重复探测）

- 治理根：`D:\Desktop\Dsh\本地项目\_governance\`（pending-reviews.json、repos.json、MANIFEST.md、REPOS.md）；
- 常见受审仓库：`D:\Desktop\Dsh\本地项目\dsh-manager`（包 @deepseek-ai/dsh-manager）；
- 审核对象跨会话持久：队列文件在磁盘上，新对话读它即可继续。
