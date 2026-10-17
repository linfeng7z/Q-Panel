import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {
  buildAiMessages,
  callAiGeneration,
  normalizeAiConfig,
  normalizeAiTasks,
  testAiConnection,
} from '../lib/ai.mjs'

test('validates AI base URL and model', () => {
  assert.equal(normalizeAiConfig({ baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' }).ok, true)
  assert.equal(normalizeAiConfig({ baseUrl: 'file:///tmp', model: 'x' }).error, 'invalid_base_url')
  assert.equal(normalizeAiConfig({ baseUrl: 'https://example.com', model: '' }).error, 'invalid_model')
})

test('normalizes model tasks against categories and limits', () => {
  const tasks = normalizeAiTasks(
    {
      tasks: [
        { title: 'A', categoryId: 'appsec', dueDate: '2026-10-31', estimateDays: 0.6 },
        { title: 'B', categoryId: 'unknown', dueDate: 'bad', estimateDays: 99 },
        { title: '', categoryId: 'appsec' },
      ],
    },
    { categories: [{ id: 'appsec' }, { id: 'other' }], today: '2026-10-17' },
  )
  assert.equal(tasks.length, 2)
  assert.equal(tasks[0].estimateDays, 0.5)
  assert.equal(tasks[1].categoryId, 'other')
  assert.equal(tasks[1].dueDate, '2026-10-17')
  assert.equal(tasks[1].estimateDays, 20)
})

test('AI messages include bounded context and request', () => {
  const messages = buildAiMessages('拆任务', { today: '2026-10-17', period: '2026 Q4', categories: [] })
  assert.equal(messages.length, 2)
  assert.match(messages[1].content, /拆任务/)
})

test('calls an OpenAI-compatible endpoint and parses proposals', async () => {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      choices: [{ message: { content: '```json\n{"message":"已拆分","tasks":[{"title":"验证 AI","categoryId":"appsec","dueDate":"2026-10-20","estimateDays":1}]}\n```' } }],
    }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try {
    const result = await callAiGeneration({
      config: { baseUrl: `http://127.0.0.1:${port}/v1`, model: 'fixture' },
      apiKey: 'sk-test',
      prompt: '生成一条',
      context: { today: '2026-10-17', categories: [{ id: 'appsec' }] },
    })
    assert.equal(result.ok, true)
    assert.equal(result.tasks[0].title, '验证 AI')
    assert.equal(result.tasks[0].categoryId, 'appsec')
    const ping = await testAiConnection({
      config: { baseUrl: `http://127.0.0.1:${port}/v1`, model: 'fixture' },
      apiKey: 'sk-test',
    })
    assert.equal(ping.ok, true)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
