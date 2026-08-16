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
  const VERSION = '0.7.0'

  const zh = {
    'trigger.aria': 'Skills 管理', 'trigger.label': 'Skills', 'panel.title': 'Skills 管理', 'panel.total': '共 {count} 个', 'panel.close': '关闭', 'panel.refresh': '刷新', 'panel.search.placeholder': '搜索技能…', 'panel.workspace.label': '工作区', 'panel.workspace.session': '当前会话', 'panel.loading': '正在读取技能目录…', 'panel.incomplete': '部分技能来源尚未就绪，列表可能不完整', 'panel.readError': '读取失败：{message}', 'panel.toggleError': '修改失败：{message}', 'nav.sources': '技能来源',
    'group.global': '全局', 'group.global.hint': '你自己的通用技能（~/.dsh/skills）', 'group.project': '项目', 'group.project.hint': '当前项目目录中的技能', 'group.preset': '插件 / 预设', 'group.preset.hint': '由插件或 Agent 预设动态注入', 'group.builtin': '系统内置', 'group.builtin.hint': '代码内嵌或随内置 provider 提供', 'group.empty': '此来源暂无技能', 'search.results': '匹配 {count} 个技能', 'search.empty': '没有找到匹配的技能',
    'card.agent.on': 'Agent 可自动调用', 'card.agent.off': 'Agent 不可自动调用，开关将其从模型目录移除', 'card.user.on': '可从 / 菜单手动调用', 'card.user.off': '不可手动调用', 'card.user': '用户', 'card.config': '配置', 'card.noDescription': '（无描述）',
    'config.title': '技能配置 · {name}', 'config.close': '关闭', 'config.source': '来源', 'config.file': '文件', 'config.provider': 'Provider', 'config.readonly': '只读 · 系统/预设自带技能，不可修改调用权限', 'config.editable': '可编辑 · 保存直接写入文件', 'config.noPath': '运行时注册 · 无配置文件', 'config.content.label': '文件内容', 'config.save': '保存', 'config.saving': '保存中…', 'config.saved': '已保存', 'config.openExternal': '外部打开', 'config.openFailed': '打开失败：{message}', 'config.saveFailed': '保存失败：{message}',
    'card.delete': '删除', 'card.delete.title': '移入回收站（可在回收站中还原或彻底删除）', 'card.delete.confirm': '确认删除？', 'card.delete.disabled': '只读来源不可删除', 'card.deleteError': '移入回收站失败：{message}',
    'trash.title': '回收站', 'trash.hint': '被移入回收站的技能，可还原或彻底删除', 'trash.empty': '回收站是空的', 'trash.config': '配置', 'trash.open.title': '打开对应的文件（回收站备份）', 'trash.openFailed': '打开失败：{message}', 'trash.restore': '还原', 'trash.delete': '彻底删除', 'trash.delete.confirm': '确认彻底删除？', 'trash.delete.title': '彻底删除后不可恢复', 'trash.restoreError': '还原失败：{message}', 'trash.deleteError': '彻底删除失败：{message}',
    'notes.edit': '编辑备注', 'notes.saving': '保存中…', 'notes.save': '保存', 'notes.cancel': '取消', 'notes.untitled': '（无标题）', 'notes.empty.title': '暂无备注', 'notes.empty.content': '点击「编辑备注」添加一条仅自己可见的说明（模型不会读取）', 'notes.title.placeholder': '→', 'notes.content.placeholder': '→', 'notes.hint': '备注仅你可见，保存在 ~/.dsh/skills-notes.json，模型不会读取。',
    'patch.trigger.aria': '补丁管理', 'patch.trigger.label': '补丁', 'patch.panel.title': '补丁管理', 'patch.panel.loading': '正在扫描补丁目录…', 'patch.panel.error': '扫描失败：{message}', 'patch.panel.empty': '没有补丁', 'patch.state.applied': '已启用', 'patch.state.clean': '未启用', 'patch.state.lost': '已丢失 · 文件被外部改动', 'patch.state.error': '校验失败', 'patch.state.error.title': '结构校验失败：{message}', 'patch.enable': '启用', 'patch.disable': '禁用', 'patch.delete': '删除', 'patch.delete.confirm': '确认删除？', 'patch.delete.title': '删除声明文件与伴随文件（不可恢复）', 'patch.enable.title': '校验通过后写入部署目录', 'patch.disable.title': '重放剩余链并还原官方快照', 'patch.lost.title': '目标文件已被官方更新或手动改动；禁用时会把当前内容刷新为新官方快照', 'patch.apply.refresh': '已写入磁盘：刷新浏览器（Ctrl+Shift+R）生效', 'patch.apply.restart': '已写入磁盘：需要重启 dsh web 生效', 'patch.kind.replace': '替换', 'patch.kind.script': '脚本', 'patch.kind.override': '覆盖', 'patch.executable': '可执行', 'patch.confirm.exec': '确认启用可执行补丁？', 'patch.import': '导入', 'patch.import.to': '导入到', 'patch.import.drop': '拖放 .dsh-patch.json 文件到面板任意处导入', 'patch.imported': '已导入：{id}', 'patch.import.error': '导入失败：{message}', 'patch.allowExec': '允许可执行补丁', 'patch.allowExec.title': '关闭后所有脚本类补丁不可启用（总闸）', 'patch.category.default': '默认', 'patch.category.add': '新建类别', 'patch.category.add.placeholder': '类别名（中文/字母/数字/_/-）', 'patch.category.rename': '重命名', 'patch.category.delete': '删除类别', 'patch.category.delete.confirm': '确认删除？', 'patch.category.delete.title': '仅空类别可删除', 'patch.category.added': '已创建类别', 'patch.category.renamed': '已重命名类别', 'patch.category.deleted': '已删除类别', 'patch.targets': '目标文件', 'patch.dup.title': 'id 与其它补丁重复，无法启用', 'patch.hint': '启用/禁用后按各补丁提示刷新浏览器或重启 dsh web；补丁目录：~/.dsh/dsh-manager/patches/，恢复手册：目录下 RECOVERY.md。', 'patch.root': '部署根目录', 'patch.opError': '操作失败：{message}', 'patch.saving': '写入中…', 'patch.lostBadge': '有补丁丢失或异常', 'patch.alert.label': '丢失提醒', 'patch.alert.panel': '面板内轮询（默认）', 'patch.alert.badge': '后台轮询 + 按钮角标',
  }

  const en = {
    'trigger.aria': 'Skills manager', 'trigger.label': 'Skills', 'panel.title': 'Skills', 'panel.total': '{count} skills', 'panel.close': 'Close', 'panel.refresh': 'Refresh', 'panel.search.placeholder': 'Search skills…', 'panel.workspace.label': 'Workspace', 'panel.workspace.session': 'Current session', 'panel.loading': 'Reading the skill catalog…', 'panel.incomplete': 'Some skill sources are not ready yet; the list may be incomplete', 'panel.readError': 'Read failed: {message}', 'panel.toggleError': 'Update failed: {message}', 'nav.sources': 'Skill sources',
    'group.global': 'Global', 'group.global.hint': 'Your own general-purpose skills (~/.dsh/skills)', 'group.project': 'Project', 'group.project.hint': 'Skills in the current project directory', 'group.preset': 'Plugin / Preset', 'group.preset.hint': 'Injected by plugins or agent presets', 'group.builtin': 'Built-in', 'group.builtin.hint': 'Embedded in code or shipped with a provider', 'group.empty': 'No skills from this source', 'search.results': '{count} matching skills', 'search.empty': 'No matching skills',
    'card.agent.on': 'Agent can auto-invoke', 'card.agent.off': 'Not agent-invocable', 'card.user.on': 'User-invocable from / menu', 'card.user.off': 'Not user-invocable', 'card.user': 'User', 'card.config': 'Configure', 'card.noDescription': '(no description)',
    'config.title': 'Skill config · {name}', 'config.close': 'Close', 'config.source': 'Source', 'config.file': 'File', 'config.provider': 'Provider', 'config.readonly': 'Read-only · shipped by system/preset', 'config.editable': 'Editable · saves write to the file', 'config.noPath': 'Runtime-registered · no config file', 'config.content.label': 'File content', 'config.save': 'Save', 'config.saving': 'Saving…', 'config.saved': 'Saved', 'config.openExternal': 'Open externally', 'config.openFailed': 'Open failed: {message}', 'config.saveFailed': 'Save failed: {message}',
    'card.delete': 'Delete', 'card.delete.title': 'Move to trash (restore or permanently delete in the trash)', 'card.delete.confirm': 'Confirm delete?', 'card.delete.disabled': 'Read-only sources cannot be deleted', 'card.deleteError': 'Move to trash failed: {message}',
    'trash.title': 'Trash', 'trash.hint': 'Skills moved to the trash; restore or permanently delete them here', 'trash.empty': 'The trash is empty', 'trash.config': 'Configure', 'trash.open.title': 'Open the corresponding file (trash backup)', 'trash.openFailed': 'Open failed: {message}', 'trash.restore': 'Restore', 'trash.delete': 'Delete forever', 'trash.delete.confirm': 'Delete forever?', 'trash.delete.title': 'This cannot be undone', 'trash.restoreError': 'Restore failed: {message}', 'trash.deleteError': 'Permanent delete failed: {message}',
    'notes.edit': 'Edit note', 'notes.saving': 'Saving…', 'notes.save': 'Save', 'notes.cancel': 'Cancel', 'notes.untitled': '(untitled)', 'notes.empty.title': 'No note yet', 'notes.empty.content': 'Click "Edit note" to add a private note (never read by the model)', 'notes.title.placeholder': '→', 'notes.content.placeholder': '→', 'notes.hint': 'Notes are private: stored in ~/.dsh/skills-notes.json and never read by the model.',
    'patch.trigger.aria': 'Patch manager', 'patch.trigger.label': 'Patches', 'patch.panel.title': 'Patches', 'patch.panel.loading': 'Scanning the patch directory…', 'patch.panel.error': 'Scan failed: {message}', 'patch.panel.empty': 'No patches', 'patch.state.applied': 'Enabled', 'patch.state.clean': 'Disabled', 'patch.state.lost': 'Lost · file changed externally', 'patch.state.error': 'Invalid', 'patch.state.error.title': 'Invalid: {message}', 'patch.enable': 'Enable', 'patch.disable': 'Disable', 'patch.delete': 'Delete', 'patch.delete.confirm': 'Delete?', 'patch.delete.title': 'Deletes the manifest and companion files (cannot be undone)', 'patch.enable.title': 'Validate, then write into the deployment', 'patch.disable.title': 'Replay the remaining chain and restore the official snapshot', 'patch.lost.title': 'The target was changed by an upgrade or manual edit; disabling refreshes it as the new official snapshot', 'patch.apply.refresh': 'Written: refresh the browser (Ctrl+Shift+R) to apply', 'patch.apply.restart': 'Written: restart dsh web to apply', 'patch.kind.replace': 'replace', 'patch.kind.script': 'script', 'patch.kind.override': 'override', 'patch.executable': 'executable', 'patch.confirm.exec': 'Enable this executable patch?', 'patch.import': 'Import', 'patch.import.to': 'Import into', 'patch.import.drop': 'Drop .dsh-patch.json files anywhere on this panel to import', 'patch.imported': 'Imported: {id}', 'patch.import.error': 'Import failed: {message}', 'patch.allowExec': 'Allow executable patches', 'patch.allowExec.title': 'When off, no script-kind patch can be enabled (master switch)', 'patch.category.default': 'Default', 'patch.category.add': 'New category', 'patch.category.add.placeholder': 'Category name', 'patch.category.rename': 'Rename', 'patch.category.delete': 'Delete category', 'patch.category.delete.confirm': 'Delete?', 'patch.category.delete.title': 'Only empty categories can be deleted', 'patch.category.added': 'Category created', 'patch.category.renamed': 'Category renamed', 'patch.category.deleted': 'Category deleted', 'patch.targets': 'Targets', 'patch.dup.title': 'Duplicate id with another patch; cannot be enabled', 'patch.hint': 'After enable/disable, refresh the browser or restart dsh web as each patch indicates. Patch directory: ~/.dsh/dsh-manager/patches/; recovery manual: RECOVERY.md inside it.', 'patch.root': 'Deployment root', 'patch.opError': 'Operation failed: {message}', 'patch.saving': 'Writing…', 'patch.lostBadge': 'Patches lost or broken', 'patch.alert.label': 'Loss alerts', 'patch.alert.panel': 'Poll while the panel is open (default)', 'patch.alert.badge': 'Background polling + button badge',
  }

  // ---- 与宿主半边的通信面（静态版：同源 fetch 替换 host.call）----

  function rpc(method, args) {
    return fetch('/api/dsh-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: method, args: args }),
    }).then(function (res) { return res.json() })
  }

  // apply() 里注入 workspaces 服务引用（面板组件通过模块级 port 调用，
  // 与动态版的闭包 port 保持同一结构）。
  let workspacesService
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
    openPath: async function (path) {
      if (workspacesService === undefined || typeof workspacesService.openPath !== 'function') return { error: 'workspaces 服务不可用' }
      try { await workspacesService.openPath(path); return { ok: true } } catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
    },
  }

  const EDITABLE_SOURCES = ['user-dsh', 'project-dsh', 'project-agents', 'user-agents']

  const GROUP_DEFS = [
    { key: 'global', titleKey: 'group.global', hintKey: 'group.global.hint', sources: ['user-dsh'] },
    { key: 'project', titleKey: 'group.project', hintKey: 'group.project.hint', sources: ['project-dsh', 'project-agents'] },
    { key: 'preset', titleKey: 'group.preset', hintKey: 'group.preset.hint', sources: ['user-agents', 'custom'] },
    { key: 'builtin', titleKey: 'group.builtin', hintKey: 'group.builtin.hint', sources: ['bundled', 'runtime'] },
  ]
  function groupKeyOf(source) { for (const g of GROUP_DEFS) if (g.sources.indexOf(source) !== -1) return g.key; return 'builtin' }

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

  function InvSwitch(props) {
    const on = props.on === true; const variant = props.variant === 'user' ? 'user' : 'agent'; const disabled = props.disabled === true
    const cls = 'skm-sw' + (on ? (variant === 'user' ? ' skm-sw-user-on' : ' skm-sw-on') : '') + (disabled ? ' skm-sw-dis' : '')
    return h('button', { type: 'button', role: 'switch', 'aria-checked': on, disabled: disabled, className: cls, title: props.title, 'aria-label': props.title, onClick: function () { if (props.onChange) props.onChange() } }, h('span', { className: 'skm-sw-thumb', 'aria-hidden': true }))
  }

  function SkillCard(props) {
    const t = props.t; const skill = props.skill; const name = String(skill.name)
    const description = skill.description === undefined || skill.description === null || skill.description === '' ? t('card.noDescription') : String(skill.description)
    const modelOn = skill.modelInvocable === true; const userOn = skill.userInvocable === true
    const readOnly = props.readOnly === true; const busy = props.busy === true; const disabledSw = readOnly || busy
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
          h('button', { type: 'button', className: 'skm-card-gear', 'aria-label': t('card.config'), title: t('card.config'), onClick: function () { props.onConfig(skill) } }, h(GearGlyph, { size: 11 })),
          h('button', {
            type: 'button',
            className: confirming ? 'skm-card-del skm-card-del-confirm' : 'skm-card-del',
            'aria-label': readOnly ? t('card.delete.disabled') : t('card.delete'),
            title: readOnly ? t('card.delete.disabled') : t('card.delete.title'),
            disabled: readOnly || busy,
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
            h('span', { className: 'skm-swlabel', title: modelOn ? t('card.agent.on') : t('card.agent.off') }, 'Agent'),
            h(InvSwitch, { on: modelOn, variant: 'agent', disabled: disabledSw, title: readOnly ? t('config.readonly') : (modelOn ? t('card.agent.on') : t('card.agent.off')), onChange: function () { props.onToggle('agent') } }),
            h('span', { className: 'skm-swlabel', title: userOn ? t('card.user.on') : t('card.user.off') }, t('card.user')),
            h(InvSwitch, { on: userOn, variant: 'user', disabled: disabledSw, title: readOnly ? t('config.readonly') : (userOn ? t('card.user.on') : t('card.user.off')), onChange: function () { props.onToggle('user') } })))),
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

    return h('div', { className: 'skm-cfg-backdrop', onClick: function (event) { if (event.target === event.currentTarget) props.onClose() } },
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
    const [notes, setNotes] = React.useState({}); const [notesBusy, setNotesBusy] = React.useState(null)
    const [trash, setTrash] = React.useState({ items: [] }); const [trashBusy, setTrashBusy] = React.useState(null)

    const cwd = (function () { if (workspaceId !== '') { const f = workspaces.find(function (item) { return item.workspaceId === workspaceId }); if (f !== undefined) return f.path } return sessionCwd })()

    React.useEffect(function () {
      if (open !== true) return
      let cancelled = false
      setCatalog(function (prev) { return { data: prev.data, error: null, loading: prev.data === null } })
      port.catalog({ sessionId: currentId === undefined ? null : currentId, cwd: cwd === undefined ? null : cwd }).then(function (result) {
        if (cancelled) return
        if (result !== null && typeof result === 'object' && typeof result.error === 'string') setCatalog({ data: null, error: result.error, loading: false })
        else setCatalog({ data: result, error: null, loading: false })
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
        if (groupKeyOf(String(skill.source)) !== group.key) return false
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
      const name = String(skill.name); const local = localInv[name]
      const effModel = local !== undefined && typeof local.model === 'boolean' ? local.model : skill.modelInvocable === true
      const effUser = local !== undefined && typeof local.user === 'boolean' ? local.user : skill.userInvocable === true
      const view = { name: name, description: skill.description, whenToUse: skill.whenToUse, source: String(skill.source), provider: String(skill.provider), modelInvocable: effModel, userInvocable: effUser }
      return h(SkillCard, { key: name, skill: view, t: t, accentClass: accentClass, readOnly: EDITABLE_SOURCES.indexOf(String(skill.source)) === -1, busy: busyName !== null && busyName === name, note: notes[name], onToggle: function (kind) { handleToggle(view, kind) }, onConfig: function () { setConfigName(name) }, onDelete: function () { deleteSkill(view) }, onSaveNote: function (note) { saveNote(name, note) } })
    })))

    return h('div', { className: 'skm-backdrop', onClick: function (event) { if (event.target === event.currentTarget) openStore.set(false) } },
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

    return h('div', { className: 'skm-backdrop', onClick: function (event) { if (event.target === event.currentTarget) patchOpenStore.set(false) } },
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

  function apply(ctx) {
    const locale = ctx.get('locale')
    workspacesService = ctx.get('workspaces')

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
.skm-content { flex:1; min-width:0; display:flex; flex-direction:column; padding:12px 14px 14px; gap:10px; }
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
.skm-card-desc { flex:0 0 48px; height:48px; margin:0; font-size:11.5px; line-height:24px; color:var(--dsw-alias-label-secondary); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.skm-card-divider { flex:0 0 auto; border:none; border-top:1px solid var(--dsw-alias-border-l1); margin:0; }
.skm-card-foot { flex:0 0 auto; display:flex; align-items:center; justify-content:space-between; gap:10px; }
.skm-card-provider { font-size:10px; color:var(--dsw-alias-label-secondary); opacity:.65; font-family:ui-monospace,Consolas,monospace; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.skm-inv { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.skm-swlabel { font-size:9.5px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
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
.skm-patch-del-confirm { background:var(--dsw-alias-state-error-primary); border-color:transparent; color:#fff; }`

  exports.apply = apply
  exports.inject = inject
  return module.exports
} })
