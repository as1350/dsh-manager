---
user-invocable: false
name: dsh-plugin-lifecycle
description: Use when the user asks to create, develop, update, upgrade, modify, fix, scaffold, build, inject, hot-reload, productionize, package, port, release, remove, uninstall, delete, list, or inspect a DSH plugin — the full plugin lifecycle from zero to release and retirement, including porting existing dynamic plugin code into a static package.
whenToUse: 当用户要求制作、更新、升级、修改、改造、注入、打包、发布、卸载、删除或查看/管理 DSH 插件（dev_scaffold_plugin → dev_build_plugin → dev_inject_plugin → dev_reload_package → dev_install_package → dev_release_plugin；删除走 dev_uninject_plugin / dsh plugin remove；查看走 dev_plugin_status），或把已有动态插件源码转为静态插件包时。
---

# DSH 插件生命周期（造 / 改 / 查 / 删 / 发布）

本技能把"管理一个 DSH 插件"的完整流程固化为可重复的步骤链：入口分诊 → 分支（从零造 / 已有代码 / 删除 / 查询）→ 构建 → 注入 → 迭代 → 生产化 → 发布。每一步都有**完成判据**；参考内容（机制、模板、踩坑、卸载细节）下沉在 [REFERENCE.md](REFERENCE.md)，卡住或深入时按节查阅。

## 前置条件

需要注入器 `dev_*` 工具（dev_scaffold_plugin / dev_build_plugin / dev_inject_plugin / dev_reload_package / dev_install_package / dev_release_plugin / dev_uninject_plugin / dev_injected_list / dev_plugin_status / dev_self_test）。

- 缺失时：**报告环境缺注入器**，给出两条出路：① 装 dsh-super-injector（官方 `dsh plugin --profile web add` 后重启）；② 走官方安装通道（`dsh plugin add <tgz>`，见 REFERENCE §9）——不硬造降级流程。
- 用 `dev_plugin_status` 确认注入器 active 后再继续。

## 入口分诊（先做，30 秒）

判断用户要干什么：

1. **从零造**（没有代码，只有想法/需求）→ **分支 A**；
2. **已有动态插件代码**（evolve 单文件 / harness.handle + host.call 的动态插件）→ **分支 B**；
3. **删除/卸载插件** → **分支 C**；
4. **查看/查询插件状态** → **分支 D**；
5. **更新/改造现有插件**（已注入或已装配）→ **分支 E**：先识别目标与通道（复用 C1），再改代码 → build → 按通道重载 → 验证；不重新走骨架。

## 分支 A：从零造

### A1. 选形态（决策矩阵）

| 形态 | 适用 | 有 client UI？ |
|---|---|---|
| toolkit 工具包 | 提供工具给会话调用（记账/周报/查询） | 否 |
| daemon-loop 守护循环 | timer + LLM 自主决策循环（监控/自优化） | 否 |
| ui-panel UI 面板 | 需要在 Web GUI 里出面板/设置页 | 是（需 tsdown 构建） |
| hybrid 混合 | 工具 + 面板 + 循环都要 | 是 |

**完成判据**：形态已定，且用户确认。

### A2. dev_scaffold_plugin 生成骨架

调用 `dev_scaffold_plugin`：`dir`（插件包绝对路径）、`name`（包名）、`form`（A1 的形态）、`description`（一句话）。

**完成判据**：目录出现 package.json + tsconfig + scripts/build.sh + src/（UI 形态另有 src/client/）。

### A3. 写业务代码

骨架自带规范注释（资源挂 ctx.effect、peerDeps 范围声明、首轮锚定示例、schema 精简铁律）。按需求填充 src/；UI 形态两半都要写：host（工具 + webServer 路由）+ client（slots 注册面板）。参考 REFERENCE §4。

**完成判据**：功能代码完成；工具/路由/监听全部挂 `ctx.effect`；UI 形态的 client 声明了 `inject: ['slots']` 且 register 带 name 字段。

## 分支 B：已有动态代码 → 静态包

按 REFERENCE §6「动态 → 静态移植对照表」逐项转换：harness.handle 方法体 → dispatch 表；host.call → fetch 同源 POST；styles.insert → `<style>` 注入 ctx.effect；ctx.interval/timeout → window.setInterval/setTimeout；wire 形状不变。传输选型默认 **webServer 路由 + 同源 fetch**（REFERENCE §2）。

**完成判据**：无 harness.handle / host.call 残留；host 有 ctx.webServer 路由；client 全部走 fetch；每个请求做同源校验。

## 分支 C：删除/卸载插件

### C1. 识别目标

用 `dev_injected_list`（注入清单）+ `dev_plugin_status`（全部 entry）+ profile package.json（官方依赖）定位目标。**名字模糊或命中多个候选 → 列出候选让用户确认，绝不在确认前执行任何删除。**

**完成判据**：唯一确定目标及其装配通道（注入 / 官方 bundle / 双路径）。

### C2. 按通道删除

| 通道 | 动作 |
|---|---|
| 运行时注入（registry 有） | `dev_uninject_plugin <包名子串>`（fiber 全清理 → 清清单 → 删 junction） |
| 官方 bundle | `dsh plugin --profile <名> remove <完整包名>`，并告知用户重启后彻底生效 |
| 双路径（生产化过） | 两层都清：`dev_uninject_plugin`（运行时）+ 官方 remove（配置） |

**完成判据**：对应通道的删除命令已执行且返回成功（或明确的失败原因）。

### C3. 护栏（防误删）

- 匹配串过短/过通用（如 "git"、"tool"）→ 先列匹配项让用户确认；
- 目标含 `dsh-super-injector` → `dev_uninject_plugin` 会拒绝（注入器受保护），改用官方 remove，并说明这是引导器、确认用户真想卸；
- **绝不删除插件源目录**（junction 悬空会让注入器恢复失败）；
- 不把"写 disabled 条目"当作"删除"——那只是运行时禁用。

**完成判据**：所有护栏检查通过，删除动作只针对用户确认的目标。

### C4. 验证删除

`dev_plugin_status` 无此包、`dev_injected_list` 无此名、profile 依赖无残留。官方 remove 的彻底生效需重启——明确告知用户。

**完成判据**：运行时 entry 消失 + 配置无残留（或明确告知剩余的重启步骤）。

## 分支 D：查询/查看插件状态

用 `dev_plugin_status`（全部 entry：id/name/fiber 状态/入口）+ `dev_injected_list`（注入清单）+ profile package.json（官方依赖）回答用户问题，并**标注每个插件的通道**（官方 bundle / 运行时注入 / 预设行 / 动态）。

**完成判据**：按用户问题给出清单，每项标注通道与运行状态。

## 分支 E：更新/改造现有插件

### E1. 识别目标与通道

复用 C1 的步骤：`dev_injected_list` + `dev_plugin_status` + profile package.json 定位包名与装配通道（注入 / 官方 bundle / 双路径）；模糊 → 列候选让用户确认。

**完成判据**：唯一确定目标及其通道。

### E2. 改代码并构建

改 src/ → `dev_build_plugin` 构建。

**完成判据**：`lib/index.js` 存在且 `node --check` 通过；UI 形态 `lib/client.js` 存在。

### E3. 按通道重载

| 通道 | 重载动作 |
|---|---|
| 运行时注入 | `dev_reload_package <包名子串>`（或 watch 自动重载） |
| 官方 bundle | 重新 `dsh plugin --profile <名> add <新 tgz>` 或替换源目录后重启（告知用户重启生效） |
| 双路径 | `dev_reload_package`（运行时）+ 必要时官方重装（配置层） |

**完成判据**：新版本在 `dev_plugin_status` 中 [active]，且版本/行为符合预期。

### E4. 验证

功能按用户要求工作；回归不引入新问题；如改动对外可见（新工具/新路由），确认工具可用或路由可达。

**完成判据**：功能验证通过；用户确认更新完成。

## 共同尾巴

### T1. 构建（dev_build_plugin）

**完成判据**：`lib/index.js` 存在且 `node --check` 通过；UI 形态 `lib/client.js` 存在（tsdown 产物，含 __ModuleLoader__ 包裹）。产物缺失/语法错误 → 修复后重跑，不跳过。

### T2. 注入（dev_inject_plugin）

参数 = 插件包目录绝对路径。**完成判据**：返回 host ✓（client ✓ 或"跳过（无 client 声明）"）；`dev_plugin_status` 中该包 [active]。预检拦截（缺 lib/、缺 inject、坏 client）→ 按报错修复后重试。

### T3. 迭代（改 → build → 重载）

简单改动走 watch 自动重载（约 1.5s）或 `dev_reload_package`。注意：重载匹配串含包名；**匹配注入器自身必须走自重载路径**（match 含 dsh-super-injector），普通路径会被拒绝。

**完成判据**：功能按用户要求工作，回归不引入新问题。

### T4. 生产化（dev_install_package）

把运行时注入落为 profile bundles（重启后由官方接管）。**完成判据**：profile package.json 的 `dsh.profile.bundles` 出现包名，且 node_modules junction 存在。

### T5. 发布（dev_release_plugin）

打 GitHub Release：v<version> + tgz 附件 + notes。**完成判据**：Release URL 可访问、tgz 可下载；`dsh plugin --profile <name> add <tgz>` 在干净环境可装（或至少 pnpm pack 产物完整，见 REFERENCE §7）。

### T6. 自检收尾

`dev_self_test` 相关项不回归；向用户汇报：插件名、形态、注入状态、生产化/发布状态（用户明确收窄范围时，声明未走完的出口）。

## 完成线

**默认完成 = 走到 T5 发布**；删除分支的完成线 = C4；查询分支的完成线 = D；更新分支的完成线 = E4。用户明确收窄范围（试用/自用/仅查看）→ 提前收尾，但必须声明停在哪个出口。每个出口都有可核的完成判据。

## 技能自身验证

写完/改完本技能后：① 静态审查——对照本技能步骤清单与工具清单逐条核对；② 玩具插件 dry-run——新会话里造一个最小 toolkit 插件跑通 A2→T2，再用分支 C 删除并验证清理干净（一次验证覆盖造与删两条线）。
