import dns from 'node:dns/promises'

const MAX_BYTES = 2 * 1024 * 1024
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 6000
const PRIVATE_HOST_SUFFIXES = ['.local', '.internal', '.localhost']

function isPrivateIPv4(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isLoopbackIPv6(address) {
  const normalized = address.toLowerCase().split('%')[0]
  return normalized === '::1' || normalized === '0:0:0:0:0:0:0:1'
}

function isPrivateIPv6(address) {
  const normalized = address.toLowerCase().split('%')[0]
  if (isLoopbackIPv6(normalized)) return false
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (/^fe[89ab]/.test(normalized)) return true
  if (normalized.startsWith('ff')) return true
  if (normalized.startsWith('::ffff:')) return isPrivateIPv4(normalized.slice(7))
  return false
}

function isPrivateAddress(address) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return isPrivateIPv4(address)
  return isPrivateIPv6(address)
}

async function assertSafeUrl(rawUrl, { allowLoopback = false } = {}) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    throw Object.assign(new Error('invalid_url'), { code: 'invalid_url' })
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('unsupported_protocol'), { code: 'unsupported_protocol' })
  }
  if (url.username || url.password) {
    throw Object.assign(new Error('credentials_not_allowed'), { code: 'credentials_not_allowed' })
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (!host || PRIVATE_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix)) || host === 'localhost') {
    if (!(allowLoopback && host === 'localhost')) {
      throw Object.assign(new Error('private_address'), { code: 'private_address' })
    }
  }
  const addresses = await dns.lookup(host, { all: true, verbatim: true }).catch(() => {
    throw Object.assign(new Error('dns_lookup_failed'), { code: 'dns_lookup_failed' })
  })
  for (const address of addresses) {
    if (isLoopbackIPv6(address.address) || address.address.startsWith('127.')) {
      if (!allowLoopback) {
        throw Object.assign(new Error('private_address'), { code: 'private_address' })
      }
      continue
    }
    if (isPrivateAddress(address.address)) {
      throw Object.assign(new Error('private_address'), { code: 'private_address' })
    }
  }
  return url
}

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, num) => String.fromCodePoint(Number(num)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function cleanText(value, max) {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function metaContent(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["'][^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) return match[1]
  }
  return ''
}

export function parseHtmlMetadata(html, baseUrl) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = cleanText(titleMatch?.[1] ?? metaContent(html, 'og:title'), 200)
  const description = cleanText(
    metaContent(html, 'description') || metaContent(html, 'og:description'),
    500,
  )
  return { title: title || '', description: description || '', url: baseUrl }
}

async function readLimitedBody(response, maxBytes = MAX_BYTES) {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw Object.assign(new Error('content_too_large'), { code: 'content_too_large' })
    }
    chunks.push(value)
  }
  const buffer = Buffer.concat(chunks)
  return buffer.toString('utf8')
}

export async function fetchPageMetadata(rawUrl, { allowLoopback = false } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    let current = await assertSafeUrl(rawUrl, { allowLoopback })
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'Q-Panel/0.5 metadata (+https://qpanel.local)',
          accept: 'text/html,application/xhtml+xml',
        },
      }).catch((error) => {
        throw Object.assign(new Error(error?.name === 'AbortError' ? 'timeout' : 'fetch_failed'), {
          code: error?.name === 'AbortError' ? 'timeout' : 'fetch_failed',
        })
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) throw Object.assign(new Error('invalid_redirect'), { code: 'invalid_redirect' })
        current = await assertSafeUrl(new URL(location, current).toString(), { allowLoopback })
        continue
      }
      if (!response.ok) {
        throw Object.assign(new Error(`http_${response.status}`), { code: `http_${response.status}` })
      }
      const contentType = response.headers.get('content-type') ?? ''
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        throw Object.assign(new Error('unsupported_content'), { code: 'unsupported_content' })
      }
      const length = Number(response.headers.get('content-length') ?? 0)
      if (length > MAX_BYTES) {
        throw Object.assign(new Error('content_too_large'), { code: 'content_too_large' })
      }
      const html = await readLimitedBody(response)
      return { ok: true, ...parseHtmlMetadata(html, current.toString()) }
    }
    throw Object.assign(new Error('too_many_redirects'), { code: 'too_many_redirects' })
  } catch (error) {
    return { ok: false, error: error?.code ?? 'metadata_failed' }
  } finally {
    clearTimeout(timeout)
  }
}
