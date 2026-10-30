import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, cpSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SCENES } from '../lib/events.mjs'
import { OBJECTS } from '../lib/pictograms.mjs'

const SKILL = new URL('../skills/motiondev', import.meta.url).pathname
const tmp = prefix => mkdtempSync(join(tmpdir(), prefix))

// The skill as `npx skills add` installs it: its own folder, nothing else of the repository.
const installedAlone = () => {
  const dir = tmp('motiondev-skill-alone-')
  cpSync(SKILL, join(dir, 'motiondev'), { recursive: true })
  return join(dir, 'motiondev')
}

test('emit works from the skill folder alone', () => {
  const skill = installedAlone()
  const home = tmp('motiondev-home-')
  const r = spawnSync(process.execPath, [join(skill, 'scripts/emit.mjs'), 'database', 'table', 'users', '--detail', 'id, email'], { env: { ...process.env, MOTIONDEV_HOME: home }, encoding: 'utf8' })
  assert.equal(r.status, 0, r.stderr)
  const [e] = readFileSync(join(home, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)
  assert.deepEqual([e.kind, e.scene, e.object, e.name, e.detail, e.source, e.weight], ['object', 'database', 'table', 'users', 'id, email', 'agent', 'major'])
  const run = spawnSync(process.execPath, [join(skill, 'scripts/emit.mjs'), 'tests', 'run', 'npm', 'test', '--status', 'start'], { env: { ...process.env, MOTIONDEV_HOME: home }, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  const last = JSON.parse(readFileSync(join(home, 'events.jsonl'), 'utf8').trim().split('\n').pop())
  assert.deepEqual([last.kind, last.name, last.status], ['run', 'npm test', 'start'])
  const bad = spawnSync(process.execPath, [join(skill, 'scripts/emit.mjs'), 'kitchen'], { env: { ...process.env, MOTIONDEV_HOME: home }, encoding: 'utf8' })
  assert.notEqual(bad.status, 0)
  assert.match(bad.stderr, /unknown scene/)
})

test("the skill's scenes and objects match the library's", async () => {
  const mod = await import(join(SKILL, 'scripts/emit.mjs') + '?probe')
  assert.deepEqual([...mod.SCENES], [...SCENES])
  assert.deepEqual(mod.OBJECTS, OBJECTS)
})

// A stand-in for the claude CLI: answers `plugin list --json` from $FAKE_LIST, records every call, fails installs on $FAKE_FAIL.
const fakeClaude = (list, { fail = false } = {}) => {
  const bin = tmp('motiondev-fake-claude-')
  const log = join(bin, 'calls.log')
  writeFileSync(join(bin, 'claude'), `#!/bin/sh
echo "$@" >> "${log}"
if [ "$1 $2" = "plugin list" ]; then printf '%s' '${JSON.stringify(list)}'; exit 0; fi
if [ -n "${fail ? '1' : ''}" ]; then echo "network down" >&2; exit 1; fi
exit 0
`)
  chmodSync(join(bin, 'claude'), 0o755)
  return { bin, calls: () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : []) }
}
const ensure = (bin, extra = {}) => spawnSync(process.execPath, [join(installedAlone(), 'scripts/ensure.mjs')], { env: { ...process.env, PATH: `${bin}:/usr/bin:/bin`, ...extra }, encoding: 'utf8', timeout: 20000 })

test('ensure: an enabled plugin needs nothing but /motiondev', () => {
  const fake = fakeClaude([{ id: 'motiondev@motiondev', enabled: true, installPath: '/x' }])
  const r = ensure(fake.bin)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /installed and enabled/)
  assert.match(r.stdout, /\/motiondev/)
  assert.doesNotMatch(r.stdout, /reload-plugins/)
  assert.deepEqual(fake.calls(), ['plugin list --json'])
})

test('ensure: a missing plugin is installed, then the person reloads and opens the window', () => {
  const fake = fakeClaude([{ id: 'other@market', enabled: true }])
  const r = ensure(fake.bin)
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(fake.calls(), ['plugin list --json', 'plugin marketplace add yeubridev/motiondev-skill', 'plugin install motiondev@motiondev'])
  assert.match(r.stdout, /\/reload-plugins/)
  assert.match(r.stdout, /\/motiondev/)
  assert.ok(r.stdout.indexOf('/reload-plugins') < r.stdout.lastIndexOf('/motiondev'), 'reload comes before opening')
})

test('ensure: a disabled plugin is enabled', () => {
  const fake = fakeClaude([{ id: 'motiondev@motiondev', enabled: false }])
  const r = ensure(fake.bin)
  assert.equal(r.status, 0, r.stderr)
  assert.deepEqual(fake.calls(), ['plugin list --json', 'plugin enable motiondev@motiondev'])
  assert.match(r.stdout, /\/reload-plugins/)
})

test('ensure: a failed install or no claude CLI says how to install by hand and how to show snapshots', () => {
  const fake = fakeClaude([], { fail: true })
  const r = ensure(fake.bin)
  assert.equal(r.status, 2)
  assert.match(r.stdout + r.stderr, /network down/)
  assert.match(r.stdout, /\/plugin marketplace add yeubridev\/motiondev-skill/)
  assert.match(r.stdout, /\/plugin install motiondev@motiondev/)
  assert.match(r.stdout, /snapshot/)
  const none = ensure(tmp('motiondev-empty-path-'))
  assert.equal(none.status, 2)
  assert.match(none.stdout, /\/plugin install motiondev@motiondev/)
})

test('ensure: MOTIONDEV_NO_INSTALL=1 reports without installing', () => {
  const fake = fakeClaude([])
  const r = ensure(fake.bin, { MOTIONDEV_NO_INSTALL: '1' })
  assert.equal(r.status, 2)
  assert.deepEqual(fake.calls(), ['plugin list --json'])
  assert.match(r.stdout, /not installed/)
})
