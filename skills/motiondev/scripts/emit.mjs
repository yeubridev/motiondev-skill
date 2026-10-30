#!/usr/bin/env node
// Narrate one unit of work: node emit.mjs <scene> [object] [name...] [--status start|done|fail] [--detail text] [--minor]
// Self-contained on purpose: `npx skills add` installs this folder alone, without the rest of the plugin.
// SCENES and OBJECTS mirror lib/events.mjs and lib/pictograms.mjs; tests/skill.test.mjs keeps them equal.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SCENES = [
  'database', 'api', 'frontend', 'tests', 'git', 'deps', 'infra', 'config',
  'docs', 'auth', 'build', 'agents', 'explore', 'shell', 'think', 'code', 'idle',
]

export const OBJECTS = {
  database: ['table', 'migration', 'seed', 'index', 'query'],
  api: ['endpoint', 'route', 'model', 'service', 'middleware', 'schema', 'server', 'request'],
  frontend: ['component', 'page', 'style', 'hook', 'asset'],
  tests: ['test', 'run', 'lint'],
  git: ['commit', 'branch', 'push', 'pr'],
  deps: ['package'],
  infra: ['container', 'pipeline', 'deploy'],
  config: ['env', 'setting'],
  docs: ['page'],
  auth: ['guard', 'token', 'login'],
  build: ['bundle'],
  agents: ['agent'],
  explore: ['read', 'search', 'fetch'],
  shell: ['command'],
  think: ['task'],
  code: ['file'],
  idle: [],
}

const MINOR = new Set(['explore', 'shell'])
const RUNS = new Set(['run', 'lint', 'query', 'server', 'agent', 'request', 'pipeline', 'deploy', 'bundle'])
const VALUED = new Set(['status', 'detail', 'file', 'kind', 'session'])

export function parse(argv) {
  const opts = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { opts._.push(a); continue }
    const [key, inline] = a.slice(2).split('=')
    if (inline !== undefined) opts[key] = inline
    else if (VALUED.has(key) && argv[i + 1] !== undefined) opts[key] = argv[++i]
    else opts[key] = true
  }
  return opts
}

export function eventFrom(argv, ts = Date.now()) {
  const opts = parse(argv)
  const [scene, maybeObject, ...rest] = opts._
  if (!SCENES.includes(scene)) throw new Error(`unknown scene: ${scene ?? '(none)'}\nScenes: ${SCENES.join(', ')}`)
  const object = (OBJECTS[scene] ?? []).includes(maybeObject) || Object.values(OBJECTS).flat().includes(maybeObject) ? maybeObject : undefined
  const name = (object ? rest : [maybeObject, ...rest]).filter(Boolean).join(' ')
  const kind = opts.kind ?? (opts.status === 'start' || (object && RUNS.has(object)) ? 'run' : object ? 'object' : 'scene')
  const e = { ts, kind, scene, weight: opts.minor || MINOR.has(scene) ? 'minor' : 'major', source: 'agent' }
  const fields = { object, name, status: opts.status ?? (kind === 'run' ? 'done' : undefined), detail: opts.detail, file: opts.file, session: opts.session }
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== '' && v !== true) e[k] = String(v)
  return e
}

export const eventsPath = () => process.env.MOTIONDEV_FILE || path.join(process.env.MOTIONDEV_HOME || path.join(os.homedir(), '.motiondev'), 'events.jsonl')

export function append(e, file = eventsPath()) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.appendFileSync(file, JSON.stringify(e) + '\n')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  try {
    const e = eventFrom(process.argv.slice(2))
    append(e)
    console.log(`motiondev · ${e.scene}${e.object ? ' · ' + e.object : ''}${e.name ? ' ' + e.name : ''}${e.status ? ` (${e.status})` : ''}`)
  } catch (err) {
    console.error(`${err.message}\nUsage: node emit.mjs <scene> [object] [name...] [--status start|done|fail] [--detail text]`)
    process.exit(1)
  }
}
