// 0.29.0：从 lib/index.js 拆出的纯逻辑函数（无插件状态）。行为与拆分前完全一致。
import { readFile, writeFile, access, rm, rename, stat, mkdir, readdir, appendFile, unlink } from 'node:fs/promises'
import { join, dirname, resolve, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function buildCommitMaterial(path, hash) {
  let subject = ''
  let body = ''
  let stat = ''
  let diff = ''
  try {
    const full = (await runGit(path, ['show', '-s', '--format=%B', hash])).trim()
    const lines = full.split(/\r?\n/)
    subject = lines[0] || ''
    body = lines.slice(1).join('\n').trim()
  } catch (error) {}
  try {
    stat = (await runGit(path, ['show', '--stat', '--format=', hash])).trim()
  } catch (error) {}
  try {
    const rawDiff = await runGit(path, ['show', '--format=', '--unified=3', hash])
    const diffLines = rawDiff.split(/\r?\n/)
    if (diffLines.length <= 300) {
      diff = rawDiff
    } else {
      // 大提交：每个文件只取前 40 行 diff，总量 ≤ 600 行
      const files = rawDiff.split(/^(?=diff --git )/m).filter(function (s) { return s.trim().length > 0 })
      const parts = []
      let total = 0
      for (const fileDiff of files) {
        const fl = fileDiff.split(/\r?\n/)
        let head = fl.slice(0, 40)
        if (total + head.length > 600) head = head.slice(0, Math.max(1, 600 - total))
        parts.push(head.join('\n'))
        total += head.length
        if (total >= 600) break
      }
      diff = parts.join('\n')
    }
  } catch (error) {}
  return { subject: subject, body: body, stat: stat, diff: diff }
}

function cloudRepoFromRemote(url) {
  let s = String(url || '').trim().replace(/\/+$/, '').replace(/\.git$/, '')
  if (s.startsWith('git@')) s = s.replace(/^git@[^:]+:/, 'https://github.com/')
  else if (s.startsWith('git://')) s = s.replace(/^git:\/\//, 'https://')
  const m = /github\.com[:/]([^/]+\/[^/]+?)$/.exec(s)
  return m ? m[1] : ''
}

async function detectRepoMeta(path) {
  let meta = null
  try {
    await access(join(path, '.git'))
    const remote = (await runGit(path, ['remote', 'get-url', 'origin'])).trim()
    const cloudRepo = remote.length > 0 ? cloudRepoFromRemote(remote) : ''
    if (cloudRepo.length > 0) {
      let privateRepo = false
      try {
        const out = await runGh(['repo', 'view', cloudRepo, '--json', 'visibility'])
        const parsed = JSON.parse(out)
        privateRepo = parsed !== null && typeof parsed === 'object' && parsed.visibility === 'PRIVATE'
      } catch (error) {}
      meta = { cloudRepo: cloudRepo, private: privateRepo }
    }
  } catch (error) {}
  return meta
}

function findLocalDocEntry(doc, hash) {
  if (doc === null || doc === undefined || doc.exists !== true || !Array.isArray(doc.entries)) return null
  const short = hash.slice(0, 7)
  for (const entry of doc.entries) {
    if (entry.hash === hash || entry.hash === short || short.indexOf(entry.hash) === 0 || entry.hash.indexOf(short) === 0) return entry
  }
  return null
}

function uncoveredOutgoing(doc, commits) {
  if (!Array.isArray(commits)) return []
  return commits.filter(function (c) { return c !== null && typeof c === 'object' && findLocalDocEntry(doc, c.hash) === null })
}

async function gitLogEntries(path, range, limit) {
  const out = await runGit(path, ['log', '--date=short', '--format=%H%x1f%an%x1f%ad%x1f%s', '-' + String(limit), range])
  const entries = []
  const lines = String(out || '').split(/\r?\n/).filter(function (s) { return s.trim().length > 0 })
  for (const line of lines) {
    const parts = line.split('\x1f')
    if (parts.length < 4) continue
    entries.push({ hash: parts[0], author: parts[1], date: parts[2], subject: parts[3] })
  }
  return entries
}

async function gitState(path) {
  const out = { path: path, isRepo: false, branch: '', remote: '', hasUpstream: false, ahead: 0, behind: 0, dirty: false }
  try { await access(join(path, '.git')) } catch (error) { return out }
  out.isRepo = true
  try { out.branch = (await runGit(path, ['branch', '--show-current'])).trim() } catch (error) {}
  try {
    const remotes = (await runGit(path, ['remote'])).trim().split(/\r?\n/).map(function (s) { return s.trim() }).filter(function (s) { return s.length > 0 })
    out.remote = remotes[0] || ''
  } catch (error) {}
  try { out.dirty = (await runGit(path, ['status', '--porcelain'])).trim().length > 0 } catch (error) {}
  try {
    const raw = (await runGit(path, ['rev-list', '--left-right', '--count', 'HEAD...@{u}'])).trim()
    const parts = raw.split(/\s+/)
    if (parts.length === 2) {
      out.ahead = parseInt(parts[0], 10) || 0
      out.behind = parseInt(parts[1], 10) || 0
      out.hasUpstream = true
    }
  } catch (error) {}
  return out
}

function parseFrontmatterMeta(text) {
  const meta = {}
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (fm === null) return meta
  for (const line of fm[1].split('\n')) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return meta
}

async function parseLocalChangelog(path) {
  const file = join(path, 'CHANGELOG-local.md')
  let text = ''
  try { text = await readFile(file, 'utf8') } catch (error) { return { exists: false, entries: [], notes: [] } }
  const entries = []
  const notes = []
  let currentEntry = null
  let currentNote = null
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const entryMatch = /^###\s+\[commit\s+([0-9a-fA-F]{7,40})\]\s*(.*)$/.exec(line.trim())
    if (entryMatch !== null) {
      currentEntry = { hash: entryMatch[1], title: entryMatch[2].trim(), bullets: [] }
      entries.push(currentEntry)
      currentNote = null
      continue
    }
    if (/^###\s+/.test(line.trim())) {
      currentNote = { heading: line.trim().replace(/^###\s+/, ''), lines: [] }
      notes.push(currentNote)
      currentEntry = null
      continue
    }
    if (/^##\s+/.test(line.trim())) {
      currentNote = { heading: line.trim().replace(/^##\s+/, ''), lines: [] }
      notes.push(currentNote)
      currentEntry = null
      continue
    }
    if (currentEntry !== null) {
      const t = line.trim()
      if (t.length > 0) currentEntry.bullets.push(t.replace(/^[-*]\s+/, ''))
    } else if (currentNote !== null) {
      const t = line.trim()
      if (t.length > 0) currentNote.lines.push(t.replace(/^[-*]\s+/, ''))
    }
  }
  return { exists: true, entries: entries, notes: notes }
}

function parseSkillFrontmatter(text) {
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text)
  if (m === null) return { frontmatter: null, body: text }
  const fields = {}
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    value = value.replace(/^["']|["']$/g, '')
    if (key.length > 0 && value.length > 0) fields[key] = value
  }
  return { frontmatter: fields, body: text.slice(m[0].length) }
}

function pathUnderRoot(path, root) {
  const p = String(path || '').replace(/\\/g, '/').replace(/\/+$/, '')
  const r = String(root || '').replace(/\\/g, '/').replace(/\/+$/, '')
  return p.length > 0 && r.length > 0 && (p === r || p.startsWith(r + '/'))
}

async function readPackageInfo(path) {
  try {
    const raw = await readFile(join(path, 'package.json'), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      version: typeof parsed.version === 'string' ? parsed.version : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
    }
  } catch (error) { return null }
}

async function readReadmeInfo(path) {
  const names = ['README.md', 'readme.md', 'Readme.md', 'README', 'README.txt', 'readme.txt']
  for (const name of names) {
    let text = ''
    try {
      text = await readFile(join(path, name), 'utf8')
    } catch (error) {
      if (error !== null && error !== undefined && error.code === 'ENOENT') continue
      continue
    }
    if (typeof text !== 'string' || text.trim().length === 0) continue
    const limited = text.slice(0, 16000)
    const lines = limited.split(/\r?\n/)
    let title = ''
    const introLines = []
    let inCode = false
    for (const line of lines) {
      const t = line.trim()
      if (/^```/.test(t)) { inCode = !inCode; continue }
      if (inCode) continue
      if (t.length === 0) continue
      if (/^#\s+/.test(t)) { if (title.length === 0) title = t.replace(/^#+\s*/, '').trim(); continue }
      if (/^#{2,6}\s/.test(t)) continue
      if (/^!\[|^\[!\[|^<img|^<p align|^<!--/.test(t)) continue
      introLines.push(t)
      if (introLines.join(' ').length >= 600) break
    }
    return { title: title, intro: introLines.join(' ').slice(0, 800), text: limited }
  }
  return null
}

async function resolveFullHash(path, hash) {
  if (typeof hash !== 'string' || hash.length === 0) return hash
  if (/^[0-9a-fA-F]{40}$/.test(hash)) return hash.toLowerCase()
  try {
    const full = (await runGit(path, ['rev-parse', '--verify', hash])).trim()
    if (/^[0-9a-fA-F]{40}$/.test(full)) return full.toLowerCase()
  } catch (error) {}
  return hash
}

async function runGh(args) {
  const candidates = []
  if (process.platform !== 'win32') candidates.push('gh')
  candidates.push(join(process.env.ProgramFiles || 'C:\\Program Files', 'GitHub CLI', 'gh.exe'))
  if (process.env['ProgramFiles(x86)']) candidates.push(join(process.env['ProgramFiles(x86)'], 'GitHub CLI', 'gh.exe'))
  candidates.push('gh')
  let lastError = null
  for (const cmd of candidates) {
    try {
      const { stdout } = await execFileAsync(cmd, args, {
        timeout: 15000,
        env: Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: '0' }),
      })
      return String(stdout || '')
    } catch (error) {
      lastError = error
      if (error !== null && error !== undefined && error.code !== 'ENOENT') throw error
    }
  }
  throw lastError
}

async function runGit(cwd, args, timeoutMs) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: cwd,
    timeout: timeoutMs || 8000,
    env: Object.assign({}, process.env, { GIT_TERMINAL_PROMPT: '0' }),
  })
  return String(stdout || '')
}

function splitFrontmatter(text) {
  const src = text.length > 0 && text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const lines = src.split('\n')
  if (lines.length > 0 && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        return { has: true, fm: lines.slice(1, i), body: lines.slice(i + 1) }
      }
    }
  }
  return { has: false, fm: [], body: lines }
}
export { buildCommitMaterial, cloudRepoFromRemote, detectRepoMeta, findLocalDocEntry, gitLogEntries, gitState, parseFrontmatterMeta, parseLocalChangelog, parseSkillFrontmatter, pathUnderRoot, readPackageInfo, readReadmeInfo, resolveFullHash, runGh, runGit, splitFrontmatter, uncoveredOutgoing }
