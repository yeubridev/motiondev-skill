// What the moment on screen means, worded for the level of the person watching.
// Pure: no I/O, no Node globals (the mod imports it in a sandbox).
import { PHRASES, UI } from './phrases.mjs'

export const LEVELS = ['beginner', 'intermediate', 'advanced', 'dev']

const SCENE_LABEL = {
  database: 'database', api: 'api', frontend: 'ui', tests: 'tests', git: 'git', deps: 'deps', infra: 'infra',
  config: 'config', docs: 'docs', auth: 'auth', build: 'build', agents: 'agents', explore: 'explore',
  shell: 'shell', think: 'think', code: 'code', idle: 'idle',
}

export const localeOf = lang => (/^fr/i.test(String(lang ?? '')) ? 'fr' : 'en')
export const ui = locale => UI[locale] ?? UI.en

const cut = (s, n) => { const a = [...String(s ?? '')]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join('') }
const base = file => String(file ?? '').split('/').pop()
// A line whose every field is empty says nothing: it is dropped.
const fill = (s, v) => {
  const keys = [...String(s).matchAll(/\{(name|detail)\}/g)].map(m => m[1])
  if (keys.length && keys.every(k => !v[k])) return ''
  return String(s).replace(/\{(name|detail)\}/g, (_, k) => v[k] ?? '')
}
const bare = s => String(s).replace(/\s*[:«“]?\s*\{(name|detail)\}\s*[»”]?/g, ' ').replace(/\s+/g, ' ').trim()
// A detail like "id, email, password_hash" becomes chips.
export const chipsOf = detail => String(detail ?? '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).slice(0, 6).map(x => cut(x, 24))

// The phrase for a moment: the most specific key first, the scene's honest fallback last.
function phrase(table, c) {
  const { scene, object, status } = c
  const keys = [`${scene}/${object}`, object]
  if (status === 'done' || status === 'fail') keys.unshift(`${object}/${status}`)
  for (const k of keys) if (k && table[k]) return table[k]
  return table[scene] ?? table.file
}

// { title, subtitle, chips, mono }: one line to read, one line to understand, what it holds.
export function explain(c, { level = 'intermediate', locale = 'en' } = {}) {
  const current = { scene: 'idle', object: '', name: '', detail: '', status: '', file: '', tool: '', ...c }
  if (current.detail === 'edit') current.detail = ''
  const v = { name: cut(current.name, 48), detail: cut(current.detail, 48) }
  if (level === 'dev') {
    const target = current.file || current.name
    const kind = current.scene === 'idle' ? 'idle' : [current.scene, current.object].filter(Boolean).join('/')
    return { title: `${kind} ${cut(target, 60)}`.trim(), subtitle: [current.status, current.detail].filter(Boolean).join(' · '), chips: [], mono: true }
  }
  if (level === 'advanced') {
    const what = [current.object, current.name].filter(Boolean).join(' ')
    return { title: `${SCENE_LABEL[current.scene] ?? current.scene}${what ? ' · ' + cut(what, 48) : ''}`, subtitle: current.file || '', chips: chipsOf(current.detail), mono: false }
  }
  // Test counts come from the runner in English; the first two levels read them in their own words.
  if (locale === 'fr') v.detail = v.detail.replace(/(\d+) passed/g, (_, n) => `${n} réussi${n === '1' ? '' : 's'}`).replace(/(\d+) failed/g, (_, n) => `${n} échoué${n === '1' ? '' : 's'}`)
  const words = PHRASES[locale] ?? PHRASES.en
  const table = words[level] ?? words.intermediate
  const scene = current.scene === 'idle' ? { ...current, object: 'idle' } : current
  const [t, s, fallback] = phrase(table, scene)
  // A table's columns and a run's counts read better as chips than in the sentence.
  const chips = ['table', 'migration', 'seed', 'index'].includes(current.object) ? chipsOf(current.detail) : []
  return { title: fill(t, v) || bare(t), subtitle: fill(s, v) || (fallback ? fill(fallback, v) : ''), chips, mono: false }
}

// One line per event for the dev timeline: time, tool, target, outcome.
export function row(ev) {
  const d = new Date(ev.ts)
  const time = [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':')
  const target = ev.file ? base(ev.file) : ev.name ?? ''
  const outcome = ev.status === 'fail' ? 'fail' : ev.detail ? cut(ev.detail, 24) : ev.status === 'done' ? 'ok' : ''
  // mcp__server__tool reads as its last part; the server is noise in a ten-column gutter.
  const tool = String(ev.tool ?? ev.kind).split('__').pop()
  return { time, tool, target: cut(target, 40), outcome, isFail: ev.status === 'fail' }
}

// The timeline without its echoes: the agent's own plan updates, and a start shown again by its result.
export function timeline(ticker) {
  const rows = ticker.filter(ev => !/(^|__)update_plan$|^(TodoWrite|TaskCreate|TaskUpdate)$/.test(String(ev.tool ?? '')))
  return rows.filter((ev, i) => !(ev.status === 'start' && rows.slice(i + 1).some(n => n.tool === ev.tool && n.name === ev.name && (n.status === 'done' || n.status === 'fail'))))
}
