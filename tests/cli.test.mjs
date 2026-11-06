import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CLI = new URL('../bin/motiondev.mjs', import.meta.url).pathname
const EMIT = new URL('../skills/motiondev/scripts/emit.mjs', import.meta.url).pathname
const home = () => mkdtempSync(join(tmpdir(), 'motiondev-cli-'))
const cli = (args, dir, opts = {}) => spawnSync(process.execPath, [CLI, ...args], { env: { ...process.env, MOTIONDEV_HOME: dir, NO_COLOR: '1' }, encoding: 'utf8', timeout: 10000, ...opts })

test('emit appends an agent event and echoes it', () => {
  const dir = home()
  const r = cli(['emit', 'database', 'table', 'users', '--detail', 'email, password_hash'], dir)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /database/)
  assert.match(r.stdout, /users/)
  const [e] = readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  assert.deepEqual([e.kind, e.scene, e.object, e.name, e.detail, e.source], ['object', 'database', 'table', 'users', 'email, password_hash', 'agent'])
})

test('emit done closes a unit of work and emit refuses an unknown scene', () => {
  const dir = home()
  assert.equal(cli(['emit', 'tests', 'run', 'pytest', '--status', 'start'], dir).status, 0)
  const r = cli(['emit', 'tests', 'run', 'pytest', '--status', 'done', '--detail', '12 passed'], dir)
  assert.equal(r.status, 0)
  const bad = cli(['emit', 'kitchen', 'sink'], dir)
  assert.notEqual(bad.status, 0)
  assert.match(bad.stderr, /unknown scene/)
  assert.match(bad.stderr, /database/, 'lists the scenes')
})

test('the skill script emits through the same path', () => {
  const dir = home()
  const r = spawnSync(process.execPath, [EMIT, 'api', 'endpoint', 'GET', '/users'], { env: { ...process.env, MOTIONDEV_HOME: dir }, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  const [e] = readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  assert.equal(e.name, 'GET /users')
})

test('status sums the file up in one line', () => {
  const dir = home()
  cli(['emit', 'frontend', 'component', 'Button'], dir)
  cli(['emit', 'frontend', 'component', 'Card'], dir)
  const r = cli(['status'], dir)
  assert.equal(r.stdout.trim(), '◫ frontend · component "Card" · 2 built')
  assert.equal(cli(['status', '--ascii'], dir).stdout.trim(), '# frontend . component "Card" . 2 built')
  assert.equal(cli(['status'], home()).stdout.trim(), '◌ idle')
})

test('tail prints one line per event and stops without --follow', () => {
  const dir = home()
  cli(['emit', 'git', 'commit', 'feat: users'], dir)
  const r = cli(['tail', '--no-follow'], dir)
  assert.equal(r.status, 0)
  assert.match(r.stdout, /commit feat: users/)
  assert.equal(r.stdout.trim().split('\n').length, 1)
})

test('clear empties the file and path prints where it is', () => {
  const dir = home()
  cli(['emit', 'docs', 'page', 'README'], dir)
  assert.equal(cli(['clear'], dir).status, 0)
  assert.equal(readFileSync(join(dir, 'events.jsonl'), 'utf8'), '')
  assert.equal(cli(['path'], dir).stdout.trim(), join(dir, 'events.jsonl'))
})

test('watch without a TTY prints frames once and exits with --once: the blueprint, or the action with --view', () => {
  const dir = home()
  cli(['emit', 'tests', 'run', 'npm test', '--status', 'start'], dir)
  const r = cli(['watch', '--once', '--width', '70', '--height', '16'], dir)
  assert.equal(r.status, 0, r.stderr)
  const rows = r.stdout.replace(/\n$/, '').split('\n')
  assert.equal(rows.length, 16)
  for (const row of rows) assert.equal([...row].length, 70)
  assert.match(r.stdout, /✓ tests .*npm test.*running/, 'the suite runs in its strip')
  assert.doesNotMatch(r.stdout, /quality · tests/)
  const action = cli(['watch', '--once', '--width', '70', '--height', '16', '--view', 'action'], dir)
  assert.match(action.stdout, /quality · tests/)
  assert.match(action.stdout, /┌─ ▶ run/)
})

test('demo plays the bundled scenario and --once renders its final frame', () => {
  const r = cli(['demo', '--once', '--width', '80', '--height', '24'], home())
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /motiondev/)
  for (const zone of ['┌─ ◫ frontend', '┌─ ⇄ backend', '┌─ ▤ database', '✓ tests', '● git', '⊞ also']) assert.ok(r.stdout.includes(zone), zone)
  assert.match(r.stdout, /│ ◫ UserList/, 'the retried component is whole at the end')
  assert.doesNotMatch(r.stdout, /✗ UserList/)
  assert.match(cli(['demo', '--once', '--width', '80', '--height', '24', '--view', 'action'], home()).stdout, /built/)
})

test('snapshot prints a compact frame for a chat code block', () => {
  const dir = home()
  cli(['emit', 'database', 'table', 'users', '--detail', 'id, email'], dir)
  const r = cli(['snapshot'], dir)
  assert.equal(r.status, 0, r.stderr)
  const rows = r.stdout.replace(/\n$/, '').split('\n')
  assert.ok(rows.length >= 5 && rows.length <= 16, `${rows.length} rows`)
  for (const row of rows) assert.ok([...row].length <= 64, `too wide: ${row}`)
  assert.match(r.stdout, /┌─ ▤ database/)
  assert.match(r.stdout, /│ ▦ users▌/)
  assert.doesNotMatch(r.stdout, /q quits/, 'no watcher footer in a snapshot')
  assert.doesNotMatch(r.stdout, /\x1b\[/, 'never colored')
  const a = cli(['snapshot', '--ascii'], dir)
  assert.ok(/^[\x20-\x7e\n]*$/.test(a.stdout), 'ascii only')
  const action = cli(['snapshot', '--view', 'action'], dir)
  assert.match(action.stdout, /╭──────────╮/, 'the action view draws the cylinder')
  assert.match(action.stdout, /built/)
})

test('help lists the commands', () => {
  const r = cli(['--help'], home())
  assert.equal(r.status, 0)
  for (const cmd of ['watch', 'tail', 'emit', 'demo', 'status', 'clear', 'snapshot']) assert.match(r.stdout, new RegExp(`\\b${cmd}\\b`))
  assert.match(r.stdout, /--view blueprint\|action/)
})
