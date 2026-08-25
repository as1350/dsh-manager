// ============================================================
// dsh-manager · 浏览器（Client）半边
//
// 通过 window.__ModuleLoader__ 加载（与官方 dsh.client 包同款包装），
// React 取自平台模块表。与宿主通信走同源 fetch → /api/dsh-manager
// （宿主半边注册的 webServer 路由）。
// ============================================================
window.__ModuleLoader__.load({ id: '@deepseek-ai/dsh-manager', factory: (require) => {
  var module = { exports: {} }
  var exports = module.exports

  const React = require('react')
  const h = React.createElement

  const NS = 'skill-manager'
  const VERSION = '0.37.4'

  const zh = {
    'trigger.aria': 'Skills 管理',
    'trigger.label': 'Skills',
    'panel.title': 'Skills 管理',
    'panel.total': '共 {count} 个',
    'panel.close': '关闭',
    'panel.refresh': '刷新',
    'panel.search.placeholder': '搜索技能…',
    'panel.workspace.label': '工作区',
    'panel.workspace.session': '当前会话',
    'panel.loading': '正在读取技能目录…',
    'panel.incomplete': '部分技能来源尚未就绪，列表可能不完整',
    'panel.readError': '读取失败：{message}',
    'panel.toggleError': '修改失败：{message}',
    'panel.observeError': '观察开关失败：{message}',
    'nav.sources': '技能来源',
    'group.global': '全局',
    'group.global.hint': '你自己的通用技能（~/.dsh/skills）',
    'group.project': '项目',
    'group.project.hint': '当前项目目录中的技能',
    'group.plugin': '插件',
    'group.plugin.hint': '由宿主插件动态注入',
    'group.preset': '预设',
    'group.preset.hint': '由 Agent 预设作用域注入',
    'group.builtin': '系统内置',
    'group.builtin.hint': '代码内嵌或随内置 provider 提供',
    'group.empty': '此来源暂无技能',
    'scope.global': '全局',
    'scope.project': '项目',
    'scope.plugin': '插件',
    'scope.pluginName': '插件：{name}',
    'scope.preset': '{name} 预设',
    'card.crossScope': '来自其他预设作用域 · 仅查看',
    'card.preview': '未挂载 · 开会话后生效',
    'lock.locked': '已锁定 · 点击解锁后可切换调用权限',
    'lock.unlocked': '已解锁 · 点击重新锁定',
    'search.results': '匹配 {count} 个技能',
    'search.empty': '没有找到匹配的技能',
    'card.agent.on': 'Agent 可自动调用',
    'card.agent.off': 'Agent 不可自动调用，开关将其从模型目录移除',
    'card.user.on': '可从 / 菜单手动调用',
    'card.user.off': '不可手动调用',
    'card.user': '用户',
    'card.observe': '观察',
    'card.observe.on': '启动优化检测：任务结束后对本次使用做一次收尾复盘，经验记录进 _governance/skill-observations.json',
    'card.observe.off': '停止优化检测（约定块将移除，已有复盘记录保留）',
    'card.config': '配置',
    'card.noDescription': '（无描述）',
    'config.title': '技能配置 · {name}',
    'config.close': '关闭',
    'config.source': '来源',
    'config.file': '文件',
    'config.provider': 'Provider',
    'config.readonly': '只读 · 系统/预设自带技能，不可修改调用权限',
    'config.editable': '可编辑 · 保存直接写入文件',
    'config.noPath': '运行时注册 · 无配置文件',
    'config.content.label': '文件内容',
    'config.save': '保存',
    'config.saving': '保存中…',
    'config.saved': '已保存',
    'config.openExternal': '外部打开',
    'config.openFailed': '打开失败：{message}',
    'config.saveFailed': '保存失败：{message}',
    'card.saveFailed': '备注保存失败：{message}',
    'card.delete': '删除',
    'card.delete.title': '移入回收站（可在回收站中还原或彻底删除）',
    'card.delete.confirm': '确认删除？',
    'card.delete.disabled': '只读来源不可删除',
    'card.deleteError': '移入回收站失败：{message}',
    'trash.title': '回收站',
    'trash.hint': '被移入回收站的技能，可还原或彻底删除',
    'trash.empty': '回收站是空的',
    'trash.config': '配置',
    'trash.open.title': '打开对应的文件（回收站备份）',
    'trash.openFailed': '打开失败：{message}',
    'trash.restore': '还原',
    'trash.delete': '彻底删除',
    'trash.delete.confirm': '确认彻底删除？',
    'trash.delete.title': '彻底删除后不可恢复',
    'trash.restoreError': '还原失败：{message}',
    'trash.deleteError': '彻底删除失败：{message}',
    'notes.edit': '编辑备注',
    'notes.saving': '保存中…',
    'notes.save': '保存',
    'notes.cancel': '取消',
    'notes.untitled': '（无标题）',
    'notes.empty.title': '暂无备注',
    'notes.empty.content': '点击「编辑备注」添加一条仅自己可见的说明（模型不会读取）',
    'notes.title.placeholder': '→',
    'notes.content.placeholder': '→',
    'notes.hint': '备注仅你可见，保存在 ~/.dsh/skills-notes.json，模型不会读取。',
    'patch.trigger.aria': '补丁管理',
    'patch.trigger.label': '补丁',
    'patch.panel.title': '补丁管理',
    'patch.panel.loading': '正在扫描补丁目录…',
    'patch.panel.error': '扫描失败：{message}',
    'patch.panel.empty': '没有补丁',
    'patch.state.applied': '已启用',
    'patch.state.clean': '未启用',
    'patch.state.lost': '已丢失 · 文件被外部改动',
    'patch.state.error': '校验失败',
    'patch.state.error.title': '结构校验失败：{message}',
    'patch.enable': '启用',
    'patch.disable': '禁用',
    'patch.delete': '删除',
    'patch.delete.confirm': '确认删除？',
    'patch.delete.title': '删除声明文件与伴随文件（不可恢复）',
    'patch.enable.title': '校验通过后写入部署目录',
    'patch.disable.title': '重放剩余链并还原官方快照',
    'patch.lost.title': '目标文件已被官方更新或手动改动；禁用时会把当前内容刷新为新官方快照',
    'patch.apply.refresh': '已写入磁盘：刷新浏览器（Ctrl+Shift+R）生效',
    'patch.apply.restart': '已写入磁盘：需要重启 dsh web 生效',
    'patch.kind.replace': '替换',
    'patch.kind.script': '脚本',
    'patch.kind.override': '覆盖',
    'patch.executable': '可执行',
    'patch.confirm.exec': '确认启用可执行补丁？',
    'patch.import': '导入',
    'patch.import.to': '导入到',
    'patch.import.drop': '拖放 .dsh-patch.json 文件到面板任意处导入',
    'patch.imported': '已导入：{id}',
    'patch.import.error': '导入失败：{message}',
    'patch.allowExec': '允许可执行补丁',
    'patch.allowExec.title': '关闭后所有脚本类补丁不可启用（总闸）',
    'patch.category.default': '默认',
    'patch.category.add': '新建类别',
    'patch.category.add.placeholder': '类别名（中文/字母/数字/_/-）',
    'patch.category.rename': '重命名',
    'patch.category.delete': '删除类别',
    'patch.category.delete.confirm': '确认删除？',
    'patch.category.delete.title': '仅空类别可删除',
    'patch.category.added': '已创建类别',
    'patch.category.renamed': '已重命名类别',
    'patch.category.deleted': '已删除类别',
    'patch.targets': '目标文件',
    'patch.dup.title': 'id 与其它补丁重复，无法启用',
    'patch.hint': '启用/禁用后按各补丁提示刷新浏览器或重启 dsh web；补丁目录：~/.dsh/dsh-manager/patches/，恢复手册：目录下 RECOVERY.md。',
    'patch.root': '部署根目录',
    'patch.opError': '操作失败：{message}',
    'patch.saving': '写入中…',
    'patch.lostBadge': '有补丁丢失或异常',
    'patch.alert.label': '丢失提醒',
    'patch.alert.panel': '面板内轮询（默认）',
    'patch.alert.badge': '后台轮询 + 按钮角标',
    'repo.trigger.aria': '本地仓库',
    'repo.trigger.label': '本地仓库',
    'repo.panel.title': '本地仓库',
    'repo.nav': '仓库管理',
    'repo.hint': '面板只读 + 生成指令；所有 git/账本写入由 agent 执行。',
    'repo.readError': '读取失败：{message}',
    'repo.saved': '设置已保存',
    'repo.draftWritten': '指令已写入当前输入框',
    'repo.draftFailed': '写入输入框失败：{message}',
    'repo.openFailed': '打开失败：{message}',
    'repo.copied': '克隆命令已复制',
    'repo.copyFailed': '复制失败',
    'repo.noProjectCwd': '当前会话没有工作目录，无法应用到项目',
    'repo.noRoots': '尚未添加任何根目录',
    'repo.noRootsHint': '请先在上方添加一个根目录（例如 D:/Desktop/Dsh/本地项目）',
    'repo.noProjects': '没有识别到项目目录',
    'repo.noMirrors': '没有镜像仓库',
    'repo.noSkills': '技能仓库为空',
    'repo.rootPlaceholder': '粘贴你的本地仓库根目录，管理你的本地项目、github项目以及Skill本地库',
    'repo.addRoot': '添加位置',
    'repo.remove': '移除',
    'repo.setGovernance': '设为治理根',
    'repo.switchGovernance': '切换治理根',
    'repo.switchGovernanceConfirm': '是否需要切换治理根目录？',
    'repo.switchGovernanceTo': '确定将治理根切换到 {path} 吗？',
    'repo.select': '选择',
    'repo.cancelSwitch': '取消切换',
    'repo.switchHint': '请选择要切换到的根目录',
    'repo.cloneRepo': '拉取新Github项目',
    'repo.cloneTitle': '克隆 GitHub 仓库',
    'repo.cloneUrlLabel': '克隆地址',
    'repo.cloneUrlPlaceholder': 'https://github.com/... 或 git@github.com:...（可带 git clone 前缀）',
    'repo.cloneCurrentDir': '当前选择目录：',
    'repo.noCategories': '当前目录下没有分类目录',
    'repo.newCatPlaceholder': '新分类名称',
    'repo.addCategory': '添加新分类',
    'repo.cloneHere': '克隆到该目录',
    'repo.goUp': '返回上一级',
    'repo.catNameRequired': '请输入分类名称',
    'repo.cloneUrlRequired': '请输入克隆地址',
    'repo.cloneUrlInvalid': '无法识别克隆地址',
    'repo.cloneExists': '目标目录下存在同名文件夹的项目，请选择其他目录',
    'repo.governance': '治理根',
    'repo.rootType.local': '本地项目',
    'repo.rootType.mirror': 'GitHub项目（镜像）',
    'repo.tab.projects': '本地项目',
    'repo.tab.mirrors': 'GitHub项目',
    'repo.tab.skills': '本地Skill仓库',
    'repo.open': '打开文件夹',
    'repo.initGit': '初始化 Git 并登记',
    'repo.sync': '同步到 GitHub',
    'repo.createAndPush': '创建仓库并推送',
    'repo.openGh': 'GitHub 页',
    'repo.clone': '克隆命令',
    'repo.privateLocked': '私有仓库不可克隆',
    'repo.noCloud': '尚未创建 GitHub 仓库',
    'repo.pull': '拉取更新',
    'repo.public': '公有',
    'repo.private': '私有',
    'repo.cloneMode': '克隆协议',
    'repo.update': '拉取更新',
    'repo.noUpdate': '无需更新',
    'repo.convertLocal': '转为本地项目',
    'repo.openUpstream': 'GitHub 页',
    'repo.needsUpdate': '需要更新',
    'repo.upToDate': '已是最新',
    'repo.detail.title': '项目详情',
    'repo.detail.loading': '加载中…',
    'repo.detail.error': '读取失败：{message}',
    'repo.detail.close': '关闭',
    'repo.detail.type.local': '本地项目',
    'repo.detail.type.mirror': 'GitHub项目',
    'repo.detail.updateTitle': '更新简介',
    'repo.detail.update.behind': 'GitHub 有更新（落后 {count} 个提交）：',
    'repo.detail.update.ahead': '有 {count} 个提交尚未推送到 GitHub：',
    'repo.detail.update.noneMirror': '已是最新（无需更新）',
    'repo.detail.update.noneLocal': '没有未推送的提交',
    'repo.detail.historyTitle': '最近更新历史',
    'repo.detail.aboutTitle': '项目介绍',
    'repo.detail.about.none': '（该项目没有 README 介绍）',
    'repo.detail.readmeMore': '阅读完整 README',
    'repo.detail.readmeLess': '收起',
    'repo.detail.packageTitle': '包信息',
    'repo.detail.package.version': '版本',
    'repo.detail.gitTitle': 'Git 状态',
    'repo.detail.git.branch': '分支',
    'repo.detail.git.remote': '远端',
    'repo.detail.git.dirty': '有未提交改动',
    'repo.detail.git.clean': '工作区干净',
    'repo.detail.git.aheadBehind': '领先 {ahead} / 落后 {behind}',
    'repo.detail.commit.empty': '暂无提交记录',
    'repo.detail.noGit': '该项目不是 Git 仓库',
    'repo.detail.noCloud': '无云端仓库',
    'repo.detail.type.skill': '技能',
    'repo.detail.skill.introTitle': '技能介绍',
    'repo.detail.skill.contentTitle': '技能内容',
    'repo.detail.localTitle': '本地更新',
    'repo.detail.local.hasDoc': '（含人工维护说明）',
    'repo.detail.local.none': '没有本地定制提交',
    'repo.detail.notesTitle': '维护笔记',
    'repo.detail.registerTitle': '未登记提交',
    'repo.detail.registerHint': '以下本地提交尚未登记到 CHANGELOG-local.md：',
    'repo.detail.registerAction': '登记本地修改',
    'repo.ai.title': 'AI 更新讲解',
    'repo.ai.generating': 'AI 讲解生成中…',
    'repo.ai.queued': '排队中…',
    'repo.ai.retry': '重试',
    'repo.ai.failed': 'AI 讲解失败：{message}',
    'repo.ai.summaryLabel': '摘要',
    'repo.ai.pointsLabel': '要点',
    'repo.ai.impactLabel': '对使用者的影响',
    'repo.ai.rawTitle': '原始提交信息',
    'repo.ai.rawSubject': '提交',
    'repo.ai.materialHint': '基于提交信息+变更摘要生成，仅供参考',
    'repo.ai.statusDone': '已生成',
    'repo.ai.statusPending': '点击生成',
    'repo.ai.statusRunning': '生成中',
    'repo.ai.statusError': '生成失败，点击重试',
    'repo.ai.disabled': 'AI 讲解未启用或服务不可用',
    'repo.aiSettingsTitle': 'AI 讲解设置',
    'repo.aiSettingsEnabled': '启用 AI 讲解',
    'repo.aiSettingsProvider': 'Provider',
    'repo.aiSettingsModel': '模型',
    'repo.aiSettingsEffort': '思考等级',
    'repo.aiSettingsMaxTokens': '最大输出 token',
    'repo.aiSettingsSave': '保存 AI 设置',
    'repo.state.nogit': '未初始化 Git',
    'repo.state.behind': '远端领先',
    'repo.state.ahead': '有未推送提交',
    'repo.state.synced': '已同步',
    'repo.state.untracked': '未跟踪远端',
    'repo.state.noremote': '无远端',
    'repo.applyGlobal': '应用到全局',
    'repo.applyProject': '应用到项目',
    'repo.applyPlugin': '应用到插件',
    'repo.visibilityChanged': '仓库可见性已改为 {visibility}',
    'repo.delete': '删除',
    'repo.deleteConfirm': '确认删除？',
    'repo.skillDeleted': '已删除技能 {name}',
    'repo.skillCopied': '已复制到 {path}',
    'repo.skillSkip': '目标已存在，跳过：{path}',
    'repo.selectProject': '选择本地 git 项目…',
    'repo.selectPlugin': '选择插件包…',
    'repo.generateCommand': '生成指令',
    'repo.cancel': '取消',
    'repo.pluginRequired': '请先选择插件包',
    'repo.division.local': '本地',
    'repo.division.plugins': '插件',
    'repo.division.projects': '项目',
    'service.trigger.aria': '本地服务',
    'service.trigger.label': '本地服务',
    'service.panel.title': '本地服务',
    'service.hint': '配置集中在 _governance/services.json（面板直接写）；服务默认随 dsh 停止，可对单个服务开启「独立运行」。',
    'service.readError': '读取失败：{message}',
    'service.opError': '操作失败：{message}',
    'service.empty': '还没有注册任何服务',
    'service.emptyHint': '在「本地仓库」面板的项目卡片右上角点「注册服务」，注册后即可在这里配置启动命令。',
    'service.enabled': '服务管理总开关',
    'service.enabled.title': '关闭后所有服务不可启动',
    'service.confirmStart': '启动前确认',
    'service.confirmStart.title': '每次点击启动时弹确认框（默认开）',
    'service.start': '启动',
    'service.stop': '停止',
    'service.open': '管理页面',
    'service.running': '运行中',
    'service.stopped': '已停止',
    'service.portUp': '端口正常',
    'service.pid': 'PID {pid}',
    'service.add': '新增服务',
    'service.remove': '移除注册',
    'service.remove.confirm': '确认移除该项目的服务注册？将先自动停止该项目全部服务。',
    'service.edit': '编辑',
    'service.save': '保存',
    'service.saving': '保存中…',
    'service.cancel': '取消',
    'service.deleteService': '删除服务',
    'service.deleteService.confirm': '确认删除该服务配置？',
    'service.name': '服务名',
    'service.cwd': '工作目录',
    'service.command': '启动命令',
    'service.command.placeholder': '例如 python main.py 或 npm run start',
    'service.args': '参数',
    'service.args.placeholder': '空格分隔，支持引号如 --name "hello world"（可留空）',
    'service.env': '环境变量',
    'service.env.placeholder': 'KEY=value 每行一个（可留空）',
    'service.port': '服务端口 (API/TCP)-仅用于端口进程探活，无法修改启动端口',
    'service.port.placeholder': '可选 1-65535，用于探活',
    'service.autoStart': '开机自启',
    'service.autoStart.title': 'dsh 启动后自动拉起该服务',
    'service.autoRestart': '崩溃重启',
    'service.autoRestart.title': '进程异常退出后自动重启（5 分钟内最多 5 次）',
    'service.detached': '独立运行',
    'service.detached.title': '进程独立于 dsh 运行：dsh 关闭/重启不停止，重启后自动接管（身份验证：命令行+端口匹配）；静默启动不弹窗，日志直写文件（.cmd/.bat 命令会自动改写为 node 直跑，含 shell 操作符的命令不支持独立运行）',
    'service.startAll': '全部启动',
    'service.stopAll': '全部停止',
    'service.stopAllConfirm': '确认停止该项目全部服务？',
    'service.startAllDone': '批量启动完成：成功 {ok} 个，失败 {fail} 个',
    'service.stopAllDone': '已停止 {count} 个服务',
    'service.starting': '启动中…',
    'service.stopping': '停止中…',
    'service.configError': '配置文件损坏，已阻止写入：{message}',
    'service.configTitle': '编辑服务 · {name}',
    'service.addTitle': '新增服务 · {project}',
    'service.noCommand': '尚未配置启动命令',
    'service.registered': '已注册',
    'service.register': '注册服务',
    'service.badge.registered': '已注册',
    'service.badge.register': '注册服务',
    'service.saved': '配置已保存',
    'service.startFailed': '启动失败：{message}',
    'service.started': '已启动',
    'service.stoppedDone': '已停止',
    'service.removed': '已移除注册',
    'service.registeredDone': '已注册，可在「本地服务」面板配置',
    'service.stopConfirm': '确认停止服务 {name}？',
    'service.startConfirm': '确认启动服务 {name}？',
    'service.nameRequired': '请输入服务名',
    'service.cwdRequired': '请输入工作目录',
    'service.commandRequired': '请输入启动命令',
    'service.portInvalid': '端口必须是 1-65535 的整数',
    'service.restart': '重启',
    'service.restarting': '重启中…',
    'service.restarted': '已重启',
    'service.restartFailed': '重启失败：{message}',
    'service.logs': '日志',
    'service.logs.title': '服务日志 · {name}',
    'service.logs.empty': '暂无日志输出',
    'service.logs.readError': '读取日志失败：{message}',
    'service.logs.autoRefresh': '每 3 秒自动刷新',
    'service.uptime': '已运行 {time}',
    'service.lastExitBadge': '上次异常退出 code={code}',
    'service.lastExitBadgeSignal': '上次被信号终止',
    'service.logs.pause': '暂停',
    'service.logs.resume': '恢复',
    'service.logs.clear': '清空',
    'service.logs.clearConfirm': '确认清空该服务日志？',
    'service.logs.cleared': '日志已清空',
    'service.logs.download': '下载',
    'service.logs.loadMore': '加载更多',
    'service.logs.loadingMore': '加载中…',
    'service.logs.search': '搜索日志',
    'service.logs.searchCount': '匹配 {count} 行',
    'service.starting': '启动中',
    'service.healthUp': '健康正常',
    'service.healthDown': '健康异常',
    'service.healthUrl': '健康检查地址',
    'service.healthUrl.placeholder': '可选，如 /health 或 http://127.0.0.1:8787/health',
    'service.manageUrl': '管理页面网址',
    'service.manageUrl.placeholder': '可选，如 http://127.0.0.1:8787 或 http://127.0.0.1:8787/admin（留空则用端口拼 http://127.0.0.1:端口）',
    'service.envFile': 'envFile 文件',
    'service.envFile.placeholder': '可选，相对工作目录，如 .env',
    'service.startTimeoutMs': '启动超时(毫秒)',
    'service.startTimeoutMs.placeholder': '默认 30000（30 秒）',
    'service.templates': '配置模板',
    'service.templateNode': 'Node',
    'service.templatePython': 'Python',
    'service.templateNpm': 'npm',
    'service.aiFill': 'AI 帮我填',
    'service.aiFilling': 'AI 生成中…',
    'service.aiFillFailed': 'AI 生成配置失败：{message}',
    'service.aiDiagTitle': 'AI 诊断',
    'service.aiDiagRunning': 'AI 诊断中…',
    'service.aiDiagFailed': 'AI 诊断失败：{message}',
    'service.logs.aiSummary': 'AI 摘要',
    'service.logs.aiSummaryRunning': 'AI 摘要生成中…',
    'service.logs.aiSummaryFailed': 'AI 摘要失败：{message}',
    'service.aiSettingsTitle': 'AI 服务助手',
    'service.aiSettingsEnabled': '启用 AI 功能（失败诊断 / 日志摘要 / 配置助手）',
    'service.aiSettingsProvider': '供应商',
    'service.aiSettingsModel': '模型',
    'service.aiSettingsEffort': '思考等级',
    'service.aiSettingsSave': '保存 AI 设置',
    'service.aiSettingsSaved': 'AI 设置已保存',
    'service.aiSettingsClearCache': '清空缓存',
    'service.aiSettingsClearCacheConfirm': '确定清空 AI 讲解缓存？清空后所有条目将重新生成',
    'service.aiSettingsClearCacheDone': '已清空 {count} 条 AI 讲解缓存',
    'service.aiSettingsClearCacheFailed': '清空失败：{message}',
    'service.logs.detachedHint': '此日志由服务进程直写（独立运行），无面板时间戳与 out/err 标记',
    'service.note': '说明',
    'service.note.placeholder': '这个服务是干什么的（如：Grok 注册机 Web 界面）',
    'service.search.placeholder': '搜索项目 / 服务名 / 说明 / 命令…',
    'service.search.empty': '没有匹配的项目',
    'service.more': '更多操作',
    'service.startAllGlobal': '全部启动',
    'service.stopAllGlobal': '全部停止',
    'service.unconfigured': '未配置服务的项目（{count}）',
    'service.aiConfig': 'AI 配置',
    'service.aiConfigDone': '配置指令已写入当前输入框，发送后 agent 将用 service-config 技能处理',
    'service.aiConfigFailed': '写入输入框失败：{message}',
    'service.portConflictWarnings': '配置提醒：{message}',
    'service.envSensitiveHint': '含敏感变量',
    'service.startTimeoutExceeded': '启动超时（进程存活但端口/健康检查未就绪）',
    'service.external': '外部运行中',
    'service.external.title': '端口 {port} 正被未托管的进程（PID {pid}）监听，可能是命令行手动启动。面板不管理该进程（无停止/重启/日志能力）。如需面板管理，请先手动停止该进程，再从面板启动。',
    'service.external.proc': '外部运行中 · {name}（PID {pid}）',
    'service.external.related': '像是外部启动的本服务',
    'service.external.unrelated': '疑似被其他程序占用',
    'service.external.unknown': '无法确认进程身份',
    'service.external.detail': '查看进程',
    'service.external.modal.title': '外部占用进程详情',
    'service.external.modal.pid': 'PID',
    'service.external.modal.name': '进程名',
    'service.external.modal.cmdline': '命令行',
    'service.external.modal.basis': '判断依据',
    'service.external.modal.basisRelated': '命令行包含本服务的工作目录或启动命令，可能是外部手动启动的本服务',
    'service.external.modal.basisUnrelated': '命令行与本服务配置不匹配，可能是其他程序占用',
    'service.external.modal.basisUnknown': '无法读取占用进程的命令行，无法确认',
    'service.external.modal.port': '端口',
    'service.external.modal.close': '关闭',
    'service.external.modal.empty': '（不可用）',
    'service.external.kill': '杀死进程',
    'service.external.killConfirmTitle': '确认杀死外部进程？',
    'service.external.killConfirmBody': '将杀死当前占用端口 {port} 的进程 {name}（PID {pid}）。该进程由命令行手动启动，面板不管理它；杀死后请从面板重新启动以纳入管理。',
    'service.external.killConfirmWarn': '注意：该进程与本服务配置不匹配，可能是其他程序占用，请确认无误后再继续。',
    'service.external.killing': '正在杀死…',
    'service.external.killed': '已杀死进程 {name}（PID {pid}）',
    'service.external.alreadyFree': '端口已释放，无需杀死',
    'service.external.killFailed': '杀死进程失败：{message}',
  }

  const en = {
    'trigger.aria': 'Skills manager',
    'trigger.label': 'Skills',
    'panel.title': 'Skills',
    'panel.total': '{count} skills',
    'panel.close': 'Close',
    'panel.refresh': 'Refresh',
    'panel.search.placeholder': 'Search skills…',
    'panel.workspace.label': 'Workspace',
    'panel.workspace.session': 'Current session',
    'panel.loading': 'Reading the skill catalog…',
    'panel.incomplete': 'Some skill sources are not ready yet; the list may be incomplete',
    'panel.readError': 'Read failed: {message}',
    'panel.toggleError': 'Update failed: {message}',
    'panel.observeError': 'Observe toggle failed: {message}',
    'nav.sources': 'Skill sources',
    'group.global': 'Global',
    'group.global.hint': 'Your own general-purpose skills (~/.dsh/skills)',
    'group.project': 'Project',
    'group.project.hint': 'Skills in the current project directory',
    'group.plugin': 'Plugins',
    'group.plugin.hint': 'Injected by host plugins',
    'group.preset': 'Presets',
    'group.preset.hint': 'Injected by agent preset scopes',
    'group.builtin': 'Built-in',
    'group.builtin.hint': 'Embedded in code or shipped with a provider',
    'group.empty': 'No skills from this source',
    'scope.global': 'Global',
    'scope.project': 'Project',
    'scope.plugin': 'Plugin',
    'scope.pluginName': 'Plugin: {name}',
    'scope.preset': '{name} preset',
    'card.crossScope': 'From another preset scope · read-only',
    'card.preview': 'Not mounted · open a session to activate',
    'lock.locked': 'Locked · click to unlock and toggle invocation',
    'lock.unlocked': 'Unlocked · click to lock again',
    'search.results': '{count} matching skills',
    'search.empty': 'No matching skills',
    'card.agent.on': 'Agent can auto-invoke',
    'card.agent.off': 'Not agent-invocable',
    'card.user.on': 'User-invocable from / menu',
    'card.user.off': 'Not user-invocable',
    'card.user': 'User',
    'card.observe': 'Observe',
    'card.observe.on': 'Optimization watch: run a closing review after tasks using this skill; records go to _governance/skill-observations.json',
    'card.observe.off': 'Stop optimization watch (block removed, past records kept)',
    'card.config': 'Configure',
    'card.noDescription': '(no description)',
    'config.title': 'Skill config · {name}',
    'config.close': 'Close',
    'config.source': 'Source',
    'config.file': 'File',
    'config.provider': 'Provider',
    'config.readonly': 'Read-only · shipped by system/preset',
    'config.editable': 'Editable · saves write to the file',
    'config.noPath': 'Runtime-registered · no config file',
    'config.content.label': 'File content',
    'config.save': 'Save',
    'config.saving': 'Saving…',
    'config.saved': 'Saved',
    'config.openExternal': 'Open externally',
    'config.openFailed': 'Open failed: {message}',
    'config.saveFailed': 'Save failed: {message}',
    'card.saveFailed': 'Note save failed: {message}',
    'card.delete': 'Delete',
    'card.delete.title': 'Move to trash (restore or permanently delete in the trash)',
    'card.delete.confirm': 'Confirm delete?',
    'card.delete.disabled': 'Read-only sources cannot be deleted',
    'card.deleteError': 'Move to trash failed: {message}',
    'trash.title': 'Trash',
    'trash.hint': 'Skills moved to the trash; restore or permanently delete them here',
    'trash.empty': 'The trash is empty',
    'trash.config': 'Configure',
    'trash.open.title': 'Open the corresponding file (trash backup)',
    'trash.openFailed': 'Open failed: {message}',
    'trash.restore': 'Restore',
    'trash.delete': 'Delete forever',
    'trash.delete.confirm': 'Delete forever?',
    'trash.delete.title': 'This cannot be undone',
    'trash.restoreError': 'Restore failed: {message}',
    'trash.deleteError': 'Permanent delete failed: {message}',
    'notes.edit': 'Edit note',
    'notes.saving': 'Saving…',
    'notes.save': 'Save',
    'notes.cancel': 'Cancel',
    'notes.untitled': '(untitled)',
    'notes.empty.title': 'No note yet',
    'notes.empty.content': 'Click "Edit note" to add a private note (never read by the model)',
    'notes.title.placeholder': '→',
    'notes.content.placeholder': '→',
    'notes.hint': 'Notes are private: stored in ~/.dsh/skills-notes.json and never read by the model.',
    'patch.trigger.aria': 'Patch manager',
    'patch.trigger.label': 'Patches',
    'patch.panel.title': 'Patches',
    'patch.panel.loading': 'Scanning the patch directory…',
    'patch.panel.error': 'Scan failed: {message}',
    'patch.panel.empty': 'No patches',
    'patch.state.applied': 'Enabled',
    'patch.state.clean': 'Disabled',
    'patch.state.lost': 'Lost · file changed externally',
    'patch.state.error': 'Invalid',
    'patch.state.error.title': 'Invalid: {message}',
    'patch.enable': 'Enable',
    'patch.disable': 'Disable',
    'patch.delete': 'Delete',
    'patch.delete.confirm': 'Delete?',
    'patch.delete.title': 'Deletes the manifest and companion files (cannot be undone)',
    'patch.enable.title': 'Validate, then write into the deployment',
    'patch.disable.title': 'Replay the remaining chain and restore the official snapshot',
    'patch.lost.title': 'The target was changed by an upgrade or manual edit; disabling refreshes it as the new official snapshot',
    'patch.apply.refresh': 'Written: refresh the browser (Ctrl+Shift+R) to apply',
    'patch.apply.restart': 'Written: restart dsh web to apply',
    'patch.kind.replace': 'replace',
    'patch.kind.script': 'script',
    'patch.kind.override': 'override',
    'patch.executable': 'executable',
    'patch.confirm.exec': 'Enable this executable patch?',
    'patch.import': 'Import',
    'patch.import.to': 'Import into',
    'patch.import.drop': 'Drop .dsh-patch.json files anywhere on this panel to import',
    'patch.imported': 'Imported: {id}',
    'patch.import.error': 'Import failed: {message}',
    'patch.allowExec': 'Allow executable patches',
    'patch.allowExec.title': 'When off, no script-kind patch can be enabled (master switch)',
    'patch.category.default': 'Default',
    'patch.category.add': 'New category',
    'patch.category.add.placeholder': 'Category name',
    'patch.category.rename': 'Rename',
    'patch.category.delete': 'Delete category',
    'patch.category.delete.confirm': 'Delete?',
    'patch.category.delete.title': 'Only empty categories can be deleted',
    'patch.category.added': 'Category created',
    'patch.category.renamed': 'Category renamed',
    'patch.category.deleted': 'Category deleted',
    'patch.targets': 'Targets',
    'patch.dup.title': 'Duplicate id with another patch; cannot be enabled',
    'patch.hint': 'After enable/disable, refresh the browser or restart dsh web as each patch indicates. Patch directory: ~/.dsh/dsh-manager/patches/; recovery manual: RECOVERY.md inside it.',
    'patch.root': 'Deployment root',
    'patch.opError': 'Operation failed: {message}',
    'patch.saving': 'Writing…',
    'patch.lostBadge': 'Patches lost or broken',
    'patch.alert.label': 'Loss alerts',
    'patch.alert.panel': 'Poll while the panel is open (default)',
    'patch.alert.badge': 'Background polling + button badge',
    'repo.trigger.aria': 'Local repositories',
    'repo.trigger.label': 'Repos',
    'repo.panel.title': 'Local Repositories',
    'repo.nav': 'Repositories',
    'repo.hint': 'The panel is read-only and generates instructions; all git/ledger writes are done by the agent.',
    'repo.readError': 'Read failed: {message}',
    'repo.saved': 'Settings saved',
    'repo.draftWritten': 'Instruction written to the current input box',
    'repo.draftFailed': 'Failed to write to input: {message}',
    'repo.openFailed': 'Open failed: {message}',
    'repo.copied': 'Clone command copied',
    'repo.copyFailed': 'Copy failed',
    'repo.noProjectCwd': 'The current session has no working directory, cannot apply to project',
    'repo.noRoots': 'No root directories added',
    'repo.noRootsHint': 'Add a root directory above (e.g. D:/Desktop/Dsh/本地项目)',
    'repo.noProjects': 'No project directories found',
    'repo.noMirrors': 'No mirror repositories',
    'repo.noSkills': 'Skill warehouse is empty',
    'repo.rootPlaceholder': 'Paste an absolute root path, e.g. D:/Desktop/Dsh/插件集',
    'repo.addRoot': 'Add location',
    'repo.remove': 'Remove',
    'repo.setGovernance': 'Set as governance root',
    'repo.switchGovernance': 'Switch governance root',
    'repo.switchGovernanceConfirm': 'Do you want to switch the governance root?',
    'repo.switchGovernanceTo': 'Switch the governance root to {path}?',
    'repo.select': 'Select',
    'repo.cancelSwitch': 'Cancel switch',
    'repo.switchHint': 'Select the root to switch to',
    'repo.cloneRepo': 'Pull new GitHub project',
    'repo.cloneTitle': 'Clone GitHub repository',
    'repo.cloneUrlLabel': 'Clone URL',
    'repo.cloneUrlPlaceholder': 'https://github.com/... or git@github.com:... (git clone prefix optional)',
    'repo.cloneCurrentDir': 'Current directory:',
    'repo.noCategories': 'No category directories here',
    'repo.newCatPlaceholder': 'New category name',
    'repo.addCategory': 'Add category',
    'repo.cloneHere': 'Clone to this directory',
    'repo.goUp': 'Go up',
    'repo.catNameRequired': 'Enter a category name',
    'repo.cloneUrlRequired': 'Enter a clone URL',
    'repo.cloneUrlInvalid': 'Cannot recognize clone URL',
    'repo.cloneExists': 'A folder with the same name already exists in the target directory; choose another directory',
    'repo.governance': 'governance',
    'repo.rootType.local': 'Local Projects',
    'repo.rootType.mirror': 'GitHub (mirror)',
    'repo.tab.projects': 'Local Projects',
    'repo.tab.mirrors': 'GitHub Projects',
    'repo.tab.skills': 'Skill Warehouse',
    'repo.open': 'Open folder',
    'repo.initGit': 'Init Git & register',
    'repo.sync': 'Sync to GitHub',
    'repo.createAndPush': 'Create repo & push',
    'repo.openGh': 'GitHub page',
    'repo.clone': 'Clone command',
    'repo.privateLocked': 'Private repository cannot be cloned',
    'repo.noCloud': 'No GitHub repository yet',
    'repo.pull': 'Pull update',
    'repo.public': 'Public',
    'repo.private': 'Private',
    'repo.cloneMode': 'Clone protocol',
    'repo.update': 'Pull update',
    'repo.noUpdate': 'Up to date',
    'repo.convertLocal': 'Convert to local',
    'repo.openUpstream': 'GitHub page',
    'repo.needsUpdate': 'Update needed',
    'repo.upToDate': 'Up to date',
    'repo.detail.title': 'Project Details',
    'repo.detail.loading': 'Loading…',
    'repo.detail.error': 'Read failed: {message}',
    'repo.detail.close': 'Close',
    'repo.detail.type.local': 'Local project',
    'repo.detail.type.mirror': 'GitHub project',
    'repo.detail.updateTitle': 'Update Summary',
    'repo.detail.update.behind': 'GitHub has updates ({count} commits behind):',
    'repo.detail.update.ahead': '{count} commits not pushed to GitHub yet:',
    'repo.detail.update.noneMirror': 'Up to date (no updates needed)',
    'repo.detail.update.noneLocal': 'No unpushed commits',
    'repo.detail.historyTitle': 'Recent History',
    'repo.detail.aboutTitle': 'About',
    'repo.detail.about.none': '(No README intro for this project)',
    'repo.detail.readmeMore': 'Read full README',
    'repo.detail.readmeLess': 'Collapse',
    'repo.detail.packageTitle': 'Package',
    'repo.detail.package.version': 'Version',
    'repo.detail.gitTitle': 'Git Status',
    'repo.detail.git.branch': 'Branch',
    'repo.detail.git.remote': 'Remote',
    'repo.detail.git.dirty': 'Uncommitted changes',
    'repo.detail.git.clean': 'Working tree clean',
    'repo.detail.git.aheadBehind': '{ahead} ahead / {behind} behind',
    'repo.detail.commit.empty': 'No commits yet',
    'repo.detail.noGit': 'Not a Git repository',
    'repo.detail.noCloud': 'No cloud repo',
    'repo.detail.type.skill': 'Skill',
    'repo.detail.skill.introTitle': 'Skill Intro',
    'repo.detail.skill.contentTitle': 'Skill Content',
    'repo.detail.localTitle': 'Local Updates',
    'repo.detail.local.hasDoc': '(with maintained notes)',
    'repo.detail.local.none': 'No local custom commits',
    'repo.detail.notesTitle': 'Notes',
    'repo.detail.registerTitle': 'Unregistered commits',
    'repo.detail.registerHint': 'These local commits are not recorded in CHANGELOG-local.md:',
    'repo.detail.registerAction': 'Register local changes',
    'repo.ai.title': 'AI Update Summary',
    'repo.ai.generating': 'Generating…',
    'repo.ai.queued': 'Queued…',
    'repo.ai.retry': 'Retry',
    'repo.ai.failed': 'AI summary failed: {message}',
    'repo.ai.summaryLabel': 'Summary',
    'repo.ai.pointsLabel': 'Highlights',
    'repo.ai.impactLabel': 'Impact',
    'repo.ai.rawTitle': 'Raw commit info',
    'repo.ai.rawSubject': 'Commit',
    'repo.ai.materialHint': 'Generated from commit message + change summary, for reference only',
    'repo.ai.statusDone': 'Ready',
    'repo.ai.statusPending': 'Click to generate',
    'repo.ai.statusRunning': 'Generating',
    'repo.ai.statusError': 'Failed, click to retry',
    'repo.ai.disabled': 'AI summary disabled or unavailable',
    'repo.aiSettingsTitle': 'AI Summary Settings',
    'repo.aiSettingsEnabled': 'Enable AI summary',
    'repo.aiSettingsProvider': 'Provider',
    'repo.aiSettingsModel': 'Model',
    'repo.aiSettingsEffort': 'Reasoning effort',
    'repo.aiSettingsMaxTokens': 'Max output tokens',
    'repo.aiSettingsSave': 'Save AI settings',
    'repo.state.nogit': 'Git not initialized',
    'repo.state.behind': 'Behind remote',
    'repo.state.ahead': 'Unpushed commits',
    'repo.state.synced': 'Synced',
    'repo.state.untracked': 'No upstream tracking',
    'repo.state.noremote': 'No remote',
    'repo.applyGlobal': 'Apply to global',
    'repo.applyProject': 'Apply to project',
    'repo.applyPlugin': 'Apply to plugin',
    'repo.visibilityChanged': 'Repo visibility changed to {visibility}',
    'repo.delete': 'Delete',
    'repo.deleteConfirm': 'Confirm delete?',
    'repo.skillDeleted': 'Deleted skill {name}',
    'repo.skillCopied': 'Copied to {path}',
    'repo.skillSkip': 'Target exists, skipped: {path}',
    'repo.selectProject': 'Select a local git project…',
    'repo.selectPlugin': 'Select a plugin package…',
    'repo.generateCommand': 'Generate command',
    'repo.cancel': 'Cancel',
    'repo.pluginRequired': 'Select a plugin package first',
    'repo.division.local': 'Local',
    'repo.division.plugins': 'Plugins',
    'repo.division.projects': 'Projects',
    'service.trigger.aria': 'Local services',
    'service.trigger.label': 'Services',
    'service.panel.title': 'Local Services',
    'service.hint': 'Config lives in _governance/services.json (written directly by the panel); services stop with dsh by default, enable "Independent" per service to keep them alive.',
    'service.readError': 'Read failed: {message}',
    'service.opError': 'Operation failed: {message}',
    'service.empty': 'No services registered yet',
    'service.emptyHint': 'Click "Register service" on a project card in the Local Repositories panel to register it, then configure commands here.',
    'service.enabled': 'Service manager master switch',
    'service.enabled.title': 'When off, no service can be started',
    'service.confirmStart': 'Confirm before start',
    'service.confirmStart.title': 'Ask for confirmation on every start (default on)',
    'service.start': 'Start',
    'service.stop': 'Stop',
    'service.open': 'Manage Page',
    'service.running': 'Running',
    'service.stopped': 'Stopped',
    'service.portUp': 'Port up',
    'service.pid': 'PID {pid}',
    'service.add': 'Add service',
    'service.remove': 'Unregister',
    'service.remove.confirm': 'Unregister the services of this project? All its services will be stopped first.',
    'service.edit': 'Edit',
    'service.save': 'Save',
    'service.saving': 'Saving…',
    'service.cancel': 'Cancel',
    'service.deleteService': 'Delete service',
    'service.deleteService.confirm': 'Delete this service config?',
    'service.name': 'Name',
    'service.cwd': 'Working dir',
    'service.command': 'Start command',
    'service.command.placeholder': 'e.g. python main.py or npm run start',
    'service.args': 'Arguments',
    'service.args.placeholder': 'space-separated; quotes supported, e.g. --name "hello world" (optional)',
    'service.env': 'Environment',
    'service.env.placeholder': 'KEY=value, one per line (optional)',
    'service.port': 'Service port (API/TCP) — probe only, does not change the listen port',
    'service.port.placeholder': 'optional 1-65535, used for liveness probe',
    'service.autoStart': 'Auto start',
    'service.autoStart.title': 'Start automatically when dsh starts',
    'service.autoRestart': 'Crash restart',
    'service.autoRestart.title': 'Restart automatically after abnormal exit (max 5 per 5 min)',
    'service.detached': 'Independent',
    'service.detached.title': 'Process runs independently of dsh: not stopped on dsh shutdown/restart; re-adopted on restart (identity: command line + port match); silent start without a console window, logs written straight to a file (.cmd/.bat commands are rewritten to node; shell operators are not supported in independent mode)',
    'service.startAll': 'Start all',
    'service.stopAll': 'Stop all',
    'service.stopAllConfirm': 'Stop all services of this project?',
    'service.startAllDone': 'Batch start: {ok} ok, {fail} failed',
    'service.stopAllDone': 'Stopped {count} services',
    'service.starting': 'Starting…',
    'service.stopping': 'Stopping…',
    'service.configError': 'Config file corrupted, write blocked: {message}',
    'service.configTitle': 'Edit service · {name}',
    'service.addTitle': 'Add service · {project}',
    'service.noCommand': 'No start command configured',
    'service.registered': 'Registered',
    'service.register': 'Register service',
    'service.badge.registered': 'Registered',
    'service.badge.register': 'Register service',
    'service.saved': 'Config saved',
    'service.startFailed': 'Start failed: {message}',
    'service.started': 'Started',
    'service.stoppedDone': 'Stopped',
    'service.removed': 'Unregistered',
    'service.registeredDone': 'Registered; configure it in the Local Services panel',
    'service.stopConfirm': 'Stop service {name}?',
    'service.startConfirm': 'Start service {name}?',
    'service.nameRequired': 'Enter a service name',
    'service.cwdRequired': 'Enter a working directory',
    'service.commandRequired': 'Enter a start command',
    'service.portInvalid': 'Port must be an integer between 1 and 65535',
    'service.restart': 'Restart',
    'service.restarting': 'Restarting…',
    'service.restarted': 'Restarted',
    'service.restartFailed': 'Restart failed: {message}',
    'service.logs': 'Logs',
    'service.logs.title': 'Service logs · {name}',
    'service.logs.empty': 'No log output yet',
    'service.logs.readError': 'Failed to read logs: {message}',
    'service.logs.autoRefresh': 'Auto-refresh every 3s',
    'service.uptime': 'Up {time}',
    'service.lastExitBadge': 'Last abnormal exit code={code}',
    'service.lastExitBadgeSignal': 'Last terminated by signal',
    'service.logs.pause': 'Pause',
    'service.logs.resume': 'Resume',
    'service.logs.clear': 'Clear',
    'service.logs.clearConfirm': 'Clear this service log?',
    'service.logs.cleared': 'Log cleared',
    'service.logs.download': 'Download',
    'service.logs.loadMore': 'Load more',
    'service.logs.loadingMore': 'Loading…',
    'service.logs.search': 'Search logs',
    'service.logs.searchCount': '{count} matching lines',
    'service.starting': 'Starting',
    'service.healthUp': 'Health up',
    'service.healthDown': 'Health down',
    'service.healthUrl': 'Health URL',
    'service.healthUrl.placeholder': 'optional, e.g. /health or http://127.0.0.1:8787/health',
    'service.manageUrl': 'Manage page URL',
    'service.manageUrl.placeholder': 'optional, e.g. http://127.0.0.1:8787 or http://127.0.0.1:8787/admin (empty falls back to http://127.0.0.1:port)',
    'service.envFile': 'envFile',
    'service.envFile.placeholder': 'optional, relative to cwd, e.g. .env',
    'service.startTimeoutMs': 'Start timeout (ms)',
    'service.startTimeoutMs.placeholder': 'default 30000 (30s)',
    'service.templates': 'Templates',
    'service.templateNode': 'Node',
    'service.templatePython': 'Python',
    'service.templateNpm': 'npm',
    'service.aiFill': 'AI fill',
    'service.aiFilling': 'AI generating…',
    'service.aiFillFailed': 'AI draft failed: {message}',
    'service.aiDiagTitle': 'AI diagnosis',
    'service.aiDiagRunning': 'AI diagnosing…',
    'service.aiDiagFailed': 'AI diagnosis failed: {message}',
    'service.logs.aiSummary': 'AI summary',
    'service.logs.aiSummaryRunning': 'Generating summary…',
    'service.logs.aiSummaryFailed': 'AI summary failed: {message}',
    'service.aiSettingsTitle': 'AI service assistant',
    'service.aiSettingsEnabled': 'Enable AI features (failure diagnosis / log summary / config draft)',
    'service.aiSettingsProvider': 'Provider',
    'service.aiSettingsModel': 'Model',
    'service.aiSettingsEffort': 'Reasoning effort',
    'service.aiSettingsSave': 'Save AI settings',
    'service.aiSettingsSaved': 'AI settings saved',
    'service.aiSettingsClearCache': 'Clear cache',
    'service.aiSettingsClearCacheConfirm': 'Clear the AI explanation cache? All entries will be regenerated',
    'service.aiSettingsClearCacheDone': 'Cleared {count} AI explanation cache entries',
    'service.aiSettingsClearCacheFailed': 'Clear failed: {message}',
    'service.logs.detachedHint': 'Log written directly by the service process (independent mode); no panel timestamps or out/err markers',
    'service.note': 'Note',
    'service.note.placeholder': 'What this service does (e.g. Grok register web UI)',
    'service.search.placeholder': 'Search projects / service name / note / command…',
    'service.search.empty': 'No matching projects',
    'service.more': 'More actions',
    'service.startAllGlobal': 'Start all',
    'service.stopAllGlobal': 'Stop all',
    'service.unconfigured': 'Unconfigured projects ({count})',
    'service.aiConfig': 'AI configure',
    'service.aiConfigDone': 'Config instruction written to the input box; send it and the agent will use the service-config skill',
    'service.aiConfigFailed': 'Failed to write to input: {message}',
    'service.portConflictWarnings': 'Config warning: {message}',
    'service.envSensitiveHint': 'sensitive vars',
    'service.startTimeoutExceeded': 'Start timed out (process alive but port/health not ready)',
    'service.external': 'External running',
    'service.external.title': 'Port {port} is being listened by an unmanaged process (PID {pid}), likely started from the command line. The panel does not manage it (no stop/restart/logs). To manage it here, stop the process manually first, then start from the panel.',
    'service.external.proc': 'External running · {name} (PID {pid})',
    'service.external.related': 'Looks like this service started externally',
    'service.external.unrelated': 'Probably another program',
    'service.external.unknown': 'Cannot identify the process',
    'service.external.detail': 'View process',
    'service.external.modal.title': 'External process details',
    'service.external.modal.pid': 'PID',
    'service.external.modal.name': 'Process name',
    'service.external.modal.cmdline': 'Command line',
    'service.external.modal.basis': 'Basis',
    'service.external.modal.basisRelated': 'Command line contains this service\'s working directory or start command — likely this service started externally',
    'service.external.modal.basisUnrelated': 'Command line does not match this service config — probably another program',
    'service.external.modal.basisUnknown': 'Could not read the occupying process command line — cannot confirm',
    'service.external.modal.port': 'Port',
    'service.external.modal.close': 'Close',
    'service.external.modal.empty': '(unavailable)',
    'service.external.kill': 'Kill process',
    'service.external.killConfirmTitle': 'Kill external process?',
    'service.external.killConfirmBody': 'This will kill process {name} (PID {pid}) currently holding port {port}. It was started from the command line and is not managed by the panel; after killing, start it from the panel to bring it under management.',
    'service.external.killConfirmWarn': 'Caution: this process does not match this service config — it may be another program. Make sure before continuing.',
    'service.external.killing': 'Killing…',
    'service.external.killed': 'Killed process {name} (PID {pid})',
    'service.external.alreadyFree': 'Port is already free, nothing to kill',
    'service.external.killFailed': 'Failed to kill process: {message}',
  }

  // ---- 与宿主半边的通信面（静态版：同源 fetch 替换 host.call）----

  function rpc(method, args) {
    let body
    try {
      body = JSON.stringify({ method: method, args: args })
    } catch (error) {
      return Promise.reject(error)
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    const timer = controller !== null ? window.setTimeout(function () { controller.abort() }, 120000) : null
    return fetch('/api/dsh-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      signal: controller !== null ? controller.signal : undefined,
    }).then(function (res) { return res.json() }).finally(function () { if (timer !== null) window.clearTimeout(timer) })
  }

  // apply() 里注入 workspaces 服务引用（面板组件通过模块级 port 调用，
  // 与动态版的闭包 port 保持同一结构）。
  let workspacesService
  let conversationService
  let sessionsService

  // 把指令写入当前会话输入框（面板不执行 git/账本写操作，只生成指令）。
  function writeDraft(currentId, text) {
    if (!currentId) return { ok: false, error: '未找到当前会话' }
    if (conversationService === undefined || sessionsService === undefined || conversationService.input === undefined || typeof conversationService.input.for !== 'function' || typeof sessionsService.scope !== 'function') {
      return { ok: false, error: '会话输入服务不可用' }
    }
    try {
      const actx = sessionsService.scope(currentId)
      conversationService.input.for(actx).actions.setDraft(String(text))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  // 0.31.0：写入草稿后聚焦宿主会话输入框（尽力而为；DOM 标识 data-composer-seat
  // 为宿主稳定属性，失败静默不影响主流程）。
  function focusComposer() {
    try {
      const el = document.querySelector('[data-composer-seat] textarea')
      if (el !== null && typeof el.focus === 'function') el.focus()
    } catch (error) { /* 尽力而为 */ }
  }

  const port = {
    catalog: function (args) { return rpc('catalog', args) },
    config: function (args) { return rpc('config', args) },
    save: function (args) { return rpc('save', args) },
    toggleInvocation: function (args) { return rpc('setInvocation', args) },
    deleteSkill: function (args) { return rpc('trash', args) },
    trashList: function () { return rpc('trashList', {}) },
    trashRestore: function (args) { return rpc('trashRestore', args) },
    trashDelete: function (args) { return rpc('trashDelete', args) },
    notesGet: function () { return rpc('notesGet', {}) },
    notesSave: function (args) { return rpc('notesSave', args) },
    patchScan: function () { return rpc('patchScan', {}) },
    patchEnable: function (args) { return rpc('patchEnable', args) },
    patchDisable: function (args) { return rpc('patchDisable', args) },
    patchDelete: function (args) { return rpc('patchDelete', args) },
    patchImport: function (args) { return rpc('patchImport', args) },
    patchCategoryAdd: function (args) { return rpc('patchCategoryAdd', args) },
    patchCategoryRename: function (args) { return rpc('patchCategoryRename', args) },
    patchCategoryDelete: function (args) { return rpc('patchCategoryDelete', args) },
    patchSettingsGet: function () { return rpc('patchSettingsGet', {}) },
    patchSettingsSet: function (args) { return rpc('patchSettingsSet', args) },
    repoSettingsGet: function () { return rpc('repoSettingsGet', {}) },
    repoSettingsSet: function (args) { return rpc('repoSettingsSet', args) },
    repoScan: function (args) { return rpc('repoScan', args || {}) },
    repoGitStates: function (args) { return rpc('repoGitStates', args) },
    repoFetch: function (args) { return rpc('repoFetch', args) },
    repoDetail: function (args) { return rpc('repoDetail', args) },
    skillDetail: function (args) { return rpc('skillDetail', args) },
    skillObserveGet: function (args) { return rpc('skillObserveGet', args) },
    skillObserveSet: function (args) { return rpc('skillObserveSet', args) },
    skillObserveList: function () { return rpc('skillObserveList', {}) },
    aiExplainWarmup: function () { return rpc('aiExplainWarmup', {}) },
    aiExplainRequest: function (args) { return rpc('aiExplainRequest', args) },
    aiExplainStatus: function (args) { return rpc('aiExplainStatus', args) },
    aiExplainClearCache: function () { return rpc('aiExplainClearCache', {}) },
    aiProvidersList: function () { return rpc('aiProvidersList', {}) },
    repoSetVisibility: function (args) { return rpc('repoSetVisibility', args) },
    repoDeleteSkill: function (args) { return rpc('repoDeleteSkill', args) },
    repoListDirs: function (args) { return rpc('repoListDirs', args) },
    repoCreateDir: function (args) { return rpc('repoCreateDir', args) },
    repoGetProxy: function () { return rpc('repoGetProxy', {}) },
    repoScanPluginPackages: function (args) { return rpc('repoScanPluginPackages', args) },
    repoCopySkillToGlobal: function (args) { return rpc('repoCopySkillToGlobal', args) },
    repoCopySkillToProject: function (args) { return rpc('repoCopySkillToProject', args) },
    serviceSettingsGet: function () { return rpc('serviceSettingsGet', {}) },
    serviceSettingsSet: function (args) { return rpc('serviceSettingsSet', args) },
    serviceScan: function () { return rpc('serviceScan', {}) },
    serviceRegister: function (args) { return rpc('serviceRegister', args) },
    serviceConfigSet: function (args) { return rpc('serviceConfigSet', args) },
    serviceUnregister: function (args) { return rpc('serviceUnregister', args) },
    serviceStart: function (args) { return rpc('serviceStart', args) },
    serviceStop: function (args) { return rpc('serviceStop', args) },
    serviceRestart: function (args) { return rpc('serviceRestart', args) },
    serviceStartAll: function (args) { return rpc('serviceStartAll', args) },
    serviceStopAll: function (args) { return rpc('serviceStopAll', args) },
    serviceLogGet: function (args) { return rpc('serviceLogGet', args) },
    serviceLogClear: function (args) { return rpc('serviceLogClear', args) },
    serviceExternalKill: function (args) { return rpc('serviceExternalKill', args) },
    serviceAiDiagnose: function (args) { return rpc('serviceAiDiagnose', args) },
    serviceLogAi: function (args) { return rpc('serviceLogAi', args) },
    serviceAiDraft: function (args) { return rpc('serviceAiDraft', args) },
    openPath: async function (path) {
      if (workspacesService === undefined || typeof workspacesService.openPath !== 'function') return { error: 'workspaces 服务不可用' }
      try { await workspacesService.openPath(path); return { ok: true } } catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
    },
  }

  const EDITABLE_SOURCES = ['user-dsh', 'project-dsh', 'project-agents', 'user-agents']

  function aiOptionLabel(name, id) {
    const n = typeof name === 'string' && name.length > 0 ? name : String(id)
    if (n === String(id)) return n
    const norm = function (s) { return String(s).toLowerCase().replace(/[\s_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') }
    if (norm(n) === norm(id)) return n
    if (String(n).toLowerCase().indexOf(String(id).toLowerCase()) !== -1) return n
    return n + '（' + id + '）'
  }

  const GROUP_DEFS = [
    { key: 'global', titleKey: 'group.global', hintKey: 'group.global.hint', sources: ['user-dsh'] },
    { key: 'project', titleKey: 'group.project', hintKey: 'group.project.hint', sources: ['project-dsh', 'project-agents'] },
    { key: 'plugin', titleKey: 'group.plugin', hintKey: 'group.plugin.hint', sources: ['custom'] },
    { key: 'preset', titleKey: 'group.preset', hintKey: 'group.preset.hint', sources: ['user-agents', 'custom'] },
    { key: 'builtin', titleKey: 'group.builtin', hintKey: 'group.builtin.hint', sources: ['bundled', 'runtime'] },
  ]
  function groupKeyOf(source) { for (const g of GROUP_DEFS) if (g.sources.indexOf(source) !== -1) return g.key; return 'builtin' }
  // 分组键需要 source + scopeId 组合：custom 在全局作用域 = 插件，在预设作用域 = 预设。
  function groupKeyOfSkill(skill) {
    const source = String(skill.source)
    const scopeId = skill.scopeId === undefined || skill.scopeId === null ? 'global' : String(skill.scopeId)
    if (source === 'user-dsh') return 'global'
    if (source === 'project-dsh' || source === 'project-agents') return 'project'
    if (source === 'user-agents') return 'preset'
    if (source === 'custom') return scopeId === 'global' ? 'plugin' : 'preset'
    return 'builtin'
  }
  function scopeText(skill, t) {
    const label = skill.scopeLabel === undefined || skill.scopeLabel === null ? 'global' : String(skill.scopeLabel)
    const source = String(skill.source)
    if (source === 'custom' && label === 'global') {
      const p = skill.provider === undefined || skill.provider === null ? '' : String(skill.provider)
      if (p.length > 0 && p !== 'runtime') return t('scope.pluginName', { name: p })
      return t('scope.plugin')
    }
    if (label === 'global') return t('scope.global')
    if (label === 'project') return t('scope.project')
    return t('scope.preset', { name: label })
  }

  // ---- 图标 ----

  function SkillGlyph(props) {
    const size = props === undefined || props.size === undefined ? 16 : props.size
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: 'M8 2.3 9.8 6l4.1.6-3 2.9.7 4.1L8 11.9l-3.6 1.7.7-4.1-3-2.9L6.2 6 8 2.3z' }))
  }
  function RefreshGlyph() {
    return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', 'aria-hidden': true },
      h('path', { d: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9' }), h('path', { d: 'M13.4 2.3v2.9h-2.9' }))
  }
  function CloseGlyph() {
    return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', 'aria-hidden': true },
      h('path', { d: 'M4 4l8 8M12 4l-8 8' }))
  }
  function GearGlyph(props) {
    const size = props === undefined || props.size === undefined ? 12 : props.size
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
      h('circle', { cx: 8, cy: 8, r: 2.6 }),
      h('path', { d: 'M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5' }))
  }
  function TrashGlyph(props) {
    const size = props === undefined || props.size === undefined ? 11 : props.size
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: 'M2.5 4.5h11M6.5 4.5V3h3v1.5M4 4.5l.6 8.2a1.2 1.2 0 0 0 1.2 1.1h4.4a1.2 1.2 0 0 0 1.2-1.1l.6-8.2M6.7 7v4M9.3 7v4' }))
  }
  function LockGlyph(props) {
    const size = props === undefined || props.size === undefined ? 11 : props.size
    const locked = props.locked === true
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      locked ? h('path', { d: 'M5 7V4.8A3 3 0 0 1 11 4.8V7M4 7h8v6H4z' }) : h('path', { d: 'M5 7V4.8A3 3 0 0 1 11 4.8V7M6.5 10h3' }), h('rect', { x: 4, y: 7, width: 8, height: 6, rx: 1 }))
  }
  function NoteGlyph(props) {
    const size = props === undefined || props.size === undefined ? 11 : props.size
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: 'M3 2.5h7l3 3V13.5H3z' }), h('path', { d: 'M10 2.5V5.5h3M5.5 8h5M5.5 10.5h5' }))
  }

  function createStore(initial) {
    let snapshot = initial
    const listeners = new Set()
    return {
      getSnapshot: function () { return snapshot },
      set: function (next) { snapshot = next; for (const l of Array.from(listeners)) l() },
      subscribe: function (l) { listeners.add(l); return function () { listeners.delete(l) } },
    }
  }

  const openStore = createStore(false)
  const focusCtl = { pending: false }
  function focusSearchIfPending(el) { if (el === null) return; if (focusCtl.pending !== true) return; focusCtl.pending = false; el.focus() }

  // ---- 补丁管理器（0.6.0）：独立面板 + 丢失角标 ----
  const patchOpenStore = createStore(false)
  const patchLostStore = createStore(false)
  let patchBadgeTimer = null

  // ---- 本地仓库面板（0.10.0）：多根目录 ----
  const repoOpenStore = createStore(false)
  const repoPreload = createStore(null)
  // Skills 面板秒显缓存（0.35.4）：按 (sessionId, cwd) 缓存上次 catalog 快照——
  // 面板重开先秒显旧数据再后台刷新（组件卸载导致 catalog state 丢失，重开白屏等 50-150ms）；
  // 会话/工作目录变化时 key 不匹配自动失效；reloadTick 刷新仍强制重拉。
  // 0.35.5：持久化到 sessionStorage（标签页级）——页面/标签页重载后 apply 重建，
  // 内存态缓存丢失导致秒显失效（实测重开变空白 1-3s），持久化后刷新仍可秒显；
  // 读写均 try/catch 防存储不可用（隐私模式/iframe 限制）。key 含 v1 版本号防结构漂移。
  const SKILL_CATALOG_CACHE_KEY = 'dsh-manager:skillCatalogCache:v1'
  const skillCatalogCache = (function () {
    try {
      if (typeof window !== 'undefined' && typeof window.sessionStorage === 'object') {
        const raw = window.sessionStorage.getItem(SKILL_CATALOG_CACHE_KEY)
        if (raw !== null) {
          const parsed = JSON.parse(raw)
          if (parsed !== null && typeof parsed === 'object' && typeof parsed.key === 'string' && parsed.data !== null && typeof parsed.data === 'object') return { key: parsed.key, data: parsed.data }
        }
      }
    } catch (error) {}
    return { key: null, data: null }
  })()
  // 详情缓存：同会话内按 path 缓存 repoDetail 结果（0.15.0 提速，45s TTL）
  const repoDetailCache = new Map()

  function findLocalDocEntryClient(doc, hash) {
    if (doc === null || doc === undefined || doc.exists !== true || !Array.isArray(doc.entries)) return null
    const short = hash.slice(0, 7)
    for (const entry of doc.entries) {
      if (entry.hash === hash || entry.hash === short || short.indexOf(entry.hash) === 0 || entry.hash.indexOf(short) === 0) return entry
    }
    return null
  }

  // ---- 本地服务面板（0.12.0）：独立面板 + 侧边栏按钮 ----
  const serviceOpenStore = createStore(false)
  // 服务面板变更注册状态后，通知本地仓库面板重扫（避免两面板数据不一致）
  const repoInvalidateStore = createStore(0)

  function patchRepoRegistered(path, registered) {
    repoDetailCache.delete(path)
    const pre = repoPreload.getSnapshot()
    if (pre === null || pre === undefined || pre.data === null || pre.data === undefined || !Array.isArray(pre.data.projects)) return
    const projects = pre.data.projects.map(function (p) {
      if (p.path !== path) return p
      return Object.assign({}, p, { registered: registered })
    })
    const mirrors = Array.isArray(pre.data.mirrors) ? pre.data.mirrors.map(function (p) {
      if (p.path !== path) return p
      return Object.assign({}, p, { registered: registered })
    }) : pre.data.mirrors
    const data = Object.assign({}, pre.data, { projects: projects, mirrors: mirrors })
    repoPreload.set(Object.assign({}, pre, { data: data }))
  }

  // 页面加载即预取仓库数据（内存态，便于面板秒开；不做磁盘缓存）
  function prefetchRepo() {
    port.repoScan().then(function (result) {
      if (result === null || typeof result !== 'object' || typeof result.error === 'string') return
      const payload = { data: result, states: {} }
      // 0.15.0：浏览器启动预热——repoScan 完成后，宿主后台批量生成缺失的 AI 讲解
      port.aiExplainWarmup().catch(function () {})
      // 0.15.1：同时预热 repoDetail 缓存，重进面板后首张卡片也能秒开
      prefetchRepoDetails(result.projects, result.mirrors)
      const paths = (result.projects || []).map(function (p) { return p.path })
      if (paths.length === 0) { repoPreload.set(payload); return }
      port.repoGitStates({ paths: paths }).then(function (gres) {
        if (gres !== null && typeof gres === 'object' && gres.states !== null && typeof gres.states === 'object') payload.states = gres.states
        repoPreload.set(payload)
      }).catch(function () { repoPreload.set(payload) })
    }).catch(function () {})
  }

  // 后台预热 repoDetail 缓存：限并发 3，失败跳过（0.15.1）
  function prefetchRepoDetails(projects, mirrors) {
    const repos = (Array.isArray(projects) ? projects : []).concat(Array.isArray(mirrors) ? mirrors : [])
    if (repos.length === 0) return
    let cursor = 0
    let active = 0
    const CONCURRENCY = 3
    const tick = function () {
      while (active < CONCURRENCY && cursor < repos.length) {
        const repo = repos[cursor]
        cursor += 1
        const path = repo !== null && repo !== undefined ? repo.path : ''
        if (typeof path !== 'string' || path.length === 0) continue
        if (repoDetailCache.has(path)) continue
        active += 1
        port.repoDetail({ path: path }).then(function (res) {
          if (res !== null && typeof res === 'object' && typeof res.error !== 'string') {
            repoDetailCache.set(path, { ts: Date.now(), data: res })
          }
        }).catch(function () {}).then(function () {
          active -= 1
          tick()
        })
      }
    }
    tick()
  }

  function useStore(store) {
    const [v, setV] = React.useState(function () { return store.getSnapshot() })
    React.useEffect(function () { return store.subscribe(function () { setV(store.getSnapshot()) }) }, [store])
    return v
  }

  function Trigger(props) {
    const wide = props.wide; const t = props.t; const open = useStore(openStore)
    return h('button', {
      type: 'button',
      className: wide === true ? 'skm-trigger' : 'skm-trigger skm-trigger-rail',
      'aria-label': t('trigger.aria'), title: t('trigger.aria'), 'aria-haspopup': 'dialog', 'aria-expanded': open,
      onClick: function () { const next = openStore.getSnapshot() !== true; if (next) focusCtl.pending = true; openStore.set(next) },
    }, h(SkillGlyph, { size: wide === true ? 16 : 18 }), wide === true ? h('span', { className: 'skm-trigger-label' }, t('trigger.label')) : null)
  }

  function PatchTrigger(props) {
    const t = props.t; const open = useStore(patchOpenStore); const lost = useStore(patchLostStore)
    return h('button', {
      type: 'button',
      className: 'skm-trigger',
      'aria-label': t('patch.trigger.aria'), title: t('patch.trigger.aria'), 'aria-haspopup': 'dialog', 'aria-expanded': open,
      onClick: function () { patchOpenStore.set(patchOpenStore.getSnapshot() !== true) },
    }, h(GearGlyph, { size: 16 }), h('span', { className: 'skm-trigger-label' }, t('patch.trigger.label')), lost === true ? h('span', { className: 'skm-patch-badge', title: t('patch.lostBadge') }) : null)
  }

  function FolderGlyph(props) {
    const size = props === undefined || props.size === undefined ? 16 : props.size
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: 'M1.8 3.2h4l1.4 1.8h7v7.8a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1z' }))
  }

  function RepoTrigger(props) {
    const t = props.t; const open = useStore(repoOpenStore)
    return h('button', {
      type: 'button',
      className: 'skm-trigger',
      'aria-label': t('repo.trigger.aria'), title: t('repo.trigger.aria'), 'aria-haspopup': 'dialog', 'aria-expanded': open,
      onClick: function () { repoOpenStore.set(repoOpenStore.getSnapshot() !== true) },
    }, h(FolderGlyph, { size: 16 }), h('span', { className: 'skm-trigger-label' }, t('repo.trigger.label')))
  }

  function ServiceGlyph(props) {
    const size = props === undefined || props.size === undefined ? 16 : props.size
    return h('svg', { viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('path', { d: 'M4 4.5h8M4 8h8M4 11.5h8' }),
      h('circle', { cx: 2.2, cy: 4.5, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: 2.2, cy: 8, r: 1.1, fill: 'currentColor', stroke: 'none' }),
      h('circle', { cx: 2.2, cy: 11.5, r: 1.1, fill: 'currentColor', stroke: 'none' }))
  }

  function ServiceTrigger(props) {
    const t = props.t; const open = useStore(serviceOpenStore)
    return h('button', {
      type: 'button',
      className: 'skm-trigger',
      'aria-label': t('service.trigger.aria'), title: t('service.trigger.aria'), 'aria-haspopup': 'dialog', 'aria-expanded': open,
      onClick: function () { serviceOpenStore.set(serviceOpenStore.getSnapshot() !== true) },
    }, h(ServiceGlyph, { size: 16 }), h('span', { className: 'skm-trigger-label' }, t('service.trigger.label')))
  }

  function InvSwitch(props) {
    const on = props.on === true; const variant = props.variant === 'user' ? 'user' : 'agent'; const disabled = props.disabled === true
    const cls = 'skm-sw' + (on ? (variant === 'user' ? ' skm-sw-user-on' : ' skm-sw-on') : '') + (disabled ? ' skm-sw-dis' : '')
    return h('button', { type: 'button', role: 'switch', 'aria-checked': on, disabled: disabled, className: cls, title: props.title, 'aria-label': props.title, onClick: function () { if (props.onChange) props.onChange() } }, h('span', { className: 'skm-sw-thumb', 'aria-hidden': true }))
  }

  function SkillCard(props) {
    const t = props.t; const skill = props.skill; const name = String(skill.name)
    const description = skill.description === undefined || skill.description === null || skill.description === '' ? t('card.noDescription') : String(skill.description)
    const modelOn = skill.modelInvocable === true; const userOn = skill.userInvocable === true
    const crossScope = props.crossScope === true; const sourceReadOnly = props.readOnly === true; const readOnly = sourceReadOnly || crossScope; const busy = props.busy === true
    const observeOn = props.observeOn === true
    // 观察开关：preview（未挂载预设的静态预览）不可观察；只读来源（含插件技能）也可观察
    const observeDisabled = props.skill.preview === true || props.observeBusy === true || busy
    const showLock = !crossScope && sourceReadOnly && props.skill.preview !== true
    const [locked, setLocked] = React.useState(showLock)
    const togglesDisabled = crossScope || locked || busy
    const deleteDisabled = sourceReadOnly || crossScope || busy
    const disabledSw = readOnly || busy
    const note = props.note
    const noteTitleProp = note !== undefined && note !== null ? String(note.title || '') : ''
    const noteContentProp = note !== undefined && note !== null ? String(note.content || '') : ''
    const [confirming, setConfirming] = React.useState(false)
    const [confirmTimer, setConfirmTimer] = React.useState(null)
    // 标题与内容都是“常驻编辑”状态：失焦即提交（值变化才保存）
    const [noteTitle, setNoteTitle] = React.useState(noteTitleProp)
    const [noteContent, setNoteContent] = React.useState(noteContentProp)

    React.useEffect(function () {
      setNoteTitle(noteTitleProp)
      setNoteContent(noteContentProp)
    }, [noteTitleProp, noteContentProp])

    const commitNote = function () {
      if (noteTitle === noteTitleProp && noteContent === noteContentProp) return
      props.onSaveNote({ title: noteTitle, content: noteContent })
    }

    const requestDelete = function () {
      if (readOnly) return
      if (confirming) {
        if (confirmTimer !== null) window.clearTimeout(confirmTimer)
        setConfirming(false); setConfirmTimer(null)
        props.onDelete()
      } else {
        setConfirming(true)
        setConfirmTimer(window.setTimeout(function () { setConfirming(false); setConfirmTimer(null) }, 4000))
      }
    }

    return h('article', { className: 'skm-card' },
      h('div', { className: 'skm-card-top' },
        h('div', { className: 'skm-card-head' },
          h('span', { className: 'skm-card-icon ' + props.accentClass, 'aria-hidden': true }, name.charAt(0).toUpperCase()),
          h('span', { className: 'skm-card-name', title: name }, name),
          h('span', { className: 'skm-card-scope', title: props.skill.preview === true ? t('card.preview') : (crossScope ? t('card.crossScope') : scopeText(props.skill, t)) }, scopeText(props.skill, t)),
          h('button', { type: 'button', className: 'skm-card-gear', 'aria-label': t('card.config'), title: t('card.config'), onClick: function () { props.onConfig(skill) } }, h(GearGlyph, { size: 11 })),
          h('button', {
            type: 'button',
            className: confirming ? 'skm-card-del skm-card-del-confirm' : 'skm-card-del',
            'aria-label': readOnly ? t('card.delete.disabled') : t('card.delete'),
            title: readOnly ? t('card.delete.disabled') : t('card.delete.title'),
            disabled: deleteDisabled,
            onClick: requestDelete,
          }, confirming ? t('card.delete.confirm') : h(TrashGlyph, null))),
        h('p', { className: 'skm-card-desc', title: description }, description),
        h('hr', { className: 'skm-card-divider' }),
        h('div', { className: 'skm-card-foot' },
          h('input', {
            type: 'text',
            className: 'skm-notes-title-input',
            placeholder: t('notes.title.placeholder'),
            title: t('notes.title.placeholder'),
            value: noteTitle,
            onChange: function (event) { setNoteTitle(event.target.value) },
            onBlur: commitNote,
            onKeyDown: function (event) { if (event.key === 'Enter') event.target.blur() },
          }),
          h('div', { className: 'skm-inv' },
            showLock ? h('button', { type: 'button', className: 'skm-lock ' + (locked ? 'skm-lock-on' : 'skm-lock-off'), 'aria-label': locked ? t('lock.locked') : t('lock.unlocked'), title: locked ? t('lock.locked') : t('lock.unlocked'), onClick: function () { setLocked(function (v) { return !v }) } }, h(LockGlyph, { locked: locked })) : null,
            h('span', { className: 'skm-swlabel', title: modelOn ? t('card.agent.on') : t('card.agent.off') }, 'Agent'),
            h(InvSwitch, { on: modelOn, variant: 'agent', disabled: togglesDisabled, title: crossScope ? t('config.readonly') : (locked ? t('lock.locked') : (modelOn ? t('card.agent.on') : t('card.agent.off'))), onChange: function () { props.onToggle('agent') } }),
            h('span', { className: 'skm-swlabel', title: userOn ? t('card.user.on') : t('card.user.off') }, t('card.user')),
            h(InvSwitch, { on: userOn, variant: 'user', disabled: togglesDisabled, title: crossScope ? t('config.readonly') : (locked ? t('lock.locked') : (userOn ? t('card.user.on') : t('card.user.off'))), onChange: function () { props.onToggle('user') } }),
            h('span', { className: 'skm-swlabel', title: observeOn ? t('card.observe.on') : t('card.observe.off') }, t('card.observe')),
            h(InvSwitch, { on: observeOn, variant: 'agent', disabled: observeDisabled, title: observeDisabled ? t('config.readonly') : (observeOn ? t('card.observe.on') : t('card.observe.off')), onChange: function () { props.onObserveToggle(!observeOn) } })))),
      h('hr', { className: 'skm-card-split' }),
      h('div', { className: 'skm-notes-view' },
        h('textarea', {
          className: 'skm-notes-area',
          rows: 2,
          placeholder: t('notes.content.placeholder'),
          value: noteContent,
          spellCheck: false,
          onChange: function (event) {
            // 最多两个逻辑行：覆盖 Enter、粘贴多行、程序写入等所有入口
            const raw = event.target.value
            const lines = raw.split(/\r?\n/)
            const limited = lines.length > 2 ? lines.slice(0, 2).join('\n') : raw
            if (limited !== raw) event.target.value = limited
            setNoteContent(limited)
          },
          onBlur: commitNote,
        })))
  }

  function TrashCard(props) {
    const t = props.t; const item = props.item; const busy = props.busy === true
    const noteTitle = typeof props.noteTitle === 'string' ? props.noteTitle.trim() : ''
    const [confirming, setConfirming] = React.useState(false)
    const [confirmTimer, setConfirmTimer] = React.useState(null)
    const requestDelete = function () {
      if (confirming) {
        if (confirmTimer !== null) window.clearTimeout(confirmTimer)
        setConfirming(false); setConfirmTimer(null)
        props.onDelete()
      } else {
        setConfirming(true)
        setConfirmTimer(window.setTimeout(function () { setConfirming(false); setConfirmTimer(null) }, 4000))
      }
    }
    return h('article', { className: 'skm-trash-card' },
      h('div', { className: 'skm-trash-head' },
        h('span', { className: 'skm-trash-name', title: String(item.name) }, String(item.name)),
        noteTitle.length > 0 ? h('span', { className: 'skm-trash-meta', title: noteTitle }, noteTitle) : null),
      h('div', { className: 'skm-trash-actions' },
        h('div', { className: 'skm-cfg-spacer' }),
        h('button', { type: 'button', className: 'skm-btn', title: t('trash.open.title'), onClick: props.onOpen }, t('trash.config')),
        h('button', { type: 'button', className: 'skm-btn', disabled: busy, onClick: props.onRestore }, t('trash.restore')),
        h('button', {
          type: 'button',
          className: confirming ? 'skm-btn skm-trash-del skm-trash-del-confirm' : 'skm-btn skm-trash-del',
          disabled: busy,
          title: t('trash.delete.title'),
          onClick: requestDelete,
        }, confirming ? t('trash.delete.confirm') : t('trash.delete'))))
  }

  function ConfigDialog(props) {
    const t = props.t; const name = props.name
    const [state, setState] = React.useState({ phase: 'loading', data: null, error: null, content: '', saving: false, status: null })
    React.useEffect(function () {
      let cancelled = false
      setState({ phase: 'loading', data: null, error: null, content: '', saving: false, status: null })
      port.config({ name: name, sessionId: props.sessionId === undefined ? null : props.sessionId, cwd: props.cwd === undefined ? null : props.cwd }).then(function (result) {
        if (cancelled) return
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setState({ phase: 'error', data: null, error: result.error, content: '', saving: false, status: null })
        else setState({ phase: 'ready', data: result, error: null, content: typeof result.content === 'string' ? result.content : '', saving: false, status: null })
      }).catch(function (error) { if (cancelled) return; setState({ phase: 'error', data: null, error: error instanceof Error ? error.message : String(error), content: '', saving: false, status: null }) })
      return function () { cancelled = true }
    }, [name, props.sessionId, props.cwd])

    const save = function () {
      if (state.saving) return
      setState(function (prev) { return { phase: prev.phase, data: prev.data, error: prev.error, content: prev.content, saving: true, status: null } })
      port.save({ name: name, sessionId: props.sessionId === undefined ? null : props.sessionId, cwd: props.cwd === undefined ? null : props.cwd, content: state.content }).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setState(function (prev) { return { phase: prev.phase, data: prev.data, error: prev.error, content: prev.content, saving: false, status: { kind: 'error', message: result.error } } })
        else { setState(function (prev) { return { phase: prev.phase, data: prev.data, error: prev.error, content: prev.content, saving: false, status: { kind: 'saved' } } }); if (typeof props.onSaved === 'function') props.onSaved() }
      }).catch(function (error) { setState(function (prev) { return { phase: prev.phase, data: prev.data, error: prev.error, content: prev.content, saving: false, status: { kind: 'error', message: error instanceof Error ? error.message : String(error) } } }) })
    }

    const openExternal = function () {
      if (state.phase !== 'ready' || state.data === null || state.data.path === null) return
      port.openPath(String(state.data.path)).then(function (result) { if (result !== null && typeof result === 'object' && typeof result.error === 'string') setState(function (prev) { return { phase: prev.phase, data: prev.data, error: prev.error, content: prev.content, saving: prev.saving, status: { kind: 'error', message: t('config.openFailed', { message: result.error }) } } }) })
    }

    const data = state.data; const editable = data !== null && data.editable === true; const hasPath = data !== null && data.path !== null
    const metaRows = []
    if (state.phase === 'ready' && data !== null) {
      metaRows.push(h('div', { className: 'skm-cfg-meta', key: 'meta' },
        h('span', null, t('config.source') + '：', h('code', null, String(data.source)), ' · ' + t('config.provider') + '：', h('code', null, String(data.provider))),
        hasPath ? h('span', null, t('config.file') + '：', h('code', null, String(data.path))) : null))
      let badge = null
      if (editable) badge = h('span', { className: 'skm-badge skm-badge-ok' }, t('config.editable')); else if (hasPath) badge = h('span', { className: 'skm-badge skm-badge-ro' }, t('config.readonly')); else badge = h('span', { className: 'skm-badge skm-badge-ro' }, t('config.noPath'))
      metaRows.push(badge)
    }

    return h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) props.onClose() } },
      h('section', { className: 'skm-cfg-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': t('config.title', { name: name }), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { event.stopPropagation(); props.onClose() } } },
        h('header', { className: 'skm-cfg-header' },
          h('span', { className: 'skm-cfg-title' }, t('config.title', { name: name })),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('config.close'), title: t('config.close'), onClick: function () { props.onClose() } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-cfg-body' },
          state.phase === 'loading' ? h('p', { className: 'skm-notice' }, t('panel.loading')) : null,
          state.phase === 'error' ? h('p', { className: 'skm-notice skm-notice-error' }, state.error) : null,
          state.phase === 'ready' ? metaRows : null,
          state.phase === 'ready' ? h('div', { className: 'skm-field' }, h('span', { className: 'skm-field-label' }, t('config.content.label'))) : null,
          state.phase === 'ready' ? h('textarea', { className: 'skm-cfg-textarea', spellCheck: false, readOnly: !editable, value: state.content, onChange: function (event) { setState(function (prev) { return { phase: prev.phase, data: prev.data, error: prev.error, content: event.target.value, saving: prev.saving, status: null } }) } }) : null),
        h('footer', { className: 'skm-cfg-foot' },
          state.status !== null && state.status.kind === 'saved' ? h('span', { className: 'skm-status skm-status-ok' }, t('config.saved')) : null,
          state.status !== null && state.status.kind === 'error' ? h('span', { className: 'skm-status skm-status-err' }, state.status.message) : null,
          h('div', { className: 'skm-cfg-spacer' }),
          state.phase === 'ready' && hasPath ? h('button', { type: 'button', className: 'skm-btn', onClick: openExternal }, t('config.openExternal')) : null,
          state.phase === 'ready' && editable ? h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: state.saving, onClick: save }, state.saving ? t('config.saving') : t('config.save')) : null)))
  }

  function Panel(props) {
    const t = props.t; const useSessions = props.useSessions; const useWorkspaces = props.useWorkspaces; const open = useStore(openStore)
    const currentId = useSessions(function (state) { return state.current })
    const sessionCwd = useSessions(function (state) { const cur = state.current; if (cur === undefined) return undefined; const row = state.byId[cur]; return row === undefined ? undefined : row.cwd })
    const workspaces = useWorkspaces(function (state) { return state.items })
    const [query, setQuery] = React.useState(''); const [workspaceId, setWorkspaceId] = React.useState(''); const [groupId, setGroupId] = React.useState('global')
    const [catalog, setCatalog] = React.useState({ data: null, error: null, loading: false }); const [reloadTick, setReloadTick] = React.useState(0); const [configName, setConfigName] = React.useState(null)
    const [busyName, setBusyName] = React.useState(null); const [toggleError, setToggleError] = React.useState(null); const [localInv, setLocalInv] = React.useState({})
    const [observeBusy, setObserveBusy] = React.useState(null); const [localObserve, setLocalObserve] = React.useState({})
    const [notes, setNotes] = React.useState({}); const [notesBusy, setNotesBusy] = React.useState(null)
    const [trash, setTrash] = React.useState({ items: [] }); const [trashBusy, setTrashBusy] = React.useState(null)

    const cwd = (function () { if (workspaceId !== '') { const f = workspaces.find(function (item) { return item.workspaceId === workspaceId }); if (f !== undefined) return f.path } return sessionCwd })()

    React.useEffect(function () {
      if (open !== true) return
      let cancelled = false
      // 0.35.4：同会话同 cwd 秒显上次 catalog 快照，再后台刷新拿新数据
      const cacheKey = String(currentId === undefined ? '' : currentId) + '|' + String(cwd === undefined ? '' : cwd)
      if (skillCatalogCache.key === cacheKey && skillCatalogCache.data !== null) {
        setCatalog({ data: skillCatalogCache.data, error: null, loading: false })
      } else {
        setCatalog(function (prev) { return { data: prev.data, error: null, loading: prev.data === null } })
      }
      port.catalog({ sessionId: currentId === undefined ? null : currentId, cwd: cwd === undefined ? null : cwd }).then(function (result) {
        if (cancelled) return
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setCatalog({ data: null, error: result.error, loading: false })
        else {
          setCatalog({ data: result, error: null, loading: false })
          skillCatalogCache.key = cacheKey
          skillCatalogCache.data = result
          try { if (typeof window !== 'undefined' && typeof window.sessionStorage === 'object') window.sessionStorage.setItem(SKILL_CATALOG_CACHE_KEY, JSON.stringify({ key: cacheKey, data: result })) } catch (error) {}
        }
      }).catch(function (error) { if (cancelled) return; setCatalog({ data: null, error: error instanceof Error ? error.message : String(error), loading: false }) })
      port.notesGet().then(function (result) {
        if (cancelled) return
        if (result !== null && typeof result === 'object' && result.notes !== null && typeof result.notes === 'object') setNotes(result.notes)
      }).catch(function () {})
      port.trashList().then(function (result) {
        if (cancelled) return
        if (result !== null && typeof result === 'object' && Array.isArray(result.items)) setTrash({ items: result.items })
      }).catch(function () {})
      return function () { cancelled = true }
    }, [open, currentId, cwd, reloadTick])

    const saveNote = function (skillName, note, onSaved) {
      setNotesBusy(skillName)
      port.notesSave({ name: skillName, title: note.title, content: note.content }).then(function (result) {
        setNotesBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setToggleError(t('card.saveFailed', { message: result.error })) }
        else if (result !== null && typeof result === 'object' && result.notes !== null && typeof result.notes === 'object') { setNotes(result.notes); if (typeof onSaved === 'function') onSaved() }
      }).catch(function (error) { setNotesBusy(null); setToggleError(t('card.saveFailed', { message: error instanceof Error ? error.message : String(error) })) })
    }

    const deleteSkill = function (skill) {
      const name = String(skill.name)
      setBusyName(name); setToggleError(null)
      port.deleteSkill({ name: name, sessionId: currentId === undefined ? null : currentId, cwd: cwd === undefined ? null : cwd }).then(function (result) {
        setBusyName(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setToggleError(t('card.deleteError', { message: result.error })) }
        else setReloadTick(function (tick) { return tick + 1 })
      }).catch(function (error) { setBusyName(null); setToggleError(t('card.deleteError', { message: error instanceof Error ? error.message : String(error) })) })
    }

    const restoreTrash = function (id) {
      setTrashBusy(id); setToggleError(null)
      port.trashRestore({ id: id }).then(function (result) {
        setTrashBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setToggleError(t('trash.restoreError', { message: result.error })) }
        else setReloadTick(function (tick) { return tick + 1 })
      }).catch(function (error) { setTrashBusy(null); setToggleError(t('trash.restoreError', { message: error instanceof Error ? error.message : String(error) })) })
    }

    const deleteTrash = function (id) {
      setTrashBusy(id); setToggleError(null)
      port.trashDelete({ id: id }).then(function (result) {
        setTrashBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setToggleError(t('trash.deleteError', { message: result.error })) }
        else setReloadTick(function (tick) { return tick + 1 })
      }).catch(function (error) { setTrashBusy(null); setToggleError(t('trash.deleteError', { message: error instanceof Error ? error.message : String(error) })) })
    }

    const openTrashFile = function (item) {
      const file = item !== undefined && item !== null && typeof item.file === 'string' && item.file.length > 0 ? item.file : ''
      if (file.length === 0) { setToggleError(t('trash.openFailed', { message: '条目缺少文件路径' })); return }
      setToggleError(null)
      port.openPath(file).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setToggleError(t('trash.openFailed', { message: result.error }))
      }).catch(function (error) { setToggleError(t('trash.openFailed', { message: error instanceof Error ? error.message : String(error) })) })
    }

    React.useEffect(function () {
      if (open !== true) return undefined
      const id = window.setInterval(function () { setReloadTick(function (tick) { return tick + 1 }) }, 6000)
      return function () { window.clearInterval(id) }
    }, [open])

    if (open !== true) return null

    const skills = catalog.data === null || catalog.data.skills === undefined ? [] : catalog.data.skills
    const q = query.trim().toLowerCase()
    const groupEntries = GROUP_DEFS.map(function (group) {
      const entries = skills.filter(function (skill) {
        if (groupKeyOfSkill(skill) !== group.key) return false
        if (q.length > 0) {
          const n = String(skill.name).toLowerCase()
          const d = String(skill.description === undefined || skill.description === null ? '' : skill.description).toLowerCase()
          const note = notes[String(skill.name)]
          const a = note !== undefined && note !== null ? String(note.title || '').toLowerCase() : ''
          if (n.indexOf(q) !== -1 || d.indexOf(q) !== -1 || a.indexOf(q) !== -1) return true
          const qp = lettersOnly(q)
          if (qp.length === 0) return false
          const aliasPinyin = note !== undefined && note !== null && typeof note.aliasPinyin === 'string' ? note.aliasPinyin : ''
          const aliasInitials = note !== undefined && note !== null && typeof note.aliasInitials === 'string' ? note.aliasInitials : ''
          const namePinyin = typeof skill.namePinyin === 'string' ? skill.namePinyin : ''
          const nameInitials = typeof skill.nameInitials === 'string' ? skill.nameInitials : ''
          return aliasPinyin.indexOf(qp) !== -1 || aliasInitials.indexOf(qp) !== -1 || namePinyin.indexOf(qp) !== -1 || nameInitials.indexOf(qp) !== -1
        }
        return true
      })
      return { group: group, entries: entries }
    })
    let selected = groupEntries[0]
    for (const entry of groupEntries) if (entry.group.key === groupId) selected = entry
    const isTrash = groupId === 'trash'
    if (!isTrash && q.length > 0 && selected.entries.length === 0) for (const candidate of groupEntries) if (candidate.entries.length > 0) { setGroupId(candidate.group.key); break }

    const accentClass = isTrash ? 'skm-accent-builtin' : 'skm-accent-' + selected.group.key
    const sectionTitle = isTrash ? t('trash.title') : t(selected.group.titleKey)
    const sectionHint = isTrash ? t('trash.hint') : (q.length > 0 ? t('search.results', { count: selected.entries.length }) : t(selected.group.hintKey))
    const sectionCount = isTrash ? trash.items.length : selected.entries.length

    const handleToggle = function (skill, kind) {
      const name = String(skill.name)
      const nextModel = kind === 'agent' ? !(skill.modelInvocable === true) : (skill.modelInvocable === true)
      const nextUser = kind === 'user' ? !(skill.userInvocable === true) : (skill.userInvocable === true)
      setBusyName(name); setToggleError(null)
      setLocalInv(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; n[name] = { model: nextModel, user: nextUser }; return n })
      port.toggleInvocation({ name: name, sessionId: currentId === undefined ? null : currentId, cwd: cwd === undefined ? null : cwd, modelOn: nextModel, userOn: nextUser }).then(function (result) {
        setBusyName(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setToggleError(result.error); setLocalInv(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; delete n[name]; return n }) }
        else { setReloadTick(function (tick) { return tick + 1 }); window.setTimeout(function () { setLocalInv(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; delete n[name]; return n }); setReloadTick(function (tick) { return tick + 1 }) }, 800) }
      }).catch(function (error) { setBusyName(null); setToggleError(error instanceof Error ? error.message : String(error)); setLocalInv(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; delete n[name]; return n }) })
    }

    const handleObserveToggle = function (skill, next) {
      const name = String(skill.name)
      setObserveBusy(name); setToggleError(null)
      setLocalObserve(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; n[name] = next === true; return n })
      port.skillObserveSet({ name: name, sessionId: currentId === undefined ? null : currentId, cwd: cwd === undefined ? null : cwd, observing: next === true }).then(function (result) {
        setObserveBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setToggleError(t('panel.observeError', { message: result.error })); setLocalObserve(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; delete n[name]; return n }) }
        else { setReloadTick(function (tick) { return tick + 1 }); window.setTimeout(function () { setLocalObserve(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; delete n[name]; return n }); setReloadTick(function (tick) { return tick + 1 }) }, 800) }
      }).catch(function (error) { setObserveBusy(null); setToggleError(t('panel.observeError', { message: error instanceof Error ? error.message : String(error) })); setLocalObserve(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; delete n[name]; return n }) })
    }

    const options = []
    if (currentId !== undefined) options.push(h('option', { key: 'session', value: '' }, t('panel.workspace.session')))
    for (const ws of workspaces) options.push(h('option', { key: String(ws.workspaceId), value: String(ws.workspaceId) }, String(ws.title) + ' · ' + String(ws.path)))

    const navItems = groupEntries.map(function (entry) {
      const active = entry.group.key === selected.group.key
      return h('button', { type: 'button', key: entry.group.key, className: active ? 'skm-nav-item skm-nav-item-active' : 'skm-nav-item', onClick: function () { setGroupId(entry.group.key) } },
        h('span', { className: 'skm-nav-item-label' }, t(entry.group.titleKey)), h('span', { className: 'skm-nav-item-count' }, String(entry.entries.length)))
    })
    navItems.push(h('button', { type: 'button', key: 'trash', className: isTrash ? 'skm-nav-item skm-nav-item-active' : 'skm-nav-item', onClick: function () { setGroupId('trash') } },
      h('span', { className: 'skm-nav-item-label' }, t('trash.title')), h('span', { className: 'skm-nav-item-count' }, String(trash.items.length))))

    const contentChildren = []
    if (catalog.error !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'error' }, t('panel.readError', { message: catalog.error })))
    if (catalog.loading === true && catalog.data === null) contentChildren.push(h('p', { className: 'skm-notice', key: 'loading' }, t('panel.loading')))
    if (catalog.data !== null && catalog.data.complete !== true) contentChildren.push(h('p', { className: 'skm-notice', key: 'incomplete' }, t('panel.incomplete')))
    if (toggleError !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'toggleErr' }, t('panel.toggleError', { message: toggleError })))
    contentChildren.push(h('div', { className: 'skm-section-head', key: 'head' },
      h('div', { className: 'skm-section-main' }, h('span', { className: 'skm-section-mark ' + accentClass, 'aria-hidden': true }), h('span', { className: 'skm-section-title' }, sectionTitle)),
      h('span', { className: 'skm-section-count' }, t('panel.total', { count: sectionCount })),
      h('div', { className: 'skm-section-hint' }, sectionHint)))
    if (isTrash) {
      if (trash.items.length === 0) contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, t('trash.empty')))
      else contentChildren.push(h('div', { className: 'skm-trash-grid', key: 'trashgrid' }, trash.items.map(function (item) {
        return h(TrashCard, { key: String(item.id), item: item, t: t, busy: trashBusy === item.id, noteTitle: notes[item.name] !== undefined && notes[item.name] !== null ? String(notes[item.name].title || '') : '', onOpen: function () { openTrashFile(item) }, onRestore: function () { restoreTrash(item.id) }, onDelete: function () { deleteTrash(item.id) } })
      })))
    } else if (catalog.data !== null && selected.entries.length === 0) contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, q.length > 0 ? t('search.empty') : t('group.empty')))
    else contentChildren.push(h('div', { className: 'skm-grid', key: 'grid' }, selected.entries.map(function (skill) {
      const name = String(skill.name); const local = localInv[name]; const localOb = localObserve[name]
      const effModel = local !== undefined && typeof local.model === 'boolean' ? local.model : skill.modelInvocable === true
      const effUser = local !== undefined && typeof local.user === 'boolean' ? local.user : skill.userInvocable === true
      const effObserve = localOb !== undefined ? localOb : skill.observing === true
      const view = { name: name, description: skill.description, whenToUse: skill.whenToUse, source: String(skill.source), provider: String(skill.provider), modelInvocable: effModel, userInvocable: effUser, scopeId: skill.scopeId === undefined || skill.scopeId === null ? 'global' : String(skill.scopeId), scopeLabel: skill.scopeLabel === undefined || skill.scopeLabel === null ? 'global' : String(skill.scopeLabel), crossScope: skill.crossScope === true, preview: skill.preview === true, observing: effObserve }
      return h(SkillCard, { key: name, skill: view, t: t, accentClass: accentClass, readOnly: EDITABLE_SOURCES.indexOf(String(skill.source)) === -1, busy: busyName !== null && busyName === name, observeOn: effObserve, observeBusy: observeBusy !== null && observeBusy === name, note: notes[name], scopeLabel: view.scopeLabel, crossScope: view.crossScope, onToggle: function (kind) { handleToggle(view, kind) }, onObserveToggle: function (next) { handleObserveToggle(view, next) }, onConfig: function () { setConfigName(name) }, onDelete: function () { deleteSkill(view) }, onSaveNote: function (note) { saveNote(name, note) } })
    })))

    return h('div', { className: 'skm-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) openStore.set(false) } },
      h('section', { className: 'skm-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': t('panel.title'), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key !== 'Escape') return; const target = event.target; if (target !== null && typeof target === 'object' && target.tagName === 'INPUT' && typeof target.value === 'string' && target.value.length > 0) return; openStore.set(false) } },
        h('header', { className: 'skm-header' },
          h('div', { className: 'skm-title' }, h(SkillGlyph, { size: 16 }), t('panel.title'), h('span', { className: 'skm-total' }, 'v' + VERSION), catalog.data !== null ? h('span', { className: 'skm-total' }, t('panel.total', { count: skills.length })) : null),
          h('div', { className: 'skm-header-spacer' }),
          h('label', { className: 'skm-field' }, h('span', { className: 'skm-field-label' }, t('panel.workspace.label')), h('select', { className: 'skm-select', value: workspaceId, onChange: function (event) { setWorkspaceId(event.target.value) } }, options)),
          h('input', { className: 'skm-search', type: 'search', placeholder: t('panel.search.placeholder'), value: query, ref: focusSearchIfPending, onChange: function (event) { setQuery(event.target.value) } }),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.refresh'), title: t('panel.refresh'), onClick: function () { setReloadTick(function (tick) { return tick + 1 }) } }, h(RefreshGlyph, null)),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { openStore.set(false) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-split' },
          h('nav', { className: 'skm-nav' },
            h('div', { className: 'skm-nav-title' }, t('nav.sources')),
            navItems),
          h('div', { className: 'skm-content' }, contentChildren))),
        configName !== null ? h(ConfigDialog, { name: configName, t: t, sessionId: currentId === undefined ? null : currentId, cwd: cwd === undefined ? null : cwd, onClose: function () { setConfigName(null) }, onSaved: function () { setReloadTick(function (tick) { return tick + 1 }) } }) : null)
  }

  // ---- 补丁管理面板（0.7.0：目录驱动）----

  function syncPatchBadge() {
    port.patchScan().then(function (result) {
      if (result !== null && typeof result === 'object' && Array.isArray(result.patches)) {
        patchLostStore.set(result.patches.some(function (p) { return p.state === 'lost' || p.state === 'error' || p.structuralError !== null && p.structuralError !== undefined }))
      }
    }).catch(function () {})
  }

  function applyBadgeMode(mode) {
    if (patchBadgeTimer !== null) { window.clearInterval(patchBadgeTimer); patchBadgeTimer = null }
    if (mode === 'badge') {
      syncPatchBadge()
      patchBadgeTimer = window.setInterval(syncPatchBadge, 15000)
    } else {
      patchLostStore.set(false)
    }
  }

  function PatchPanel(props) {
    const t = props.t; const open = useStore(patchOpenStore)
    const [state, setState] = React.useState({ data: null, error: null })
    const [settings, setSettings] = React.useState({ alertMode: 'panel', allowExecutable: true })
    const [busy, setBusy] = React.useState(null)
    const [opError, setOpError] = React.useState(null)
    const [notice, setNotice] = React.useState(null)
    const [confirming, setConfirming] = React.useState(null)
    const [dragOver, setDragOver] = React.useState(false)
    const [importTo, setImportTo] = React.useState('默认')
    const [showCatAdd, setShowCatAdd] = React.useState(false)
    const [catName, setCatName] = React.useState('')
    const [renaming, setRenaming] = React.useState(null)
    const [renameValue, setRenameValue] = React.useState('')
    const [catDeleteConfirm, setCatDeleteConfirm] = React.useState(null)
    const renameSession = React.useRef(null)
    const renameCancel = React.useRef(false)
    const fileInput = React.useRef(null)
    const [tick, setTick] = React.useState(0)

    React.useEffect(function () {
      if (open !== true) return undefined
      let cancelled = false
      const load = function () {
        port.patchScan().then(function (result) {
          if (cancelled) return
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') setState({ data: null, error: result.error })
          else setState({ data: result, error: null })
        }).catch(function (error) { if (cancelled) return; setState({ data: null, error: error instanceof Error ? error.message : String(error) }) })
        port.patchSettingsGet().then(function (result) {
          if (cancelled) return
          if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object') setSettings(result.settings)
        }).catch(function () {})
      }
      load()
      const id = window.setInterval(load, 6000)
      return function () { cancelled = true; window.clearInterval(id) }
    }, [open, tick])

    // 类别被删除/重命名后，「导入到」下拉可能指向不存在的类别：自动回落到“默认”。
    React.useEffect(function () {
      const cats = state.data !== null && state.data !== undefined && Array.isArray(state.data.categories) ? state.data.categories : null
      if (cats !== null && cats.indexOf(importTo) === -1) setImportTo('默认')
    }, [state.data, importTo])

    const operate = function (id, action, patch) {
      if (action === 'enable' && patch !== undefined && patch.hasScript === true && confirming !== id) { setConfirming(id); return }
      if (action === 'delete' && confirming !== id) { setConfirming(id); return }
      setConfirming(null)
      setBusy(id); setOpError(null); setNotice(null)
      const fn = action === 'enable' ? port.patchEnable : action === 'disable' ? port.patchDisable : port.patchDelete
      fn({ id: id }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setOpError(result.error) }
        else if (action !== 'delete' && result !== null && typeof result === 'object') { setNotice(t(result.apply === 'restart' ? 'patch.apply.restart' : 'patch.apply.refresh')) }
        setTick(function (v) { return v + 1 })
      }).catch(function (error) { setBusy(null); setOpError(error instanceof Error ? error.message : String(error)) })
    }

    const setMode = function (mode) {
      port.patchSettingsSet({ alertMode: mode }).then(function (result) {
        if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object') setSettings(result.settings)
        if (typeof result !== 'object' || result === null || result.error === undefined) applyBadgeMode(mode)
      }).catch(function () {})
    }

    const toggleAllowExec = function () {
      const next = settings.allowExecutable !== true
      port.patchSettingsSet({ allowExecutable: next }).then(function (result) {
        if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object') setSettings(result.settings)
        setTick(function (v) { return v + 1 })
      }).catch(function () {})
    }

    const importFiles = function (files) {
      const list = Array.from(files || [])
      if (list.length === 0) return
      setOpError(null); setNotice(null)
      let chain = Promise.resolve()
      let okCount = 0
      list.forEach(function (file) {
        chain = chain.then(function () {
          return new Promise(function (resolve) {
            const reader = new FileReader()
            reader.onload = function () {
              port.patchImport({ category: importTo, fileName: file.name, content: String(reader.result) }).then(function (result) {
                if (result !== null && typeof result === 'object' && typeof result.error === 'string') setOpError(t('patch.import.error', { message: result.error }))
                else { okCount += 1; setNotice(t('patch.imported', { id: result.id })) }
                resolve()
              }).catch(function (error) { setOpError(t('patch.import.error', { message: error instanceof Error ? error.message : String(error) })); resolve() })
            }
            reader.onerror = function () { setOpError(t('patch.import.error', { message: '读取文件失败' })); resolve() }
            reader.readAsText(file)
          })
        })
      })
      chain.then(function () { setTick(function (v) { return v + 1 }) })
    }

    const addCategory = function () {
      const name = catName.trim()
      if (name.length === 0) return
      port.patchCategoryAdd({ name: name }).then(function (result) {
        setCatName(''); setShowCatAdd(false)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setOpError(result.error)
        else { setNotice(t('patch.category.added')); setTick(function (v) { return v + 1 }) }
      }).catch(function (error) { setOpError(error instanceof Error ? error.message : String(error)) })
    }

    const renameCategory = function (oldName) {
      if (renameSession.current !== oldName) return // 已提交/已取消后的失焦二次触发，直接忽略
      renameSession.current = null
      if (renameCancel.current === true) { renameCancel.current = false; setRenaming(null); return }
      const name = renameValue.trim()
      setRenaming(null)
      if (name.length === 0 || name === oldName) return
      port.patchCategoryRename({ oldName: oldName, newName: name }).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setOpError(result.error)
        else { setNotice(t('patch.category.renamed')); setTick(function (v) { return v + 1 }) }
      }).catch(function (error) { setOpError(error instanceof Error ? error.message : String(error)) })
    }

    const deleteCategory = function (name) {
      if (catDeleteConfirm !== name) { setCatDeleteConfirm(name); return }
      setCatDeleteConfirm(null)
      port.patchCategoryDelete({ name: name }).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setOpError(result.error)
        else { setNotice(t('patch.category.deleted')); setTick(function (v) { return v + 1 }) }
      }).catch(function (error) { setOpError(error instanceof Error ? error.message : String(error)) })
    }

    if (open !== true) return null

    const patches = state.data !== null && state.data !== undefined && Array.isArray(state.data.patches) ? state.data.patches : []
    const categories = state.data !== null && state.data !== undefined && Array.isArray(state.data.categories) ? state.data.categories : ['默认']
    const root = state.data !== null && state.data !== undefined && typeof state.data.root === 'string' ? state.data.root : ''

    const kindLabel = function (patch) {
      if (patch.hasScript === true) return t('patch.kind.script')
      return patch.structuralError !== null && patch.structuralError !== undefined ? '' : (patch.state === 'error' ? '' : '')
    }

    const sections = categories.map(function (category) {
      const inCat = patches.filter(function (p) { return p.category === category })
      const isDefault = category === '默认'
      const catHead = h('div', { className: 'skm-patch-cat-head', key: 'head-' + category },
        h('span', { className: 'skm-patch-cat-name' }, isDefault ? t('patch.category.default') : String(category)),
        h('span', { className: 'skm-nav-item-count' }, String(inCat.length)),
        renaming === category ? h('input', { className: 'skm-cat-input', value: renameValue, autoFocus: true, onChange: function (event) { setRenameValue(event.target.value) }, onBlur: function () { renameCategory(category) }, onKeyDown: function (event) { if (event.key === 'Enter') renameCategory(category); if (event.key === 'Escape') { renameCancel.current = true; renameSession.current = null; setRenaming(null) } } }) : null,
        isDefault ? null : h('button', { type: 'button', className: 'skm-cat-btn', title: t('patch.category.rename'), onClick: function () { renameSession.current = category; renameCancel.current = false; setRenaming(category); setRenameValue(category) } }, t('patch.category.rename')),
        isDefault ? null : h('button', { type: 'button', className: 'skm-cat-btn' + (catDeleteConfirm === category ? ' skm-cat-btn-confirm' : ''), title: t('patch.category.delete.title'), onClick: function () { deleteCategory(category) } }, catDeleteConfirm === category ? t('patch.category.delete.confirm') : t('patch.category.delete')),
        h('div', { className: 'skm-cfg-spacer' }))
      const rows = inCat.map(function (patch) {
        const stateKey = patch.state === 'applied' ? 'patch.state.applied' : patch.state === 'clean' ? 'patch.state.clean' : patch.state === 'lost' ? 'patch.state.lost' : 'patch.state.error'
        const badgeClass = patch.state === 'applied' ? 'skm-badge skm-badge-ok' : patch.state === 'clean' ? 'skm-badge' : patch.state === 'lost' ? 'skm-badge skm-badge-lost' : 'skm-badge skm-badge-ro'
        const structural = patch.structuralError !== null && patch.structuralError !== undefined
        const errorTitle = structural ? t('patch.state.error.title', { message: patch.structuralError }) : (patch.state === 'lost' ? t('patch.lost.title') : '')
        const busyThis = busy === patch.id
        const confirmingThis = confirming === patch.id
        const canDisable = patch.state === 'applied'
        const canEnable = patch.state === 'clean' && !structural
        const lost = patch.state === 'lost'
        const applyHint = patch.apply === 'restart' ? t('patch.apply.restart') : t('patch.apply.refresh')
        return h('article', { className: 'skm-patch-card', key: patch.id },
          h('div', { className: 'skm-patch-head' },
            h('span', { className: 'skm-patch-name', title: patch.fileName || String(patch.id) }, String(patch.name)),
            patch.hasScript === true ? h('span', { className: 'skm-badge skm-badge-ro', title: t('patch.executable') }, t('patch.executable')) : null,
            patch.apply === 'restart' ? h('span', { className: 'skm-badge', title: applyHint }, t('patch.apply.restart')) : null,
            h('span', { className: badgeClass, title: errorTitle }, t(stateKey))),
          h('p', { className: 'skm-patch-desc' }, String(patch.description || '')),
          Array.isArray(patch.targets) && patch.targets.length > 0 ? h('p', { className: 'skm-patch-targets', title: patch.targets.join('\n') }, t('patch.targets') + '：', h('code', null, patch.targets[0] + (patch.targets.length > 1 ? '（+' + String(patch.targets.length - 1) + '）' : ''))) : null,
          h('div', { className: 'skm-patch-actions' },
            h('div', { className: 'skm-cfg-spacer' }),
            canDisable ? h('button', { type: 'button', className: 'skm-btn', disabled: busyThis, title: t('patch.disable.title'), onClick: function () { operate(patch.id, 'disable', patch) } }, busyThis ? t('patch.saving') : t('patch.disable')) : null,
            canEnable ? h('button', { type: 'button', className: confirmingThis ? 'skm-btn skm-btn-primary skm-btn-confirm' : 'skm-btn skm-btn-primary', disabled: busyThis, title: confirmingThis && patch.hasScript === true ? t('patch.confirm.exec') : t('patch.enable.title'), onClick: function () { operate(patch.id, 'enable', patch) } }, busyThis ? t('patch.saving') : confirmingThis ? t('patch.confirm.exec') : t('patch.enable')) : null,
            lost ? h('button', { type: 'button', className: 'skm-btn', disabled: busyThis, title: t('patch.lost.title'), onClick: function () { operate(patch.id, 'disable', patch) } }, t('patch.disable')) : null,
            h('button', { type: 'button', className: confirmingThis ? 'skm-btn skm-patch-del skm-patch-del-confirm' : 'skm-btn skm-patch-del', disabled: busyThis, title: t('patch.delete.title'), onClick: function () { operate(patch.id, 'delete', patch) } }, confirmingThis ? t('patch.delete.confirm') : t('patch.delete'))))
      })
      return [catHead, rows.length > 0 ? rows : null]
    })

    return h('div', { className: 'skm-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) patchOpenStore.set(false) } },
      h('section', { className: 'skm-dialog skm-patch-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': t('patch.panel.title'), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key !== 'Escape') return; const target = event.target; if (target !== null && typeof target === 'object' && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && typeof target.value === 'string' && target.value.length > 0) return; patchOpenStore.set(false) }, onDragOver: function (event) { event.preventDefault(); setDragOver(true) }, onDragLeave: function () { setDragOver(false) }, onDrop: function (event) { event.preventDefault(); setDragOver(false); importFiles(event.dataTransfer.files) } },
        dragOver === true ? h('div', { className: 'skm-patch-drop' }, t('patch.import.drop')) : null,
        h('header', { className: 'skm-header' },
          h('div', { className: 'skm-title' }, h(GearGlyph, { size: 16 }), t('patch.panel.title'), h('span', { className: 'skm-total' }, 'v' + VERSION)),
          h('div', { className: 'skm-header-spacer' }),
          h('label', { className: 'skm-field' }, h('span', { className: 'skm-field-label' }, t('patch.import.to')), h('select', { className: 'skm-select', value: importTo, onChange: function (event) { setImportTo(event.target.value) } }, categories.map(function (c) { return h('option', { key: c, value: c }, c === '默认' ? t('patch.category.default') : c) }))),
          h('button', { type: 'button', className: 'skm-btn', onClick: function () { if (fileInput.current !== null) fileInput.current.click() } }, t('patch.import')),
          h('input', { ref: fileInput, type: 'file', accept: '.dsh-patch.json', multiple: true, style: { display: 'none' }, onChange: function (event) { importFiles(event.target.files); event.target.value = '' } }),
          h('label', { className: 'skm-field', title: t('patch.allowExec.title') }, h('span', { className: 'skm-field-label' }, t('patch.allowExec')), h(InvSwitch, { on: settings.allowExecutable === true, variant: 'agent', title: t('patch.allowExec.title'), onChange: toggleAllowExec })),
          h('label', { className: 'skm-field' }, h('span', { className: 'skm-field-label' }, t('patch.alert.label')), h('select', { className: 'skm-select', value: String(settings.alertMode || 'panel'), onChange: function (event) { setMode(event.target.value) } },
            h('option', { value: 'panel' }, t('patch.alert.panel')),
            h('option', { value: 'badge' }, t('patch.alert.badge')))),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.refresh'), title: t('panel.refresh'), onClick: function () { setTick(function (v) { return v + 1 }) } }, h(RefreshGlyph, null)),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { patchOpenStore.set(false) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-patch-body' },
          state.error !== null ? h('p', { className: 'skm-notice skm-notice-error' }, t('patch.panel.error', { message: state.error })) : null,
          opError !== null ? h('p', { className: 'skm-notice skm-notice-error' }, t('patch.opError', { message: opError })) : null,
          notice !== null ? h('p', { className: 'skm-notice' }, notice) : null,
          state.data === null ? h('p', { className: 'skm-notice' }, t('patch.panel.loading')) : null,
          patches.length === 0 && state.data !== null ? h('div', { className: 'skm-empty' }, t('patch.panel.empty')) : null,
          sections,
          showCatAdd === true ? h('div', { className: 'skm-patch-cat-add' },
            h('input', { className: 'skm-cat-input', placeholder: t('patch.category.add.placeholder'), value: catName, autoFocus: true, onChange: function (event) { setCatName(event.target.value) }, onKeyDown: function (event) { if (event.key === 'Enter') addCategory(); if (event.key === 'Escape') { setShowCatAdd(false); setCatName('') } } }),
            h('button', { type: 'button', className: 'skm-btn skm-btn-primary', onClick: addCategory }, t('patch.category.add')),
            h('button', { type: 'button', className: 'skm-btn', onClick: function () { setShowCatAdd(false); setCatName('') } }, t('panel.close'))) : h('div', { className: 'skm-patch-cat-add' },
            h('button', { type: 'button', className: 'skm-btn', onClick: function () { setShowCatAdd(true); setCatName('') } }, '+ ' + t('patch.category.add'))),
          h('p', { className: 'skm-notice' }, t('patch.hint')),
          root.length > 0 ? h('p', { className: 'skm-patch-root' }, t('patch.root') + '：', h('code', null, root)) : null)))
  }

  const inject = ['slots']

  // ---- 模糊匹配（1:1 复刻内置命令源算法：有序子序列打分 + 边界加权）----

  /** Extra weight for alias starts and separator boundaries. */
  function boundaryBonus(name, index) {
    return index === 0 || name.charAt(index - 1) === '-' || name.charAt(index - 1) === '_' ? 8 : 0
  }

  /** Score the strongest ordered-subsequence alignment in O(name × query). */
  function fuzzyScore(name, query) {
    if (query === '') return 0
    if (query.length > name.length) return undefined
    const noMatch = Number.NEGATIVE_INFINITY
    let previous = Array(name.length).fill(noMatch)
    for (let index = 0; index < name.length; index++) if (name.charAt(index) === query.charAt(0)) previous[index] = 1 + boundaryBonus(name, index) - index
    for (let queryIndex = 1; queryIndex < query.length; queryIndex++) {
      const current = Array(name.length).fill(noMatch)
      let bestGapped = noMatch
      for (let index = 0; index < name.length; index++) {
        const gappedIndex = index - 2
        if (gappedIndex >= 0) {
          const prior = previous[gappedIndex] ?? noMatch
          if (prior !== noMatch) bestGapped = Math.max(bestGapped, prior + gappedIndex)
        }
        if (name.charAt(index) !== query.charAt(queryIndex)) continue
        const bonus = 1 + boundaryBonus(name, index)
        const adjacent = index > 0 ? previous[index - 1] ?? noMatch : noMatch
        if (adjacent !== noMatch) current[index] = adjacent + bonus + 4
        if (bestGapped !== noMatch) current[index] = Math.max(current[index] ?? noMatch, bestGapped + bonus + 1 - index)
      }
      previous = current
    }
    let best = noMatch
    for (const score of previous) best = Math.max(best, score)
    return best === noMatch ? undefined : best
  }

  /** 拼音查询归一化：只保留 a–z（上游已小写；中文查询归一后为空串，跳过拼音路径）。 */
  function lettersOnly(text) { return String(text).replace(/[^a-z]/g, '') }

  // ---- `/` 菜单源的客户端缓存（0.5.1）----
  // 每次击键不再发 2 次 RPC：catalog+notesGet 并行拉取，按会话缓存 6 秒，
  // 命中直接同步返回（把“空结果自动关闭”前的等待压到一帧内）；过期时后台
  // 刷新（stale-while-revalidate），仅首帧无缓存时才阻塞等待。

  const ALIAS_CACHE_TTL = 6000
  const aliasCaches = new Map()

  function ensureAliasCache(sessionId) {
    const existing = aliasCaches.get(sessionId)
    if (existing !== undefined && existing.loading === null && existing.catalog !== null && Date.now() - existing.at < ALIAS_CACHE_TTL) {
      return Promise.resolve({ catalog: existing.catalog, notes: existing.notes })
    }
    if (existing !== undefined && existing.loading !== null) return existing.loading
    const entry = existing !== undefined ? existing : { catalog: null, notes: null, at: 0, loading: null }
    aliasCaches.set(sessionId, entry)
    const args = { sessionId: sessionId, cwd: null }
    entry.loading = Promise.all([rpc('catalog', args), rpc('notesGet', {})]).then(function (results) {
      const catalog = results[0]
      const notes = results[1]
      if (catalog !== null && typeof catalog === 'object' && catalog.error === undefined && Array.isArray(catalog.skills)) entry.catalog = catalog
      if (notes !== null && typeof notes === 'object' && notes.notes !== null && typeof notes.notes === 'object') entry.notes = notes
      entry.at = Date.now()
      entry.loading = null
      return { catalog: entry.catalog, notes: entry.notes }
    }, function (error) {
      entry.loading = null
      throw error
    })
    return entry.loading
  }

  function aliasCacheHit(sessionId) {
    const entry = aliasCaches.get(sessionId)
    if (entry === undefined || entry.catalog === null || entry.notes === null) return null
    return entry
  }

  // ---- 别名候选计算（五级分层，见 apply 内注释）----

  function computeAliasCandidates(catalog, notes, q, qp) {
    if (catalog === null || typeof catalog !== 'object' || catalog.error !== undefined || !Array.isArray(catalog.skills)) return []
    const noteMap = notes !== null && typeof notes === 'object' && notes.notes !== null && typeof notes.notes === 'object' ? notes.notes : {}
    const ranked = []
    catalog.skills.forEach(function (skill, index) {
      if (skill.userInvocable !== true) return // 仅“用户可调用”开启的技能
      const skillName = String(skill.name)
      if (skillName.toLowerCase().startsWith(q)) return // 内置技能源已覆盖，去重
      const note = noteMap[skillName]
      const alias = note !== undefined && note !== null ? String(note.title || '').trim() : ''
      const aliasLower = alias.toLowerCase()
      let tier = 0
      let score = Number.NEGATIVE_INFINITY
      if (alias.length > 0) {
        const fuzzy = fuzzyScore(aliasLower, q)
        if (aliasLower.startsWith(q)) { tier = 1; score = fuzzy === undefined ? 0 : fuzzy }
        else if (fuzzy !== undefined) { tier = 2; score = fuzzy }
      }
      if (tier === 0 && qp.length > 0) {
        const fullStrings = []
        const initialStrings = []
        if (note !== undefined && note !== null) {
          if (typeof note.aliasPinyin === 'string' && note.aliasPinyin.length > 0) fullStrings.push(note.aliasPinyin)
          if (typeof note.aliasInitials === 'string' && note.aliasInitials.length > 0) initialStrings.push(note.aliasInitials)
        }
        if (typeof skill.namePinyin === 'string' && skill.namePinyin.length > 0) fullStrings.push(skill.namePinyin)
        if (typeof skill.nameInitials === 'string' && skill.nameInitials.length > 0) initialStrings.push(skill.nameInitials)
        for (const s of fullStrings) if (s.startsWith(qp)) { tier = 3; break }
        if (tier === 0) for (const s of initialStrings) if (s.startsWith(qp)) { tier = 4; break }
        if (tier === 0) for (const s of fullStrings) if (fuzzyScore(s, qp) !== undefined) { tier = 5; break }
      }
      if (tier === 0) return
      const content = note !== undefined && note !== null ? String(note.content || '').trim() : ''
      ranked.push({
        candidate: {
          name: alias.length > 0 ? alias + ' · ' + skillName : skillName,
          description: alias.length > 0 && content.length > 0 ? content : String(skill.description || ''),
          skillName: skillName,
        },
        index: index,
        tier: tier,
        score: score,
      })
    })
    ranked.sort(function (left, right) { return left.tier - right.tier || right.score - left.score || left.index - right.index })
    return ranked.map(function (match) { return match.candidate })
  }

  function RepoPanel(props) {
    const t = props.t; const useSessions = props.useSessions; const useWorkspaces = props.useWorkspaces; const open = useStore(repoOpenStore)
    const repoInvalidate = useStore(repoInvalidateStore)
    const currentId = useSessions(function (state) { return state.current })
    const sessionCwd = useSessions(function (state) { const cur = state.current; if (cur === undefined) return undefined; const row = state.byId[cur]; return row === undefined ? undefined : row.cwd })
    const [state, setState] = React.useState({ data: null, error: null, loading: false })
    // 0.35.1：repoInvalidate 变化（服务面板注册状态变更）时强制重扫，绕过 repoScan SWR 缓存
    const prevInvalidate = React.useRef(repoInvalidate)
    const [tab, setTab] = React.useState('projects')
    const [gitStates, setGitStates] = React.useState({})
    const [busy, setBusy] = React.useState(null)
    const [notice, setNotice] = React.useState(null)
    const [opError, setOpError] = React.useState(null)
    const [rootInput, setRootInput] = React.useState('')
    const [cloneMode, setCloneMode] = React.useState('https')
    const [deleteConfirm, setDeleteConfirm] = React.useState(null)
    const [switchingRoot, setSwitchingRoot] = React.useState(false)
    const [cloneRoot, setCloneRoot] = React.useState(null)
    const [clonePath, setClonePath] = React.useState('')
    const [cloneDirs, setCloneDirs] = React.useState([])
    const [cloneUrl, setCloneUrl] = React.useState('')
    const [newCatName, setNewCatName] = React.useState('')
    const [cloneBusy, setCloneBusy] = React.useState(false)
    const [applySkill, setApplySkill] = React.useState(null)
    const [selectedProject, setSelectedProject] = React.useState('')
    const [pluginPackages, setPluginPackages] = React.useState([])
    const [selectedPlugin, setSelectedPlugin] = React.useState('')
    const [detail, setDetail] = React.useState(null)
    const [readmeExpanded, setReadmeExpanded] = React.useState(false)
    const [aiModal, setAiModal] = React.useState(null)
    const [aiEntryStates, setAiEntryStates] = React.useState({})
    const [aiRawOpen, setAiRawOpen] = React.useState(false)
    const [aiDraft, setAiDraft] = React.useState(null)
    const [aiProviders, setAiProviders] = React.useState(null)
    const aiPollRef = React.useRef(null)
    const detailReq = React.useRef(0)
    const data = state.data

    const flash = function (message) { setNotice(message); setOpError(null); window.setTimeout(function () { setNotice(null) }, 4000) }
    const fail = function (message) { setOpError(message); setNotice(null) }

    // 本地即时更新某张项目卡（乐观 UI）：repoScan 全量重扫较慢，先翻转角标再后台校准。
    const patchProjectLocal = function (path, patch) {
      setState(function (prev) {
        if (prev.data === null || prev.data === undefined || !Array.isArray(prev.data.projects)) return prev
        const projects = prev.data.projects.map(function (p) {
          if (p.path !== path) return p
          return Object.assign({}, p, patch)
        })
        const mirrors = Array.isArray(prev.data.mirrors) ? prev.data.mirrors.map(function (p) {
          if (p.path !== path) return p
          return Object.assign({}, p, patch)
        }) : prev.data.mirrors
        const data = Object.assign({}, prev.data, { projects: projects, mirrors: mirrors })
        return { data: data, error: prev.error, loading: prev.loading }
      })
    }

    // ---- AI 讲解（0.15.0）：条目点击 → 请求/排队/轮询 → 弹窗展示 ----
    const fetchAiEntryStates = function (info) {
      const hashes = []
      const push = function (arr) { if (Array.isArray(arr)) for (const c of arr) if (c !== null && typeof c.hash === 'string') hashes.push(c.hash) }
      if (info !== null && info !== undefined) { push(info.incoming); push(info.outgoing); push(info.history) }
      if (hashes.length === 0) return
      port.aiExplainStatus({ hashes: hashes }).then(function (res) {
        if (res !== null && typeof res === 'object' && res.states !== null && typeof res.states === 'object') setAiEntryStates(res.states)
      }).catch(function () {})
    }

    const clearAiPoll = function () {
      if (aiPollRef.current !== null) { window.clearInterval(aiPollRef.current); aiPollRef.current = null }
    }

    const pollAiStatus = function (hash) {
      port.aiExplainStatus({ hash: hash }).then(function (res) {
        const st = res !== null && res !== undefined && res.states !== null && typeof res.states === 'object' ? res.states[hash] : null
        if (st === null || st === undefined) return
        if (st.state === 'done') {
          clearAiPoll()
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'done' }; return next })
          setAiModal(function (m) { return m === null || m.hash !== hash ? m : Object.assign({}, m, { state: 'done', text: '', data: st.data !== undefined ? st.data : null, error: '' }) })
        } else if (st.state === 'error') {
          clearAiPoll()
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'error' }; return next })
          setAiModal(function (m) { return m === null || m.hash !== hash ? m : Object.assign({}, m, { state: 'error', text: '', data: null, error: typeof st.error === 'string' ? st.error : '' }) })
        } else if (st.state === 'queued') {
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'queued' }; return next })
          setAiModal(function (m) { return m === null || m.hash !== hash ? m : Object.assign({}, m, { state: 'queued', text: typeof st.text === 'string' ? st.text : '', error: typeof st.error === 'string' ? st.error : '' }) })
        } else if (st.state === 'running' || st.state === 'pending') {
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'running' }; return next })
          setAiModal(function (m) { return m === null || m.hash !== hash ? m : Object.assign({}, m, { state: 'running', text: typeof st.text === 'string' ? st.text : '', error: typeof st.error === 'string' ? st.error : '' }) })
        } else {
          // 0.34.2 F4-11：'none' 或未知状态视为终态，停止轮询（此前被当成 running 无限循环）
          clearAiPoll()
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); delete next[hash]; return next })
        }
      }).catch(function () {})
    }

    const startAiFlow = function (hash, path, subject, stat, retry) {
      clearAiPoll()
      setAiRawOpen(false)
      setAiModal({ hash: hash, path: path, subject: subject, stat: stat, state: 'loading', text: '', data: null, error: '' })
      port.aiExplainRequest({ hash: hash, path: path, retry: retry === true }).then(function (res) {
        if (res !== null && typeof res === 'object' && typeof res.error === 'string' && res.error.length > 0 && res.ok !== true) {
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'error' }; return next })
          setAiModal({ hash: hash, path: path, subject: subject, stat: stat, state: 'error', text: '', data: null, error: res.error })
          return
        }
        if (res !== null && res !== undefined && res.state === 'done' && res.data !== null && res.data !== undefined) {
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'done' }; return next })
          setAiModal({ hash: hash, path: path, subject: subject, stat: stat, state: 'done', text: '', data: res.data, error: '' })
        } else if (res !== null && res !== undefined && res.state === 'error') {
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'error' }; return next })
          setAiModal({ hash: hash, path: path, subject: subject, stat: stat, state: 'error', text: '', data: null, error: typeof res.error === 'string' ? res.error : '' })
        } else {
          const state = res !== null && res !== undefined && res.state === 'queued' ? 'queued' : 'running'
          setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: state }; return next })
          setAiModal({ hash: hash, path: path, subject: subject, stat: stat, state: state, text: res !== null && res !== undefined && typeof res.text === 'string' ? res.text : '', data: null, error: res !== null && res !== undefined && typeof res.error === 'string' ? res.error : '' })
          aiPollRef.current = window.setInterval(function () { pollAiStatus(hash) }, 800)
        }
      }).catch(function (error) {
        setAiEntryStates(function (prev) { const next = Object.assign({}, prev); next[hash] = { state: 'error' }; return next })
        setAiModal({ hash: hash, path: path, subject: subject, stat: stat, state: 'error', text: '', data: null, error: error instanceof Error ? error.message : String(error) })
      })
    }

    const openAiModal = function (entry) {
      startAiFlow(String(entry.hash || ''), String(entry.path || ''), String(entry.subject || ''), String(entry.stat || ''), false)
    }

    const retryAi = function () {
      if (aiModal === null) return
      startAiFlow(aiModal.hash, aiModal.path, aiModal.subject, aiModal.stat, true)
    }

    // ---- 项目/技能详情面板：点击卡片（按钮/表单区除外）触发 ----
    const openDetail = function (kind, item, x, y) {
      detailReq.current += 1
      const req = detailReq.current
      const name = kind === 'skill' ? (typeof item.name === 'string' ? item.name : item.path) : item.name
      const cached = kind === 'repo' ? repoDetailCache.get(item.path) : undefined
      if (cached !== undefined && cached !== null) {
        setDetail({ kind: kind, path: item.path, name: name, loading: false, data: cached.data, error: null, x: x, y: y })
        fetchAiEntryStates(cached.data)
        // 0.15.1：stale-while-revalidate——先秒开缓存，超过 20s 后台刷新，面板不关闭、数据到位后原地更新
        if (Date.now() - cached.ts > 20000) {
          port.repoDetail({ path: item.path }).then(function (fresh) {
            if (detailReq.current !== req) return
            if (fresh !== null && typeof fresh === 'object' && typeof fresh.error !== 'string') {
              repoDetailCache.set(item.path, { ts: Date.now(), data: fresh })
              setDetail({ kind: kind, path: item.path, name: name, loading: false, data: fresh, error: null, x: x, y: y })
              fetchAiEntryStates(fresh)
            }
          }).catch(function () {})
        }
        return
      }
      setDetail({ kind: kind, path: item.path, name: name, loading: true, data: null, error: null, x: x, y: y })
      const call = kind === 'skill' ? port.skillDetail({ path: item.path }) : port.repoDetail({ path: item.path })
      call.then(function (result) {
        if (detailReq.current !== req) return
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') {
          setDetail({ kind: kind, path: item.path, name: name, loading: false, data: null, error: result.error, x: x, y: y })
        } else {
          if (kind === 'repo') {
            repoDetailCache.set(item.path, { ts: Date.now(), data: result })
            fetchAiEntryStates(result)
          }
          setDetail({ kind: kind, path: item.path, name: name, loading: false, data: result, error: null, x: x, y: y })
        }
      }).catch(function (error) {
        if (detailReq.current !== req) return
        setDetail({ kind: kind, path: item.path, name: name, loading: false, data: null, error: error instanceof Error ? error.message : String(error), x: x, y: y })
      })
    }

    const overInteractive = function (event) {
      const target = event !== null && event !== undefined ? event.target : null
      return target !== null && typeof target.closest === 'function' && target.closest('button, select, input, textarea, a') !== null
    }

    const cardPointerHandlers = function (kind, item) {
      return {
        onClick: function (event) {
          if (overInteractive(event)) return
          openDetail(kind, item, event.clientX, event.clientY)
        },
      }
    }

    const aiDotFor = function (hash) {
      const st = aiEntryStates[hash]
      let dotClass = 'skm-ai-dot'
      let statusLabel = t('repo.ai.statusPending')
      if (st !== null && st !== undefined) {
        if (st.state === 'done') { dotClass = 'skm-ai-dot skm-ai-dot-done'; statusLabel = t('repo.ai.statusDone') }
        else if (st.state === 'running' || st.state === 'queued') { dotClass = 'skm-ai-dot skm-ai-dot-run'; statusLabel = t('repo.ai.statusRunning') }
        else if (st.state === 'error') { dotClass = 'skm-ai-dot skm-ai-dot-err'; statusLabel = t('repo.ai.statusError') }
      }
      return { dotClass: dotClass, statusLabel: statusLabel }
    }

    const commitList = function (entries, path, doc) {
      if (!Array.isArray(entries) || entries.length === 0) {
        return h('p', { className: 'skm-notice', key: 'empty' }, t('repo.detail.commit.empty'))
      }
      return h('div', { className: 'skm-detail-commits', key: 'commits' }, entries.slice(0, 20).map(function (c) {
        const de = findLocalDocEntryClient(doc, c.hash)
        const dot = aiDotFor(c.hash)
        return h('button', { key: c.hash, type: 'button', className: 'skm-detail-commit', title: dot.statusLabel, onClick: function () { openAiModal({ hash: c.hash, path: path, subject: c.subject, stat: c.stat || '' }) } },
          h('div', { className: 'skm-detail-commit-subject' }, String(de !== null && typeof de.title === 'string' && de.title.length > 0 ? de.title : (c.subject || ''))),
          de !== null && Array.isArray(de.bullets) && de.bullets.length > 0 ? h('div', { className: 'skm-detail-commit-doc' }, de.bullets.slice(0, 3).join('；')) : null,
          h('div', { className: 'skm-detail-commit-meta' },
            h('span', { className: dot.dotClass }),
            String(c.author || '') + ' · ' + String(c.date || '') + ' · ' + String(c.hash || '').slice(0, 7)))
      }))
    }

    const docEntriesUncovered = function (doc, commits) {
      if (doc === null || doc === undefined || doc.exists !== true || !Array.isArray(doc.entries)) return []
      return doc.entries.filter(function (en) {
        return !(commits || []).some(function (c) {
          const full = String(c.hash || '')
          const short = full.slice(0, 7)
          return en.hash === full || en.hash === short || full.indexOf(en.hash) === 0 || en.hash.indexOf(short) === 0
        })
      })
    }

    const localDocEntryList = function (doc, path) {
      if (doc === null || doc === undefined || doc.exists !== true || !Array.isArray(doc.entries) || doc.entries.length === 0) return null
      return h('div', { className: 'skm-detail-commits' }, doc.entries.map(function (en) {
        const dot = aiDotFor(en.hash)
        return h('button', { key: 'doc-' + en.hash, type: 'button', className: 'skm-detail-commit', title: dot.statusLabel, onClick: function () { openAiModal({ hash: en.hash, path: path, subject: en.title || '', stat: '' }) } },
          h('div', { className: 'skm-detail-commit-subject' }, String(en.title || '')),
          Array.isArray(en.bullets) && en.bullets.length > 0 ? h('div', { className: 'skm-detail-commit-doc' }, en.bullets.slice(0, 3).join('；')) : null,
          h('div', { className: 'skm-detail-commit-meta' },
            h('span', { className: dot.dotClass }),
            '[commit ' + String(en.hash || '') + ']'))
      }))
    }

    const localDocNotes = function (doc) {
      if (doc === null || doc === undefined || doc.exists !== true || !Array.isArray(doc.notes) || doc.notes.length === 0) return null
      return h('div', { className: 'skm-detail-notes' }, doc.notes.slice(0, 5).map(function (n, i) {
        return h('div', { key: i, className: 'skm-detail-note' },
          h('div', { className: 'skm-detail-note-heading' }, String(n.heading || '')),
          h('div', { className: 'skm-detail-note-lines' }, (n.lines || []).slice(0, 24).join('；')))
      }))
    }

    React.useEffect(function () {
      if (open !== true) return undefined
      let cancelled = false
      const pre = repoPreload.getSnapshot()
      if (pre !== null && pre.data !== null && pre.data !== undefined) {
        setState({ data: pre.data, error: null, loading: false })
        if (pre.states !== null && pre.states !== undefined) setGitStates(pre.states)
      } else {
        setState(function (prev) { return { data: prev.data, error: null, loading: prev.data === null } })
      }
      const invalidateChanged = repoInvalidate !== prevInvalidate.current
      prevInvalidate.current = repoInvalidate
      port.repoScan(invalidateChanged ? { force: true } : {}).then(function (result) {
        if (cancelled) return
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setState({ data: null, error: result.error, loading: false }); return }
        setState({ data: result, error: null, loading: false })
        // 0.15.1：面板打开也触发一轮预热（多轮由 host 自动续跑，已缓存/队列中/冷却期内自动跳过）
        port.aiExplainWarmup().catch(function () {})
        // 0.15.1：后台补齐详情缓存，首点秒开
        prefetchRepoDetails(result.projects, result.mirrors)
        const paths = (result.projects || []).map(function (p) { return p.path })
        if (paths.length > 0) {
          port.repoGitStates({ paths: paths }).then(function (gres) {
            const states = gres !== null && typeof gres === 'object' && gres.states !== null && typeof gres.states === 'object' ? gres.states : {}
            setGitStates(states)
            repoPreload.set({ data: result, states: states })
          }).catch(function () { repoPreload.set({ data: result, states: {} }) })
        } else {
          repoPreload.set({ data: result, states: {} })
        }
      }).catch(function (error) { if (!cancelled) setState({ data: null, error: error instanceof Error ? error.message : String(error), loading: false }) })
      if (aiProviders === null) {
        port.aiProvidersList().then(function (res) {
          if (cancelled) return
          if (res !== null && typeof res === 'object' && Array.isArray(res.providers)) setAiProviders(res.providers)
        }).catch(function () {})
      }
      return function () { cancelled = true }
    }, [open, repoInvalidate])

    React.useEffect(function () {
      if (open !== true || data === null || !Array.isArray(data.mirrors) || data.mirrors.length === 0) return undefined
      const mirrors = data.mirrors
      const tick = function () {
        // F4-5：镜像 60s 轮询限并发 3，避免仓库多时每轮 Promise.all 同时打爆本机 git fetch。
        let cursor = 0
        let active = 0
        const CONCURRENCY = 3
        const refreshGitStates = function () {
          port.repoGitStates({ paths: mirrors.map(function (m) { return m.path }) }).then(function (res) {
            if (res !== null && typeof res === 'object' && res.states !== null && typeof res.states === 'object') {
              setGitStates(function (prev) { const n = {}; for (const k of Object.keys(prev)) n[k] = prev[k]; for (const k of Object.keys(res.states)) n[k] = res.states[k]; return n })
            }
          }).catch(function () {})
        }
        const launch = function () {
          while (active < CONCURRENCY && cursor < mirrors.length) {
            const m = mirrors[cursor]
            cursor += 1
            if (m === null || m === undefined || typeof m.path !== 'string') continue
            active += 1
            port.repoFetch({ path: m.path }).then(function () { active -= 1; launch() }).catch(function () { active -= 1; launch() })
          }
          if (active === 0 && cursor >= mirrors.length) refreshGitStates()
        }
        launch()
      }
      tick()
      const id = window.setInterval(tick, 60000)
      return function () { window.clearInterval(id) }
    }, [open, data === null ? 0 : data.mirrors.length])

    React.useEffect(function () {
      if (open !== true) { setDetail(null); setReadmeExpanded(false); clearAiPoll() }
    }, [open])

    if (open !== true) return null

    const reload = function () {
      setState(function (prev) { return { data: prev.data, error: null, loading: true } })
      port.repoScan({ force: true }).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setState({ data: null, error: result.error, loading: false }); return }
        setState({ data: result, error: null, loading: false })
        const paths = (result.projects || []).map(function (p) { return p.path })
        if (paths.length > 0) {
          port.repoGitStates({ paths: paths }).then(function (gres) {
            const states = gres !== null && typeof gres === 'object' && gres.states !== null && typeof gres.states === 'object' ? gres.states : {}
            setGitStates(states)
            repoPreload.set({ data: result, states: states })
          }).catch(function () { repoPreload.set({ data: result, states: {} }) })
        } else {
          repoPreload.set({ data: result, states: {} })
        }
      }).catch(function (error) { setState({ data: null, error: error instanceof Error ? error.message : String(error), loading: false }) })
    }

    const saveSettings = function (next) {
      const current = data !== null && data.settings !== null && data.settings !== undefined ? data.settings : {}
      const merged = Object.assign({}, next)
      if (merged.aiExplain === undefined && current.aiExplain !== undefined && current.aiExplain !== null) merged.aiExplain = current.aiExplain
      setBusy('settings')
      port.repoSettingsSet(merged).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        flash(t('repo.saved'))
        reload()
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    const currentAiDraft = function () {
      if (aiDraft !== null) return aiDraft
      const s = data !== null && data.settings !== null && data.settings !== undefined && data.settings.aiExplain !== undefined && data.settings.aiExplain !== null ? data.settings.aiExplain : { enabled: true, provider: 'opencode-go', model: 'deepseek-v4-flash', maxTokens: 1600, reasoningEffort: 'off' }
      const base = { enabled: true, provider: 'opencode-go', model: 'deepseek-v4-flash', maxTokens: 1600, reasoningEffort: 'off' }
      const merged = Object.assign({}, base, s)
      merged.maxTokens = Number(merged.maxTokens) > 0 ? Number(merged.maxTokens) : 1600
      if (typeof merged.reasoningEffort !== 'string' || merged.reasoningEffort.length === 0) merged.reasoningEffort = 'off'
      return merged
    }

    const saveAiSettings = function () {
      const current = data !== null && data.settings !== null && data.settings !== undefined ? data.settings : { roots: [], governanceRoot: '', rootTypes: {} }
      const d = currentAiDraft()
      saveSettings({
        roots: current.roots || [],
        governanceRoot: current.governanceRoot || '',
        rootTypes: current.rootTypes || {},
        services: current.services,
        aiExplain: { enabled: d.enabled !== false, provider: String(d.provider || 'opencode-go').trim(), model: String(d.model || 'deepseek-v4-flash').trim(), maxTokens: Number(d.maxTokens) || 1600, reasoningEffort: String(d.reasoningEffort || 'off') },
      })
    }

    const addRoot = function () {
      const value = rootInput.trim()
      if (value.length === 0) return
      const current = data !== null && data.settings !== null ? data.settings : { roots: [], governanceRoot: '', rootTypes: {} }
      const roots = (current.roots || []).concat([value])
      const rootTypes = Object.assign({}, current.rootTypes || {})
      if (rootTypes[value] === undefined) rootTypes[value] = current.governanceRoot ? 'mirror' : 'local'
      saveSettings({ roots: roots, governanceRoot: current.governanceRoot || value, rootTypes: rootTypes })
      setRootInput('')
    }

    const removeRoot = function (root) {
      const current = data !== null && data.settings !== null ? data.settings : { roots: [], governanceRoot: '', rootTypes: {} }
      const roots = (current.roots || []).filter(function (r) { return r !== root })
      const governanceRoot = current.governanceRoot === root ? (roots[0] || '') : (current.governanceRoot || '')
      const rootTypes = Object.assign({}, current.rootTypes || {})
      delete rootTypes[root]
      saveSettings({ roots: roots, governanceRoot: governanceRoot, rootTypes: rootTypes })
    }

    const setGovernance = function (root) {
      const current = data !== null && data.settings !== null ? data.settings : { roots: [], governanceRoot: '', rootTypes: {} }
      saveSettings({ roots: current.roots || [], governanceRoot: root, rootTypes: current.rootTypes || {} })
    }

    const setRootType = function (root, type) {
      const current = data !== null && data.settings !== null ? data.settings : { roots: [], governanceRoot: '', rootTypes: {} }
      const rootTypes = Object.assign({}, current.rootTypes || {})
      rootTypes[root] = type
      saveSettings({ roots: current.roots || [], governanceRoot: current.governanceRoot || '', rootTypes: rootTypes })
    }

    const draft = function (text) {
      const res = writeDraft(currentId, text)
      if (res.ok === true) {
        flash(t('repo.draftWritten'))
        repoOpenStore.set(false)
        focusComposer()
      } else fail(res.error || t('repo.draftFailed'))
    }

    const draftInitGit = function (project) {
      draft('请为本地项目 ' + project.name + '（' + project.path + '）初始化 Git 并登记：\n1. cd ' + project.path + '\n2. 若没有 .git，执行 git init；必要时创建 .gitignore\n3. git add -A && git commit -m "chore: init repository"\n4. 更新 _governance/repos.json（git=true）和 REPOS.md\n5. 不要推送远端（除非我另行要求）。')
    }

    const draftSync = function (project) {
      const cloudRepo = typeof project.cloudRepo === 'string' && project.cloudRepo.length > 0 ? project.cloudRepo : ''
      if (cloudRepo.length > 0) {
        const branch = gitStates[project.path] !== undefined && gitStates[project.path] !== null && gitStates[project.path].branch ? gitStates[project.path].branch : 'main'
        draft('请同步本地项目 ' + project.name + ' 到 GitHub（' + cloudRepo + '）：\n1. cd ' + project.path + '\n2. 若有未提交变更，先 git add -A 并提交（commit message 无法判断时问我）\n3. git push origin ' + branch + '\n4. 更新 repos.json 中该项目的 lastSync/updatedAt\n5. 更新 REPOS.md')
      } else {
        const vis = project.private === true ? '--private' : '--public'
        const repoName = project.name
        draft('请为本地项目 ' + project.name + ' 创建 GitHub 仓库并推送：\n1. cd ' + project.path + '\n2. 若有未提交变更，先提交\n3. gh repo create ' + repoName + ' --source --push ' + vis + '\n4. 将 cloudRepo 写入 repos.json（形如 ' + (vis === '--private' ? '你的用户名/' + repoName : 'as1350/' + repoName) + '）\n5. 更新 REPOS.md')
      }
    }

    const draftPull = function (project) {
      const branch = gitStates[project.path] !== undefined && gitStates[project.path] !== null && gitStates[project.path].branch ? gitStates[project.path].branch : 'main'
      draft('请拉取本地项目 ' + project.name + ' 的远端更新：\n1. cd ' + project.path + '\n2. git pull origin ' + branch + '\n3. 若有冲突停下来问我\n4. 更新 repos.json 中该项目的 lastSync/updatedAt\n5. 更新 REPOS.md')
    }

    const draftRegisterLocalChanges = function (project) {
      const commits = Array.isArray(project.unregisteredOutgoing) ? project.unregisteredOutgoing : []
      const lines = commits.map(function (c) { return '- ' + String(c.hash || '').slice(0, 7) + ' ' + String(c.subject || '') }).join('\n')
      draft('请为本地项目 ' + project.name + ' 登记本地修改：\n1. cd ' + project.path + '\n2. 确认在本地维护分支（如 local-custom；不存在则基于 main 创建）\n3. 将以下未登记提交补登到 CHANGELOG-local.md：\n' + lines + '\n4. 提交 CHANGELOG-local.md\n5. 如需同步上游：git pull --rebase origin main，冲突停下问我')
    }

    const draftUpdateMirror = function (mirror) {
      const st = gitStates[mirror.path]
      const branch = st !== undefined && st !== null && st.branch ? st.branch : 'main'
      draft('请更新镜像 ' + mirror.name + ' 并处理装配检查：\n' +
        '1. cd ' + mirror.path + '\n' +
        '2. 记录旧状态：git rev-parse HEAD + 旧版本标识；git status --porcelain 必须为空（mirror 纪律），非空则停下报告待用户裁决\n' +
        '   （版本标识取法：git describe --tags > 仓库内 VERSION/version 文件 > 短 SHA；统一格式「<版本>[+N] (<短SHA>)」，如 0.1.179+108 (d45135d8)）\n' +
        '3. upstream remote 缺失时按 D:\\Desktop\\Dsh\\本地项目\\_governance\\repos.json 该条目 upstream 字段补配（与 origin 同址惯例）；git fetch upstream\n' +
        '4. git reset --hard upstream/' + branch + '\n' +
        '5. 若存在 .gitmodules：git submodule update --init --recursive；子模块增删/指针变化记入更新总结\n' +
        '6. 同法取新版本标识，并总结更新内容：提交数 + diff --stat 合计 + 主要变更按模块归类\n' +
        '7. 治理落账 D:\\Desktop\\Dsh\\本地项目\\_governance：\n' +
        '   a. repos.json：顶层 updatedAt + 该条目 lastChecked/lastSync（UTC ISO）+ notes 前置一行同步摘要；写后 JSON 校验\n' +
        '   b. REPOS.md 备注列追加「最近同步：<UTC+8 时间>（版本, 短SHA）」\n' +
        '8. 装配判定（短路）：读 D:\\Desktop\\Dsh\\本地项目\\_governance\\MANIFEST.md 有此包行 或 C:\\Users\\ThinkBook\\.dsh\\profiles\\web\\package.json 的 dependencies/dsh.profile.bundles 含此包 → dev_plugin_status 复核账实一致；均无 = 未装配，跳到 10\n' +
        '9. 已装配且版本有变化 → 按 local-governance 流程 A/B，以 MANIFEST「装配方式」列分支：\n' +
        '   - file: tgz：构建（仅有 build script 时；上游 lib/ 入库免构建）→ npm pack 快照入 _snapshots\\<包名>\\ → profile 切 file: 新 tgz → 清 pnpm 缓存（删 profiles\\web\\node_modules\\.pnpm\\lock.yaml 与 node_modules\\.package-map.json）→ pnpm install → 更新 MANIFEST（装配版本改列/归档版本追加/备注）\n' +
        '   - link: 直连：随镜像自动生效，仅更 MANIFEST 备注\n' +
        '   - registry 固定版本：profile 改版本号 → 清 pnpm 缓存 → pnpm install\n' +
        '   - 目录复制（预设）：删旧建新复制（ESM 缓存规则）\n' +
        '   装配更新收尾：loader 管理模块 dev_reload_package；官方 bundle 通道需重启 DSH 生效。完成后询问用户：立即审核 or 推迟\n' +
        '10. local-governance 流程 I：镜像同步静默入队 pending-reviews.json（id=<repo>-sync-<日期>，type=registry，status=pending，from/toVersion 记版本标识，其余沿用队列先例）\n' +
        '11. 汇报四段：镜像结果（旧→新 commit/版本）｜更新内容总结｜装配状态（已装配已更新 / 版本未变 / 未装配仅镜像同步）｜治理落账清单')
    }

    const draftConvertMirror = function (mirror) {
      draft('请将 ' + mirror.name + ' 从镜像转为本地项目：\n1. cd ' + mirror.path + '\n2. 调整 remote（origin=自己的仓库，upstream 可保留）\n3. 更新 repos.json type=local\n4. 更新 REPOS.md')
    }

    const openFolder = function (path) {
      port.openPath(path).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') fail(t('repo.openFailed', { message: result.error }))
      }).catch(function (error) { fail(t('repo.openFailed', { message: error instanceof Error ? error.message : String(error) })) })
    }

    const openGitHub = function (cloudRepo) {
      if (typeof cloudRepo !== 'string' || cloudRepo.length === 0) return
      window.open('https://github.com/' + cloudRepo, '_blank', 'noopener')
    }

    const copyRemoteClone = function (base) {
      if (typeof base !== 'string' || base.length === 0) return
      const cmd = cloneMode === 'ssh' ? 'git clone git@github.com:' + base + '.git' : 'git clone https://github.com/' + base + '.git'
      if (navigator.clipboard !== undefined) {
        navigator.clipboard.writeText(cmd).then(function () { flash(t('repo.copied')) }).catch(function () { fail(t('repo.copyFailed')) })
      } else {
        fail(t('repo.copyFailed'))
      }
    }

    const copyClone = function (project) {
      const base = typeof project.cloudRepo === 'string' && project.cloudRepo.length > 0 ? project.cloudRepo : ''
      copyRemoteClone(base)
    }

    const copySkillGlobal = function (skill) {
      setBusy(skill.path)
      port.repoCopySkillToGlobal({ src: skill.path, name: skill.name }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        if (result !== null && result.skipped === true) flash(t('repo.skillSkip', { path: result.path }))
        else flash(t('repo.skillCopied', { path: result.path }))
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    const copySkillProject = function (skill) {
      if (!sessionCwd) { fail(t('repo.noProjectCwd')); return }
      setBusy(skill.path)
      port.repoCopySkillToProject({ src: skill.path, name: skill.name, cwd: sessionCwd }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        if (result !== null && result.skipped === true) flash(t('repo.skillSkip', { path: result.path }))
        else flash(t('repo.skillCopied', { path: result.path }))
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    const startApplyPlugin = function (skill) {
      setApplySkill(skill); setSelectedProject(''); setPluginPackages([]); setSelectedPlugin('')
    }

    const selectApplyProject = function (path) {
      setSelectedProject(path); setSelectedPlugin(''); setPluginPackages([])
      if (path.length === 0) return
      port.repoScanPluginPackages({ path: path }).then(function (result) {
        if (result !== null && typeof result === 'object' && Array.isArray(result.packages)) setPluginPackages(result.packages)
      }).catch(function () { setPluginPackages([]) })
    }

    const draftApplyPlugin = function (skill) {
      const pkg = pluginPackages.find(function (p) { return p.path === selectedPlugin })
      if (pkg === undefined) { fail(t('repo.pluginRequired')); return }
      const target = pkg.relative.length > 0 ? pkg.relative + '/skills/' + skill.name : 'skills/' + skill.name
      draft('请把技能 ' + skill.name + ' 从 ' + skill.path + ' 复制到 ' + selectedProject + '/' + target + '，并按插件规范处理打包/提交（必要时升版本、更新 MANIFEST）。')
    }

    const projectState = function (project) {
      const st = gitStates[project.path]
      if (project.hasGit !== true || st === undefined || st === null || st.isRepo !== true) return 'nogit'
      if (st.hasUpstream === true) {
        if (st.behind > 0) return 'behind'
        if (st.ahead > 0) return 'ahead'
        return 'synced'
      }
      if (st.remote.length > 0) return 'untracked'
      return 'noremote'
    }

    const projectStateText = function (project) {
      const key = projectState(project)
      return t('repo.state.' + key)
    }

    const canClone = function (project) {
      const cloudRepo = typeof project.cloudRepo === 'string' && project.cloudRepo.length > 0 ? project.cloudRepo : ''
      if (cloudRepo.length === 0) return false
      if (project.private === true) return false
      return true
    }

    const setVisibility = function (project) {
      const cloudRepo = typeof project.cloudRepo === 'string' && project.cloudRepo.length > 0 ? project.cloudRepo : ''
      if (cloudRepo.length === 0) { fail(t('repo.noCloud')); return }
      const next = project.private === true ? 'public' : 'private'
      const nextPrivate = next === 'private'
      setBusy(project.path)
      patchProjectLocal(project.path, { private: nextPrivate })
      port.repoSetVisibility({ path: project.path, cloudRepo: cloudRepo, visibility: next }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { patchProjectLocal(project.path, { private: project.private === true }); fail(result.error); return }
        const label = next === 'public' ? t('repo.public') : t('repo.private')
        flash(t('repo.visibilityChanged', { visibility: label }))
        reload()
      }).catch(function (error) { setBusy(null); patchProjectLocal(project.path, { private: project.private === true }); fail(error instanceof Error ? error.message : String(error)) })
    }

    const registerService = function (project) {
      setBusy(project.path)
      patchProjectLocal(project.path, { registered: true })
      port.serviceRegister({ path: project.path }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { patchProjectLocal(project.path, { registered: false }); fail(result.error); return }
        patchRepoRegistered(project.path, true)
        flash(t('service.registeredDone'))
        reload()
      }).catch(function (error) { setBusy(null); patchProjectLocal(project.path, { registered: false }); fail(error instanceof Error ? error.message : String(error)) })
    }

    const deleteSkill = function (skill) {
      setBusy(skill.path)
      port.repoDeleteSkill({ path: skill.path, name: skill.name }).then(function (result) {
        setBusy(null)
        setDeleteConfirm(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        flash(t('repo.skillDeleted', { name: skill.name }))
        draft('请提交并推送 skill仓库 的删除改动：已删除技能 ' + skill.name + '（' + skill.path + '），并已更新 SKILLS.md。')
        reload()
      }).catch(function (error) { setBusy(null); setDeleteConfirm(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    const joinPath = function (base, name) {
      return base.replace(/[\\/]+$/, '') + '\\' + name
    }

    const parseCloneInput = function (raw) {
      let s = String(raw || '').trim()
      const prefix = /^git\s+clone\s+(.+)$/i.exec(s)
      if (prefix !== null) s = prefix[1].trim()
      s = s.replace(/^["']|["']$/g, '')
      const ssh = /^(?:ssh:\/\/)?git@([^:]+):([^/]+\/[^/]+?)(?:\.git)?$/.exec(s)
      if (ssh !== null) {
        const repo = ssh[2].replace(/\.git$/, '')
        return { type: 'ssh', url: s, repoName: repo.split('/')[1] || '', cloudRepo: repo }
      }
      const https = /^https?:\/\/(?:www\.)?github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(s)
      if (https !== null) {
        const repo = https[1].replace(/\.git$/, '')
        return { type: 'https', url: s, repoName: repo.split('/')[1] || '', cloudRepo: repo }
      }
      const seg = s.replace(/\.git$/, '').split(/[\/\\:]/).filter(Boolean).pop() || ''
      return { type: 'unknown', url: s, repoName: seg, cloudRepo: '' }
    }

    const loadCloneDirs = function (path) {
      port.repoListDirs({ path: path }).then(function (result) {
        if (result !== null && typeof result === 'object' && Array.isArray(result.dirs)) setCloneDirs(result.dirs)
        else setCloneDirs([])
      }).catch(function () { setCloneDirs([]) })
    }

    const openCloneDialog = function (root) {
      setCloneRoot(root)
      setClonePath(root)
      setCloneUrl('')
      setNewCatName('')
      setCloneDirs([])
      loadCloneDirs(root)
    }

    const enterCloneDir = function (name) {
      const next = joinPath(clonePath, name)
      setClonePath(next)
      setCloneDirs([])
      loadCloneDirs(next)
    }

    const addCloneCategory = function () {
      const name = newCatName.trim()
      if (name.length === 0) { fail(t('repo.catNameRequired')); return }
      setCloneBusy(true)
      port.repoCreateDir({ path: joinPath(clonePath, name) }).then(function (result) {
        setCloneBusy(false)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        setNewCatName('')
        loadCloneDirs(clonePath)
      }).catch(function (error) { setCloneBusy(false); fail(error instanceof Error ? error.message : String(error)) })
    }

    const cloneToCurrent = function () {
      if (cloneUrl.trim().length === 0) { fail(t('repo.cloneUrlRequired')); return }
      const parsed = parseCloneInput(cloneUrl)
      if (parsed.repoName.length === 0) { fail(t('repo.cloneUrlInvalid')); return }
      if (cloneDirs.some(function (d) { return d.toLowerCase() === parsed.repoName.toLowerCase() })) {
        fail(t('repo.cloneExists'))
        return
      }
      setCloneBusy(true)
      port.repoGetProxy().then(function (proxyResult) {
        setCloneBusy(false)
        const httpProxy = proxyResult !== null && typeof proxyResult === 'object' && typeof proxyResult.httpProxy === 'string' && proxyResult.httpProxy.length > 0 ? proxyResult.httpProxy : '未设置'
        const httpsProxy = proxyResult !== null && typeof proxyResult === 'object' && typeof proxyResult.httpsProxy === 'string' && proxyResult.httpsProxy.length > 0 ? proxyResult.httpsProxy : '未设置'
        const target = joinPath(clonePath, parsed.repoName)
        const typeText = parsed.type === 'ssh' ? 'SSH' : (parsed.type === 'https' ? 'HTTPS' : '未知')
        const command = '请使用 dsh-repo-clone 技能克隆 GitHub 仓库到本地：\n- 仓库地址：' + cloneUrl.trim() + '（已识别为 ' + typeText + '）\n- 目标目录：' + target + '\n- 当前 git 代理：http.proxy=' + httpProxy + ' / https.proxy=' + httpsProxy + '\n\n要求：加载 dsh-repo-clone 技能并按其步骤执行（代理检查 → 克隆 → 校验）；克隆完成后按 local-governance 技能完成 repos.json 与 REPOS.md 登记。'
        draft(command)
        setCloneRoot(null)
        setClonePath('')
        setCloneDirs([])
        setCloneUrl('')
        setNewCatName('')
      }).catch(function (error) { setCloneBusy(false); fail(error instanceof Error ? error.message : String(error)) })
    }

    const roots = data !== null && data.settings !== null && Array.isArray(data.settings.roots) ? data.settings.roots : []
    const governanceRoot = data !== null && data.settings !== null && typeof data.settings.governanceRoot === 'string' ? data.settings.governanceRoot : ''
    const allProjects = data !== null && Array.isArray(data.projects) ? data.projects : []
    const projects = allProjects
    const localProjects = allProjects.filter(function (p) { return p.type !== 'mirror' })
    const mirrors = data !== null && Array.isArray(data.mirrors) ? data.mirrors : []
    const skillGroups = data !== null && Array.isArray(data.skillGroups) ? data.skillGroups : []

    const rootGroups = roots.map(function (root) {
      return { root: root, items: localProjects.filter(function (p) { return p.root === root }) }
    })

    const navFor = function (key, label, count) {
      return h('button', { type: 'button', key: key, className: tab === key ? 'skm-nav-item skm-nav-item-active' : 'skm-nav-item', onClick: function () { setTab(key) } },
        h('span', { className: 'skm-nav-item-label' }, label), h('span', { className: 'skm-nav-item-count' }, String(count)))
    }

    const projectCard = function (project) {
      const st = projectState(project)
      const cloudRepo = typeof project.cloudRepo === 'string' && project.cloudRepo.length > 0 ? project.cloudRepo : ''
      const canCloneNow = canClone(project)
      const actions = []
      actions.push(h('button', { type: 'button', key: 'open', className: 'skm-btn', onClick: function () { openFolder(project.path) } }, t('repo.open')))
      if (project.hasGit !== true) {
        actions.push(h('button', { type: 'button', key: 'init', className: 'skm-btn', onClick: function () { draftInitGit(project) } }, t('repo.initGit')))
      } else {
        actions.push(h('button', { type: 'button', key: 'sync', className: 'skm-btn', onClick: function () { draftSync(project) } }, cloudRepo.length > 0 ? t('repo.sync') : t('repo.createAndPush')))
      }
      if (cloudRepo.length > 0) {
        actions.push(h('button', { type: 'button', key: 'gh', className: 'skm-btn', onClick: function () { openGitHub(cloudRepo) } }, t('repo.openGh')))
      }
      if (canCloneNow) {
        actions.push(h('button', { type: 'button', key: 'clone', className: 'skm-btn', onClick: function () { copyClone(project) } }, t('repo.clone') + (cloneMode === 'ssh' ? ' SSH' : ' HTTPS')))
      } else {
        const label = project.private === true ? t('repo.privateLocked') : (cloudRepo.length > 0 ? '' : t('repo.noCloud'))
        actions.push(h('button', { type: 'button', key: 'clone', className: 'skm-btn', disabled: true, title: label }, t('repo.clone')))
      }
      if (st === 'behind') actions.push(h('button', { type: 'button', key: 'pull', className: 'skm-btn', onClick: function () { draftPull(project) } }, t('repo.pull')))
      const visButton = cloudRepo.length > 0 ? h('button', {
        type: 'button',
        key: 'vis',
        className: 'skm-repo-badge' + (project.private === true ? ' skm-repo-badge-private' : ' skm-repo-badge-public'),
        title: project.private === true ? t('repo.private') : t('repo.public'),
        disabled: busy === project.path,
        onClick: function () { setVisibility(project) },
      }, project.private === true ? t('repo.private') : t('repo.public')) : null
      const serviceBadge = h('button', {
        type: 'button',
        key: 'svc',
        className: 'skm-repo-badge' + (project.registered === true ? ' skm-repo-badge-service-on' : ' skm-repo-badge-service-off'),
        title: project.registered === true ? t('service.badge.registered') : t('service.badge.register'),
        disabled: busy === project.path,
        onClick: function () { if (project.registered === true) serviceOpenStore.set(true); else registerService(project) },
      }, project.registered === true ? t('service.badge.registered') : t('service.badge.register'))
      return h('div', Object.assign({ key: project.path, className: 'skm-repo-card' }, cardPointerHandlers('repo', project)),
        h('div', { className: 'skm-repo-head' },
          h('span', { className: 'skm-repo-name' }, project.name),
          serviceBadge,
          visButton,
          h('span', { className: 'skm-repo-badge' }, projectStateText(project))),
        h('div', { className: 'skm-repo-path' }, project.rel !== undefined && project.rel !== null && project.rel.length > 0 ? project.rel : project.path),
        h('div', { className: 'skm-repo-actions' }, actions))
    }

    const mirrorCloudRepo = function (mirror) {
      if (mirror.cloudRepo !== undefined && mirror.cloudRepo !== null && String(mirror.cloudRepo).length > 0) return String(mirror.cloudRepo)
      const up = mirror.meta !== null && mirror.meta !== undefined && typeof mirror.meta.upstream === 'string' ? mirror.meta.upstream : ''
      if (up.length === 0) return ''
      let s = up.trim().replace(/\.git$/, '')
      if (s.startsWith('git@')) s = s.replace(/^git@[^:]+:/, 'https://github.com/')
      const m = /github\.com[:/]([^/]+\/[^/]+?)$/.exec(s)
      return m ? m[1] : ''
    }

    const mirrorCard = function (mirror) {
      const st = gitStates[mirror.path]
      const needUpdate = st !== undefined && st !== null && st.isRepo === true && st.behind > 0
      const cloudRepo = mirrorCloudRepo(mirror)
      const actions = []
      actions.push(h('button', { type: 'button', key: 'open', className: 'skm-btn', onClick: function () { openFolder(mirror.path) } }, t('repo.open')))
      if (needUpdate) {
        actions.push(h('button', { type: 'button', key: 'update', className: 'skm-btn skm-btn-primary', onClick: function () { draftUpdateMirror(mirror) } }, t('repo.update')))
      } else {
        actions.push(h('button', { type: 'button', key: 'update', className: 'skm-btn', disabled: true, title: t('repo.noUpdate') }, t('repo.noUpdate')))
      }
      if (cloudRepo.length > 0) {
        actions.push(h('button', { type: 'button', key: 'gh', className: 'skm-btn', onClick: function () { openGitHub(cloudRepo) } }, t('repo.openGh')))
      }
      if (cloudRepo.length > 0 && mirror.private !== true) {
        actions.push(h('button', { type: 'button', key: 'clone', className: 'skm-btn', onClick: function () { copyRemoteClone(cloudRepo) } }, t('repo.clone') + (cloneMode === 'ssh' ? ' SSH' : ' HTTPS')))
      } else if (cloudRepo.length > 0) {
        actions.push(h('button', { type: 'button', key: 'clone', className: 'skm-btn', disabled: true, title: t('repo.privateLocked') }, t('repo.clone')))
      }
      return h('div', Object.assign({ key: mirror.path, className: 'skm-repo-card' }, cardPointerHandlers('repo', mirror)),
        h('div', { className: 'skm-repo-head' },
          h('span', { className: 'skm-repo-name' }, mirror.name),
          h('button', {
            type: 'button',
            key: 'svc',
            className: 'skm-repo-badge' + (mirror.registered === true ? ' skm-repo-badge-service-on' : ' skm-repo-badge-service-off'),
            title: mirror.registered === true ? t('service.badge.registered') : t('service.badge.register'),
            disabled: busy === mirror.path,
            onClick: function () { if (mirror.registered === true) serviceOpenStore.set(true); else registerService(mirror) },
          }, mirror.registered === true ? t('service.badge.registered') : t('service.badge.register')),
          h('span', { className: 'skm-repo-badge' + (needUpdate ? ' skm-repo-badge-warn' : '') }, needUpdate ? t('repo.needsUpdate') : t('repo.upToDate'))),
        h('div', { className: 'skm-repo-path' }, mirror.path),
        h('div', { className: 'skm-repo-actions' }, actions))
    }

    const skillCard = function (skill) {
      const isApplying = applySkill !== null && applySkill.path === skill.path
      const actions = []
      actions.push(h('button', { type: 'button', key: 'open', className: 'skm-btn', onClick: function () { openFolder(skill.path) } }, t('repo.open')))
      actions.push(h('button', { type: 'button', key: 'g', className: 'skm-btn', disabled: busy === skill.path, onClick: function () { copySkillGlobal(skill) } }, t('repo.applyGlobal')))
      actions.push(h('button', { type: 'button', key: 'p', className: 'skm-btn', disabled: busy === skill.path, onClick: function () { copySkillProject(skill) } }, t('repo.applyProject')))
      actions.push(h('button', { type: 'button', key: 'plugin', className: 'skm-btn', onClick: function () { startApplyPlugin(skill) } }, t('repo.applyPlugin')))
      actions.push(h('button', { type: 'button', key: 'del', className: 'skm-btn' + (deleteConfirm === skill.path ? ' skm-btn-danger' : ''), onClick: function () { if (deleteConfirm === skill.path) deleteSkill(skill); else setDeleteConfirm(skill.path) } }, deleteConfirm === skill.path ? t('repo.deleteConfirm') : t('repo.delete')))
      const form = isApplying ? h('div', { className: 'skm-repo-apply-form', key: 'form' },
        h('select', { className: 'skm-select', value: selectedProject, onChange: function (event) { selectApplyProject(event.target.value) } },
          h('option', { value: '' }, t('repo.selectProject')),
          projects.map(function (p) { return h('option', { key: p.path, value: p.path }, p.name + ' · ' + p.path) })),
        selectedProject.length > 0 ? h('select', { className: 'skm-select', value: selectedPlugin, onChange: function (event) { setSelectedPlugin(event.target.value) } },
          h('option', { value: '' }, t('repo.selectPlugin')),
          pluginPackages.map(function (p) { return h('option', { key: p.path, value: p.path }, p.name) })) : null,
        selectedPlugin.length > 0 ? h('button', { type: 'button', className: 'skm-btn skm-btn-primary', onClick: function () { draftApplyPlugin(skill) } }, t('repo.generateCommand')) : null,
        h('button', { type: 'button', className: 'skm-btn', onClick: function () { setApplySkill(null) } }, t('repo.cancel'))) : null
      return h('div', Object.assign({ key: skill.path, className: 'skm-repo-card' }, cardPointerHandlers('skill', skill)),
        h('div', { className: 'skm-repo-head' },
          h('span', { className: 'skm-repo-name' }, skill.name),
          h('span', { className: 'skm-repo-badge' }, skill.sub || skill.path)),
        h('div', { className: 'skm-repo-path' }, skill.path),
        h('div', { className: 'skm-repo-actions' }, actions),
        form)
    }

    const contentChildren = []
    contentChildren.push(h('p', { className: 'skm-notice', key: 'hint' }, t('repo.hint')))
    if (state.error !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'error' }, t('repo.readError', { message: state.error })))
    if (opError !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'opError' }, opError))
    if (notice !== null) contentChildren.push(h('p', { className: 'skm-notice', key: 'notice' }, notice))

    const aiForm = currentAiDraft()
    const aiProviderList = Array.isArray(aiProviders) ? aiProviders : []
    const aiOptionLabel = function (name, id) {
      const n = typeof name === 'string' && name.length > 0 ? name : String(id)
      if (n === String(id)) return n
      const norm = function (s) { return String(s).toLowerCase().replace(/[\s_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') }
      if (norm(n) === norm(id)) return n
      if (String(n).toLowerCase().indexOf(String(id).toLowerCase()) !== -1) return n
      return n + '（' + id + '）'
    }
    const aiProviderOptions = aiProviderList.map(function (p) { return p.id })
    if (aiProviderOptions.indexOf(aiForm.provider) === -1) aiProviderOptions.unshift(aiForm.provider)
    const aiSelectedProvider = aiProviderList.find(function (p) { return p.id === aiForm.provider }) || null
    const aiModelList = aiSelectedProvider !== null && Array.isArray(aiSelectedProvider.models) ? aiSelectedProvider.models : []
    const aiModelOptions = aiModelList.map(function (m) { return m.id })
    if (aiModelOptions.indexOf(aiForm.model) === -1) aiModelOptions.unshift(aiForm.model)
    const aiSelectedModel = aiModelList.find(function (m) { return m.id === aiForm.model }) || null
    const aiEffortList = aiSelectedModel !== null && Array.isArray(aiSelectedModel.efforts) && aiSelectedModel.efforts.length > 0 ? aiSelectedModel.efforts : [{ id: 'off', name: 'Off' }]
    const aiEffortValue = typeof aiForm.reasoningEffort === 'string' && aiForm.reasoningEffort.length > 0 ? aiForm.reasoningEffort : 'off'
    const aiEffortOptions = aiEffortList.map(function (e) { return e.id })
    if (aiEffortOptions.indexOf(aiEffortValue) === -1) aiEffortOptions.unshift(aiEffortValue)
    contentChildren.push(h('div', { className: 'skm-repo-settings', key: 'settings' },
      h('div', { className: 'skm-repo-roots' },
        roots.length === 0 ? h('span', { className: 'skm-repo-path' }, t('repo.noRoots')) :
        roots.map(function (root) {
          const rowActions = []
          if (root === governanceRoot) {
            rowActions.push(h('button', { type: 'button', key: 'switch', className: 'skm-btn', onClick: function () { if (window.confirm(t('repo.switchGovernanceConfirm'))) setSwitchingRoot(true) } }, t('repo.switchGovernance')))
          } else if (switchingRoot === true) {
            rowActions.push(h('button', { type: 'button', key: 'pick', className: 'skm-btn skm-btn-primary', onClick: function () { if (window.confirm(t('repo.switchGovernanceTo', { path: root }))) { setGovernance(root); setSwitchingRoot(false) } } }, t('repo.select')))
          }
          rowActions.push(h('button', { type: 'button', key: 'clone', className: 'skm-btn', onClick: function () { openCloneDialog(root) } }, t('repo.cloneRepo')))
          rowActions.push(h('button', { type: 'button', key: 'remove', className: 'skm-btn', disabled: busy === 'settings', onClick: function () { removeRoot(root) } }, t('repo.remove')))
          return h('div', { key: root, className: 'skm-repo-root' + (switchingRoot === true && root !== governanceRoot ? ' skm-repo-root-selectable' : '') },
            h('span', { className: 'skm-repo-path' }, root + (root === governanceRoot ? ' · ' + t('repo.governance') : '')),
            rowActions)
        })),
      switchingRoot === true ? h('div', { className: 'skm-repo-actions', key: 'switchCancel' },
        h('span', { className: 'skm-repo-path' }, t('repo.switchHint')),
        h('button', { type: 'button', className: 'skm-btn', onClick: function () { setSwitchingRoot(false) } }, t('repo.cancelSwitch'))) : null,
      h('div', { className: 'skm-repo-add' },
        h('input', { className: 'skm-select', type: 'text', placeholder: t('repo.rootPlaceholder'), value: rootInput, onChange: function (event) { setRootInput(event.target.value) } }),
        h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busy === 'settings', onClick: addRoot }, t('repo.addRoot'))),
      h('div', { className: 'skm-ai-settings' },
        h('div', { className: 'skm-ai-settings-title' }, t('repo.aiSettingsTitle')),
        h('div', { className: 'skm-ai-settings-row' },
          h('label', { className: 'skm-ai-settings-toggle' },
            h('input', { type: 'checkbox', checked: aiForm.enabled !== false, onChange: function (event) { setAiDraft(Object.assign({}, currentAiDraft(), { enabled: event.target.checked })) } }),
            ' ' + t('repo.aiSettingsEnabled')),
          h('span', { className: 'skm-ai-settings-label' }, t('repo.aiSettingsProvider')),
          h('select', { className: 'skm-select skm-ai-settings-input', value: aiForm.provider, onChange: function (event) {
            const pid = event.target.value
            const p = aiProviderList.find(function (x) { return x.id === pid })
            const firstModel = p !== null && p !== undefined && Array.isArray(p.models) && p.models.length > 0 ? p.models[0].id : aiForm.model
            setAiDraft(Object.assign({}, currentAiDraft(), { provider: pid, model: firstModel, reasoningEffort: 'off' }))
          } }, aiProviderOptions.map(function (id) {
            const p = aiProviderList.find(function (x) { return x.id === id })
            return h('option', { key: 'p-' + id, value: id }, p !== null && p !== undefined ? aiOptionLabel(p.name, id) : id)
          })),
          h('span', { className: 'skm-ai-settings-label' }, t('repo.aiSettingsModel')),
          h('select', { className: 'skm-select skm-ai-settings-input', value: aiForm.model, onChange: function (event) { setAiDraft(Object.assign({}, currentAiDraft(), { model: event.target.value, reasoningEffort: 'off' })) } },
            aiModelOptions.map(function (id) {
              const m = aiModelList.find(function (x) { return x.id === id })
              return h('option', { key: 'm-' + id, value: id }, m !== null && m !== undefined ? aiOptionLabel(m.name, id) : id)
            })),
          h('span', { className: 'skm-ai-settings-label' }, t('repo.aiSettingsEffort')),
          h('select', { className: 'skm-select skm-ai-settings-input', value: aiEffortValue, onChange: function (event) { setAiDraft(Object.assign({}, currentAiDraft(), { reasoningEffort: event.target.value })) } },
            aiEffortOptions.map(function (id) {
              const e = aiEffortList.find(function (x) { return x.id === id })
              return h('option', { key: 'e-' + id, value: id }, e !== null && e !== undefined ? aiOptionLabel(e.name, id) : id)
            })),
          h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busy === 'settings', onClick: saveAiSettings }, t('repo.aiSettingsSave'))))
    ))

    const navItems = [
      navFor('projects', t('repo.tab.projects'), localProjects.length),
      navFor('mirrors', t('repo.tab.mirrors'), mirrors.length),
      navFor('skills', t('repo.tab.skills'), skillGroups.reduce(function (sum, g) { return sum + g.skills.length }, 0)),
    ]

    contentChildren.push(h('div', { className: 'skm-repo-tabs', key: 'tabs' }, navItems))

    if (tab === 'projects') {
      if (roots.length === 0) contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, t('repo.noRootsHint')))
      else if (localProjects.length === 0) contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, t('repo.noProjects')))
      else contentChildren.push(h('div', { className: 'skm-repo-list', key: 'list' },
        rootGroups.map(function (group) {
          if (group.items.length === 0) return null
          return h('div', { key: group.root, className: 'skm-repo-group' },
            h('div', { className: 'skm-repo-group-title' }, group.root),
            h('div', { className: 'skm-repo-grid' }, group.items.map(projectCard)))
        })
      ))
      contentChildren.push(h('div', { className: 'skm-repo-actions', key: 'cloneMode' },
        h('button', { type: 'button', className: 'skm-btn', onClick: function () { setCloneMode(cloneMode === 'https' ? 'ssh' : 'https') } }, t('repo.cloneMode') + (cloneMode === 'ssh' ? ' SSH' : ' HTTPS'))))
    } else if (tab === 'mirrors') {
      if (mirrors.length === 0) contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, t('repo.noMirrors')))
      else contentChildren.push(h('div', { className: 'skm-repo-grid', key: 'list' }, mirrors.map(mirrorCard)))
    } else {
      if (skillGroups.length === 0 || skillGroups.every(function (g) { return g.skills.length === 0 })) contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, t('repo.noSkills')))
      else contentChildren.push(h('div', { className: 'skm-repo-list', key: 'list' }, skillGroups.map(function (group) {
        if (group.skills.length === 0) return null
        return h('div', { key: group.key, className: 'skm-repo-group' },
          h('div', { className: 'skm-repo-group-title' }, t('repo.division.' + group.key) + (group.label ? ' · ' + group.label : '')),
          h('div', { className: 'skm-repo-grid' }, group.skills.map(skillCard)))
      })))
    }

    const cloneOverlay = cloneRoot !== null ? h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setCloneRoot(null) } },
      h('div', { className: 'skm-cfg-dialog', role: 'dialog', 'aria-modal': true, onClick: function (event) { event.stopPropagation() } },
        h('div', { className: 'skm-cfg-header' },
          h('div', { className: 'skm-cfg-title' }, t('repo.cloneTitle')),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { setCloneRoot(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-cfg-body' },
          h('label', { className: 'skm-field' }, h('span', { className: 'skm-field-label' }, t('repo.cloneUrlLabel')), h('input', { className: 'skm-select', type: 'text', placeholder: t('repo.cloneUrlPlaceholder'), value: cloneUrl, onChange: function (event) { setCloneUrl(event.target.value) } })),
          h('p', { className: 'skm-repo-path' }, t('repo.cloneCurrentDir') + ' ' + clonePath + '\\'),
          h('div', { className: 'skm-repo-clone-list' },
            clonePath !== cloneRoot ? h('button', { type: 'button', className: 'skm-btn', onClick: function () { setClonePath(cloneRoot); loadCloneDirs(cloneRoot) } }, t('repo.goUp')) : null,
            cloneDirs.length === 0 ? h('p', { className: 'skm-repo-path' }, t('repo.noCategories')) : cloneDirs.map(function (dir) { return h('button', { key: dir, type: 'button', className: 'skm-btn', onClick: function () { enterCloneDir(dir) } }, dir) }),
            h('div', { className: 'skm-repo-actions' },
              h('input', { className: 'skm-select', type: 'text', placeholder: t('repo.newCatPlaceholder'), value: newCatName, onChange: function (event) { setNewCatName(event.target.value) } }),
              h('button', { type: 'button', className: 'skm-btn', disabled: cloneBusy, onClick: addCloneCategory }, t('repo.addCategory'))),
            h('div', { className: 'skm-repo-actions' },
              h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: cloneBusy, onClick: cloneToCurrent }, t('repo.cloneHere')),
              h('button', { type: 'button', className: 'skm-btn', onClick: function () { setCloneRoot(null) } }, t('repo.cancel'))))))) : null

    const detailBody = function (info) {
      const children = []
      const updateKids = []
      const hasLocalDoc = info.localDoc !== null && info.localDoc !== undefined && info.localDoc.exists === true
      if (info.git.isRepo !== true) {
        updateKids.push(h('p', { className: 'skm-notice', key: 'nogit' }, t('repo.detail.noGit')))
      } else if (info.type === 'mirror') {
        if (info.git.behind > 0) {
          updateKids.push(h('p', { className: 'skm-detail-lead', key: 'lead' }, t('repo.detail.update.behind', { count: info.git.behind })))
          updateKids.push(commitList(info.incoming, info.path, info.localDoc))
        } else {
          updateKids.push(h('p', { className: 'skm-detail-lead', key: 'lead' }, t('repo.detail.update.noneMirror')))
        }
      } else {
        if (info.git.ahead > 0) {
          updateKids.push(h('p', { className: 'skm-detail-lead', key: 'lead' }, t('repo.detail.update.ahead', { count: info.git.ahead })))
          updateKids.push(commitList(info.outgoing, info.path, info.localDoc))
        } else {
          updateKids.push(h('p', { className: 'skm-detail-lead', key: 'lead' }, t('repo.detail.update.noneLocal')))
        }
      }
      children.push(h('section', { className: 'skm-detail-section', key: 'update' },
        h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.updateTitle')), updateKids))

      if (info.type === 'mirror') {
        // 0.15.0：GitHub 镜像卡片的「本地更新」区块（人工文档条目为主 + git 兜底）
        const localKids = []
        const docRows = localDocEntryList(info.localDoc, info.path)
        if (docRows !== null) localKids.push(docRows)
        if (info.git.ahead > 0) {
          const uncovered = (info.outgoing || []).filter(function (c) { return findLocalDocEntryClient(info.localDoc, c.hash) === null })
          if (uncovered.length > 0) {
            localKids.push(h('p', { className: 'skm-detail-lead', key: 'ahead' }, t('repo.detail.update.ahead', { count: info.git.ahead })))
            localKids.push(commitList(uncovered, info.path, info.localDoc))
          }
        }
        if (docRows === null && info.git.ahead === 0) {
          localKids.push(h('p', { className: 'skm-notice', key: 'none' }, t('repo.detail.local.none')))
        }
        const notes = localDocNotes(info.localDoc)
        if (notes !== null) localKids.push(notes)
        children.push(h('section', { className: 'skm-detail-section', key: 'local' },
          h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.localTitle')), localKids))
      } else {
        const localKids = []
        const unregistered = Array.isArray(info.unregisteredOutgoing) ? info.unregisteredOutgoing : []
        if (unregistered.length > 0) {
          localKids.push(h('p', { className: 'skm-detail-lead', key: 'unreg-lead' }, t('repo.detail.registerHint')))
          localKids.push(commitList(unregistered, info.path, info.localDoc))
          localKids.push(h('button', { type: 'button', className: 'skm-btn skm-btn-primary', key: 'register', onClick: function () { draftRegisterLocalChanges(info) } }, t('repo.detail.registerAction')))
        }
        if (hasLocalDoc) {
          const uncoveredDoc = docEntriesUncovered(info.localDoc, info.outgoing)
          if (uncoveredDoc.length > 0) {
            const uncoveredRow = localDocEntryList({ exists: true, entries: uncoveredDoc, notes: [] }, info.path)
            if (uncoveredRow !== null) localKids.push(uncoveredRow)
          }
          const notes = localDocNotes(info.localDoc)
          if (notes !== null) localKids.push(notes)
        }
        if (localKids.length > 0) children.push(h('section', { className: 'skm-detail-section', key: 'local' },
          h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.localTitle')), localKids))
      }

      children.push(h('section', { className: 'skm-detail-section', key: 'history' },
        h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.historyTitle')),
        commitList(info.history, info.path, info.localDoc)))

      const aboutKids = []
      if (info.readme !== null && info.readme !== undefined) {
        if (typeof info.readme.title === 'string' && info.readme.title.length > 0) aboutKids.push(h('h4', { className: 'skm-detail-about-title', key: 'title' }, info.readme.title))
        if (typeof info.readme.intro === 'string' && info.readme.intro.length > 0) aboutKids.push(h('p', { className: 'skm-detail-about-intro', key: 'intro' }, info.readme.intro))
        if (typeof info.readme.text === 'string' && info.readme.text.length > 0) {
          if (readmeExpanded === true) aboutKids.push(h('pre', { className: 'skm-detail-readme', key: 'full' }, info.readme.text))
          aboutKids.push(h('button', { type: 'button', className: 'skm-btn skm-btn-ghost', key: 'toggle', onClick: function () { setReadmeExpanded(!readmeExpanded) } }, readmeExpanded === true ? t('repo.detail.readmeLess') : t('repo.detail.readmeMore')))
        }
      } else {
        aboutKids.push(h('p', { className: 'skm-notice', key: 'none' }, t('repo.detail.about.none')))
      }
      if (info.package !== null && info.package !== undefined) {
        aboutKids.push(h('div', { className: 'skm-detail-meta', key: 'pkg' },
          h('span', { className: 'skm-detail-meta-item' }, t('repo.detail.packageTitle') + '：' + String(info.package.name || info.name)),
          typeof info.package.version === 'string' && info.package.version.length > 0 ? h('span', { className: 'skm-detail-meta-item' }, t('repo.detail.package.version') + '：' + info.package.version) : null,
          typeof info.package.description === 'string' && info.package.description.length > 0 ? h('span', { className: 'skm-detail-meta-item' }, info.package.description) : null))
      }
      children.push(h('section', { className: 'skm-detail-section', key: 'about' },
        h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.aboutTitle')), aboutKids))

      const gitKids = []
      if (info.git.isRepo === true) {
        gitKids.push(h('div', { className: 'skm-detail-meta', key: 'git' },
          h('span', { className: 'skm-detail-meta-item' }, t('repo.detail.git.branch') + '：' + String(info.git.branch || '-')),
          typeof info.git.remote === 'string' && info.git.remote.length > 0 ? h('span', { className: 'skm-detail-meta-item' }, t('repo.detail.git.remote') + '：' + info.git.remote) : null,
          h('span', { className: 'skm-detail-meta-item' }, info.git.dirty === true ? t('repo.detail.git.dirty') : t('repo.detail.git.clean')),
          info.git.hasUpstream === true ? h('span', { className: 'skm-detail-meta-item' }, t('repo.detail.git.aheadBehind', { ahead: info.git.ahead, behind: info.git.behind })) : null))
      } else {
        gitKids.push(h('p', { className: 'skm-notice', key: 'nogit' }, t('repo.detail.noGit')))
      }
      children.push(h('section', { className: 'skm-detail-section', key: 'git' },
        h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.gitTitle')), gitKids))
      return children
    }

    const skillDetailBody = function (info) {
      const children = []
      children.push(h('section', { className: 'skm-detail-section', key: 'intro' },
        h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.skill.introTitle')),
        typeof info.title === 'string' && info.title.length > 0 ? h('h4', { className: 'skm-detail-about-title' }, info.title) : null,
        typeof info.description === 'string' && info.description.length > 0 ? h('p', { className: 'skm-detail-about-intro' }, info.description) : h('p', { className: 'skm-notice' }, t('repo.detail.about.none'))))
      children.push(h('section', { className: 'skm-detail-section', key: 'content' },
        h('h3', { className: 'skm-detail-section-title' }, t('repo.detail.skill.contentTitle')),
        typeof info.text === 'string' && info.text.length > 0 ? h('pre', { className: 'skm-detail-readme skm-detail-readme-lg' }, info.text) : h('p', { className: 'skm-notice' }, t('repo.detail.about.none'))))
      return children
    }

    const detailBadge = detail !== null && detail.kind === 'skill' ? h('span', { className: 'skm-repo-badge' }, t('repo.detail.type.skill')) :
      h('span', { className: 'skm-repo-badge' + (detail !== null && detail.data !== null && detail.data.type === 'mirror' ? ' skm-repo-badge-warn' : '') }, detail !== null && detail.data !== null && detail.data.type === 'mirror' ? t('repo.detail.type.mirror') : t('repo.detail.type.local'))

    const detailOverlay = detail !== null && detail.loading !== true ? h('div', { className: 'skm-detail-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setDetail(null) } },
      h('section', { className: 'skm-detail', role: 'dialog', 'aria-modal': true, 'aria-label': t('repo.detail.title'), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') setDetail(null) } },
        h('header', { className: 'skm-header' },
          h('div', { className: 'skm-title' },
            h(NoteGlyph, { size: 16 }),
            detail.name,
            detailBadge),
          h('div', { className: 'skm-header-spacer' }),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('repo.detail.close'), title: t('repo.detail.close'), onClick: function () { setDetail(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-detail-body' },
          detail.error !== null ? h('p', { className: 'skm-notice skm-notice-error' }, t('repo.detail.error', { message: detail.error })) :
          detail.data !== null ? (detail.kind === 'skill' ? skillDetailBody(detail.data) : detailBody(detail.data)) :
          h('p', { className: 'skm-notice' }, t('repo.detail.loading'))))) : null

    const loadingCursor = detail !== null && detail.loading === true ? h('div', { className: 'skm-loading-cursor', style: { left: (detail.x || 0) + 'px', top: (detail.y || 0) + 'px' } }) : null

    const aiRawBlock = function (m, forceOpen) {
      const openNow = forceOpen === true || aiRawOpen === true
      return h('div', { className: 'skm-ai-raw' },
        h('button', { type: 'button', className: 'skm-btn skm-btn-ghost', onClick: function () { setAiRawOpen(!aiRawOpen) } }, t('repo.ai.rawTitle') + (openNow ? ' ▾' : ' ▸')),
        openNow ? h('div', { className: 'skm-ai-raw-body' },
          h('p', { className: 'skm-ai-raw-subject' }, t('repo.ai.rawSubject') + '：' + String(m.subject || '')),
          m.stat !== null && m.stat !== undefined && String(m.stat).length > 0 ? h('pre', { className: 'skm-ai-raw-stat' }, String(m.stat)) : null) : null)
    }

    const aiBodyKids = []
    if (aiModal !== null) {
      if (aiModal.state === 'loading' || aiModal.state === 'queued') {
        aiBodyKids.push(h('p', { className: 'skm-ai-status', key: 'status' }, h('span', { className: 'skm-spin' }), t('repo.ai.queued')))
      } else if (aiModal.state === 'running') {
        aiBodyKids.push(h('p', { className: 'skm-ai-status', key: 'status' }, h('span', { className: 'skm-spin' }), t('repo.ai.generating')))
        if (typeof aiModal.text === 'string' && aiModal.text.length > 0) aiBodyKids.push(h('pre', { className: 'skm-ai-stream', key: 'stream' }, aiModal.text))
      } else if (aiModal.state === 'done' && aiModal.data !== null && aiModal.data !== undefined) {
        const d = aiModal.data
        aiBodyKids.push(h('p', { className: 'skm-ai-hint', key: 'hint' }, t('repo.ai.materialHint')))
        if (typeof d.summary === 'string' && d.summary.length > 0) {
          aiBodyKids.push(h('h4', { className: 'skm-ai-label', key: 'sumh' }, t('repo.ai.summaryLabel')))
          aiBodyKids.push(h('p', { className: 'skm-ai-text', key: 'sum' }, d.summary))
        }
        if (Array.isArray(d.points) && d.points.length > 0) {
          aiBodyKids.push(h('h4', { className: 'skm-ai-label', key: 'poh' }, t('repo.ai.pointsLabel')))
          aiBodyKids.push(h('ul', { className: 'skm-ai-points', key: 'points' }, d.points.map(function (p, i) { return h('li', { key: i }, String(p)) })))
        }
        if (typeof d.impact === 'string' && d.impact.length > 0) {
          aiBodyKids.push(h('h4', { className: 'skm-ai-label', key: 'imh' }, t('repo.ai.impactLabel')))
          aiBodyKids.push(h('p', { className: 'skm-ai-text', key: 'impact' }, d.impact))
        }
        aiBodyKids.push(aiRawBlock(aiModal, false))
      } else {
        aiBodyKids.push(h('p', { className: 'skm-notice skm-notice-error', key: 'err' }, t('repo.ai.failed', { message: aiModal.error || '' })))
        aiBodyKids.push(aiRawBlock(aiModal, true))
      }
    }

    const aiOverlay = aiModal !== null ? h('div', { className: 'skm-detail-backdrop skm-ai-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) { clearAiPoll(); setAiModal(null) } } },
      h('section', { className: 'skm-ai-modal', role: 'dialog', 'aria-modal': true, 'aria-label': t('repo.ai.title'), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { clearAiPoll(); setAiModal(null) } } },
        h('header', { className: 'skm-header' },
          h('div', { className: 'skm-title' }, h(NoteGlyph, { size: 16 }), t('repo.ai.title'), h('span', { className: 'skm-ai-subject' }, String(aiModal.subject || '').slice(0, 60))),
          h('div', { className: 'skm-header-spacer' }),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('repo.ai.retry'), title: t('repo.ai.retry'), onClick: retryAi }, h(RefreshGlyph, null)),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('repo.detail.close'), title: t('repo.detail.close'), onClick: function () { clearAiPoll(); setAiModal(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-ai-body' }, aiBodyKids))) : null

    return h(React.Fragment, null,
      h('div', { className: 'skm-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) repoOpenStore.set(false) } },
        h('section', { className: 'skm-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': t('repo.panel.title'), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key !== 'Escape') return; const target = event.target; if (target !== null && typeof target === 'object' && target.tagName === 'INPUT' && typeof target.value === 'string' && target.value.length > 0) return; repoOpenStore.set(false) } },
          h('header', { className: 'skm-header' },
            h('div', { className: 'skm-title' }, h(FolderGlyph, { size: 16 }), t('repo.panel.title'), h('span', { className: 'skm-total' }, 'v' + VERSION)),
            h('div', { className: 'skm-header-spacer' }),
            h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.refresh'), title: t('panel.refresh'), onClick: reload }, h(RefreshGlyph, null)),
            h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { repoOpenStore.set(false) } }, h(CloseGlyph, null))),
          h('div', { className: 'skm-split' },
            h('nav', { className: 'skm-nav' },
              h('div', { className: 'skm-nav-title' }, t('repo.nav')),
              navItems),
            h('div', { className: 'skm-content' }, contentChildren)))),
      cloneOverlay,
      detailOverlay,
      aiOverlay,
      loadingCursor)
  }

  function ServicePanel(props) {
    const t = props.t; const useSessions = props.useSessions; const open = useStore(serviceOpenStore)
    const currentId = useSessions(function (state) { return state.current })
    const [state, setState] = React.useState({ data: null, error: null, loading: false })
    const [settings, setSettings] = React.useState({ enabled: true, confirmStart: true })
    const [busy, setBusy] = React.useState(null)
    const [opError, setOpError] = React.useState(null)
    const [notice, setNotice] = React.useState(null)
    const [editor, setEditor] = React.useState(null)
    const [removeConfirm, setRemoveConfirm] = React.useState(null)
    const [tick, setTick] = React.useState(0)
    const [logViewer, setLogViewer] = React.useState(null) // { path, name }
    const [logData, setLogData] = React.useState({ text: '', exists: false, loading: false, error: null, detached: false })
    const [logPaused, setLogPaused] = React.useState(false)
    const [logMax, setLogMax] = React.useState(32 * 1024)
    const [logFilter, setLogFilter] = React.useState('')
    const logBodyRef = React.useRef(null)
    const [aiProviders, setAiProviders] = React.useState(null)
    const [aiDraft, setAiDraft] = React.useState(null)
    const [aiDiag, setAiDiag] = React.useState(null) // { path, name, loading, text, error }
    const [logAi, setLogAi] = React.useState(null) // { loading, text, error }
    const [editorWarnings, setEditorWarnings] = React.useState(null)
    const [extModal, setExtModal] = React.useState(null) // 0.22.0：外部占用进程详情（只读）
    const [killConfirm, setKillConfirm] = React.useState(null) // 0.23.0：杀死外部进程确认框
    // 0.33.0 UI 优化：AI 设置弹窗 / 未配置项目折叠 / 全局搜索 / 行与项目头更多菜单 / 内嵌两段确认
    const [aiSettingsOpen, setAiSettingsOpen] = React.useState(false)
    const [unconfiguredOpen, setUnconfiguredOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    // 本地：卡片/列表视图切换（localStorage 持久化，key: skm-service-view）
    const [viewMode, setViewMode] = React.useState(function () {
      try { return window.localStorage.getItem('skm-service-view') === 'card' ? 'card' : 'list' } catch (error) { return 'list' }
    })
    // 本地：项目置顶星标（可多个，localStorage key: skm-service-pins，数组按置顶先后排列，置顶项目排最前）
    const [pins, setPins] = React.useState(function () {
      try {
        const raw = window.localStorage.getItem('skm-service-pins')
        if (raw === null) return []
        const arr = JSON.parse(raw)
        return Array.isArray(arr) ? arr.filter(function (x) { return typeof x === 'string' }) : []
      } catch (error) { return [] }
    })
    const [rowMenu, setRowMenu] = React.useState(null) // 'path|name'
    const [projMenu, setProjMenu] = React.useState(null) // path
    const [aiClearConfirm, setAiClearConfirm] = React.useState(false)
    const [logClearConfirm, setLogClearConfirm] = React.useState(false)
    const [deleteConfirm, setDeleteConfirm] = React.useState(false)
    const [stopAllConfirm, setStopAllConfirm] = React.useState(null) // path 或 'global'
    // 0.34.3：⋯ 菜单边界检测——底部空间不足自动向上翻转（.skm-menu-up），必要时限高内部滚动
    const [rowMenuPos, setRowMenuPos] = React.useState({ dir: 'down', maxH: null })
    const [projMenuPos, setProjMenuPos] = React.useState({ dir: 'down', maxH: null })
    const menuWrapRef = React.useRef(null)
    const menuElRef = React.useRef(null)
    const projWrapRef = React.useRef(null)
    const projElRef = React.useRef(null)
    const applyMenuPlacement = function (wrapRef, elRef, setPos) {
      const el = elRef.current
      const wrap = wrapRef.current
      if (el === null || wrap === null) return
      const wrapRect = wrap.getBoundingClientRect()
      const menuH = el.offsetHeight
      const gap = 4
      // 裁剪边界 = 最近的滚动容器可视矩形（服务列表 .skm-repo-list overflow-y:auto）；
      // 菜单 absolute 定位受它裁剪，必须用它而不是 window.innerHeight 计算空间。
      let boxRect = null
      let node = wrap.parentElement
      while (node !== null && node !== document.body && node !== document.documentElement) {
        const cs = window.getComputedStyle(node)
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflow === 'auto' || cs.overflow === 'scroll') {
          boxRect = node.getBoundingClientRect()
          break
        }
        node = node.parentElement
      }
      if (boxRect === null) boxRect = { top: 0, bottom: window.innerHeight }
      const spaceBelow = boxRect.bottom - wrapRect.bottom - gap
      const spaceAbove = wrapRect.top - boxRect.top - gap
      let dir = 'down'
      let maxH = null
      if (menuH > spaceBelow) {
        if (menuH <= spaceAbove) {
          dir = 'up'
        } else if (spaceBelow >= spaceAbove) {
          dir = 'down'
          maxH = Math.max(Math.floor(spaceBelow), 40)
        } else {
          dir = 'up'
          maxH = Math.max(Math.floor(spaceAbove), 40)
        }
      }
      setPos({ dir: dir, maxH: maxH })
    }
    const attachScrollReposition = function (wrapRef, elRef, setPos) {
      let node = (wrapRef.current === null ? null : wrapRef.current.parentElement)
      while (node !== null && node !== document.body && node !== document.documentElement) {
        const cs = window.getComputedStyle(node)
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflow === 'auto' || cs.overflow === 'scroll') break
        node = node.parentElement
      }
      if (node === null || node === document.body || node === document.documentElement) return undefined
      const handler = function () { applyMenuPlacement(wrapRef, elRef, setPos) }
      node.addEventListener('scroll', handler, { passive: true })
      return function () { node.removeEventListener('scroll', handler) }
    }
    React.useEffect(function () {
      if (rowMenu === null) { setRowMenuPos({ dir: 'down', maxH: null }); return undefined }
      applyMenuPlacement(menuWrapRef, menuElRef, setRowMenuPos)
      return attachScrollReposition(menuWrapRef, menuElRef, setRowMenuPos)
    }, [rowMenu, tick])
    React.useEffect(function () {
      if (projMenu === null) { setProjMenuPos({ dir: 'down', maxH: null }); return undefined }
      applyMenuPlacement(projWrapRef, projElRef, setProjMenuPos)
      return attachScrollReposition(projWrapRef, projElRef, setProjMenuPos)
    }, [projMenu, tick])

    const flash = function (message) { setNotice(message); setOpError(null); window.setTimeout(function () { setNotice(null) }, 4000) }
    const fail = function (message) { setOpError(message); setNotice(null) }
    const refresh = function () { setTick(function (v) { return v + 1 }) }
    const switchView = function (mode) {
      setViewMode(mode)
      try { window.localStorage.setItem('skm-service-view', mode) } catch (error) {}
    }
    const togglePin = function (path) {
      setPins(function (prev) {
        const next = prev.indexOf(path) >= 0 ? prev.filter(function (x) { return x !== path }) : prev.concat([path])
        try { window.localStorage.setItem('skm-service-pins', JSON.stringify(next)) } catch (error) {}
        return next
      })
    }
    const isPinned = function (path) { return pins.indexOf(path) >= 0 }

    // 0.31.0：把「用 service-config 配置此项目」的指令写入当前会话输入框
    //（复用 repo 面板 writeDraft 机制，面板不直接改服务配置，交给 agent 处理）。
    const draftService = function (path) {
      const text = '请用 service-config 为项目 ' + path + ' 生成服务配置：识别服务类型（Node / Python venv / 前后端分离 / 多服务），生成全部服务的 command/args/env/port/healthUrl/manageUrl 静默配置草稿供确认，写入 services.json 后自动阶梯测试（进程存活 → 端口 → healthUrl），测完停止。'
      const res = writeDraft(currentId, text)
      if (res.ok === true) {
        flash(t('service.aiConfigDone'))
        serviceOpenStore.set(false)
        focusComposer()
      } else fail(res.error || t('service.aiConfigFailed', { message: res.error || 'unknown' }))
    }

    React.useEffect(function () {
      if (open !== true) return undefined
      let cancelled = false
      const load = function () {
        port.serviceScan().then(function (result) {
          if (cancelled) return
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') setState({ data: null, error: result.error, loading: false })
          else setState({ data: result, error: null, loading: false })
        }).catch(function (error) { if (cancelled) return; setState({ data: null, error: error instanceof Error ? error.message : String(error), loading: false }) })
      }
      const loadSettings = function () {
        port.serviceSettingsGet().then(function (result) {
          if (cancelled) return
          if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object') setSettings(result.settings)
        }).catch(function () {})
      }
      const loadAiProviders = function () {
        port.aiProvidersList().then(function (result) {
          if (cancelled) return
          if (result !== null && typeof result === 'object' && Array.isArray(result.providers)) setAiProviders(result.providers)
        }).catch(function () {})
      }
      load()
      loadSettings()
      loadAiProviders()
      const id = window.setInterval(load, 5000)
      return function () { cancelled = true; window.clearInterval(id) }
    }, [open, tick])

    React.useEffect(function () {
      if (logViewer === null) return undefined
      let cancelled = false
      const loadLog = function () {
        port.serviceLogGet({ path: logViewer.path, name: logViewer.name, maxBytes: logMax }).then(function (result) {
          if (cancelled) return
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') setLogData({ text: '', exists: false, loading: false, error: result.error, detached: false })
          else setLogData({ text: result !== null && typeof result === 'object' && typeof result.text === 'string' ? result.text : '', exists: !!(result !== null && typeof result === 'object' && result.exists === true), loading: false, error: null, detached: !!(result !== null && typeof result === 'object' && result.detached === true) })
          window.setTimeout(function () { if (!cancelled && logBodyRef.current !== null) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight }, 0)
        }).catch(function (error) { if (cancelled) return; setLogData({ text: '', exists: false, loading: false, error: error instanceof Error ? error.message : String(error), detached: false }) })
      }
      setLogData({ text: '', exists: false, loading: true, error: null })
      loadLog()
      if (logPaused === true) return function () { cancelled = true }
      const id = window.setInterval(loadLog, 3000)
      return function () { cancelled = true; window.clearInterval(id) }
    }, [logViewer, logPaused, logMax])

    if (open !== true) return null

    const projects = state.data !== null && state.data !== undefined && Array.isArray(state.data.projects) ? state.data.projects : []

    // 0.19.0 P2：工作目录输入框提供 datalist 候选（治理根/已配置根目录/已注册项目目录）。
    const knownDirs = []
    if (state.data !== null && state.data !== undefined && state.data.settings !== null && typeof state.data.settings === 'object') {
      const s = state.data.settings
      if (typeof s.governanceRoot === 'string' && s.governanceRoot.length > 0) knownDirs.push(s.governanceRoot)
      if (Array.isArray(s.roots)) for (const r of s.roots) if (typeof r === 'string' && r.length > 0 && knownDirs.indexOf(r) < 0) knownDirs.push(r)
    }
    for (const p of projects) if (typeof p.path === 'string' && p.path.length > 0 && knownDirs.indexOf(p.path) < 0) knownDirs.push(p.path)

    // 0.19.0 P2：参数解析支持双引号/单引号，例如 --name "hello world" 不再被拆成两段。
    const parseArgs = function (text) {
      const s = String(text || '').trim()
      if (s.length === 0) return []
      const out = []
      let cur = ''
      let quote = null
      for (let i = 0; i < s.length; i += 1) {
        const c = s[i]
        if (quote !== null) {
          if (c === quote) quote = null
          else if (c === '\\' && i + 1 < s.length && (s[i + 1] === quote || s[i + 1] === '\\')) { i += 1; cur += s[i] }
          else cur += c
        } else if (c === '"' || c === "'") {
          quote = c
        } else if (c === ' ' || c === '\t') {
          if (cur.length > 0) { out.push(cur); cur = '' }
        } else {
          cur += c
        }
      }
      if (cur.length > 0) out.push(cur)
      return out
    }
    const parseEnv = function (text) {
      const env = {}
      String(text || '').split(/\r?\n/).forEach(function (line) {
        const s = line.trim()
        if (s.length === 0) return
        const i = s.indexOf('=')
        if (i <= 0) return
        env[s.slice(0, i).trim()] = s.slice(i + 1).trim()
      })
      return env
    }
    const envToText = function (env) {
      if (env === null || env === undefined || typeof env !== 'object') return ''
      return Object.keys(env).map(function (k) { return k + '=' + env[k] }).join('\n')
    }

    const setServiceSettings = function (patch) {
      setBusy('settings')
      port.serviceSettingsSet(patch).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object') setSettings(result.settings)
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    const currentAiDraft = function () {
      if (aiDraft !== null) return aiDraft
      const base = { enabled: true, provider: 'opencode-go', model: 'deepseek-v4-flash', maxTokens: 1600, reasoningEffort: 'off' }
      const s = settings !== null && settings !== undefined && settings.aiExplain !== null && settings.aiExplain !== undefined ? settings.aiExplain : {}
      const merged = Object.assign({}, base, s)
      merged.maxTokens = Number(merged.maxTokens) > 0 ? Number(merged.maxTokens) : 1600
      if (typeof merged.reasoningEffort !== 'string' || merged.reasoningEffort.length === 0) merged.reasoningEffort = 'off'
      return merged
    }

    const saveAiSettingsService = function () {
      const d = currentAiDraft()
      setBusy('aiSettings')
      port.serviceSettingsSet({ aiExplain: { enabled: d.enabled !== false, provider: String(d.provider || 'opencode-go').trim(), model: String(d.model || 'deepseek-v4-flash').trim(), maxTokens: Number(d.maxTokens) || 1600, reasoningEffort: String(d.reasoningEffort || 'off') } }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object') { setSettings(result.settings); setAiDraft(null) }
        flash(t('service.aiSettingsSaved'))
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    // 0.28.0：清空 AI 讲解持久化缓存（host aiExplainClearCache 已清空 _governance/ai-explanations.json）。
    const clearAiExplainCache = function () {
      if (aiClearConfirm !== true) {
        setAiClearConfirm(true)
        window.setTimeout(function () { setAiClearConfirm(false) }, 4000)
        return
      }
      setAiClearConfirm(false)
      setBusy('aiClearCache')
      port.aiExplainClearCache().then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(t('service.aiSettingsClearCacheFailed', { message: result.error })); return }
        flash(t('service.aiSettingsClearCacheDone', { count: String(result !== null && typeof result === 'object' && Number.isInteger(result.cleared) ? result.cleared : 0) }))
      }).catch(function (error) { setBusy(null); fail(t('service.aiSettingsClearCacheFailed', { message: error instanceof Error ? error.message : String(error) })) })
    }

    const runAiDiagnose = function (projectPath, svc) {
      setAiDiag({ path: projectPath, name: svc.name, loading: true, text: null, error: null })
      port.serviceAiDiagnose({ path: projectPath, name: svc.name }).then(function (result) {
        setAiDiag(function (prev) {
          if (prev === null || prev.path !== projectPath || prev.name !== svc.name) return prev
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') return { path: projectPath, name: svc.name, loading: false, text: null, error: result.error }
          return { path: projectPath, name: svc.name, loading: false, text: result !== null && typeof result === 'object' && typeof result.text === 'string' ? result.text : '', error: null }
        })
      }).catch(function (error) {
        setAiDiag(function (prev) {
          if (prev === null || prev.path !== projectPath || prev.name !== svc.name) return prev
          return { path: projectPath, name: svc.name, loading: false, text: null, error: error instanceof Error ? error.message : String(error) }
        })
      })
    }

    const runLogAi = function () {
      if (logViewer === null) return
      setLogAi({ loading: true, text: null, error: null })
      port.serviceLogAi({ path: logViewer.path, name: logViewer.name, maxBytes: Math.max(logMax, 16 * 1024) }).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setLogAi({ loading: false, text: null, error: result.error })
        else setLogAi({ loading: false, text: result !== null && typeof result === 'object' && typeof result.text === 'string' ? result.text : '', error: null })
      }).catch(function (error) { setLogAi({ loading: false, text: null, error: error instanceof Error ? error.message : String(error) }) })
    }

    const startService = function (projectPath, svc) {
      const key = projectPath + '|' + svc.name
      setBusy(key); setOpError(null); setNotice(null)
      port.serviceStart({ path: projectPath, name: svc.name }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(t('service.startFailed', { message: result.error })); refresh(); runAiDiagnose(projectPath, svc); return }
        flash(t('service.started'))
        refresh()
      }).catch(function (error) { setBusy(null); fail(t('service.startFailed', { message: error instanceof Error ? error.message : String(error) })); refresh() })
    }

    const stopService = function (projectPath, svc) {
      const key = projectPath + '|' + svc.name
      setBusy(key); setOpError(null); setNotice(null)
      port.serviceStop({ path: projectPath, name: svc.name }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); refresh(); return }
        flash(t('service.stoppedDone'))
        refresh()
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)); refresh() })
    }

    const restartService = function (projectPath, svc) {
      const key = projectPath + '|' + svc.name
      setBusy(key); setOpError(null); setNotice(null)
      port.serviceRestart({ path: projectPath, name: svc.name }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(t('service.restartFailed', { message: result.error })); refresh(); return }
        flash(t('service.restarted'))
        refresh()
      }).catch(function (error) { setBusy(null); fail(t('service.restartFailed', { message: error instanceof Error ? error.message : String(error) })); refresh() })
    }

    const startAllServices = function (projectPath) {
      setBusy('all:' + projectPath); setOpError(null); setNotice(null)
      port.serviceStartAll({ path: projectPath }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); refresh(); return }
        const results = result !== null && typeof result === 'object' && Array.isArray(result.results) ? result.results : []
        const okCount = results.filter(function (r) { return r.ok === true }).length
        const failCount = results.length - okCount
        if (failCount > 0) fail(t('service.startAllDone', { ok: String(okCount), fail: String(failCount) }))
        else flash(t('service.startAllDone', { ok: String(okCount), fail: '0' }))
        refresh()
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)); refresh() })
    }

    const stopAllServices = function (projectPath) {
      if (stopAllConfirm !== projectPath) {
        setStopAllConfirm(projectPath)
        window.setTimeout(function () { setStopAllConfirm(function (v) { return v === projectPath ? null : v }) }, 4000)
        return
      }
      setStopAllConfirm(null)
      setBusy('all:' + projectPath); setOpError(null); setNotice(null)
      port.serviceStopAll({ path: projectPath }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); refresh(); return }
        const results = result !== null && typeof result === 'object' && Array.isArray(result.results) ? result.results : []
        const okCount = results.filter(function (r) { return r.ok === true }).length
        flash(t('service.stopAllDone', { count: String(okCount) }))
        refresh()
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)); refresh() })
    }

    // 0.33.0：面板级全局启停（跨项目，逐个调用各项目的 startAll/stopAll）。
    const startAllGlobal = function () {
      setBusy('allGlobal'); setOpError(null); setNotice(null)
      const targets = projects.filter(function (p) { return Array.isArray(p.services) && p.services.some(function (s) { return typeof s.command === 'string' && s.command.trim().length > 0 }) })
      const run = function (i, ok, failCount) {
        if (i >= targets.length) {
          setBusy(null)
          if (failCount > 0) fail(t('service.startAllDone', { ok: String(ok), fail: String(failCount) }))
          else flash(t('service.startAllDone', { ok: String(ok), fail: '0' }))
          refresh()
          return
        }
        port.serviceStartAll({ path: targets[i].path }).then(function (result) {
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') { run(i + 1, ok, failCount + 1); return }
          const results = result !== null && typeof result === 'object' && Array.isArray(result.results) ? result.results : []
          run(i + 1, ok + results.filter(function (r) { return r.ok === true }).length, failCount + results.filter(function (r) { return r.ok !== true }).length)
        }).catch(function () { run(i + 1, ok, failCount + 1) })
      }
      run(0, 0, 0)
    }

    const stopAllGlobal = function () {
      if (stopAllConfirm !== 'global') {
        setStopAllConfirm('global')
        window.setTimeout(function () { setStopAllConfirm(function (v) { return v === 'global' ? null : v }) }, 4000)
        return
      }
      setStopAllConfirm(null)
      setBusy('allGlobal'); setOpError(null); setNotice(null)
      const targets = projects.filter(function (p) { return Array.isArray(p.services) && p.services.some(function (s) { return typeof s.command === 'string' && s.command.trim().length > 0 }) })
      const run = function (i, ok) {
        if (i >= targets.length) {
          setBusy(null)
          flash(t('service.stopAllDone', { count: String(ok) }))
          refresh()
          return
        }
        port.serviceStopAll({ path: targets[i].path }).then(function (result) {
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') { run(i + 1, ok); return }
          const results = result !== null && typeof result === 'object' && Array.isArray(result.results) ? result.results : []
          run(i + 1, ok + results.filter(function (r) { return r.ok === true }).length)
        }).catch(function () { run(i + 1, ok) })
      }
      run(0, 0)
    }

    const openLogs = function (projectPath, svc) {
      setLogPaused(false)
      setLogMax(32 * 1024)
      setLogFilter('')
      setLogAi(null)
      setLogViewer({ path: projectPath, name: svc.name })
    }

    const clearLogs = function () {
      if (logViewer === null) return
      if (logClearConfirm !== true) {
        setLogClearConfirm(true)
        window.setTimeout(function () { setLogClearConfirm(false) }, 4000)
        return
      }
      setLogClearConfirm(false)
      port.serviceLogClear({ path: logViewer.path, name: logViewer.name }).then(function (result) {
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { setLogData({ text: '', exists: false, loading: false, error: result.error }); return }
        setLogData({ text: '', exists: false, loading: false, error: null })
      }).catch(function (error) { setLogData({ text: '', exists: false, loading: false, error: error instanceof Error ? error.message : String(error) }) })
    }

    const downloadLogs = function () {
      const blob = new Blob([logData.text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (logViewer !== null ? String(logViewer.name).replace(/[^a-zA-Z0-9_-]/g, '_') : 'service') + '.log'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    const loadMoreLogs = function () { setLogMax(function (v) { return Math.min((v || 32 * 1024) * 2, 2 * 1024 * 1024) }) }

    const formatUptime = function (startedAt) {
      const started = Number(startedAt)
      if (!Number.isFinite(started) || started <= 0) return ''
      const ms = Math.max(0, Date.now() - started)
      const s = Math.floor(ms / 1000)
      const d = Math.floor(s / 86400)
      const h = Math.floor((s % 86400) / 3600)
      const m = Math.floor((s % 3600) / 60)
      if (d > 0) return d + 'd ' + h + 'h'
      if (h > 0) return h + 'h ' + m + 'm'
      if (m > 0) return m + 'm'
      return s + 's'
    }

    const openEditor = function (projectPath, index, svc) {
      if (index === -1) {
        setEditor({ projectPath: projectPath, index: -1, draft: { name: '', cwd: projectPath, command: '', args: '', env: '', port: '', autoStart: false, autoRestart: false, detached: false, healthUrl: '', envFile: '', startTimeoutMs: '', manageUrl: '', note: '' } })
        setEditorWarnings(null)
      } else {
        setEditor({
          projectPath: projectPath, index: index,
          draft: {
            name: String(svc.name || ''), cwd: String(svc.cwd || projectPath), command: String(svc.command || ''),
            args: Array.isArray(svc.args) ? svc.args.join(' ') : '',
            env: envToText(svc.env),
            port: svc.port === null || svc.port === undefined ? '' : String(svc.port),
            autoStart: svc.autoStart === true,
            autoRestart: svc.autoRestart === true,
            detached: svc.detached === true,
            healthUrl: typeof svc.healthUrl === 'string' ? svc.healthUrl : '',
            manageUrl: typeof svc.manageUrl === 'string' ? svc.manageUrl : '',
            envFile: typeof svc.envFile === 'string' ? svc.envFile : '',
            startTimeoutMs: svc.startTimeoutMs !== null && svc.startTimeoutMs !== undefined ? String(svc.startTimeoutMs) : '',
            note: typeof svc.note === 'string' ? svc.note : '',
          },
        })
        setEditorWarnings(null)
      }
    }

    const currentProjectServices = function (projectPath) {
      const project = projects.find(function (p) { return p.path === projectPath })
      if (project === undefined || !Array.isArray(project.services)) return []
      return project.services.map(function (s) { return { name: s.name, cwd: s.cwd, command: s.command, args: s.args, env: s.env, port: s.port, autoStart: s.autoStart === true, autoRestart: s.autoRestart === true, detached: s.detached === true, healthUrl: typeof s.healthUrl === 'string' ? s.healthUrl : null, envFile: typeof s.envFile === 'string' ? s.envFile : '', startTimeoutMs: Number.isInteger(s.startTimeoutMs) ? s.startTimeoutMs : 30000, manageUrl: typeof s.manageUrl === 'string' ? s.manageUrl : '', note: typeof s.note === 'string' ? s.note : '' } })
    }

    const saveEditor = function () {
      if (editor === null) return
      const name = editor.draft.name.trim()
      const cwd = editor.draft.cwd.trim()
      const command = editor.draft.command.trim()
      if (name.length === 0) { fail(t('service.nameRequired')); return }
      if (cwd.length === 0) { fail(t('service.cwdRequired')); return }
      if (command.length === 0) { fail(t('service.commandRequired')); return }
      const portText = editor.draft.port.trim()
      let svcPort = null
      if (portText.length > 0) {
        const n = Number(portText)
        if (!Number.isInteger(n) || n < 1 || n > 65535) { fail(t('service.portInvalid')); return }
        svcPort = n
      }
      const healthUrl = editor.draft.healthUrl.trim()
      if (healthUrl.length > 0 && !/^https?:\/\//i.test(healthUrl) && healthUrl[0] !== '/') { fail(t('service.healthUrl.placeholder')); return }
      const manageUrl = editor.draft.manageUrl.trim()
      if (manageUrl.length > 0 && !/^https?:\/\//i.test(manageUrl)) { fail(t('service.manageUrl.placeholder')); return }
      const envFile = editor.draft.envFile.trim()
      let startTimeoutMs = 30000
      const stText = editor.draft.startTimeoutMs.trim()
      if (stText.length > 0) {
        const st = Number(stText)
        if (!Number.isInteger(st) || st < 1000 || st > 300000) { fail(t('service.startTimeoutMs.placeholder')); return }
        startTimeoutMs = st
      }
      const entry = { name: name, cwd: cwd, command: command, args: parseArgs(editor.draft.args), env: parseEnv(editor.draft.env), port: svcPort, autoStart: editor.draft.autoStart === true, autoRestart: editor.draft.autoRestart === true, detached: editor.draft.detached === true, healthUrl: healthUrl.length > 0 ? healthUrl : null, envFile: envFile, startTimeoutMs: startTimeoutMs, manageUrl: manageUrl.length > 0 ? manageUrl : '', note: editor.draft.note.trim() }
      const list = currentProjectServices(editor.projectPath)
      // 新增服务时自动清掉「新服务」占位条目（command 为空无法通过 host 校验，会挡住保存）。
      const baseList = editor.index === -1 ? list.filter(function (s) { return typeof s.command === 'string' && s.command.trim().length > 0 }) : list
      const nextList = editor.index === -1 ? baseList.concat([entry]) : list.map(function (s, i) { return i === editor.index ? entry : s })
      setBusy('editor')
      try {
        port.serviceConfigSet({ path: editor.projectPath, services: nextList }).then(function (result) {
          setBusy(null)
          if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
          setEditor(null)
          const warnings = result !== null && typeof result === 'object' && Array.isArray(result.warnings) ? result.warnings : []
          flash(t('service.saved') + (warnings.length > 0 ? '；' + warnings.join('；') : ''))
          refresh()
        }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
      } catch (error) {
        setBusy(null)
        fail('保存请求构造失败：' + (error instanceof Error ? error.message : String(error)))
      }
    }

    const deleteFromEditor = function () {
      if (editor === null) { setEditor(null); return }
      if (editor.index === -1) { setEditor(null); return }
      if (deleteConfirm !== true) {
        setDeleteConfirm(true)
        window.setTimeout(function () { setDeleteConfirm(false) }, 4000)
        return
      }
      setDeleteConfirm(false)
      const list = currentProjectServices(editor.projectPath).filter(function (s, i) { return i !== editor.index })
      setBusy('editor')
      port.serviceConfigSet({ path: editor.projectPath, services: list }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        setEditor(null)
        flash(t('service.saved'))
        refresh()
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    const removeRegistration = function (projectPath) {
      if (removeConfirm !== projectPath) { setRemoveConfirm(projectPath); return }
      setRemoveConfirm(null)
      setBusy('remove:' + projectPath)
      port.serviceUnregister({ path: projectPath }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        patchRepoRegistered(projectPath, false)
        repoInvalidateStore.set(repoInvalidateStore.getSnapshot() + 1)
        flash(t('service.removed'))
        refresh()
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    // 0.23.0：杀死外部进程——host 会重新反查当前占用端口的 PID，成功后清缓存并刷新面板。
    const doKillExternal = function () {
      if (killConfirm === null) return
      const kkey = 'kill:' + killConfirm.path + '|' + killConfirm.svc.name
      setBusy(kkey)
      port.serviceExternalKill({ path: killConfirm.path, name: killConfirm.svc.name }).then(function (res) {
        setBusy(null)
        if (res !== null && typeof res === 'object' && res.ok === true) {
          setKillConfirm(null)
          setExtModal(null)
          if (res.alreadyFree === true) flash(t('service.external.alreadyFree'))
          else flash(t('service.external.killed', { name: res.name !== null && res.name !== undefined && res.name.length > 0 ? res.name : '?', pid: res.pid !== null && res.pid !== undefined ? String(res.pid) : '?' }))
          refresh()
        } else {
          fail(t('service.external.killFailed', { message: res !== null && typeof res === 'object' && typeof res.error === 'string' ? res.error : String(res) }))
        }
      }).catch(function (error) {
        setBusy(null)
        fail(t('service.external.killFailed', { message: error instanceof Error ? error.message : String(error) }))
      })
    }

    const serviceRow = function (projectPath, svc, index, card) {
      const key = projectPath + '|' + svc.name
      const busyThis = busy === key
      const killBusy = busy === 'kill:' + key
      const running = svc.running === true
      const cmdText = typeof svc.command === 'string' && svc.command.length > 0 ? svc.command : t('service.noCommand')
      const badge = running
        ? h('span', { className: 'skm-repo-badge skm-badge-ok' }, svc.state === 'starting' ? t('service.starting') : (svc.portUp === true ? t('service.portUp') : t('service.running')))
        : svc.state === 'external'
          ? h('span', { className: 'skm-repo-badge skm-badge-warn', title: t('service.external.title', { port: String(svc.port), pid: svc.externalPid !== null && svc.externalPid !== undefined ? String(svc.externalPid) : '?' }) }, t('service.external'))
          : h('span', { className: 'skm-repo-badge' }, t('service.stopped'))
      const extDisabled = svc.state === 'external'
      // 0.22.0：外部进程行内信息——进程名+PID 与身份判断徽章（related/unrelated/unknown）。
      const extMeta = svc.state === 'external'
        ? h('span', { className: 'skm-svc-meta', title: t('service.external.title', { port: String(svc.port), pid: svc.externalPid !== null && svc.externalPid !== undefined ? String(svc.externalPid) : '?' }) }, t('service.external.proc', { name: svc.externalName !== null && svc.externalName !== undefined && svc.externalName.length > 0 ? svc.externalName : '?', pid: svc.externalPid !== null && svc.externalPid !== undefined ? String(svc.externalPid) : '?' }))
        : null
      const extRelBadge = svc.state === 'external'
        ? h('span', { className: 'skm-repo-badge ' + (svc.externalRelated === true ? 'skm-badge-ok' : svc.externalRelated === false ? 'skm-badge-lost' : 'skm-badge-warn'), title: svc.externalRelated === true ? t('service.external.modal.basisRelated') : svc.externalRelated === false ? t('service.external.modal.basisUnrelated') : t('service.external.modal.basisUnknown') }, svc.externalRelated === true ? t('service.external.related') : svc.externalRelated === false ? t('service.external.unrelated') : t('service.external.unknown'))
        : null
      const healthBadge = running && svc.healthUrl !== null && svc.healthUrl !== undefined
        ? h('span', { className: svc.healthUp === true ? 'skm-repo-badge skm-badge-ok' : 'skm-repo-badge skm-badge-lost', title: svc.healthUrl }, svc.healthUp === true ? t('service.healthUp') : t('service.healthDown'))
        : null
      const lastExitAt = svc.lastExitAt !== null && svc.lastExitAt !== undefined ? Number(svc.lastExitAt) : 0
      const exitBadge = !running && Number.isFinite(lastExitAt) && lastExitAt > 0
        ? h('span', { className: 'skm-repo-badge skm-badge-lost', title: new Date(lastExitAt).toLocaleString() }, svc.lastExitCode !== null && svc.lastExitCode !== undefined ? t('service.lastExitBadge', { code: String(svc.lastExitCode) }) : t('service.lastExitBadgeSignal'))
        : null
      const uptimeText = running && svc.startedAt !== null && svc.startedAt !== undefined ? h('span', { className: 'skm-svc-meta' }, t('service.uptime', { time: formatUptime(svc.startedAt) })) : null
      const badgeTitle = running
        ? (svc.state === 'starting' ? t('service.starting') : (svc.portUp === true ? t('service.portUp') : t('service.running')))
        : svc.state === 'external'
          ? t('service.external')
          : t('service.stopped')
      const statusClass = running
        ? (svc.state === 'starting' ? 'skm-svc-row-starting' : 'skm-svc-row-running')
        : svc.state === 'external'
          ? 'skm-svc-row-external'
          : 'skm-svc-row-stopped'
      const dotClass = running ? (svc.state === 'starting' ? 'skm-status-dot skm-dot-starting' : 'skm-status-dot skm-dot-ok') : svc.state === 'external' ? 'skm-status-dot skm-dot-external' : 'skm-status-dot skm-dot-stopped'
      const rowMenuOpen = rowMenu === key
      const rowCls = card === true ? 'skm-svc-card ' + statusClass : 'skm-svc-row ' + statusClass
      const rowActionsCls = card === true ? 'skm-svc-actions skm-svc-card-actions' : 'skm-svc-actions'
      const manageUrl = typeof svc.manageUrl === 'string' && svc.manageUrl.trim().length > 0 ? svc.manageUrl.trim() : ''
      const openUrl = manageUrl.length > 0 ? manageUrl : ((svc.port !== null && svc.port !== undefined) ? 'http://127.0.0.1:' + svc.port : '')
      return h('div', { key: key, className: rowCls },
        h('div', { className: 'skm-svc-row-main' },
          h('div', { className: 'skm-svc-row-head' },
            h('span', { className: dotClass, title: badgeTitle }),
            h('span', { className: 'skm-svc-name', title: svc.name }, svc.name),
            badge,
            extRelBadge,
            extMeta,
            healthBadge,
            exitBadge,
            uptimeText),
          typeof svc.note === 'string' && svc.note.trim().length > 0 ? h('div', { className: 'skm-svc-note', title: svc.note }, svc.note) : null,
          h('div', { className: 'skm-svc-command', title: cmdText }, cmdText)),
        h('div', { className: rowActionsCls },
          openUrl.length > 0
            ? h('button', { type: 'button', className: 'skm-btn', disabled: !running, title: openUrl, onClick: function () { window.open(openUrl, '_blank', 'noopener') } }, t('service.open'))
            : null,
          svc.state === 'external'
            ? h('button', { type: 'button', className: 'skm-btn', disabled: busyThis, onClick: function () { setExtModal({ path: projectPath, svc: svc }) } }, t('service.external.detail'))
            : running
              ? h('button', { type: 'button', className: 'skm-btn', disabled: busyThis || extDisabled, onClick: function () { stopService(projectPath, svc) } }, t('service.stop'))
              : h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busyThis || extDisabled, onClick: function () { startService(projectPath, svc) } }, t('service.start')),
          h('span', { className: 'skm-menu-wrap', ref: rowMenuOpen ? menuWrapRef : null },
            h('button', { type: 'button', className: 'skm-btn', title: t('service.more'), onClick: function () { setRowMenu(rowMenuOpen ? null : key) } }, '⋯'),
            rowMenuOpen ? h('span', { className: 'skm-menu-backdrop', onMouseDown: function () { setRowMenu(null) } }) : null,
            rowMenuOpen ? h('div', { className: 'skm-menu' + (rowMenuPos.dir === 'up' ? ' skm-menu-up' : ''), ref: menuElRef, style: rowMenuPos.maxH !== null ? { maxHeight: rowMenuPos.maxH + 'px', overflowY: 'auto' } : null },
              svc.state === 'external' ? h('button', { type: 'button', className: 'skm-menu-item skm-menu-item-danger', disabled: killBusy || busyThis, onClick: function () { setRowMenu(null); setKillConfirm({ path: projectPath, svc: svc }) } }, killBusy ? t('service.external.killing') : t('service.external.kill')) : null,
              h('button', { type: 'button', className: 'skm-menu-item', disabled: !running || busyThis || extDisabled, onClick: function () { setRowMenu(null); restartService(projectPath, svc) } }, busyThis ? t('service.restarting') : t('service.restart')),
              h('button', { type: 'button', className: 'skm-menu-item', disabled: busyThis || extDisabled, onClick: function () { setRowMenu(null); openLogs(projectPath, svc) } }, t('service.logs')),
              h('button', { type: 'button', className: 'skm-menu-item', disabled: busyThis, onClick: function () { setRowMenu(null); openEditor(projectPath, index, svc) } }, t('service.edit'))) : null)))
    }

    const contentChildren = []
    contentChildren.push(h('p', { className: 'skm-notice', key: 'hint' }, t('service.hint')))
    if (state.data !== null && state.data !== undefined && state.data.servicesConfig !== null && typeof state.data.servicesConfig === 'object' && typeof state.data.servicesConfig.error === 'string') contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'configError' }, t('service.configError', { message: state.data.servicesConfig.error })))
    if (state.error !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'error' }, t('service.readError', { message: state.error })))
    if (opError !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'opError' }, t('service.opError', { message: opError })))
    if (notice !== null) contentChildren.push(h('p', { className: 'skm-notice', key: 'notice' }, notice))
    if (aiDiag !== null) {
      if (aiDiag.loading === true) contentChildren.push(h('p', { className: 'skm-notice', key: 'aiDiag' }, t('service.aiDiagTitle') + '：' + t('service.aiDiagRunning')))
      else if (aiDiag.error !== null) contentChildren.push(h('p', { className: 'skm-notice skm-notice-error', key: 'aiDiag' }, t('service.aiDiagFailed', { message: aiDiag.error })))
      else contentChildren.push(h('div', { className: 'skm-notice skm-ai-diag', key: 'aiDiag' }, h('strong', null, t('service.aiDiagTitle') + '：'), h('span', null, aiDiag.text || '')))
    }
    // 0.33.0：服务开关与 AI 设置收进「⚙ 设置」弹窗（aiSettingsOverlay），主面板只留服务列表。
    // 0.33.0：路径缩写——相对治理根/已配置根的相对路径，完整路径保留在 title。
    const shortPath = function (path) {
      const roots = state.data !== null && state.data !== undefined && state.data.settings !== null && typeof state.data.settings === 'object' && Array.isArray(state.data.settings.roots) ? state.data.settings.roots : []
      let best = null
      for (const r of roots) {
        if (typeof r !== 'string' || r.length === 0) continue
        const norm = r.replace(/\\/g, '/').replace(/\/+$/, '')
        const pnorm = path.replace(/\\/g, '/')
        if (pnorm === norm || pnorm.indexOf(norm + '/') === 0) {
          if (best === null || norm.length > best.len) best = { len: norm.length, root: r }
        }
      }
      if (best !== null) {
        const rel = path.slice(best.root.length).replace(/^[/\\]+/, '')
        return rel.length > 0 ? rel : path
      }
      return path
    }

    // 0.33.0：搜索过滤 + 运行中项目置顶。
    const q = query.trim().toLowerCase()
    const filtered = q.length === 0 ? projects : projects.filter(function (p) {
      if (p.name.toLowerCase().indexOf(q) >= 0 || p.path.toLowerCase().indexOf(q) >= 0) return true
      return Array.isArray(p.services) && p.services.some(function (s) {
        return (typeof s.name === 'string' && s.name.toLowerCase().indexOf(q) >= 0) ||
          (typeof s.note === 'string' && s.note.toLowerCase().indexOf(q) >= 0) ||
          (typeof s.manageUrl === 'string' && s.manageUrl.toLowerCase().indexOf(q) >= 0) ||
          (typeof s.command === 'string' && s.command.toLowerCase().indexOf(q) >= 0)
      })
    })
    const activeProjects = []
    const emptyProjects = []
    for (const p of filtered) {
      const hasSvc = Array.isArray(p.services) && p.services.some(function (s) { return typeof s.command === 'string' && s.command.trim().length > 0 })
      if (hasSvc) activeProjects.push(p)
      else emptyProjects.push(p)
    }
    // 置顶星标排最前（按置顶先后），其后运行中优先，最后按 path 排序
    activeProjects.sort(function (a, b) {
      const ai = pins.indexOf(a.path)
      const bi = pins.indexOf(b.path)
      const ap = ai >= 0 ? 1 : 0
      const bp = bi >= 0 ? 1 : 0
      if (ap !== bp) return bp - ap
      if (ap === 1 && bp === 1) return ai - bi
      const ar = Array.isArray(a.services) && a.services.some(function (s) { return s.running === true }) ? 1 : 0
      const br = Array.isArray(b.services) && b.services.some(function (s) { return s.running === true }) ? 1 : 0
      if (ar !== br) return br - ar
      return a.path.localeCompare(b.path)
    })
    emptyProjects.sort(function (a, b) {
      const ai = pins.indexOf(a.path)
      const bi = pins.indexOf(b.path)
      const ap = ai >= 0 ? 1 : 0
      const bp = bi >= 0 ? 1 : 0
      if (ap !== bp) return bp - ap
      if (ap === 1 && bp === 1) return ai - bi
      return a.path.localeCompare(b.path)
    })

    // 0.33.0：面板工具栏（搜索 + 全局启停）。设置按钮在 header 里。
    contentChildren.push(h('div', { className: 'skm-svc-toolbar', key: 'toolbar' },
      h('input', { className: 'skm-search', type: 'search', placeholder: t('service.search.placeholder'), value: query, onChange: function (event) { setQuery(event.target.value) } }),
      h('button', { type: 'button', className: viewMode === 'card' ? 'skm-btn skm-btn-active' : 'skm-btn', title: '卡片视图：一行多个服务卡片', onClick: function () { switchView('card') } }, '▦ 卡片'),
      h('button', { type: 'button', className: viewMode === 'list' ? 'skm-btn skm-btn-active' : 'skm-btn', title: '列表视图：每行一个服务', onClick: function () { switchView('list') } }, '▤ 列表'),
      h('div', { className: 'skm-cfg-spacer' }),
      h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busy === 'allGlobal', onClick: startAllGlobal }, t('service.startAllGlobal')),
      h('button', { type: 'button', className: stopAllConfirm === 'global' ? 'skm-btn skm-btn-danger' : 'skm-btn', disabled: busy === 'allGlobal', onClick: stopAllGlobal }, stopAllConfirm === 'global' ? t('service.stopAllConfirm') : t('service.stopAllGlobal'))))

    if (projects.length === 0) {
      contentChildren.push(h('div', { className: 'skm-empty', key: 'empty' }, t('service.empty')))
      contentChildren.push(h('p', { className: 'skm-notice', key: 'emptyHint' }, t('service.emptyHint')))
    } else if (filtered.length === 0) {
      contentChildren.push(h('div', { className: 'skm-empty', key: 'noMatch' }, t('service.search.empty')))
    } else {
      if (activeProjects.length > 0) {
        contentChildren.push(h('div', { className: 'skm-repo-list', key: 'list' }, activeProjects.map(function (p) {
          const removeBusy = busy === 'remove:' + p.path
          const allBusy = busy === 'all:' + p.path
          const configured = []
          for (let i = 0; i < p.services.length; i += 1) {
            const svc = p.services[i]
            if (typeof svc.command === 'string' && svc.command.trim().length > 0) configured.push({ svc: svc, index: i })
          }
          const hasRunning = p.services.some(function (s) { return s.running === true })
          const menuOpen = projMenu === p.path
          let projBackdropEl = null
          let projMenuEl = null
          if (menuOpen) {
            projBackdropEl = h('span', { className: 'skm-menu-backdrop', onMouseDown: function () { setProjMenu(null) } })
            projMenuEl = h('div', { className: 'skm-menu' + (projMenuPos.dir === 'up' ? ' skm-menu-up' : ''), ref: projElRef, style: projMenuPos.maxH !== null ? { maxHeight: projMenuPos.maxH + 'px', overflowY: 'auto' } : null },
              h('button', { type: 'button', className: 'skm-menu-item', onClick: function () { setProjMenu(null); openEditor(p.path, -1, null) } }, '+ ' + t('service.add')),
              h('button', { type: 'button', className: removeConfirm === p.path ? 'skm-menu-item skm-menu-item-danger' : 'skm-menu-item', disabled: removeBusy, onClick: function () { setProjMenu(null); removeRegistration(p.path) } }, removeConfirm === p.path ? t('service.remove.confirm') : t('service.remove')))
          }
          const projHeadEl = h('div', { className: 'skm-svc-project-head' },
            h('button', { type: 'button', className: isPinned(p.path) ? 'skm-pin-btn skm-pin-on' : 'skm-pin-btn', title: isPinned(p.path) ? '取消置顶' : '置顶此项目（星标项目排最前，可多个）', onClick: function () { togglePin(p.path) } }, isPinned(p.path) ? '★' : '☆'),
            h('span', { className: 'skm-svc-project-name', title: p.path }, p.name),
            h('span', { className: 'skm-repo-path', title: p.path }, shortPath(p.path)),
            h('div', { className: 'skm-cfg-spacer' }),
            h('button', { type: 'button', className: hasRunning ? 'skm-btn' : 'skm-btn skm-btn-primary', disabled: allBusy, onClick: function () { startAllServices(p.path) } }, t('service.startAll')),
            h('button', { type: 'button', className: stopAllConfirm === p.path ? 'skm-btn skm-btn-danger' : 'skm-btn', disabled: allBusy, onClick: function () { stopAllServices(p.path) } }, stopAllConfirm === p.path ? t('service.stopAllConfirm') : t('service.stopAll')),
            h('button', { type: 'button', className: 'skm-btn skm-btn-ai', disabled: allBusy, onClick: function () { draftService(p.path) } }, t('service.aiConfig')),
            h('span', { className: 'skm-menu-wrap', ref: menuOpen ? projWrapRef : null },
              h('button', { type: 'button', className: 'skm-btn', title: t('service.more'), onClick: function () { setProjMenu(menuOpen ? null : p.path) } }, '⋯'),
              projBackdropEl,
              projMenuEl))
          return h('div', { key: p.path, className: 'skm-svc-project' },
            projHeadEl,
            h('div', { className: viewMode === 'card' ? 'skm-svc-cards' : 'skm-svc-rows' }, configured.map(function (row) { return serviceRow(p.path, row.svc, row.index, viewMode === 'card') })))
        })))
      }
      if (emptyProjects.length > 0) {
        const unconfHead = h('button', { type: 'button', className: 'skm-svc-unconfigured-head', onClick: function () { setUnconfiguredOpen(function (v) { return !v }) } },
          h('span', null, (unconfiguredOpen === true ? '▾ ' : '▸ ') + t('service.unconfigured', { count: String(emptyProjects.length) })))
        let unconfBody = null
        if (unconfiguredOpen === true) {
          unconfBody = h('div', { className: 'skm-svc-unconfigured-body' },
            emptyProjects.map(function (p) {
              const removeBusy = busy === 'remove:' + p.path
              const menuOpen = projMenu === p.path
              let projBackdropEl = null
              let projMenuEl = null
              if (menuOpen) {
                projBackdropEl = h('span', { className: 'skm-menu-backdrop', onMouseDown: function () { setProjMenu(null) } })
                projMenuEl = h('div', { className: 'skm-menu' },
                  h('button', { type: 'button', className: 'skm-menu-item', onClick: function () { setProjMenu(null); openEditor(p.path, -1, null) } }, '+ ' + t('service.add')),
                  h('button', { type: 'button', className: removeConfirm === p.path ? 'skm-menu-item skm-menu-item-danger' : 'skm-menu-item', disabled: removeBusy, onClick: function () { setProjMenu(null); removeRegistration(p.path) } }, removeConfirm === p.path ? t('service.remove.confirm') : t('service.remove')))
              }
              const projHeadEl = h('div', { className: 'skm-svc-project-head' },
                h('button', { type: 'button', className: isPinned(p.path) ? 'skm-pin-btn skm-pin-on' : 'skm-pin-btn', title: isPinned(p.path) ? '取消置顶' : '置顶此项目（星标项目排最前，可多个）', onClick: function () { togglePin(p.path) } }, isPinned(p.path) ? '★' : '☆'),
                h('span', { className: 'skm-svc-project-name', title: p.path }, p.name),
                h('span', { className: 'skm-repo-path', title: p.path }, shortPath(p.path)),
                h('div', { className: 'skm-cfg-spacer' }),
                h('button', { type: 'button', className: 'skm-btn skm-btn-ai', onClick: function () { draftService(p.path) } }, t('service.aiConfig')),
                h('span', { className: 'skm-menu-wrap' },
                  h('button', { type: 'button', className: 'skm-btn', title: t('service.more'), onClick: function () { setProjMenu(menuOpen ? null : p.path) } }, '⋯'),
                  projBackdropEl,
                  projMenuEl))
              return h('div', { key: p.path, className: 'skm-svc-project skm-svc-project-empty' }, projHeadEl)
            }))
        }
        contentChildren.push(h('div', { className: 'skm-svc-unconfigured', key: 'unconfigured' }, unconfHead, unconfBody))
      }
    }

    const applyTemplate = function (kind) {
      const presets = {
        node: { command: 'node index.js', args: '' },
        python: { command: 'python main.py', args: '' },
        npm: { command: 'npm run dev', args: '' },
      }
      const p = presets[kind]
      if (p === undefined) return
      setEditor(function (prev) { const d = Object.assign({}, prev.draft, { command: p.command, args: p.args }); return Object.assign({}, prev, { draft: d }) })
    }

    const fillDraft = function () {
      if (editor === null) return
      setBusy('aidraft')
      port.serviceAiDraft({ path: editor.projectPath }).then(function (result) {
        setBusy(null)
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') { fail(result.error); return }
        const d = result !== null && typeof result === 'object' && result.draft !== null && typeof result.draft === 'object' ? result.draft : null
        if (d === null) { fail(t('service.aiFillFailed', { message: '缺少草稿' })); return }
        setEditor(function (prev) {
          const next = Object.assign({}, prev.draft, {
            name: typeof d.name === 'string' && d.name.length > 0 ? d.name : prev.draft.name,
            command: typeof d.command === 'string' ? d.command : prev.draft.command,
            args: Array.isArray(d.args) ? d.args.join(' ') : prev.draft.args,
            env: d.env !== null && typeof d.env === 'object' && !Array.isArray(d.env) ? Object.keys(d.env).map(function (k) { return k + '=' + d.env[k] }).join('\n') : prev.draft.env,
            port: d.port !== null && d.port !== undefined && Number.isInteger(Number(d.port)) ? String(d.port) : prev.draft.port,
            healthUrl: typeof d.healthUrl === 'string' ? d.healthUrl : prev.draft.healthUrl,
            manageUrl: typeof d.manageUrl === 'string' ? d.manageUrl : prev.draft.manageUrl,
            note: typeof d.note === 'string' ? d.note : prev.draft.note,
            envFile: typeof d.envFile === 'string' ? d.envFile : prev.draft.envFile,
            startTimeoutMs: d.startTimeoutMs !== null && d.startTimeoutMs !== undefined && Number.isInteger(Number(d.startTimeoutMs)) ? String(d.startTimeoutMs) : prev.draft.startTimeoutMs,
          })
          return Object.assign({}, prev, { draft: next })
        })
      }).catch(function (error) { setBusy(null); fail(error instanceof Error ? error.message : String(error)) })
    }

    // 0.33.0：⚙ 设置弹窗——服务开关 + AI 服务助手设置（从主面板收纳进来）。
    const aiSettingsOverlay = aiSettingsOpen === true ? (function () {
      const aiForm = currentAiDraft()
      const aiProviderList = Array.isArray(aiProviders) ? aiProviders : []
      const aiProviderOptions = aiProviderList.map(function (p) { return p.id })
      if (aiProviderOptions.indexOf(aiForm.provider) === -1) aiProviderOptions.unshift(aiForm.provider)
      const aiSelectedProvider = aiProviderList.find(function (p) { return p.id === aiForm.provider }) || null
      const aiModelList = aiSelectedProvider !== null && Array.isArray(aiSelectedProvider.models) ? aiSelectedProvider.models : []
      const aiModelOptions = aiModelList.map(function (m) { return m.id })
      if (aiModelOptions.indexOf(aiForm.model) === -1) aiModelOptions.unshift(aiForm.model)
      const aiSelectedModel = aiModelList.find(function (m) { return m.id === aiForm.model }) || null
      const aiEffortList = aiSelectedModel !== null && Array.isArray(aiSelectedModel.efforts) && aiSelectedModel.efforts.length > 0 ? aiSelectedModel.efforts : [{ id: 'off', name: 'Off' }]
      const aiEffortValue = typeof aiForm.reasoningEffort === 'string' && aiForm.reasoningEffort.length > 0 ? aiForm.reasoningEffort : 'off'
      const aiEffortOptions = aiEffortList.map(function (e) { return e.id })
      if (aiEffortOptions.indexOf(aiEffortValue) === -1) aiEffortOptions.unshift(aiEffortValue)
      return h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setAiSettingsOpen(false) } },
        h('div', { className: 'skm-cfg-dialog skm-cfg-dialog-narrow', role: 'dialog', 'aria-modal': true, onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { event.stopPropagation(); setAiSettingsOpen(false) } } },
          h('header', { className: 'skm-cfg-header' },
            h('div', { className: 'skm-cfg-title' }, h(GearGlyph, null), t('service.aiSettingsTitle')),
            h('div', { className: 'skm-cfg-spacer' }),
            h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { setAiSettingsOpen(false) } }, h(CloseGlyph, null))),
          h('div', { className: 'skm-cfg-body' },
            h('div', { className: 'skm-repo-settings' },
              h('label', { className: 'skm-field', title: t('service.enabled.title') }, h('span', { className: 'skm-field-label' }, t('service.enabled')), h(InvSwitch, { on: settings.enabled === true, variant: 'agent', title: t('service.enabled.title'), onChange: function () { setServiceSettings({ enabled: settings.enabled !== true }) } }))),
            h('div', { className: 'skm-ai-settings' },
              h('div', { className: 'skm-ai-settings-title' }, t('service.aiSettingsProvider')),
              h('div', { className: 'skm-ai-settings-row' },
                h('label', { className: 'skm-ai-settings-toggle' },
                  h('input', { type: 'checkbox', checked: aiForm.enabled !== false, onChange: function (event) { setAiDraft(Object.assign({}, currentAiDraft(), { enabled: event.target.checked })) } }),
                  ' ' + t('service.aiSettingsEnabled')),
                h('span', { className: 'skm-ai-settings-label' }, t('service.aiSettingsProvider')),
                h('select', { className: 'skm-select skm-ai-settings-input', value: aiForm.provider, onChange: function (event) {
                  const pid = event.target.value
                  const p = aiProviderList.find(function (x) { return x.id === pid })
                  const firstModel = p !== null && p !== undefined && Array.isArray(p.models) && p.models.length > 0 ? p.models[0].id : aiForm.model
                  setAiDraft(Object.assign({}, currentAiDraft(), { provider: pid, model: firstModel, reasoningEffort: 'off' }))
                } }, aiProviderOptions.map(function (pid) {
                  const p = aiProviderList.find(function (x) { return x.id === pid })
                  const label = p !== null && p !== undefined ? aiOptionLabel(p.name, p.id) : pid
                  return h('option', { key: pid, value: pid }, label)
                })),
                h('span', { className: 'skm-ai-settings-label' }, t('service.aiSettingsModel')),
                h('select', { className: 'skm-select skm-ai-settings-input', value: aiForm.model, onChange: function (event) { setAiDraft(Object.assign({}, currentAiDraft(), { model: event.target.value, reasoningEffort: 'off' })) } }, aiModelOptions.map(function (mid) {
                  const m = aiModelList.find(function (x) { return x.id === mid })
                  const label = m !== null && m !== undefined ? aiOptionLabel(m.name, m.id) : mid
                  return h('option', { key: mid, value: mid }, label)
                })),
                h('span', { className: 'skm-ai-settings-label' }, t('service.aiSettingsEffort')),
                h('select', { className: 'skm-select skm-ai-settings-input', value: aiEffortValue, onChange: function (event) { setAiDraft(Object.assign({}, currentAiDraft(), { reasoningEffort: event.target.value })) } }, aiEffortOptions.map(function (eid) {
                  const e = aiEffortList.find(function (x) { return x.id === eid })
                  return h('option', { key: eid, value: eid }, e !== null && e !== undefined ? aiOptionLabel(e.name, e.id) : eid)
                })))),
            h('div', { className: 'skm-cfg-actions' },
              h('button', { type: 'button', className: aiClearConfirm === true ? 'skm-btn skm-btn-danger' : 'skm-btn', disabled: busy === 'aiClearCache', onClick: clearAiExplainCache }, aiClearConfirm === true ? t('service.aiSettingsClearCacheConfirm') : t('service.aiSettingsClearCache')),
              h('div', { className: 'skm-cfg-spacer' }),
              h('button', { type: 'button', className: 'skm-btn', onClick: function () { setAiSettingsOpen(false) } }, t('service.cancel')),
              h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busy === 'aiSettings', onClick: function () { saveAiSettingsService(); setAiSettingsOpen(false) } }, busy === 'aiSettings' ? t('service.saving') : t('service.aiSettingsSave'))))))
    })() : null

    const editorOverlay = editor !== null ? h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setEditor(null) } },
      h('div', { className: 'skm-cfg-dialog', role: 'dialog', 'aria-modal': true, onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { event.stopPropagation(); setEditor(null) } } },
        h('header', { className: 'skm-cfg-header' },
          h('div', { className: 'skm-cfg-title' }, editor.index === -1 ? t('service.addTitle', { project: editor.projectPath.split('/').filter(function (s) { return s.length > 0 }).pop() || editor.projectPath }) : t('service.configTitle', { name: editor.draft.name || '' })),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { setEditor(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-cfg-body' },
          opError !== null ? h('p', { className: 'skm-notice skm-notice-error', key: 'editorOpError' }, t('service.opError', { message: opError })) : null,
          notice !== null ? h('p', { className: 'skm-notice', key: 'editorNotice' }, notice) : null,
          editor.index === -1 ? h('div', { className: 'skm-svc-field skm-svc-templates', key: 'templates' },
            h('span', { className: 'skm-field-label' }, t('service.templates')),
            h('button', { type: 'button', className: 'skm-btn', onClick: function () { applyTemplate('node') } }, t('service.templateNode')),
            h('button', { type: 'button', className: 'skm-btn', onClick: function () { applyTemplate('python') } }, t('service.templatePython')),
            h('button', { type: 'button', className: 'skm-btn', onClick: function () { applyTemplate('npm') } }, t('service.templateNpm')),
            h('div', { className: 'skm-cfg-spacer' }),
            h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busy === 'aidraft', onClick: fillDraft }, busy === 'aidraft' ? t('service.aiFilling') : t('service.aiFill'))) : null,
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.name')), h('input', { className: 'skm-select', type: 'text', value: editor.draft.name, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { name: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.note')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.note.placeholder'), value: editor.draft.note, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { note: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.cwd')), h('input', { className: 'skm-select', type: 'text', list: 'skm-cwd-options', value: editor.draft.cwd, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { cwd: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } }), h('datalist', { id: 'skm-cwd-options' }, knownDirs.map(function (d) { return h('option', { key: d, value: d }) }))),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.command')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.command.placeholder'), value: editor.draft.command, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { command: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.args')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.args.placeholder'), value: editor.draft.args, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { args: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.port')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.port.placeholder'), value: editor.draft.port, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { port: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.healthUrl')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.healthUrl.placeholder'), value: editor.draft.healthUrl, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { healthUrl: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.manageUrl')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.manageUrl.placeholder'), value: editor.draft.manageUrl, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { manageUrl: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.envFile')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.envFile.placeholder'), value: editor.draft.envFile, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { envFile: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.startTimeoutMs')), h('input', { className: 'skm-select', type: 'text', placeholder: t('service.startTimeoutMs.placeholder'), value: editor.draft.startTimeoutMs, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { startTimeoutMs: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } })),
          h('div', { className: 'skm-svc-field skm-svc-switches' },
            h('label', { className: 'skm-field', title: t('service.autoStart.title') }, h('span', { className: 'skm-field-label' }, t('service.autoStart')), h(InvSwitch, { on: editor.draft.autoStart === true, variant: 'agent', title: t('service.autoStart.title'), onChange: function () { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { autoStart: prev.draft.autoStart !== true }); return Object.assign({}, prev, { draft: d }) }) } })),
            h('label', { className: 'skm-field', title: t('service.autoRestart.title') }, h('span', { className: 'skm-field-label' }, t('service.autoRestart')), h(InvSwitch, { on: editor.draft.autoRestart === true, variant: 'user', title: t('service.autoRestart.title'), onChange: function () { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { autoRestart: prev.draft.autoRestart !== true }); return Object.assign({}, prev, { draft: d }) }) } })),
            h('label', { className: 'skm-field', title: t('service.detached.title') }, h('span', { className: 'skm-field-label' }, t('service.detached')), h(InvSwitch, { on: editor.draft.detached === true, variant: 'warn', title: t('service.detached.title'), onChange: function () { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { detached: prev.draft.detached !== true }); return Object.assign({}, prev, { draft: d }) }) } }))),
          h('label', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.env')), h('textarea', { className: 'skm-svc-textarea', spellCheck: false, placeholder: t('service.env.placeholder'), value: editor.draft.env, onChange: function (event) { setEditor(function (prev) { const d = Object.assign({}, prev.draft, { env: event.target.value }); return Object.assign({}, prev, { draft: d }) }) } }))),
        h('footer', { className: 'skm-cfg-foot' },
          editor.index !== -1 ? h('button', { type: 'button', className: 'skm-btn skm-btn-danger', disabled: busy === 'editor', onClick: deleteFromEditor }, deleteConfirm === true ? t('service.deleteService.confirm') : t('service.deleteService')) : null,
          h('div', { className: 'skm-cfg-spacer' }),
          h('button', { type: 'button', className: 'skm-btn', onClick: function () { setEditor(null) } }, t('service.cancel')),
          h('button', { type: 'button', className: 'skm-btn skm-btn-primary', disabled: busy === 'editor', onClick: saveEditor }, busy === 'editor' ? t('service.saving') : t('service.save'))))) : null

    const logFilterText = logFilter.trim().toLowerCase()
    const logDisplayText = logFilterText.length > 0
      ? logData.text.split(/\r?\n/).filter(function (line) { return line.toLowerCase().indexOf(logFilterText) >= 0 }).join('\n')
      : logData.text
    const logMatchCount = logFilterText.length > 0 ? logDisplayText.split('\n').filter(function (line) { return line.length > 0 }).length : 0
    const logPreText = logDisplayText.length > 0 ? logDisplayText : (logFilterText.length > 0 ? t('service.logs.searchCount', { count: '0' }) : t('service.logs.empty'))

    const logOverlay = logViewer !== null ? h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setLogViewer(null) } },
      h('div', { className: 'skm-cfg-dialog', role: 'dialog', 'aria-modal': true, onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { event.stopPropagation(); setLogViewer(null) } } },
        h('header', { className: 'skm-cfg-header' },
          h('div', { className: 'skm-cfg-title' }, t('service.logs.title', { name: logViewer.name })),
          h('div', { className: 'skm-cfg-spacer' }),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { setLogViewer(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-cfg-body' },
          h('div', { className: 'skm-svc-log-toolbar' },
            h('input', { className: 'skm-select skm-svc-log-search', type: 'text', placeholder: t('service.logs.search'), value: logFilter, onChange: function (event) { setLogFilter(event.target.value) } }),
            h('button', { type: 'button', className: 'skm-btn', disabled: logAi !== null && logAi.loading === true, onClick: runLogAi }, logAi !== null && logAi.loading === true ? t('service.logs.aiSummaryRunning') : t('service.logs.aiSummary')),
            h('button', { type: 'button', className: 'skm-btn', onClick: function () { setLogPaused(function (v) { return !v }) } }, logPaused === true ? t('service.logs.resume') : t('service.logs.pause')),
            h('button', { type: 'button', className: logClearConfirm === true ? 'skm-btn skm-btn-danger' : 'skm-btn', disabled: logData.text.length === 0, onClick: clearLogs }, logClearConfirm === true ? t('service.logs.clearConfirm') : t('service.logs.clear')),
            h('button', { type: 'button', className: 'skm-btn', disabled: logData.text.length === 0, onClick: downloadLogs }, t('service.logs.download')),
            h('button', { type: 'button', className: 'skm-btn', disabled: logMax >= 2 * 1024 * 1024, onClick: loadMoreLogs }, t('service.logs.loadMore')),
            h('span', { className: 'skm-svc-meta' }, t('service.logs.autoRefresh')),
            logFilterText.length > 0 ? h('span', { className: 'skm-svc-meta' }, t('service.logs.searchCount', { count: String(logMatchCount) })) : null),
          logData.detached === true ? h('p', { className: 'skm-notice' }, t('service.logs.detachedHint')) : null,
          logAi !== null ? (logAi.loading === true ? h('p', { className: 'skm-notice' }, t('service.logs.aiSummaryRunning'))
            : logAi.error !== null ? h('p', { className: 'skm-notice skm-notice-error' }, t('service.logs.aiSummaryFailed', { message: logAi.error }))
              : h('div', { className: 'skm-notice skm-ai-diag' }, h('strong', null, t('service.logs.aiSummary') + '：'), h('span', null, logAi.text || ''))) : null,
          logData.loading === true ? h('p', { className: 'skm-notice' }, t('service.logs.empty'))
            : logData.error !== null ? h('p', { className: 'skm-notice skm-notice-error' }, t('service.logs.readError', { message: logData.error }))
              : h('pre', { className: 'skm-svc-log', ref: logBodyRef }, String(logPreText).split('\n').map(function (line, i) {
                const errLine = /error|fail|exception|EADDRINUSE|unhandled/i.test(line)
                return errLine ? h('span', { key: i, className: 'skm-log-line-err' }, line + '\n') : line + '\n'
              }))))) : null

    // 0.23.0：外部占用进程详情（只读信息 + 「杀死进程」操作；仍不接管、不写状态文件、不纳入 autoRestart/日志）。
    const extModalKillBusy = extModal !== null ? busy === 'kill:' + extModal.path + '|' + extModal.svc.name : false
    const extModalOverlay = extModal !== null ? h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setExtModal(null) } },
      h('div', { className: 'skm-cfg-dialog', role: 'dialog', 'aria-modal': true, onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { event.stopPropagation(); setExtModal(null) } } },
        h('header', { className: 'skm-cfg-header' },
          h('div', { className: 'skm-cfg-title' }, t('service.external.modal.title')),
          h('div', { className: 'skm-cfg-spacer' }),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { setExtModal(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-cfg-body' },
          h('div', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.external.modal.name')), h('span', null, extModal.svc.externalName !== null && extModal.svc.externalName !== undefined && extModal.svc.externalName.length > 0 ? extModal.svc.externalName : t('service.external.modal.empty'))),
          h('div', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.external.modal.pid')), h('span', null, extModal.svc.externalPid !== null && extModal.svc.externalPid !== undefined ? String(extModal.svc.externalPid) : t('service.external.modal.empty'))),
          h('div', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.external.modal.port')), h('span', null, extModal.svc.port !== null && extModal.svc.port !== undefined ? String(extModal.svc.port) : t('service.external.modal.empty'))),
          h('div', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.external.modal.basis')), h('span', null, extModal.svc.externalRelated === true ? t('service.external.modal.basisRelated') : extModal.svc.externalRelated === false ? t('service.external.modal.basisUnrelated') : t('service.external.modal.basisUnknown'))),
          h('div', { className: 'skm-svc-field' }, h('span', { className: 'skm-field-label' }, t('service.external.modal.cmdline')), h('pre', { className: 'skm-svc-log' }, extModal.svc.externalCommandLine !== null && extModal.svc.externalCommandLine !== undefined && extModal.svc.externalCommandLine.length > 0 ? extModal.svc.externalCommandLine : t('service.external.modal.empty'))),
          h('p', { className: 'skm-notice' }, t('service.external.title', { port: String(extModal.svc.port), pid: extModal.svc.externalPid !== null && extModal.svc.externalPid !== undefined ? String(extModal.svc.externalPid) : '?' })),
          h('div', { className: 'skm-cfg-actions' },
            h('button', { type: 'button', className: 'skm-btn skm-btn-danger', disabled: extModalKillBusy, onClick: function () { setKillConfirm({ path: extModal.path, svc: extModal.svc }) } }, extModalKillBusy ? t('service.external.killing') : t('service.external.kill'))))))
      : null

    // 0.23.0：杀死外部进程确认框（related 非 true 时红色警示；杀前 host 会重新反查端口占用）。
    const killConfirmOverlay = killConfirm !== null ? h('div', { className: 'skm-cfg-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) setKillConfirm(null) } },
      h('div', { className: 'skm-cfg-dialog', role: 'dialog', 'aria-modal': true, onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key === 'Escape') { event.stopPropagation(); setKillConfirm(null) } } },
        h('header', { className: 'skm-cfg-header' },
          h('div', { className: 'skm-cfg-title' }, t('service.external.killConfirmTitle')),
          h('div', { className: 'skm-cfg-spacer' }),
          h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { setKillConfirm(null) } }, h(CloseGlyph, null))),
        h('div', { className: 'skm-cfg-body' },
          h('p', null, t('service.external.killConfirmBody', { port: String(killConfirm.svc.port), name: killConfirm.svc.externalName !== null && killConfirm.svc.externalName !== undefined && killConfirm.svc.externalName.length > 0 ? killConfirm.svc.externalName : '?', pid: killConfirm.svc.externalPid !== null && killConfirm.svc.externalPid !== undefined ? String(killConfirm.svc.externalPid) : '?' })),
          killConfirm.svc.externalRelated === true ? null : h('p', { className: 'skm-notice skm-notice-error' }, t('service.external.killConfirmWarn')),
          h('div', { className: 'skm-cfg-actions' },
            h('button', { type: 'button', className: 'skm-btn', disabled: busy === 'kill:' + killConfirm.path + '|' + killConfirm.svc.name, onClick: function () { setKillConfirm(null) } }, t('service.cancel')),
            h('button', { type: 'button', className: 'skm-btn skm-btn-danger', disabled: busy === 'kill:' + killConfirm.path + '|' + killConfirm.svc.name, onClick: doKillExternal }, busy === 'kill:' + killConfirm.path + '|' + killConfirm.svc.name ? t('service.external.killing') : t('service.external.kill'))))))
      : null

    return h(React.Fragment, null,
      h('div', { className: 'skm-backdrop', onMouseDown: function (event) { if (event.target === event.currentTarget) serviceOpenStore.set(false) } },
        h('section', { className: 'skm-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': t('service.panel.title'), onClick: function (event) { event.stopPropagation() }, onKeyDown: function (event) { if (event.key !== 'Escape') return; const target = event.target; if (target !== null && typeof target === 'object' && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && typeof target.value === 'string' && target.value.length > 0) return; serviceOpenStore.set(false) } },
          h('header', { className: 'skm-header' },
            h('div', { className: 'skm-title' }, h(ServiceGlyph, { size: 16 }), t('service.panel.title'), h('span', { className: 'skm-total' }, 'v' + VERSION)),
            h('div', { className: 'skm-header-spacer' }),
            h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('service.aiSettingsTitle'), title: t('service.aiSettingsTitle'), onClick: function () { setAiSettingsOpen(true) } }, h(GearGlyph, null)),
            h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.refresh'), title: t('panel.refresh'), onClick: refresh }, h(RefreshGlyph, null)),
            h('button', { type: 'button', className: 'skm-icon-btn', 'aria-label': t('panel.close'), title: t('panel.close'), onClick: function () { serviceOpenStore.set(false) } }, h(CloseGlyph, null))),
          h('div', { className: 'skm-content' }, contentChildren))),
      aiSettingsOverlay,
      editorOverlay,
      logOverlay,
      extModalOverlay,
      killConfirmOverlay)
  }

  function apply(ctx) {
    const locale = ctx.get('locale')
    workspacesService = ctx.get('workspaces')
    conversationService = ctx.get('conversation')
    sessionsService = ctx.get('sessions')

    // F4-4：不在页面加载时预取仓库数据——repoScan + AI 预热 + 详情预热三连发
    // 会在浏览器启动瞬间制造无谓的 git/gh 风暴；改为仓库面板首次打开时按需加载。

    // —— “备注名即别名”的 `/` 菜单源（组头固定字面量「技能别名」）——
    // 纯客户端扩展：触发管线允许任意插件注册新源，按源分组渲染；
    // 别名数据实时取自 notesGet（备注名+内容+拼音串），目录取自 catalog（含原名拼音串）。
    // 匹配层级（0.5.0）：原文前缀 > 原文模糊 > 全拼前缀 > 首字母前缀 > 全拼模糊；
    // 有别名显示“别名 · 原名”，无别名但原名含中文、被拼音命中时显示裸原名。
    const inputTriggers = ctx.get('inputTriggers')
    if (inputTriggers !== undefined && typeof inputTriggers.registerSource === 'function') {
      ctx.effect(function () {
        const unregister = inputTriggers.registerSource({
          trigger: '/',
          name: '技能别名',
          order: 3,
          async candidates(session, req) {
            try {
              const query = req !== null && typeof req === 'object' && typeof req.query === 'string' ? req.query : ''
              const q = query.toLowerCase()
              const qp = lettersOnly(q)
              const sessionId = session !== undefined && session !== null && typeof session.sessionId === 'string' ? session.sessionId : ''
              const hit = aliasCacheHit(sessionId)
              if (hit !== null) {
                // 命中缓存：同步返回；过期则后台静默刷新（不阻塞本次击键）
                if (Date.now() - hit.at >= ALIAS_CACHE_TTL) ensureAliasCache(sessionId).catch(function () {})
                return computeAliasCandidates(hit.catalog, hit.notes, q, qp)
              }
              const fresh = await ensureAliasCache(sessionId)
              return computeAliasCandidates(fresh.catalog, fresh.notes, q, qp)
            } catch (error) {
              return []
            }
          },
          onPick(payload) {
            const candidate = payload !== null && typeof payload === 'object' ? payload.candidate : undefined
            const skillName = candidate !== undefined && candidate !== null && typeof candidate.skillName === 'string' ? candidate.skillName : ''
            return { text: skillName.length > 0 ? '/' + skillName + ' ' : '' }
          },
        })
        return function () { if (typeof unregister === 'function') unregister() }
      }, 'skill-manager: alias source')
    }

    const slots = ctx.get('slots')
    if (slots === undefined) return

    if (locale !== undefined) ctx.effect(function () { return locale.register(NS, { zh: zh, en: en }) }, 'skill-manager: dictionaries')

    ctx.effect(function () {
      const id = 'dsh-manager-style'
      if (document.getElementById(id) === null) {
        const s = document.createElement('style')
        s.id = id
        s.dataset.plugin = '@deepseek-ai/dsh-manager'
        s.textContent = CSS_TEXT
        document.head.appendChild(s)
      }
      return function () { const el = document.getElementById(id); if (el !== null) el.remove() }
    }, 'dsh-manager: styles')

    // 提醒模式 B（后台轮询 + 角标）：启动时按已存设置决定；面板内切换时即时生效。
    port.patchSettingsGet().then(function (result) {
      if (result !== null && typeof result === 'object' && result.settings !== null && typeof result.settings === 'object' && result.settings.alertMode === 'badge') applyBadgeMode('badge')
    }).catch(function () {})
    ctx.effect(function () {
      return function () { if (patchBadgeTimer !== null) { window.clearInterval(patchBadgeTimer); patchBadgeTimer = null } }
    }, 'dsh-manager: badge polling')

    slots.inject('sidebar.footer.action', function () { return slots.register({ name: 'sidebar.footer.action', id: 'patch-manager', order: -2, locale: NS }, PatchTrigger) })
    slots.inject('shell.overlay', function () { return slots.register({ name: 'shell.overlay', id: 'patch-manager', locale: NS }, PatchPanel) })
    slots.inject('sidebar.footer.action', function () { return slots.register({ name: 'sidebar.footer.action', id: 'skills-manager', order: -1, locale: NS }, Trigger) })
    slots.inject('shell.overlay', function () { return slots.register({ name: 'shell.overlay', id: 'skills-manager', locale: NS }, Panel) })
    slots.inject('sidebar.footer.action', function () { return slots.register({ name: 'sidebar.footer.action', id: 'repo-manager', order: 0, locale: NS }, RepoTrigger) })
    slots.inject('shell.overlay', function () { return slots.register({ name: 'shell.overlay', id: 'repo-manager', locale: NS }, RepoPanel) })
    slots.inject('sidebar.footer.action', function () { return slots.register({ name: 'sidebar.footer.action', id: 'service-manager', order: 1, locale: NS }, ServiceTrigger) })
    slots.inject('shell.overlay', function () { return slots.register({ name: 'shell.overlay', id: 'service-manager', locale: NS }, ServicePanel) })
  }

  // ---- 完整 .skm-* 样式（与动态版 styles.insert 相同，颜色全走 --dsw-alias-* 主题 token）----
  const CSS_TEXT = `div:has(> div[data-slot='sidebar.footer.action']) { flex-direction: column; align-items: center; }
.skm-trigger { box-sizing:border-box; cursor:pointer; width:calc(100% + 8px); height:34px; color:var(--dsw-alias-label-primary); background:transparent; border:none; border-radius:12px; flex:none; align-items:center; gap:8px; margin:4px -4px; padding:6px 2px 6px 10px; font-family:inherit; font-size:14px; line-height:22px; display:flex; overflow:hidden; }
.skm-trigger:hover { background:var(--dsw-alias-interactive-bg-hover); }
.skm-trigger-rail { border-radius:50%; justify-content:center; gap:0; width:36px; height:36px; margin:8px 0 10px; padding:0; }
.skm-trigger-label { white-space:nowrap; overflow:hidden; }
.skm-backdrop { position:fixed; inset:0; z-index:9000; background:rgba(10,12,16,.5); display:flex; align-items:center; justify-content:center; padding:24px; pointer-events:auto; }
.skm-dialog { display:flex; flex-direction:column; width:min(1120px,100%); height:min(760px,100%); background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:14px; box-shadow:0 24px 64px rgba(0,0,0,.4); overflow:hidden; }
.skm-header { display:flex; align-items:center; gap:10px; padding:10px 14px; border-bottom:1px solid var(--dsw-alias-border-l1); flex-wrap:wrap; flex-shrink:0; }
.skm-title { display:flex; align-items:center; gap:8px; font-size:13.5px; font-weight:600; color:var(--dsw-alias-label-primary); }
.skm-total { font-size:11.5px; font-weight:400; color:var(--dsw-alias-label-secondary); }
.skm-header-spacer { flex:1 1 auto; }
.skm-field { display:flex; align-items:center; gap:6px; }
.skm-field-label { font-size:12px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
.skm-select, .skm-search { font:inherit; font-size:12px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:5px 8px; max-width:300px; }
.skm-search { width:180px; }
.skm-select:focus, .skm-search:focus { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-1px; border-color:transparent; }
.skm-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:27px; height:27px; border:1px solid var(--dsw-alias-border-l1); background:transparent; color:var(--dsw-alias-label-secondary); border-radius:7px; cursor:pointer; flex-shrink:0; }
.skm-icon-btn:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); }
.skm-split { flex:1; min-height:0; display:flex; }
.skm-nav { width:200px; flex-shrink:0; border-right:1px solid var(--dsw-alias-border-l1); padding:10px 10px 14px; display:flex; flex-direction:column; gap:4px; overflow-y:auto; }
.skm-nav-title { font-size:10.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--dsw-alias-label-secondary); opacity:.8; padding:2px 8px 6px; flex-shrink:0; }
.skm-nav-item { display:flex; align-items:center; justify-content:space-between; gap:8px; font:inherit; font-size:12.5px; line-height:1; text-align:left; color:var(--dsw-alias-label-secondary); background:transparent; border:1px solid transparent; border-radius:7px; padding:8px 9px; cursor:pointer; flex-shrink:0; }
.skm-nav-item:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-2); }
.skm-nav-item-active { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-2); border-color:var(--dsw-alias-border-l1); }
.skm-nav-item-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-nav-item-count { font-size:10.5px; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:999px; padding:0 6px; line-height:15px; flex-shrink:0; }
.skm-nav-item-active .skm-nav-item-count { color:var(--dsw-alias-brand-primary); border-color:currentColor; }
.skm-content { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; padding:12px 14px 14px; gap:10px; }
.skm-accent-global { --skm-accent: var(--dsw-alias-state-success-primary); }
.skm-accent-project { --skm-accent: var(--dsw-alias-brand-primary); }
.skm-accent-preset { --skm-accent: var(--dsw-alias-state-warn-primary); }
.skm-accent-builtin { --skm-accent: var(--dsw-alias-label-secondary); }
.skm-section-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex-shrink:0; padding-bottom:8px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.skm-section-main { display:flex; align-items:center; gap:7px; }
.skm-section-mark { width:9px; height:9px; border-radius:3px; background:var(--skm-accent); flex-shrink:0; }
.skm-section-title { font-size:13.5px; font-weight:600; color:var(--dsw-alias-label-primary); }
.skm-section-count { margin-left:auto; font-size:11px; color:var(--dsw-alias-label-secondary); }
.skm-section-hint { flex-basis:100%; font-size:11.5px; color:var(--dsw-alias-label-secondary); padding-left:16px; }
.skm-grid { flex:1; min-height:0; overflow-y:auto; display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; align-content:start; padding:2px; }
.skm-empty { flex:1; display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--dsw-alias-label-secondary); opacity:.75; border:1px dashed var(--dsw-alias-border-l1); border-radius:10px; }
.skm-card { display:grid; grid-template-rows:130px auto 54px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:10px; min-width:0; overflow:hidden; transition:border-color .12s, box-shadow .12s; }
.skm-card:hover { border-color:var(--dsw-alias-border-l2); box-shadow:0 2px 10px rgba(0,0,0,.08); }
.skm-card-top { display:flex; flex-direction:column; justify-content:flex-start; gap:6px; padding:10px 12px 4px; min-height:0; overflow:hidden; }
.skm-card-split { border:none; border-top:1px solid var(--dsw-alias-border-l1); margin:0; }
.skm-card-head { flex:0 0 auto; display:flex; align-items:center; gap:8px; min-width:0; }
.skm-card-icon { width:26px; height:26px; border-radius:7px; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; color:var(--skm-accent); background:color-mix(in srgb, var(--skm-accent) 14%, transparent); flex-shrink:0; }
.skm-card-name { flex:1; min-width:0; font-size:13px; font-weight:600; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-card-scope { flex:0 0 auto; max-width:110px; font-size:9.5px; line-height:1.6; padding:0 6px; border-radius:999px; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-card-desc { flex:0 0 48px; height:48px; margin:0; font-size:11.5px; line-height:24px; color:var(--dsw-alias-label-secondary); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.skm-card-divider { flex:0 0 auto; border:none; border-top:1px solid var(--dsw-alias-border-l1); margin:0; }
.skm-card-foot { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:10px; }
.skm-card-provider { font-size:10px; color:var(--dsw-alias-label-secondary); opacity:.65; font-family:ui-monospace,Consolas,monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.skm-inv { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.skm-swlabel { font-size:9.5px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
.skm-lock { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:6px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; padding:0; flex-shrink:0; }
.skm-lock:hover { color:var(--dsw-alias-brand-primary); border-color:var(--dsw-alias-brand-primary); }
.skm-lock-on { color:var(--dsw-alias-label-secondary); }
.skm-lock-off { color:var(--dsw-alias-brand-primary); border-color:var(--dsw-alias-brand-primary); }
.skm-sw { position:relative; width:26px; height:15px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-base); cursor:pointer; padding:0; flex-shrink:0; transition:background .12s; }
.skm-sw:focus { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:1px; }
.skm-sw-thumb { position:absolute; top:2px; left:2px; width:9px; height:9px; border-radius:50%; background:var(--dsw-alias-label-secondary); transition:left .12s, background .12s; }
.skm-sw-on { background:var(--dsw-alias-state-success-primary); border-color:transparent; }
.skm-sw-on .skm-sw-thumb { left:13px; background:#fff; }
.skm-sw-user-on { background:var(--dsw-alias-brand-primary); border-color:transparent; }
.skm-sw-user-on .skm-sw-thumb { left:13px; background:#fff; }
.skm-sw-dis { opacity:.45; cursor:default; }
.skm-card-gear { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; flex-shrink:0; border:1px solid transparent; background:transparent; color:var(--dsw-alias-label-secondary); border-radius:6px; cursor:pointer; padding:0; opacity:.55; transition:opacity .12s, border-color .12s; }
.skm-card:hover .skm-card-gear { opacity:1; }
.skm-card-gear:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l1); }
.skm-card-del { display:inline-flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0; height:22px; border:1px solid transparent; background:transparent; color:var(--dsw-alias-label-secondary); border-radius:6px; cursor:pointer; padding:0 6px; font-size:11px; opacity:.55; transition:opacity .12s, border-color .12s, color .12s, background .12s; }
.skm-card:hover .skm-card-del { opacity:1; }
.skm-card-del:hover { color:var(--dsw-alias-state-error-primary); border-color:var(--dsw-alias-state-error-primary); }
.skm-card-del:disabled { opacity:.3; cursor:default; }
.skm-card-del:disabled:hover { color:var(--dsw-alias-label-disabled); border-color:var(--dsw-alias-border-l2); background:transparent; }
.skm-card-del-confirm { opacity:1; color:#fff; background:var(--dsw-alias-state-error-primary); border-color:transparent; }
.skm-card-del-confirm:hover { color:#fff; background:var(--dsw-alias-state-error-primary); filter:brightness(1.08); }
.skm-notes-view { display:flex; flex-direction:column; padding:6px 12px 6px; min-height:0; overflow:hidden; background:color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent); }
.skm-notes-head { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.skm-notes-title { flex:1; min-width:0; font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-notes-edit { display:inline-flex; align-items:center; gap:4px; flex-shrink:0; font-size:10.5px; color:var(--dsw-alias-label-secondary); background:transparent; border:1px solid var(--dsw-alias-border-l1); border-radius:6px; padding:2px 7px; cursor:pointer; }
.skm-notes-edit:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l2); }
.skm-notes-content { margin:6px 0 0; flex:1 1 auto; min-height:0; overflow-y:auto; font-size:11.5px; line-height:1.55; color:var(--dsw-alias-label-primary); white-space:pre-wrap; word-break:break-word; }
.skm-notes-content-empty { color:var(--dsw-alias-label-secondary); font-style:italic; overflow:hidden; }
.skm-notes-editor { display:flex; flex-direction:column; gap:6px; padding:8px 12px 10px; min-height:0; overflow:hidden; }
.skm-notes-input { font:inherit; font-size:12px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:5px 8px; flex-shrink:0; }
.skm-notes-input:focus { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-1px; border-color:transparent; }
.skm-notes-textarea { flex:1; min-height:0; resize:none; font:inherit; font-size:11.5px; line-height:1.5; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:6px 8px; }
.skm-notes-textarea:focus { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-1px; border-color:transparent; }
.skm-notes-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.skm-notes-hint { font-size:10px; color:var(--dsw-alias-label-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.skm-notes-title-input { flex:1; min-width:0; font:inherit; font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary); background:transparent; border:1px solid transparent; border-radius:6px; padding:2px 6px; margin:0; opacity:1; transition:border-color .12s, background .12s, color .12s; }
.skm-notes-title-input:hover { border-color:var(--dsw-alias-border-l1); }
.skm-notes-title-input:focus { outline:none; border-color:transparent; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); opacity:1; }
.skm-notes-title-input::placeholder { color:var(--dsw-alias-label-secondary); opacity:.6; }
.skm-notes-area { box-sizing:border-box; width:100%; flex:none; height:42px; min-height:0; resize:none; font:inherit; font-size:11.5px; line-height:16px; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-base); border:1px solid transparent; border-radius:6px; padding:4px 6px; margin:0; overflow-y:hidden; overflow-x:hidden; }
.skm-notes-area:focus { outline:none; border-color:transparent; }
.skm-notes-area::placeholder { color:var(--dsw-alias-label-secondary); opacity:.6; font-style:italic; }
.skm-trash-grid { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:8px; align-content:start; padding:2px; }
.skm-trash-card { display:flex; align-items:center; gap:10px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:10px; padding:10px 12px; min-width:0; }
.skm-trash-card:hover { border-color:var(--dsw-alias-border-l2); }
.skm-trash-head { flex:1; min-width:0; display:flex; align-items:center; gap:10px; }
.skm-trash-name { flex-shrink:0; max-width:45%; font-size:13px; font-weight:600; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-trash-meta { min-width:0; font-size:11px; color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-trash-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.skm-trash-del { color:var(--dsw-alias-state-error-primary); }
.skm-trash-del-confirm { background:var(--dsw-alias-state-error-primary); border-color:transparent; color:#fff; }
.skm-trash-del-confirm:hover { filter:brightness(1.08); }
.skm-notice { margin:0; font-size:11.5px; color:var(--dsw-alias-label-secondary); border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:8px; padding:7px 11px; flex-shrink:0; }
.skm-notice-error { color:var(--dsw-alias-state-error-primary); }
.skm-cfg-backdrop { position:fixed; inset:0; z-index:9200; background:rgba(10,12,16,.55); display:flex; align-items:center; justify-content:center; padding:28px; pointer-events:auto; }
.skm-cfg-dialog { display:flex; flex-direction:column; width:min(780px,100%); height:min(660px,100%); background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:14px; box-shadow:0 24px 64px rgba(0,0,0,.45); overflow:hidden; }
.skm-cfg-header { display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.skm-cfg-title { font-size:14px; font-weight:600; color:var(--dsw-alias-label-primary); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-cfg-body { flex:1; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:12px; }
.skm-cfg-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:4px; }
.skm-cfg-meta { display:flex; flex-direction:column; gap:5px; font-size:11.5px; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.skm-cfg-meta code { font-family:ui-monospace,Consolas,monospace; background:var(--dsw-alias-bg-layer-2); padding:1px 6px; border-radius:5px; }
.skm-badge { align-self:flex-start; font-size:11px; padding:2px 8px; border-radius:999px; border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
.skm-badge-ro { color:var(--dsw-alias-state-warn-primary); border-color:currentColor; }
.skm-badge-lost { color:var(--dsw-alias-state-error-primary); border-color:currentColor; }
.skm-patch-targets { margin:0; font-size:11.5px; color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-patch-targets code { font-family:ui-monospace,Consolas,monospace; background:var(--dsw-alias-bg-layer-2); padding:1px 6px; border-radius:5px; }
.skm-badge-ok { color:var(--dsw-alias-state-success-primary); border-color:currentColor; }
.skm-cfg-textarea { flex:1; min-height:280px; resize:vertical; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; font-size:12px; line-height:1.6; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:10px 12px; }
.skm-cfg-textarea:focus { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-1px; border-color:transparent; }
.skm-cfg-foot { display:flex; align-items:center; gap:8px; padding:12px 16px; border-top:1px solid var(--dsw-alias-border-l1); }
.skm-status { font-size:12px; }
.skm-status-ok { color:var(--dsw-alias-state-success-primary); }
.skm-status-err { color:var(--dsw-alias-state-error-primary); }
.skm-btn { display:inline-flex; align-items:center; gap:5px; font:inherit; font-size:12px; border-radius:7px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); padding:5px 12px; cursor:pointer; }
.skm-btn:hover { border-color:var(--dsw-alias-border-l2); }
.skm-btn-primary { background:var(--dsw-alias-brand-primary); border-color:transparent; color:#fff; }
.skm-btn-primary:hover { filter:brightness(1.08); }
.skm-btn-ai { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); }
.skm-btn-ai:hover { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); }
.skm-btn:disabled { opacity:.55; cursor:default; }
.skm-cfg-spacer { flex:1; }
.skm-trigger { position:relative; }
.skm-patch-badge { position:absolute; top:7px; right:10px; width:8px; height:8px; border-radius:50%; background:var(--dsw-alias-state-error-primary); flex:none; }
.skm-patch-dialog { width:min(720px,100%); height:min(560px,100%); }
.skm-patch-body { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding:12px 14px; }
.skm-patch-grid { display:flex; flex-direction:column; gap:8px; }
.skm-patch-card { border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:6px; }
.skm-patch-card:hover { border-color:var(--dsw-alias-border-l2); }
.skm-patch-head { display:flex; align-items:center; gap:8px; }
.skm-patch-name { flex:1; min-width:0; font-size:13px; font-weight:600; color:var(--dsw-alias-label-primary); }
.skm-patch-desc { margin:0; font-size:11.5px; color:var(--dsw-alias-label-secondary); }
.skm-patch-actions { display:flex; align-items:center; gap:6px; }
.skm-patch-root { margin:0; font-size:11px; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.skm-patch-root code { font-family:ui-monospace,Consolas,monospace; background:var(--dsw-alias-bg-layer-2); padding:1px 6px; border-radius:5px; }
.skm-patch-cat-head { display:flex; align-items:center; gap:8px; flex-shrink:0; padding:4px 2px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.skm-patch-cat-name { font-size:12.5px; font-weight:600; color:var(--dsw-alias-label-primary); }
.skm-cat-btn { display:inline-flex; align-items:center; font:inherit; font-size:11px; border-radius:6px; border:1px solid var(--dsw-alias-border-l1); background:transparent; color:var(--dsw-alias-label-secondary); padding:2px 8px; cursor:pointer; }
.skm-cat-btn:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-border-l2); }
.skm-cat-btn-confirm { color:#fff; background:var(--dsw-alias-state-error-primary); border-color:transparent; }
.skm-cat-input { font:inherit; font-size:12px; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:4px 8px; width:180px; }
.skm-patch-cat-add { display:flex; align-items:center; gap:8px; padding:2px; }
.skm-patch-drop { position:absolute; inset:0; z-index:5; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); border:2px dashed var(--dsw-alias-brand-primary); border-radius:14px; font-size:14px; color:var(--dsw-alias-label-primary); pointer-events:none; }
.skm-btn-confirm { background:var(--dsw-alias-state-warn-primary); border-color:transparent; color:#fff; }
.skm-patch-del { color:var(--dsw-alias-state-error-primary); }
.skm-patch-del-confirm { background:var(--dsw-alias-state-error-primary); border-color:transparent; color:#fff; }
.skm-repo-settings { flex-shrink:0; display:flex; flex-direction:column; gap:8px; padding:10px 12px; border:1px solid var(--dsw-alias-border-l1); border-radius:10px; background:var(--dsw-alias-bg-layer-2); }
.skm-repo-roots { display:flex; flex-direction:column; gap:6px; }
.skm-repo-root { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.skm-repo-add { display:flex; align-items:center; gap:8px; }
.skm-repo-add input { flex:1; min-width:0; max-width:none; }
.skm-repo-tabs { display:flex; gap:6px; flex-shrink:0; }
.skm-repo-tabs .skm-nav-item { flex-shrink:0; }
.skm-repo-list { flex:1; min-height:0; overflow-y:auto; display:flex; flex-direction:column; gap:14px; padding:2px; }
.skm-repo-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; align-content:start; overflow-y:auto; min-height:0; padding:2px; }
.skm-repo-group { display:flex; flex-direction:column; gap:6px; }
.skm-repo-group-title { font-size:11px; font-weight:600; color:var(--dsw-alias-label-secondary); letter-spacing:.03em; padding:2px 2px; }
.skm-repo-card { display:flex; flex-direction:column; gap:6px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:10px; padding:10px 12px; min-width:0; cursor:pointer; }
.skm-repo-card:hover { border-color:var(--dsw-alias-border-l2); }
.skm-repo-head { display:flex; align-items:center; gap:8px; min-width:0; }
.skm-repo-name { flex:1; min-width:0; font-size:13px; font-weight:600; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-repo-badge { flex-shrink:0; font-size:10px; line-height:1.6; padding:0 8px; border-radius:999px; border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
.skm-repo-badge-warn { color:var(--dsw-alias-state-warn-primary); border-color:currentColor; }
.skm-repo-path { font-size:10.5px; font-family:ui-monospace,Consolas,monospace; color:var(--dsw-alias-label-secondary); word-break:break-all; }
.skm-repo-actions { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.skm-repo-apply-form { display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding-top:6px; border-top:1px solid var(--dsw-alias-border-l1); }
.skm-repo-apply-form .skm-select { max-width:260px; }
.skm-repo-badge-public { color:var(--dsw-alias-state-success-primary); border-color:currentColor; cursor:pointer; }
.skm-repo-badge-private { color:var(--dsw-alias-state-warn-primary); border-color:currentColor; cursor:pointer; }
.skm-btn-danger { background:var(--dsw-alias-state-error-primary); border-color:transparent; color:#fff; }
.skm-btn-danger:hover { filter:brightness(1.08); }
.skm-repo-root-selectable { outline:1px dashed var(--dsw-alias-brand-primary); outline-offset:2px; border-radius:8px; }
.skm-repo-clone-list { display:flex; flex-direction:column; gap:8px; max-height:320px; overflow-y:auto; padding:2px; }
.skm-repo-clone-list .skm-btn { justify-content:flex-start; }
.skm-repo-badge-service-on { color:var(--dsw-alias-brand-primary); border-color:currentColor; cursor:pointer; }
.skm-repo-badge-service-off { color:var(--dsw-alias-label-secondary); border-color:currentColor; cursor:pointer; }
.skm-repo-badge-service-off:hover { color:var(--dsw-alias-brand-primary); }
.skm-svc-project { display:flex; flex-direction:column; gap:8px; }
.skm-svc-project-empty .skm-svc-project-name { color:var(--dsw-alias-label-tertiary); font-weight:500; }
.skm-svc-project-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.skm-svc-project-name { font-size:13px; font-weight:600; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-svc-rows { display:flex; flex-direction:column; gap:6px; }
.skm-svc-row { display:flex; align-items:center; gap:10px; border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:10px; padding:8px 12px; min-width:0; }
.skm-svc-row:hover { border-color:var(--dsw-alias-border-l2); }
.skm-svc-row-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
.skm-svc-row-head { display:flex; align-items:center; gap:8px; min-width:0; flex-wrap:wrap; }
.skm-svc-name { font-size:12.5px; font-weight:600; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-svc-command { font-size:11px; font-family:ui-monospace,Consolas,monospace; color:var(--dsw-alias-label-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-svc-note { font-size:11.5px; line-height:1.5; color:var(--dsw-alias-label-tertiary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-svc-row { border-left:3px solid var(--dsw-alias-border-l1); }
.skm-svc-row-running { border-left-color:#22c55e; }
.skm-svc-row-starting { border-left-color:#f59e0b; }
.skm-svc-row-stopped { border-left-color:var(--dsw-alias-border-l2); }
.skm-svc-row-external { border-left-color:#ef4444; }
.skm-status-dot { flex-shrink:0; width:8px; height:8px; border-radius:50%; }
.skm-dot-ok { background:#22c55e; }
.skm-dot-starting { background:#f59e0b; }
.skm-dot-external { background:#ef4444; }
.skm-dot-stopped { background:var(--dsw-alias-border-l2); }
.skm-svc-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
.skm-svc-toolbar .skm-search { flex:1 1 180px; min-width:150px; }
.skm-menu-wrap { position:relative; display:inline-flex; }
.skm-menu-backdrop { position:fixed; inset:0; z-index:60; display:block; }
.skm-menu { position:absolute; right:0; top:calc(100% + 4px); z-index:61; min-width:130px; display:flex; flex-direction:column; gap:2px; padding:4px; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l1); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.18); }
.skm-menu-up { top:auto; bottom:calc(100% + 4px); }
.skm-menu-item { display:block; text-align:left; font:inherit; font-size:12px; color:var(--dsw-alias-label-primary); background:transparent; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; white-space:nowrap; }
.skm-menu-item:hover { background:var(--dsw-alias-interactive-bg-hover); }
.skm-menu-item:disabled { opacity:.5; cursor:default; }
.skm-menu-item-danger { color:#ef4444; }
.skm-svc-unconfigured { border:1px dashed var(--dsw-alias-border-l1); border-radius:10px; padding:6px 10px; margin-top:8px; }
.skm-svc-unconfigured-head { display:flex; align-items:center; gap:6px; width:100%; font:inherit; font-size:12px; color:var(--dsw-alias-label-tertiary); background:transparent; border:none; cursor:pointer; padding:2px 0; }
.skm-svc-unconfigured-body { display:flex; flex-direction:column; gap:6px; margin-top:6px; }
.skm-cfg-dialog-narrow { max-width:560px; }
.skm-svc-meta { font-size:10px; color:var(--dsw-alias-label-secondary); }
.skm-svc-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.skm-svc-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:10px; }
.skm-svc-card { display:flex; flex-direction:column; gap:8px; border:1px solid var(--dsw-alias-border-l1); border-left:3px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-2); border-radius:10px; padding:8px 12px; min-width:0; }
.skm-svc-card:hover { border-color:var(--dsw-alias-border-l2); }
.skm-svc-card .skm-svc-row-main { flex:1; min-height:0; }
.skm-svc-card .skm-svc-card-actions { margin-top:auto; flex-wrap:wrap; }
.skm-svc-card.skm-svc-row-running { border-left-color:#22c55e; }
.skm-svc-card.skm-svc-row-starting { border-left-color:#f59e0b; }
.skm-svc-card.skm-svc-row-stopped { border-left-color:var(--dsw-alias-border-l2); }
.skm-svc-card.skm-svc-row-external { border-left-color:#ef4444; }
.skm-btn-active { border-color:var(--dsw-alias-brand-primary); color:var(--dsw-alias-brand-primary); }
.skm-btn-active:hover { border-color:var(--dsw-alias-brand-primary); }
.skm-pin-btn { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; padding:0; border:1px solid transparent; background:transparent; color:var(--dsw-alias-label-tertiary); font-size:13px; line-height:1; cursor:pointer; border-radius:7px; flex-shrink:0; }
.skm-pin-btn:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.skm-pin-on { color:#f59e0b; }
.skm-pin-on:hover { color:#f59e0b; }
.skm-svc-field { display:flex; flex-direction:column; align-items:stretch; gap:4px; }
.skm-svc-field .skm-select { max-width:none; }
.skm-svc-switches { display:flex; flex-direction:row; align-items:center; gap:16px; flex-wrap:wrap; }
.skm-svc-switches .skm-field { flex-direction:row; align-items:center; gap:8px; }
.skm-svc-textarea { font:inherit; font-size:12px; line-height:1.5; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:6px 8px; min-height:72px; resize:vertical; }
.skm-svc-textarea:focus { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:-1px; border-color:transparent; }
.skm-svc-log { flex:1; min-height:0; overflow:auto; margin:0; padding:8px 10px; font-family:ui-monospace,'Cascadia Code',Consolas,monospace; font-size:11.5px; line-height:1.55; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:7px; white-space:pre-wrap; word-break:break-all; }
.skm-log-line-err { color:#f87171; font-weight:600; }
.skm-ai-diag { white-space:pre-wrap; word-break:break-word; line-height:1.55; }
.skm-svc-templates { display:flex; flex-direction:row; align-items:center; gap:6px; flex-wrap:wrap; }
.skm-svc-templates .skm-field-label { flex:none; }
.skm-svc-log-toolbar { display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
.skm-svc-log-search { flex:1 1 160px; min-width:140px; }
.skm-detail-backdrop { position:fixed; inset:0; z-index:9300; background:rgba(8,10,14,.46); backdrop-filter:blur(2px); display:flex; align-items:center; justify-content:center; padding:18px; }
.skm-detail { display:flex; flex-direction:column; width:min(900px,100%); height:min(610px,100%); background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l2); border-radius:14px; box-shadow:0 24px 72px rgba(0,0,0,.45); overflow:hidden; }
.skm-detail-body { flex:1; min-height:0; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:12px; }
.skm-detail-section { display:flex; flex-direction:column; gap:6px; }
.skm-detail-section-title { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--dsw-alias-label-secondary); margin:0; }
.skm-detail-lead { font-size:12.5px; color:var(--dsw-alias-label-primary); margin:0; }
.skm-detail-commits { display:flex; flex-direction:column; gap:6px; max-height:260px; overflow-y:auto; padding:2px; }
.skm-detail-commit { border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-2); border-radius:8px; padding:6px 10px; display:flex; flex-direction:column; gap:3px; min-width:0; font:inherit; text-align:left; color:inherit; cursor:pointer; width:100%; }
.skm-detail-commit:hover { border-color:var(--dsw-alias-brand-primary); background:var(--dsw-alias-bg-layer-1); }
.skm-detail-commit-subject { font-size:12.5px; color:var(--dsw-alias-label-primary); word-break:break-word; }
.skm-detail-commit-doc { font-size:11px; line-height:1.5; color:var(--dsw-alias-label-secondary); word-break:break-word; }
.skm-detail-commit-meta { font-size:10.5px; font-family:ui-monospace,Consolas,monospace; color:var(--dsw-alias-label-secondary); display:flex; align-items:center; gap:5px; }
.skm-ai-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--dsw-alias-label-tertiary,#9aa3b2); flex:none; }
.skm-ai-dot-done { background:#2fb36b; }
.skm-ai-dot-run { background:#f2a93b; animation:skm-pulse 1.1s ease-in-out infinite; }
.skm-ai-dot-err { background:#e5484d; }
.skm-detail-notes { display:flex; flex-direction:column; gap:6px; }
.skm-detail-note { border:1px dashed var(--dsw-alias-border-l1); border-radius:8px; padding:6px 10px; background:var(--dsw-alias-bg-base); }
.skm-detail-note-heading { font-size:11px; font-weight:700; color:var(--dsw-alias-label-primary); margin-bottom:3px; }
.skm-detail-note-lines { font-size:11px; line-height:1.55; color:var(--dsw-alias-label-secondary); word-break:break-word; }
.skm-detail-about-title { font-size:14px; font-weight:700; color:var(--dsw-alias-label-primary); margin:2px 0 0; }
.skm-detail-about-intro { font-size:12.5px; line-height:1.65; color:var(--dsw-alias-label-primary); margin:0; }
.skm-detail-readme { font-family:ui-monospace,'Cascadia Code',Consolas,monospace; font-size:11.5px; line-height:1.55; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:10px 12px; white-space:pre-wrap; word-break:break-word; max-height:280px; overflow-y:auto; margin:0; }
.skm-detail-readme-lg { max-height:none; }
.skm-detail-meta { display:flex; flex-wrap:wrap; gap:6px 14px; }
.skm-detail-meta-item { font-size:11.5px; color:var(--dsw-alias-label-secondary); }
.skm-btn-ghost { background:transparent; border-color:var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); }
.skm-btn-ghost:hover { color:var(--dsw-alias-brand-primary); border-color:var(--dsw-alias-brand-primary); }
.skm-loading-cursor { position:fixed; width:46px; height:46px; margin-left:-23px; margin-top:-23px; border-radius:50%; border:3px solid var(--dsw-alias-brand-primary); border-top-color:transparent; animation:skm-spin .75s linear infinite; z-index:9400; pointer-events:none; box-shadow:0 6px 20px rgba(0,0,0,.35); }
.skm-ai-backdrop { z-index:9500; }
.skm-ai-modal { display:flex; flex-direction:column; width:min(560px,100%); height:min(420px,100%); background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l2); border-radius:14px; box-shadow:0 24px 72px rgba(0,0,0,.5); overflow:hidden; }
.skm-ai-body { flex:1; min-height:0; overflow-y:auto; padding:14px 16px; display:flex; flex-direction:column; gap:10px; }
.skm-ai-subject { font-size:11px; font-weight:400; color:var(--dsw-alias-label-secondary); margin-left:8px; max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.skm-ai-status { display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--dsw-alias-label-secondary); margin:0; }
.skm-ai-stream { font-size:12px; line-height:1.65; color:var(--dsw-alias-label-primary); white-space:pre-wrap; word-break:break-word; margin:0; background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:10px 12px; max-height:200px; overflow-y:auto; }
.skm-ai-hint { font-size:10.5px; color:var(--dsw-alias-label-tertiary,#9aa3b2); margin:0; }
.skm-ai-label { font-size:11px; font-weight:700; letter-spacing:.05em; color:var(--dsw-alias-label-secondary); margin:2px 0 0; }
.skm-ai-text { font-size:12.5px; line-height:1.65; color:var(--dsw-alias-label-primary); margin:0; }
.skm-ai-points { margin:0; padding-left:18px; display:flex; flex-direction:column; gap:3px; }
.skm-ai-points li { font-size:12.5px; line-height:1.55; color:var(--dsw-alias-label-primary); }
.skm-ai-raw { display:flex; flex-direction:column; gap:6px; margin-top:2px; }
.skm-ai-raw-body { display:flex; flex-direction:column; gap:6px; }
.skm-ai-raw-subject { font-size:12px; color:var(--dsw-alias-label-primary); margin:0; word-break:break-word; }
.skm-ai-raw-stat { font-family:ui-monospace,'Cascadia Code',Consolas,monospace; font-size:11px; line-height:1.5; color:var(--dsw-alias-label-secondary); background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:8px 10px; white-space:pre-wrap; word-break:break-word; max-height:160px; overflow-y:auto; margin:0; }
.skm-spin { display:inline-block; width:12px; height:12px; border-radius:50%; border:2px solid var(--dsw-alias-brand-primary); border-top-color:transparent; animation:skm-spin .75s linear infinite; flex:none; }
.skm-ai-settings { display:flex; flex-direction:column; gap:6px; border-top:1px solid var(--dsw-alias-border-l1); padding-top:8px; }
.skm-ai-settings-title { font-size:11px; font-weight:700; color:var(--dsw-alias-label-secondary); }
.skm-ai-settings-row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.skm-ai-settings-toggle { display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--dsw-alias-label-primary); }
.skm-ai-settings-label { font-size:11.5px; color:var(--dsw-alias-label-secondary); flex:none; }
.skm-ai-settings-input { flex:1 1 140px; min-width:120px; }
.skm-ai-settings-num { flex:0 1 110px; min-width:90px; }
@keyframes skm-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }
@keyframes skm-spin { to { transform:rotate(360deg); } }`

  exports.apply = apply
  exports.inject = inject
  return module.exports
} })


