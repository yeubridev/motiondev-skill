import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES, makeEvent, reduce, initialState } from '../lib/events.mjs'
import { OBJECTS } from '../lib/pictograms.mjs'
import { blueprint, plain } from '../lib/blueprint.mjs'

const cells = s => [...s].length
const text = r => r.lines.map(plain)
const joined = r => text(r).join('\n')
// One terminal cell per character: nothing wide, nothing combining, no control codes.
const ALLOWED = cp => cp >= 0x20 && cp !== 0x7f && cp < 0x2800

const build = () => {
  let s = reduce(initialState(), makeEvent({ kind: 'session', status: 'start', scene: 'idle', detail: 'shop-api', session: 's1' }, 1000))
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'Build a users API with auth and a React list' }, 2000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', file: 'prisma/schema.prisma', status: 'done' }, 3000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: 'GET /users', file: 'src/routes/users.ts', status: 'done' }, 4000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'auth', object: 'guard', name: 'requireAuth', file: 'src/middleware/auth.ts', status: 'done' }, 4500))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'frontend', object: 'component', name: 'UserList', file: 'src/components/UserList.tsx', status: 'fail', detail: 'permission denied' }, 5000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'tests', object: 'test', name: 'users API', file: 'tests/users.test.ts', status: 'done' }, 5500))
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'fail', detail: '11 passed, 1 failed' }, 6000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'git', object: 'commit', name: 'feat: users API', status: 'done' }, 7000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'deps', object: 'package', name: 'express, zod', status: 'done' }, 8000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'orders', file: 'prisma/schema.prisma', status: 'done' }, 9000))
  return s
}

test('every line is exactly the width asked for, in every box size, unicode and ascii', () => {
  const s = build()
  for (const width of [20, 24, 40, 60, 80, 120]) {
    for (const height of [1, 3, 6, 10, 18, 40]) {
      for (const ascii of [false, true]) {
        const r = blueprint(s, { width, height, ascii, now: 20000, tick: 0 })
        assert.ok(r.lines.length >= 1 && r.lines.length <= height, `${width}x${height}: ${r.lines.length} lines`)
        for (const line of text(r)) {
          assert.equal(cells(line), width, `${width}x${height} ascii=${ascii}: "${line}"`)
          for (const ch of line) assert.ok(ascii ? /[\x20-\x7e]/.test(ch) : ALLOWED(ch.codePointAt(0)), `char ${ch} U+${ch.codePointAt(0).toString(16)} in "${line}"`)
        }
      }
    }
  }
})

test('the zones hold what was built, newest last, and the strips hold the rest', () => {
  const out = joined(blueprint(build(), { width: 80, height: 14, now: 20000 }))
  assert.match(out, /┌─ ◫ frontend/)
  assert.match(out, /┌─ ⇄ backend/)
  assert.match(out, /┌─ ▤ database/)
  assert.match(out, /│ ▦ users\s+│/)
  assert.match(out, /│ ⇄ GET \/users\s+│/)
  assert.match(out, /│ ◘ requireAuth\s+│/, 'auth lives in the backend box')
  assert.match(out, /✓ tests .*npm test.*11 passed, 1 failed/)
  assert.match(out, /□ users API/)
  assert.match(out, /● git .*feat: users API/)
  assert.match(out, /⊞ also .*express, zod/)
  assert.match(out, /✧ Build a users API with auth and a React list/)
  const db = text(blueprint(build(), { width: 80, height: 14, now: 20000 })).filter(l => /│ ▦ /.test(l))
  assert.ok(db[0].indexOf('users') >= 0 && db[1].indexOf('orders') >= 0, 'oldest first, newest last')
})

test('the cursor sits after the item the agent is working on and moves with it', () => {
  let s = build()
  let out = joined(blueprint(s, { width: 80, height: 14, now: 20000, tick: 0 }))
  assert.match(out, /│ ▦ orders▌/, 'the caret follows the newest table')
  assert.doesNotMatch(out, /users▌/)
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'start' }, 21000))
  out = joined(blueprint(s, { width: 80, height: 14, now: 30000, tick: 0 }))
  assert.doesNotMatch(out, /orders▌/)
  assert.match(out, /✓ tests .*npm test.*running.*▌/, 'the caret is at the flask while the suite runs')
  assert.match(out, /[◐◓◑◒]/, 'a run in progress spins')
  s = reduce(s, makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'now the checkout' }, 31000))
  out = joined(blueprint(s, { width: 80, height: 14, now: 40000, tick: 0 }))
  assert.match(out, /✧ now the checkout▌/, 'thinking puts the caret on the task line')
})

test('the caret blinks with the tick and never widens a line', () => {
  const s = build()
  const on = joined(blueprint(s, { width: 80, height: 14, now: 20000, tick: 0 }))
  const off = joined(blueprint(s, { width: 80, height: 14, now: 20000, tick: 6 }))
  assert.match(on, /orders▌/)
  assert.doesNotMatch(off, /▌/)
  assert.equal(on.length, off.length)
})

test('a fresh item types itself in from its timestamp', () => {
  const s = build()
  const early = joined(blueprint(s, { width: 80, height: 14, now: 9100, tick: 0 }))
  const mid = joined(blueprint(s, { width: 80, height: 14, now: 9300, tick: 0 }))
  const late = joined(blueprint(s, { width: 80, height: 14, now: 9700, tick: 0 }))
  assert.match(early, /│ ▦ o▌/, 'first letter at 100 ms')
  assert.match(mid, /│ ▦ ord▌/)
  assert.match(late, /│ ▦ orders▌/)
  assert.doesNotMatch(early, /orders/)
})

test('a failed attempt is a red ghost where it failed, and the retry replaces it', () => {
  let s = build()
  let r = blueprint(s, { width: 80, height: 14, now: 20000 })
  const ghost = r.lines.find(l => /✗ UserList/.test(plain(l)))
  assert.ok(ghost, 'the failed component is drawn in the frontend box with a cross')
  assert.ok(ghost.some(seg => /UserList/.test(seg.text) && /fail/.test(seg.tone)), 'in the failure tone')
  s = reduce(s, makeEvent({ kind: 'object', scene: 'frontend', object: 'component', name: 'UserList', status: 'done' }, 21000))
  r = blueprint(s, { width: 80, height: 14, now: 30000, tick: 0 })
  assert.doesNotMatch(joined(r), /✗ UserList/)
  assert.match(joined(r), /│ ◫ UserList▌/)
  const failedRun = r.lines.find(l => /npm test/.test(plain(l)))
  assert.ok(failedRun.some(seg => /1 failed/.test(seg.text) && /fail/.test(seg.tone)), 'the failed run is red in its strip')
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'done', detail: '12 passed' }, 22000))
  const green = blueprint(s, { width: 80, height: 14, now: 30000 }).lines.find(l => /npm test/.test(plain(l)))
  assert.match(plain(green), /✓ 12 passed/)
  assert.ok(!green.some(seg => /fail/.test(seg.tone)))
})

test('a run with no object yet is a transient line in its zone, with the spinner', () => {
  let s = reduce(initialState(), makeEvent({ kind: 'run', scene: 'database', object: 'migration', name: 'add_users', status: 'start' }, 1000))
  let out = joined(blueprint(s, { width: 60, height: 10, now: 2000, tick: 0 }))
  assert.match(out, /┌─ ▤ database/)
  assert.match(out, /│ ▤ add_users [◐◓◑◒]/)
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'migration', name: 'add_users', status: 'done' }, 3000))
  out = joined(blueprint(s, { width: 60, height: 10, now: 9000, tick: 0 }))
  assert.match(out, /│ ▤ add_users▌/)
  assert.doesNotMatch(out, /[◐◓◑◒]/)
  const failed = reduce(initialState(), makeEvent({ kind: 'run', scene: 'database', object: 'query', name: 'psql -c select', status: 'fail' }, 1000))
  assert.match(joined(blueprint(failed, { width: 60, height: 10, now: 2000 })), /│ ✗ psql -c select/)
})

test('before anything happens the caret waits, and a box only appears once its zone is touched', () => {
  const idle = blueprint(initialState(), { width: 60, height: 10, now: 1000, tick: 0 })
  assert.equal(idle.lines.length, 1)
  assert.match(plain(idle.lines[0]), /^▌ waiting for the agent/)
  let s = reduce(initialState(), makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'add a table' }, 1))
  let out = joined(blueprint(s, { width: 60, height: 10, now: 1000, tick: 0 }))
  assert.match(out, /^✧ add a table▌/)
  assert.doesNotMatch(out, /┌─/)
  s = reduce(s, makeEvent({ kind: 'scene', scene: 'frontend', name: 'checkout page' }, 2))
  out = joined(blueprint(s, { width: 60, height: 10, now: 9000, tick: 0 }))
  assert.match(out, /┌─ ◫ frontend/, 'the zone opens for a scene with no object')
  assert.match(out, /│ · checkout page▌/)
})

test('too many items for the room: the newest stay and the title counts the rest', () => {
  let s = initialState()
  for (let i = 0; i < 9; i++) s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: `GET /r${i}`, status: 'done' }, 1000 + i))
  const r = blueprint(s, { width: 40, height: 6, now: 9000, tick: 0 })
  const out = joined(r)
  assert.match(out, /backend \+5/)
  assert.match(out, /GET \/r8▌/)
  assert.doesNotMatch(out, /GET \/r0\b/)
  assert.ok(r.lines.length <= 6)
})

test('four zones wrap into two rows on a narrow terminal and sit side by side on a wide one', () => {
  let s = initialState()
  for (const [scene, object, name] of [['frontend', 'component', 'A'], ['api', 'endpoint', 'GET /a'], ['database', 'table', 'a'], ['code', 'file', 'util.ts']]) {
    s = reduce(s, makeEvent({ kind: 'object', scene, object, name, status: 'done' }, 1000))
  }
  const wide = text(blueprint(s, { width: 100, height: 12, now: 9000 }))
  assert.equal(wide.filter(l => /┌─/.test(l)).length, 1, 'one row of boxes')
  assert.match(wide.find(l => /┌─/.test(l)), /frontend.*backend.*database.*code/)
  const narrow = text(blueprint(s, { width: 50, height: 12, now: 9000 }))
  assert.equal(narrow.filter(l => /┌─/.test(l)).length, 2, 'two rows of boxes')
  const one = text(blueprint(s, { width: 24, height: 20, now: 9000 }))
  assert.equal(one.filter(l => /┌─/.test(l)).length, 4, 'one box per row when only one fits')
})

test('a short box keeps the boxes and drops the strips first', () => {
  const s = build()
  const r = blueprint(s, { width: 80, height: 4, now: 20000 })
  assert.equal(r.lines.length, 4)
  const out = joined(r)
  assert.match(out, /┌─ ▤ database/)
  assert.doesNotMatch(out, /● git/)
})

test('names from code never break a row: control characters, accents, wide glyphs, long names', () => {
  const names = ['tab\there', 'bell\u0007x', 'déjà vu', '用户表', 'emoji 🚀 launch', 'constructor', '__proto__', 'a'.repeat(200)]
  for (const name of names) {
    let s = initialState()
    for (const scene of SCENES) for (const object of OBJECTS[scene].slice(0, 2)) s = reduce(s, makeEvent({ kind: 'object', scene, object, name, status: 'done' }, 1000))
    s = reduce(s, makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name }, 2000))
    for (const ascii of [false, true]) {
      const r = blueprint(s, { width: 72, height: 24, ascii, now: 9000, tick: 0 })
      for (const line of text(r)) {
        assert.equal(cells(line), 72, `${name}: "${line}"`)
        assert.doesNotMatch(line, /[\u0000-\u001f\u007f]/)
        if (ascii) assert.match(line, /^[\x20-\x7e]*$/)
      }
    }
  }
})

test('every scene and object the taxonomy knows has a place on the blueprint', () => {
  for (const scene of SCENES) {
    for (const object of OBJECTS[scene].length ? OBJECTS[scene] : ['']) {
      for (const status of ['done', 'fail']) {
        const s = reduce(initialState(), makeEvent({ kind: object ? 'object' : 'scene', scene, object: object || undefined, name: 'thing', status }, 1000))
        const r = blueprint(s, { width: 64, height: 12, now: 9000, tick: 0 })
        for (const line of text(r)) assert.equal(cells(line), 64, `${scene}/${object} ${status}: "${line}"`)
        // Minor scenes feed the ticker only; everything else is drawn somewhere.
        if (!['idle', 'explore', 'shell'].includes(scene)) assert.match(joined(r), /thing/, `${scene}/${object} ${status} shows its name`)
      }
    }
  }
})
