import { promises as fs } from 'node:fs'
import path from 'node:path'

export const DEFAULT_AI_CONFIG = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
}

const MAX_CONTEXT = 20000
const TIMEOUT_MS = 30000

export function normalizeAiBaseUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'invalid_base_url' }
  let url
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, error: 'invalid_base_url' }
  }
  if (!['http:', 'https:'].includes(url.protocol)) return { ok: false, error: 'invalid_base_url' }
  if (url.username || url.password) return { ok: false, error: 'invalid_base_url' }
  return { ok: true, url: url.toString().replace(/\/+$/, '') }
}

export function normalizeAiConfig(value = {}) {
  const base = normalizeAiBaseUrl(value.baseUrl ?? DEFAULT_AI_CONFIG.baseUrl)
  if (!base.ok) return base
  const model = String(value.model ?? DEFAULT_AI_CONFIG.model).trim()
  if (!model || model.length > 120) return { ok: false, error: 'invalid_model' }
  return { ok: true, config: { baseUrl: base.url, model } }
}

export function createAiConfigStore(filePath, safeStorage) {
  const pathFile = filePath
  return {
    async load() {
      try {
        const raw = await fs.readFile(pathFile, 'utf8')
        const parsed = JSON.parse(raw)
        const normalized = normalizeAiConfig(parsed)
        if (!normalized.ok) return { config: { ...DEFAULT_AI_CONFIG, hasKey: false } }
        const hasKey = typeof parsed.apiKeyCipher === 'string' && parsed.apiKeyCipher.length > 0
        return { config: { ...normalized.config, hasKey } }
      } catch {
        return { config: { ...DEFAULT_AI_CONFIG, hasKey: false } }
      }
    },
    async getApiKey() {
      try {
        const raw = await fs.readFile(pathFile, 'utf8')
        const parsed = JSON.parse(raw)
        if (!parsed.apiKeyCipher || typeof parsed.apiKeyCipher !== 'string') return null
        if (!safeStorage?.isEncryptionAvailable?.()) return null
        return safeStorage.decryptString(Buffer.from(parsed.apiKeyCipher, 'base64'))
      } catch {
        return null
      }
    },
    async save(input) {
      const normalized = normalizeAiConfig(input)
      if (!normalized.ok) return normalized
      let existing = {}
      try {
        existing = JSON.parse(await fs.readFile(pathFile, 'utf8'))
      } catch {
        existing = {}
      }
      const next = {
        schemaVersion: 1,
        baseUrl: normalized.config.baseUrl,
        model: normalized.config.model,
        apiKeyCipher: existing.apiKeyCipher ?? '',
      }
      if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
        if (!safeStorage?.isEncryptionAvailable?.()) return { ok: false, error: 'keychain_unavailable' }
        next.apiKeyCipher = safeStorage.encryptString(input.apiKey.trim()).toString('base64')
      }
      await fs.mkdir(path.dirname(pathFile), { recursive: true })
      const temp = `${pathFile}.${process.pid}-${Date.now()}.tmp`
      await fs.writeFile(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
      await fs.rename(temp, pathFile)
      return { ok: true, config: { ...normalized.config, hasKey: Boolean(next.apiKeyCipher) } }
    },
    async clearKey() {
      try {
        const existing = JSON.parse(await fs.readFile(pathFile, 'utf8'))
        existing.apiKeyCipher = ''
        await fs.writeFile(pathFile, `${JSON.stringify(existing, null, 2)}\n`, 'utf8')
        return { ok: true }
      } catch {
        return { ok: false, error: 'not_configured' }
      }
    },
  }
}

function parseJsonContent(content) {
  if (typeof content !== 'string') return null
  const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

function clampEstimate(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0.5
  return Math.min(20, Math.max(0.25, Math.round(numeric * 4) / 4))
}

export function normalizeAiTasks(payload, context = {}) {
  const categoryIds = new Set(
    Array.isArray(context.categories) ? context.categories.map((item) => item?.id).filter(Boolean) : [],
  )
  const rawTasks = Array.isArray(payload?.tasks) ? payload.tasks.slice(0, 5) : []
  return rawTasks
    .map((item) => {
      const title = String(item?.title ?? '').trim().slice(0, 120)
      if (!title) return null
      const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(item?.dueDate ?? '') ? item.dueDate : context.today
      const dueTime = /^\d{2}:\d{2}$/.test(item?.dueTime ?? '') ? item.dueTime : '18:00'
      const categoryId = categoryIds.has(item?.categoryId) ? item.categoryId : categoryIds.has('other') ? 'other' : [...categoryIds][0] ?? 'other'
      return {
        title,
        categoryId,
        dueDate,
        dueTime,
        estimateDays: clampEstimate(item?.estimateDays),
        ...(typeof item?.objectiveId === 'string' && item.objectiveId ? { objectiveId: item.objectiveId } : {}),
        ...(typeof item?.projectId === 'string' && item.projectId ? { projectId: item.projectId } : {}),
      }
    })
    .filter(Boolean)
}

export function buildAiMessages(prompt, context) {
  const system = [
    '你是 Q-Panel 的规划助手，帮助用户把目标拆成可执行的季度/本周事项。',
    '只返回一个 JSON 对象，不要 Markdown，不要额外解释。',
    'JSON 结构：{"message":"给用户看的中文说明","tasks":[{"title":"事项标题","categoryId":"分类 id","dueDate":"YYYY-MM-DD","dueTime":"HH:mm","estimateDays":0.5,"objectiveId":"可选","projectId":"可选"}]}。',
    '最多 5 条 tasks；estimateDays 必须在 0.25 到 20 之间；categoryId 只能从上下文 categories 中选择；如果不应创建事项，tasks 返回空数组。',
    `今天：${context.today ?? ''}，当前周期：${context.period ?? ''}。`,
  ].join('\n')
  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `用户请求：${String(prompt).slice(0, 2000)}\n\n工作区上下文：\n${JSON.stringify(context).slice(0, MAX_CONTEXT)}`,
    },
  ]
}

export async function callAiGeneration({ config, apiKey, prompt, context }) {
  if (!apiKey) return { ok: false, error: 'no_api_key' }
  const normalized = normalizeAiConfig(config)
  if (!normalized.ok) return normalized
  if (typeof context === 'object') {
    const size = Buffer.byteLength(JSON.stringify(context), 'utf8')
    if (size > MAX_CONTEXT) return { ok: false, error: 'context_too_large' }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${normalized.config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: normalized.config.model,
        temperature: 0.3,
        messages: buildAiMessages(prompt, context),
      }),
    })
    if (!response.ok) {
      return { ok: false, error: 'provider_error', status: response.status }
    }
    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    const parsed = parseJsonContent(content)
    if (!parsed) return { ok: false, error: 'invalid_response' }
    const tasks = normalizeAiTasks(parsed, context)
    return {
      ok: true,
      message: String(parsed.message ?? '已生成建议，确认后会写入工作区。').slice(0, 2000),
      tasks,
    }
  } catch (error) {
    return { ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'network_error' }
  } finally {
    clearTimeout(timeout)
  }
}

export async function testAiConnection({ config, apiKey }) {
  if (!apiKey) return { ok: false, error: 'no_api_key' }
  const normalized = normalizeAiConfig(config)
  if (!normalized.ok) return normalized
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(`${normalized.config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: normalized.config.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: '只回复 OK' }],
      }),
    })
    if (!response.ok) return { ok: false, error: 'provider_error', status: response.status }
    return { ok: true, model: normalized.config.model }
  } catch (error) {
    return { ok: false, error: error?.name === 'AbortError' ? 'timeout' : 'network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
