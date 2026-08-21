// 0.29.0：从 lib/index.js 拆出的纯逻辑函数（无插件状态）。行为与拆分前完全一致。
import { readFile, writeFile, access, rm, rename, stat, mkdir, readdir, appendFile, unlink } from 'node:fs/promises'
import { join, dirname, resolve, basename } from 'node:path'

const AI_CACHE_FILENAME = 'ai-explanations.json'

function aiCachePath(governanceRoot) {
  return join(governanceRoot, '_governance', AI_CACHE_FILENAME)
}

async function atomicWrite(path, content) {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    await writeFile(tmp, content, 'utf8')
    await rename(tmp, path)
  } catch (error) {
    try { await unlink(tmp) } catch {}
    throw error
  }
}

function buildExplainPrompt(material, docEntry, repoName) {
  const system = '你是代码更新讲解助手。基于给定的提交信息、文件变更清单和（可能提供的）diff 内容，用中文产出简洁准确的更新说明。只输出 JSON，不要输出任何其他文字。'
  const parts = []
  parts.push('项目：' + repoName)
  parts.push('提交：' + material.subject)
  if (material.body.length > 0) parts.push('提交说明：\n' + material.body)
  if (docEntry !== null && docEntry !== undefined) {
    parts.push('本地人工维护说明：\n标题：' + (docEntry.title || '') + '\n' + (docEntry.bullets || []).join('\n'))
  }
  if (material.stat.length > 0) parts.push('变更文件清单：\n' + material.stat)
  if (material.diff.length > 0) parts.push('变更 diff（可能被截断）：\n' + material.diff)
  parts.push('请输出 JSON：{"summary":"1-2句概括这次更新做了什么","points":["3-5条要点，具体改了哪些"],"impact":"对使用者的影响（如无则留空字符串）"}')
  return { system: system, prompt: parts.join('\n\n') }
}

function normalizeAiExplain(input) {
  const aiExplain = { enabled: true, provider: 'opencode-go', model: 'deepseek-v4-flash', maxTokens: 1600, reasoningEffort: 'off' }
  if (input !== null && typeof input === 'object') {
    if (typeof input.enabled === 'boolean') aiExplain.enabled = input.enabled
    if (typeof input.provider === 'string' && input.provider.trim().length > 0) aiExplain.provider = input.provider.trim()
    if (typeof input.model === 'string' && input.model.trim().length > 0) aiExplain.model = input.model.trim()
    const mt = typeof input.maxTokens === 'number' && input.maxTokens >= 200 && input.maxTokens <= 4000 ? input.maxTokens : 1600
    aiExplain.maxTokens = mt === 800 ? 1600 : mt
    if (typeof input.reasoningEffort === 'string' && input.reasoningEffort.trim().length > 0) aiExplain.reasoningEffort = input.reasoningEffort.trim()
  }
  return aiExplain
}

function parseExplainOutput(text) {
  try {
    const m = /(\{[\s\S]*\})/.exec(text)
    if (m !== null) {
      const parsed = JSON.parse(m[1])
      if (parsed !== null && typeof parsed === 'object') {
        const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : ''
        const points = Array.isArray(parsed.points) ? parsed.points.filter(function (x) { return typeof x === 'string' && x.trim().length > 0 }).map(function (x) { return x.trim() }).slice(0, 8) : []
        const impact = typeof parsed.impact === 'string' ? parsed.impact.trim() : ''
        if (summary.length > 0 || points.length > 0) return { summary: summary, points: points, impact: impact }
      }
    }
  } catch (error) {}
  return { summary: text.trim().slice(0, 1200), points: [], impact: '' }
}

async function readAiCache(governanceRoot) {
  try {
    const parsed = JSON.parse(await readFile(aiCachePath(governanceRoot), 'utf8'))
    if (parsed !== null && typeof parsed === 'object' && parsed.explanations !== null && typeof parsed.explanations === 'object') {
      return { explanations: parsed.explanations, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '' }
    }
    return { explanations: {}, updatedAt: '' }
  } catch (error) {
    return { explanations: {}, updatedAt: '' }
  }
}

async function writeAiCache(governanceRoot, cache) {
  await mkdir(join(governanceRoot, '_governance'), { recursive: true })
  await atomicWrite(aiCachePath(governanceRoot), JSON.stringify({ explanations: cache.explanations, updatedAt: new Date().toISOString() }, null, 2) + '\n')
}
export { aiCachePath, atomicWrite, buildExplainPrompt, normalizeAiExplain, parseExplainOutput, readAiCache, writeAiCache, AI_CACHE_FILENAME }
