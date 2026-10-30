import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeEvent, reduce, initialState } from '../lib/events.mjs'
import { frame, oneLine, tickerLine, stripAnsi, visibleWidth } from '../lib/render.mjs'

const build = () => {
  let s = reduce(initialState(), makeEvent({ kind: 'session', status: 'start', scene: 'idle', detail: 'shop-api', session: 's1' }, 1000))
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'Add users table and GET /users' }, 2000))
  s = reduce(s, makeEvent({ kind: 'scene', scene: 'explore', object: 'read', name: 'src/db.ts', tool: 'Read' }, 2500))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', file: 'prisma/schema.prisma', tool: 'Write', status: 'done' }, 3000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: 'GET /users', file: 'src/routes/users.ts', tool: 'Write', status: 'done' }, 4000))
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'start', tool: 'Bash' }, 5000))
  return s
}

test('a frame is exactly the box it was asked for, in color and without', () => {
  const s = build()
  for (const color of [false, true]) {
    const lines = frame(s, { width: 80, height: 24, tick: 3, now: 5200, color })
    assert.equal(lines.length, 24)
    for (const line of lines) assert.equal(visibleWidth(line), 80, `"${stripAnsi(line)}" is ${visibleWidth(line)} wide`)
    if (!color) for (const line of lines) assert.equal(line, stripAnsi(line), 'no escape codes when color is off')
  }
})

test('a frame shows the scene, what is being made, the shelf and the ticker', () => {
  const text = frame(build(), { width: 80, height: 24, tick: 0, now: 5200 }).join('\n')
  assert.match(text, /shop-api/)
  assert.match(text, /quality · tests/)
  assert.match(text, /npm test/)
  assert.match(text, /users/)
  assert.match(text, /GET \/users/)
  assert.match(text, /running/)
  assert.match(text, /src\/db\.ts/)
})

test('a narrow or short terminal still gets a full box', () => {
  for (const [width, height] of [[40, 10], [30, 6], [120, 40], [20, 4]]) {
    const lines = frame(build(), { width, height, tick: 1, now: 5200 })
    assert.equal(lines.length, height)
    for (const line of lines) assert.equal(visibleWidth(line), width, `${width}x${height}: "${line}"`)
  }
})

test('a scene change reveals the pictogram over time and animation follows the tick', () => {
  const s = build()
  const early = frame(s, { width: 80, height: 24, tick: 0, now: 5050 }).join('\n')
  const late = frame(s, { width: 80, height: 24, tick: 0, now: 9000 }).join('\n')
  assert.notEqual(early, late, 'the reveal changes the drawing')
  const a = frame(s, { width: 80, height: 24, tick: 0, now: 9000 }).join('\n')
  const b = frame(s, { width: 80, height: 24, tick: 1, now: 9000 }).join('\n')
  assert.notEqual(a, b, 'a running scene animates between ticks')
})

test('reveal can be turned off for a one-shot frame, and a done run reads in the past tense', () => {
  const s = build()
  const text = frame(s, { width: 80, height: 24, tick: 0, now: 5050, reveal: false }).join('\n')
  assert.match(text, /┌─ ▶ run/, 'the whole drawing is there, card included')
  let d = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'done', detail: '12 passed' }, 6000))
  const done = frame(d, { width: 80, height: 24, tick: 0, now: 9000 }).join('\n')
  assert.match(done, /✓ ran tests · done/)
  assert.match(done, /12 passed/)
})

test('the caption and the table card keep the columns after the turn ends', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', file: 'db/schema.sql', status: 'done' }, 1000))
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'idle', status: 'done', weight: 'minor' }, 2000))
  const text = frame(s, { width: 80, height: 24, tick: 0, now: 9000 }).join('\n')
  assert.match(text, /id, email, password_hash/, 'caption keeps the detail')
  assert.match(text, /db\/schema\.sql/, 'caption keeps the file')
  assert.match(text, /│ id\s+│/, 'the card lists the real columns')
  assert.match(text, /│ email\s+│/)
  assert.match(text, /│ password_hash\s+│/)
})

test('oneLine sums the canvas up for a status line', () => {
  const s = build()
  const line = oneLine(s)
  assert.match(line, /tests/)
  assert.match(line, /npm test/)
  assert.match(line, /2 built/)
  assert.ok(visibleWidth(line) < 100)
  assert.equal(oneLine(initialState()), '◌ idle')
  assert.equal(oneLine(initialState(), { ascii: true }), 'o idle')
})

test('tickerLine is one row per event with a clock, a glyph and the gist', () => {
  const e = makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', file: 'prisma/schema.prisma', tool: 'Write', status: 'done' }, Date.UTC(2026, 9, 30, 12, 4, 31))
  const line = tickerLine(e, { width: 80, utc: true })
  assert.match(line, /^12:04:31 /)
  assert.match(line, /table/)
  assert.match(line, /users/)
  assert.match(line, /prisma\/schema\.prisma/)
  assert.ok(visibleWidth(line) <= 80)
  const fail = tickerLine(makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'pytest', status: 'fail', detail: '2 failed' }, 0), { width: 60, utc: true })
  assert.match(fail, /2 failed/)
})
