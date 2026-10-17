import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPageMetadata, parseHtmlMetadata } from '../lib/metadata.mjs'

test('parses title, description and OG fallbacks', () => {
  const metadata = parseHtmlMetadata(
    '<html><head><title> Hello &amp; World </title><meta name="description" content="A short description"></head></html>',
    'https://example.com/',
  )
  assert.equal(metadata.title, 'Hello & World')
  assert.equal(metadata.description, 'A short description')
})

test('rejects private and non-http targets before fetching', async () => {
  assert.deepEqual(await fetchPageMetadata('http://127.0.0.1:1234/'), { ok: false, error: 'private_address' })
  assert.deepEqual(await fetchPageMetadata('file:///etc/passwd'), { ok: false, error: 'unsupported_protocol' })
  assert.deepEqual(await fetchPageMetadata('http://user:pass@example.com/'), {
    ok: false,
    error: 'credentials_not_allowed',
  })
})
