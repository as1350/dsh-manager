---
name: dsh-review
description: 审核/复核项目更新：读待审核队列（_governance/pending-reviews.json）→ 定位更新 → 一审全角度排查 → 二审源码证伪 → 修复前评估 → 修复验证并更新队列。触发：审核、复核。
---

# dsh-review — 更新审核

对"更新后审核"的完整流程：读队列定对象，逐项四步审核（一审 → 二审 → 修复前评估 → 修复验证）。本技能是**待审核队列的 schema 单一事实源**；入队时机与询问规则见 local-governance 流程 I，本技能不执行入队。

## 待审核队列（schema 单一事实源）

路径：`D:\Desktop\Dsh\本地项目\_governance\pending-reviews.json`

```json
{
  "version": 1,
  "updatedAt": "ISO8601",
  "items": [
    {
      "id": "唯一 id（版本号或 r-YYYYMMDD-NN）",
      "type": "release | patch | code-change | registry | clone | observe",
      "summary": "一句话摘要",
      "repo": "仓库绝对路径",
      "repoId": "repos.json 中的 id",
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

status 含义：`pending`=待审；`done`=已审完（**保留作审计痕迹，不删除**）；`skipped`=用户跳过（原因写进 reviewNotes）。

observe 类条目（观察留痕，由被观察技能收尾时按观察约定块写入，本技能消费）：只填 `id`（r-YYYYMMDD-<技能名>-NN）/`type`=observe/`summary`（留痕全文 1-3 行）/`createdAt`/`status`=pending，其余字段留空；无发现时 summary 写 no-op 占位（达成审计目的，不产生账本记录）。

## 步骤 0：读队列确定审核对象

1. 读 pending-reviews.json；文件不存在或 items 为空 → 告知"当前没有待审核更新"并停下；
2. 列出全部 `status=pending` 的项：id / type / summary / createdAt / 版本范围；
3. 把候选项列全，询问用户审核范围：当前项 / 全部 / 指定 id。

## observe 类条目处理（攒批评审）

对选定的 observe 类条目（跳过步骤 1-5，无代码可审）逐条处理：
1. **no-op**（summary 为 no-op / 本次无发现）→ `status=done`、`reviewedAt`=当前时间、`reviewNotes`="no-op，不产生账本记录"；同一技能连续多条 no-op → reviewNotes 标注异常模式供 skill-optimize 参考；
2. **剔除**（有内容但对照 writing-for-agents 评估：模糊无引用小节 / 与已有记录重复 / 单次过拟合）→ `status=done`、reviewNotes 写剔除原因，不入账；
3. **入账**（有效）→ 追加到 `_governance/skill-observations.json` 对应技能 entries：保留队列条目 `id` 与 `createdAt`，summary/findings/suggestions 由留痕整理（status=pending、handledAt=null），并刷新该文件顶层 updatedAt；队列条目 `status=done`、reviewNotes 记入账去向（技能名+条目 id）；
4. 汇总：本次处理 N 条 observe（M 条入账 / K 条 no-op / J 条剔除）。

判据：选定的每条 observe 项都有 done 去向（入账 / 剔除 / no-op）。

## 步骤 1：定位更新内容

- 有 commits 列表 → 直接用它定位；否则 `git -C <repo> log --oneline <from>..<to>`；
- 读关键 diff：`git -C <repo> diff <from>..<to> -- <相关文件>`；
- 记录：变更主题、涉及文件、版本变化。

## 步骤 2：一审（全角度排查）

逐维度检查，**每个维度都给出结论（无问题也要写明）**：
1. **实现正确性**：输入/输出契约、边界条件、异常路径；
2. **数据流透传**：数据/字段从源头到消费端完整，无中间环节丢弃；
3. **兼容性与回归**：与旧版本行为差异；查 git 历史判定"本次引入"还是"历史遗留"（历史遗留标引入版本）；
4. **契约耦合**：被改动调用的外部 API（类型定义、校验规则、生命周期语义）匹配；
5. **打包/装配/版本**：版本四件套一致、打包产物与源码一致、装配副本正确；
6. **运行时行为**：热重载、幂等、清理、冲突；
7. **治理一致性**：账本、镜像副本、文档同步。

每条问题附四要素：**位置（文件:行号）· 证据（源码/日志/实测）· 影响 · 等级（高/中/低）**。
判据：七维度全部给出结论，无遗漏维度、无遗漏问题。

## 步骤 3：二审（源码证伪）

对一审每条问题回源码逐行复核，逐条归入：**真实**（保留，附证据链）或 **虚假**（剔除，归入四类之一——非回归 / 设计如此 / 已有防护 / 影响可忽略）。
历史遗留问题单独成组并标引入版本，与本次回归分开。
判据：每条一审问题都有归类，无未归类条目。

## 步骤 4：修复前评估

对每个真实问题：
1. 列出修复方案的副作用与**外部可见行为变化**；
2. 涉及行为/设计变更（非纯 bug 修复）→ 先向用户说明预期变化并确认，再动手；
3. 划定最小修复范围，只改这些。

## 步骤 5：修复验证 + 队列更新

1. 实施修复（最小 diff）；
2. 验证：语法检查 + 复现（修复前失败→修复后通过）+ 热重载/运行时 + 回归清单；
3. 涉及代码/配置 → 按 local-governance 流程 A/B 发版落地（版本只增不覆盖）；
4. 写回队列：该项 `status=done`、`reviewedAt`=当前时间、`reviewNotes`=结论（真实问题、修复版本、遗留说明）；skipped 项写原因；
5. 存在高等级问题 → 审核报告写 `_governance/review-reports/<id>.md`。

## 完成判据

选定的每一项都有结论：`done`（含 reviewNotes）或 `skipped`（含原因）；observe 项按「observe 类条目处理」完成（入账 / 剔除 / no-op 各有去向）；队列已写回；有真实问题则修复已按发布流程落地并告知用户。

## 环境事实

- 队列路径：`D:\Desktop\Dsh\本地项目\_governance\pending-reviews.json`（跨会话持久，新对话读它即可继续）。
- 常见受审仓库：`D:\Desktop\Dsh\本地项目\dsh-manager`（包 @deepseek-ai/dsh-manager）。
