import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const HOOK = new URL('../hooks/motiondev-hook.mjs', import.meta.url).pathname
const home = () => mkdtempSync(join(tmpdir(), 'motiondev-'))
const run = (payload, dir, env = {}) => spawnSync(process.execPath, [HOOK], { input: typeof payload === 'string' ? payload : JSON.stringify(payload), env: { ...process.env, MOTIONDEV_HOME: dir, CLAUDE_PLUGIN_ROOT: '/plugins/motiondev', ...env }, encoding: 'utf8', timeout: 5000 })
const lines = dir => readFileSync(join(dir, 'events.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l))

test('a PostToolUse Write becomes one event line', () => {
  const dir = home()
  const r = run({ hook_event_name: 'PostToolUse', session_id: 's1', cwd: '/repo', tool_name: 'Write', tool_input: { file_path: '/repo/db/schema.sql', content: 'CREATE TABLE users (id int);' }, tool_response: {} }, dir)
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.stdout, '', 'the hook stays silent')
  const [e] = lines(dir)
  assert.equal(e.scene, 'database')
  assert.equal(e.object, 'table')
  assert.equal(e.name, 'users')
  assert.equal(e.source, 'hook')
  assert.equal(e.session, 's1')
  assert.ok(typeof e.ts === 'number')
})

test('a session start records the plugin root for the watcher and resets', () => {
  const dir = home()
  const r = run({ hook_event_name: 'SessionStart', source: 'startup', session_id: 's2', cwd: '/home/u/shop-api' }, dir)
  assert.equal(r.status, 0, r.stderr)
  const [e] = lines(dir)
  assert.deepEqual([e.kind, e.status, e.detail], ['session', 'start', 'shop-api'])
  assert.equal(readFileSync(join(dir, 'plugin-root'), 'utf8').trim(), '/plugins/motiondev')
})

test('garbage, an empty payload and an unknown tool all exit 0 and write nothing', () => {
  const dir = home()
  assert.equal(run('not json', dir).status, 0)
  assert.equal(run('', dir).status, 0)
  assert.equal(run({ hook_event_name: 'PostToolUse', tool_name: 'Mystery', tool_input: {} }, dir).status, 0)
  assert.equal(existsSync(join(dir, 'events.jsonl')), false)
})

test('MOTIONDEV=0 turns the hook off', () => {
  const dir = home()
  run({ hook_event_name: 'UserPromptSubmit', prompt: 'hi', cwd: '/repo' }, dir, { MOTIONDEV: '0' })
  assert.equal(existsSync(join(dir, 'events.jsonl')), false)
})

test('a file over the size cap is rotated once', () => {
  const dir = home()
  writeFileSync(join(dir, 'events.jsonl'), 'x'.repeat(2048) + '\n')
  run({ hook_event_name: 'Stop', cwd: '/repo' }, dir, { MOTIONDEV_MAX_BYTES: '1024' })
  assert.ok(existsSync(join(dir, 'events.1.jsonl')), 'old file kept as events.1.jsonl')
  assert.equal(lines(dir).length, 1)
})

test('a narration is not written twice: emit.mjs already wrote it', () => {
  const dir = home()
  run({ hook_event_name: 'PostToolUse', cwd: '/repo', tool_name: 'Bash', tool_input: { command: 'node scripts/emit.mjs database table users' }, tool_response: { stdout: 'motiondev · database', stderr: '' } }, dir)
  assert.equal(existsSync(join(dir, 'events.jsonl')), false)
})

test('a failed tool call (PostToolUseFailure) closes the run as a failure', () => {
  const dir = home()
  run({ hook_event_name: 'PostToolUseFailure', cwd: '/repo', tool_name: 'Bash', tool_input: { command: 'npm test' }, tool_use_id: 't1', error: 'Exit code 1\n2 failed, 10 passed' }, dir)
  const [e] = lines(dir)
  assert.deepEqual([e.kind, e.scene, e.status, e.detail], ['run', 'tests', 'fail', '10 passed, 2 failed'])
})

test('hooks.json listens to failed tool calls too', () => {
  const hooks = JSON.parse(readFileSync(new URL('../hooks/hooks.json', import.meta.url), 'utf8')).hooks
  assert.ok(hooks.PostToolUseFailure?.[0]?.hooks?.[0]?.command.includes('motiondev-hook.mjs'))
})
