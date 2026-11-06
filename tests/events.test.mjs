import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeEvent, parseLines, reduce, initialState, SCENES } from '../lib/events.mjs'

test('makeEvent stamps time, defaults weight by scene and rejects unknown scenes', () => {
  const e = makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users' }, 1000)
  assert.equal(e.ts, 1000)
  assert.equal(e.weight, 'major')
  assert.equal(makeEvent({ kind: 'scene', scene: 'explore', object: 'read' }, 1).weight, 'minor')
  assert.throws(() => makeEvent({ kind: 'scene', scene: 'kitchen' }, 1), /unknown scene/)
})

test('parseLines keeps valid events and skips broken lines', () => {
  const text = '{"ts":1,"kind":"scene","scene":"api"}\nnot json\n\n{"ts":2,"kind":"object","scene":"api","object":"endpoint","name":"GET /users"}\n'
  const events = parseLines(text)
  assert.equal(events.length, 2)
  assert.equal(events[1].name, 'GET /users')
})

test('a session start resets the canvas and names the project', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users' }, 1))
  assert.equal(s.shelf.length, 1)
  s = reduce(s, makeEvent({ kind: 'session', status: 'start', scene: 'idle', detail: 'shop-api', session: 'abc' }, 2))
  assert.equal(s.shelf.length, 0)
  assert.equal(s.project, 'shop-api')
  assert.equal(s.session, 'abc')
  assert.equal(s.current.scene, 'idle')
})

test('a major event becomes the current scene, an object joins the shelf once', () => {
  let s = initialState()
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', file: 'db/schema.sql' }, 1))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users' }, 2))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: 'GET /users' }, 3))
  assert.equal(s.current.scene, 'api')
  assert.equal(s.current.name, 'GET /users')
  assert.deepEqual(s.shelf.map(o => o.name), ['users', 'GET /users'])
})

test('a minor event only feeds the ticker', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'object', scene: 'frontend', object: 'component', name: 'Button' }, 1))
  s = reduce(s, makeEvent({ kind: 'scene', scene: 'explore', object: 'read', name: 'src/app.tsx' }, 2))
  assert.equal(s.current.scene, 'frontend')
  assert.equal(s.ticker.at(-1).name, 'src/app.tsx')
  assert.equal(s.shelf.length, 1)
})

test('runs track start, done and fail', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'start' }, 1))
  assert.equal(s.running, true)
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'fail', detail: '2 failed' }, 2))
  assert.equal(s.running, false)
  assert.equal(s.current.status, 'fail')
  assert.equal(s.shelf.length, 0)
})

test('turns count and set the current status', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'turn', scene: 'think', status: 'start', name: 'add a users table' }, 1))
  assert.equal(s.turns, 1)
  assert.equal(s.current.scene, 'think')
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users' }, 2))
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'idle', status: 'done' }, 3))
  assert.equal(s.current.status, 'done')
  assert.equal(s.current.scene, 'database', 'a finished turn keeps the last scene on screen')
  assert.equal(s.turns, 1)
})

test('a finished turn keeps a failed run red', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'fail', detail: '1 failed' }, 1))
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'idle', status: 'done', weight: 'minor' }, 2))
  assert.equal(s.current.status, 'fail')
})

test('seq keeps counting past the ticker, so animation never freezes', () => {
  let s = initialState()
  assert.equal(s.seq, 0)
  for (let i = 0; i < 30; i++) s = reduce(s, makeEvent({ kind: 'scene', scene: 'shell', object: 'command', name: `c${i}` }, i))
  assert.equal(s.seq, 30)
  assert.equal(s.ticker.length, 12)
})

test('the ticker keeps the last twelve events', () => {
  let s = initialState()
  for (let i = 0; i < 20; i++) s = reduce(s, makeEvent({ kind: 'scene', scene: 'shell', object: 'command', name: `cmd ${i}` }, i))
  assert.equal(s.ticker.length, 12)
  assert.equal(s.ticker[0].name, 'cmd 8')
})

test('SCENES lists every scene the design names', () => {
  for (const scene of ['database', 'api', 'frontend', 'tests', 'git', 'deps', 'infra', 'config', 'docs', 'auth', 'build', 'agents', 'explore', 'shell', 'think', 'code', 'idle']) {
    assert.ok(SCENES.includes(scene), scene)
  }
})

test('a failed object joins the shelf as a ghost and the retry replaces it in place', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', status: 'done' }, 1))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'frontend', object: 'component', name: 'UserList', status: 'fail', detail: 'permission denied' }, 2))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: 'GET /users', status: 'done' }, 3))
  assert.deepEqual(s.shelf.map(o => [o.name, o.status]), [['users', 'done'], ['UserList', 'fail'], ['GET /users', 'done']])
  assert.equal(s.current.status, 'done', 'the shelf keeps the ghost, the scene moved on')
  s = reduce(s, makeEvent({ kind: 'object', scene: 'frontend', object: 'component', name: 'UserList', status: 'done' }, 4))
  assert.deepEqual(s.shelf.map(o => [o.name, o.status]), [['users', 'done'], ['UserList', 'done'], ['GET /users', 'done']], 'the fix lands where the failure was')
  assert.equal(s.shelf[1].ts, 4, 'the retry is the newest thing drawn')
})

test('an edit keeps the columns a table was created with', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', detail: 'id, email', status: 'done' }, 1))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', detail: 'edit', status: 'done' }, 2))
  assert.equal(s.shelf[0].detail, 'id, email')
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', status: 'done' }, 3))
  assert.equal(s.shelf[0].detail, 'id, email, password_hash', 'a richer detail replaces the old one')
  assert.equal(s.shelf.length, 1)
})

test('runs remember the last outcome per scene and object once the agent has moved on', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'start' }, 1))
  assert.deepEqual([s.runs['tests/run'].status, s.runs['tests/run'].name], ['start', 'npm test'])
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'fail', detail: '11 passed, 1 failed' }, 2))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: 'GET /users', status: 'done' }, 3))
  assert.deepEqual([s.runs['tests/run'].status, s.runs['tests/run'].detail, s.runs['tests/run'].ts], ['fail', '11 passed, 1 failed', 2])
  assert.equal(s.current.scene, 'api')
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'done', detail: '12 passed' }, 4))
  assert.equal(s.runs['tests/run'].status, 'done')
  assert.equal(s.runs['api/endpoint'], undefined, 'objects are not runs')
  s = reduce(s, makeEvent({ kind: 'session', status: 'start', scene: 'idle' }, 5))
  assert.deepEqual(s.runs, {}, 'a new session starts with no runs')
})

test('the task is the prompt of the turn', () => {
  let s = initialState()
  assert.equal(s.task, '')
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'add a users table' }, 1))
  assert.equal(s.task, 'add a users table')
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users' }, 2))
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'idle', status: 'done', weight: 'minor' }, 3))
  assert.equal(s.task, 'add a users table', 'the task stays until the next prompt')
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'now the endpoint' }, 4))
  assert.equal(s.task, 'now the endpoint')
})
