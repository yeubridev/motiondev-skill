// The motiondev event protocol: what a hook, the agent or a demo writes, and
// how a reader folds those lines into one canvas state.
// Pure: no I/O, no Node globals. The Claude Code band imports it in a sandbox.

export const SCENES = [
  'database', 'api', 'frontend', 'tests', 'git', 'deps', 'infra', 'config',
  'docs', 'auth', 'build', 'agents', 'explore', 'shell', 'think', 'code', 'idle',
]

export const KINDS = ['session', 'turn', 'scene', 'object', 'run', 'note']

// Scenes that never move the main pictogram by themselves.
const MINOR = new Set(['explore', 'shell'])

const TICKER = 12
const SHELF = 40

export function makeEvent(fields, ts) {
  const scene = fields.scene ?? 'idle'
  if (!SCENES.includes(scene)) throw new Error(`unknown scene: ${scene}`)
  const kind = fields.kind ?? 'scene'
  if (!KINDS.includes(kind)) throw new Error(`unknown kind: ${kind}`)
  const weight = fields.weight ?? (MINOR.has(scene) ? 'minor' : 'major')
  const event = { ts: ts ?? Date.now(), kind, scene, weight, source: fields.source ?? 'hook' }
  for (const key of ['object', 'name', 'status', 'tool', 'file', 'detail', 'session']) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') event[key] = String(fields[key])
  }
  return event
}

export function parseLines(text) {
  const events = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const e = JSON.parse(trimmed)
      if (e && typeof e === 'object' && typeof e.ts === 'number' && SCENES.includes(e.scene)) events.push(e)
    } catch { /* a torn or foreign line: skip it */ }
  }
  return events
}

export function initialState() {
  return {
    project: '',
    session: '',
    task: '',
    current: { scene: 'idle', object: '', name: '', status: '', detail: '', file: '', ts: 0 },
    shelf: [],
    runs: {},
    ticker: [],
    running: false,
    turns: 0,
    changedAt: 0,
    seq: 0,
  }
}

// A detail worth keeping on the shelf: the columns of a table, not the word "edit".
const informative = d => Boolean(d) && d !== 'edit'

export function reduce(state, e) {
  if (e.kind === 'session' && e.status === 'start') {
    return { ...initialState(), project: e.detail ?? '', session: e.session ?? '', current: { scene: 'idle', object: '', name: '', status: 'start', detail: '', file: '', ts: e.ts }, changedAt: e.ts }
  }
  const next = { ...state, ticker: [...state.ticker, e].slice(-TICKER), seq: (state.seq ?? 0) + 1 }
  if (e.kind === 'turn') {
    next.running = false
    if (e.status === 'start') { next.turns = state.turns + 1; next.task = e.name ?? '' } else {
      // A finished turn keeps the last scene on screen and only badges it.
      next.current = { ...state.current, status: state.current.status === 'fail' ? 'fail' : e.status ?? 'done', ts: e.ts }
      return next
    }
  }
  if (e.kind === 'run' && e.status === 'start') next.running = true
  if (e.status === 'done' || e.status === 'fail') next.running = false
  if (e.kind === 'run' && e.object) {
    next.runs = { ...state.runs, [`${e.scene}/${e.object}`]: { scene: e.scene, object: e.object, name: e.name ?? '', status: e.status ?? 'done', detail: e.detail ?? '', ts: e.ts } }
  }
  if (e.kind === 'object' && e.object) {
    // A failure joins as a ghost under the same key, so the retry lands where the failure was.
    const key = `${e.scene}/${e.object}/${e.name ?? ''}`
    const status = e.status === 'fail' ? 'fail' : 'done'
    const at = state.shelf.findIndex(o => o.key === key)
    if (at < 0) next.shelf = [...state.shelf, { key, scene: e.scene, object: e.object, name: e.name ?? '', detail: informative(e.detail) ? e.detail : '', status, ts: e.ts }].slice(-SHELF)
    else {
      const was = state.shelf[at]
      next.shelf = state.shelf.map((o, i) => (i === at ? { ...was, status, detail: informative(e.detail) ? e.detail : was.detail, ts: e.ts } : o))
    }
  }
  if (e.weight === 'major') {
    const sceneChanged = state.current.scene !== e.scene
    next.current = { scene: e.scene, object: e.object ?? '', name: e.name ?? '', status: e.status ?? '', detail: e.detail ?? '', file: e.file ?? '', ts: e.ts }
    if (sceneChanged) next.changedAt = e.ts
  }
  return next
}

export function replay(events, state = initialState()) {
  return events.reduce(reduce, state)
}
