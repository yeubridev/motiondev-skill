import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../lib/events.mjs'
import { OBJECTS } from '../lib/pictograms.mjs'
import { illustrate, blueprint } from '../lib/svg.mjs'
import { makeEvent, reduce, initialState } from '../lib/events.mjs'

// A tag-balance check: every opened element is closed, in order.
function balanced(svg) {
  const stack = []
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, close, tag, , self] = m
    if (self) continue
    if (close) { if (stack.pop() !== tag) return false } else stack.push(tag)
  }
  return stack.length === 0
}

for (const scene of SCENES) {
  const objects = OBJECTS[scene].length ? OBJECTS[scene] : ['']
  for (const object of objects) {
    test(`illustrate ${scene}/${object || '-'}: one well-formed, bounded, script-free svg`, () => {
      for (const status of ['', 'done', 'fail']) {
        const svg = illustrate({ scene, object, name: 'users <b>&"x"', detail: 'id, email, password_hash', status, running: status === '' })
        assert.match(svg, /^<svg[^>]*viewBox="0 0 \d+ \d+"/)
        assert.match(svg, /<\/svg>$/)
        assert.ok(balanced(svg), `${scene}/${object} ${status}: unbalanced tags`)
        assert.ok(svg.length < 131072)
        assert.doesNotMatch(svg, /<script|\son\w+=|javascript:/i)
        assert.doesNotMatch(svg, /<b>/, 'names are escaped')
        // idle breathes on its own; every other scene moves only while its action runs.
        if (status !== '' && scene !== 'idle') assert.doesNotMatch(svg, /<animate/, 'a finished scene holds still')
      }
    })
  }
}

test('the table is drawn inside the database with its columns', () => {
  const svg = illustrate({ scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', running: true })
  for (const word of ['users', 'id', 'email', 'password_hash']) assert.match(svg, new RegExp(`>${word}<`))
})

test('a long endpoint path is cut before it reaches the client', () => {
  const svg = illustrate({ scene: 'api', object: 'endpoint', name: 'GET /api/v2/organizations/members/invitations', running: true })
  assert.match(svg, /…/)
  assert.doesNotMatch(svg, /invitations</)
})

test('test counts sit on two lines inside their card instead of running into its edge', () => {
  const svg = illustrate({ scene: 'tests', object: 'run', name: 'npm test', detail: '11 passed, 1 failed', status: 'fail' })
  assert.match(svg, />11 passed</)
  assert.match(svg, />1 failed</)
  const done = illustrate({ scene: 'tests', object: 'run', name: 'npm test', detail: '12 passed', status: 'done' })
  assert.match(done, />12 passed</)
})

const built = () => {
  let s = reduce(initialState(), makeEvent({ kind: 'turn', scene: 'think', object: 'task', status: 'start', name: 'Build a users API <b>&"x"' }, 1000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'database', object: 'table', name: 'users <b>', detail: 'id, email', status: 'done' }, 2000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'api', object: 'endpoint', name: 'GET /users', status: 'done' }, 3000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'frontend', object: 'component', name: 'UserList', status: 'fail' }, 4000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'tests', object: 'test', name: 'users API', status: 'done' }, 4500))
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'fail', detail: '11 passed, 1 failed' }, 5000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'git', object: 'commit', name: 'feat: users', status: 'done' }, 6000))
  s = reduce(s, makeEvent({ kind: 'object', scene: 'deps', object: 'package', name: 'zod', status: 'done' }, 7000))
  return s
}

test('the blueprint svg is one well-formed, bounded, script-free drawing of the whole build', () => {
  const svg = blueprint(built())
  assert.match(svg, /^<svg[^>]*viewBox="0 0 320 180"/)
  assert.match(svg, /<\/svg>$/)
  assert.ok(balanced(svg), 'unbalanced tags')
  assert.ok(svg.length < 131072)
  assert.doesNotMatch(svg, /<script|\son\w+=|javascript:/i)
  assert.doesNotMatch(svg, /<b>/, 'names are escaped')
  for (const word of ['frontend', 'backend', 'database', 'GET /users', 'UserList', 'users API', 'npm test', '11 passed, 1 failed', 'feat: users', 'zod', 'tests', 'git', 'also']) assert.match(svg, new RegExp(`>[^<]*${word.replace(/[/]/g, '\\/')}`), word)
  assert.match(svg, /Build a users API/)
  assert.equal(svg.match(/<animate attributeName="opacity"/g)?.length, 1, 'one caret blinks')
  assert.match(svg, new RegExp(`fill="#ff6b6b"[^>]*>✗<`), 'the failed component wears a red cross')
  assert.match(svg, /11 passed, 1 failed/)
  assert.equal((svg.match(/>✗</g) ?? []).length, 2, 'one cross on the ghost, one on the verdict: the run keeps its glyph')
  assert.match(svg, />▶</)
})

test('the blueprint svg moves the caret, keeps every scene in bounds and waits when there is nothing', () => {
  const idle = blueprint(initialState())
  assert.ok(balanced(idle))
  assert.match(idle, /waiting for the agent/)
  assert.match(idle, /<animate attributeName="opacity"/)
  let s = built()
  s = reduce(s, makeEvent({ kind: 'run', scene: 'tests', object: 'run', name: 'npm test', status: 'start' }, 8000))
  const running = blueprint(s)
  assert.match(running, /running/)
  assert.match(running, /animateTransform/, 'a spinner turns while the suite runs')
  for (const scene of SCENES) {
    for (const object of OBJECTS[scene].length ? OBJECTS[scene] : ['']) {
      let z = initialState()
      for (let i = 0; i < 12; i++) z = reduce(z, makeEvent({ kind: object ? 'object' : 'scene', scene, object: object || undefined, name: `thing ${i} with a very long name indeed`, status: i % 3 ? 'done' : 'fail' }, 1000 + i))
      const svg = blueprint(z)
      assert.ok(balanced(svg), `${scene}/${object}`)
      assert.doesNotMatch(svg, /x="-|y="-/, `${scene}/${object}: nothing drawn off the left or top`)
      assert.doesNotMatch(svg, /NaN|undefined/, `${scene}/${object}`)
    }
  }
})
