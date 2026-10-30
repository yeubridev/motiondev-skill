import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../lib/events.mjs'
import { OBJECTS } from '../lib/pictograms.mjs'
import { illustrate } from '../lib/svg.mjs'

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
