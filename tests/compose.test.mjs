import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../lib/events.mjs'
import { OBJECTS } from '../lib/pictograms.mjs'
import { compose } from '../lib/compose.mjs'

const cells = s => [...s].length
const ALLOWED = cp => cp < 0x7f || (cp >= 0x2500 && cp <= 0x25ff) || (cp >= 0x2190 && cp <= 0x21ff) || cp === 0x2026
const SAMPLE = { table: 'users', endpoint: 'GET /users', component: 'UserList', run: 'npm test', commit: 'feat: users API', package: 'express, zod', agent: 'review the diff' }

for (const scene of SCENES) {
  const objects = OBJECTS[scene].length ? OBJECTS[scene] : ['']
  for (const object of objects) {
    test(`compose ${scene}/${object || '-'}: one box per composition, every width, every status`, () => {
      for (const status of ['', 'done', 'fail']) {
        for (const maxWidth of [24, 32, 40, 80]) {
          for (const ascii of [false, true]) {
            const spec = { scene, object, name: SAMPLE[object] ?? 'something', detail: 'id, email, password_hash', status, running: status === '' }
            const r = compose(spec, { ascii, maxWidth })
            assert.ok(r.frames.length >= 1)
            assert.ok(r.width <= Math.max(24, maxWidth) && r.width >= 24, `width ${r.width}`)
            for (const frame of r.frames) {
              assert.equal(frame.length, r.height)
              for (const line of frame) {
                assert.equal(cells(line), r.width, `${scene}/${object} ${status} ${maxWidth}: "${line}"`)
                for (const ch of line) assert.ok(ascii ? /[\x20-\x7e]/.test(ch) : ALLOWED(ch.codePointAt(0)), `char ${ch} U+${ch.codePointAt(0).toString(16)} in "${line}"`)
              }
            }
          }
        }
      }
    })
  }
}

test('a running action animates, a finished one holds still', () => {
  assert.ok(compose({ scene: 'database', object: 'table', name: 'users', running: true }).frames.length >= 2)
  assert.equal(compose({ scene: 'database', object: 'table', name: 'users', status: 'done', running: false }).frames.length, 1)
})

test('the table slides into the database with its name and columns written on it', () => {
  const r = compose({ scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', running: true })
  const all = r.frames.map(f => f.join('\n'))
  assert.match(all.at(-1), /users/)
  assert.match(all.at(-1), /id/)
  assert.match(all.at(-1), /email/)
  assert.match(all.at(-1), /password_hash/)
  assert.notEqual(all[0], all.at(-1), 'the card moves')
})

test('names that look like object internals are drawn, not looked up', () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    for (const object of ['constructor', 'toString', 'table']) {
      const r = compose({ scene: 'code', object, name, running: true })
      for (const frame of r.frames) for (const line of frame) assert.equal(cells(line), r.width)
    }
  }
})

test('control characters, accents and wide characters never break a row', () => {
  const names = ['tab\there', 'bell\u0007x', 'déjà vu', 'café', '用户表', 'emoji 🚀 launch', 'áccent']
  for (const name of names) {
    for (const ascii of [false, true]) {
      const r = compose({ scene: 'database', object: 'table', name, detail: name, status: 'done', running: false }, { ascii })
      for (const frame of r.frames) for (const line of frame) {
        assert.equal(cells(line), r.width, `${name}: "${line}"`)
        assert.doesNotMatch(line, /[\u0000-\u001f\u007f]/)
        if (ascii) assert.match(line, /^[\x20-\x7e]*$/)
      }
    }
  }
  const fr = compose({ scene: 'git', object: 'commit', name: 'déjà vu', status: 'done', running: false }, { ascii: true }).frames[0].join('\n')
  assert.match(fr, /deja vu/, 'accents fold to their letter in ascii')
  const keep = compose({ scene: 'git', object: 'commit', name: 'déjà vu', status: 'done', running: false }).frames[0].join('\n')
  assert.match(keep, /déjà vu/, 'accents stay in unicode')
})

test('six packages say six', () => {
  const r = compose({ scene: 'deps', object: 'package', name: 'a, b, c, d, e, f', status: 'done', running: false })
  assert.match(r.frames[0].join('\n'), /6 packages/)
})

test('a finished run with no counts says passed or failed, never a bare marker', () => {
  for (const status of ['done', 'fail']) {
    const text = compose({ scene: 'tests', object: 'run', name: 'npm test', detail: '', status, running: false }).frames[0].join('\n')
    assert.doesNotMatch(text, /[■□] +│/, `bare marker on ${status}`)
    assert.match(text, status === 'done' ? /passed/ : /failed/)
  }
})
