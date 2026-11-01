// The thread from the person's request to what gets built: the prompt, then the
// plan the agent writes for itself (TodoWrite, the Task tools, the desktop app's
// plan list), the chapter the work is in, the recap when the request ends, and
// the guided tour of how one request crosses what was built.
// Pure: no I/O. The plan costs no token: the agent writes it anyway.
import { CHAPTERS, RECAP, TOUR } from './phrases.mjs'
import { roomOf, shown } from './map.mjs'
import { conceptOf } from './lessons.mjs'

export const initialStory = () => ({ prompt: '', steps: [], since: 0, ended: false })

const STATUS = { completed: 'done', done: 'done', in_progress: 'active', active: 'active', pending: 'todo', todo: 'todo' }
const norm = s => STATUS[s] ?? 'todo'
const title = s => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return [...t].length > 80 ? [...t].slice(0, 79).join('') + '…' : t }

// A new request starts a new thread.
export function withPrompt(story, text, now = 0) {
  return { prompt: title(text), steps: [], since: now, ended: false }
}

// The plan as the agent last wrote it, or the story unchanged when the call is not a plan.
export function withPlan(story, tool, input, result) {
  const i = input ?? {}
  if (tool === 'TodoWrite' && Array.isArray(i.todos)) {
    return { ...story, steps: i.todos.map(t => ({ title: title(t.content ?? t.activeForm), status: norm(t.status) })) }
  }
  // Task ids count across the whole session, so a step keeps the id TaskCreate answered with.
  const id = result?.task?.id
  if (tool === 'TaskCreate' && i.subject && id !== undefined) {
    return { ...story, steps: [...story.steps, { title: title(i.subject), status: 'todo', id: String(id) }] }
  }
  if (tool === 'TaskUpdate' && i.taskId !== undefined && i.status === 'deleted') return { ...story, steps: story.steps.filter(s => s.id !== String(i.taskId)) }
  if (tool === 'TaskUpdate' && i.taskId !== undefined && i.status) {
    return { ...story, steps: story.steps.map(s => (s.id === String(i.taskId) ? { ...s, status: norm(i.status) } : s)) }
  }
  if (/(^|__)update_plan$/.test(String(tool))) {
    if (Array.isArray(i.items)) return { ...story, steps: i.items.map(t => ({ title: title(t.content), status: norm(t.status) })) }
    let steps = story.steps
    if (i.advance) {
      const at = steps.findIndex(s => s.status === 'active')
      const nextAt = steps.findIndex((s, k) => k > at && s.status === 'todo')
      steps = steps.map((s, k) => (k === at ? { ...s, status: 'done' } : k === nextAt ? { ...s, status: 'active' } : s))
    }
    if (Array.isArray(i.done)) steps = steps.map((s, k) => (i.done.includes(k + 1) ? { ...s, status: 'done' } : s))
    if (typeof i.start === 'number') steps = steps.map((s, k) => (k === i.start - 1 ? { ...s, status: 'active' } : s))
    return { ...story, steps }
  }
  return story
}
export const isPlanTool = tool => tool === 'TodoWrite' || tool === 'TaskCreate' || tool === 'TaskUpdate' || /(^|__)update_plan$/.test(String(tool))

// "Step 2 of 5": the active step, else the first not done, else the last.
export function progress(steps) {
  if (!steps.length) return null
  let at = steps.findIndex(s => s.status === 'active')
  if (at < 0) at = steps.findIndex(s => s.status !== 'done')
  if (at < 0) at = steps.length - 1
  return { index: at + 1, total: steps.length, done: steps.filter(s => s.status === 'done').length }
}

// The chapter a moment belongs to: plan, scouting, building, tasting, recipe book, opening, end.
export function chapter(scene, { ended = false, locale = 'en' } = {}) {
  const c = CHAPTERS[locale] ?? CHAPTERS.en
  if (ended) return c.end
  if (scene === 'think') return c.think
  if (scene === 'explore') return c.explore
  if (scene === 'tests' || scene === 'git' || scene === 'infra') return c[scene]
  return scene === 'idle' || scene === 'shell' || scene === 'agents' ? '' : c.build
}

// The last test run's counts, read from the timeline.
export function checksOf(ticker) {
  const run = [...ticker].reverse().find(e => e.scene === 'tests' && (e.status === 'done' || e.status === 'fail'))
  if (!run) return null
  const passed = /(\d+) passed/.exec(run.detail ?? '')?.[1]
  const failed = /(\d+) failed/.exec(run.detail ?? '')?.[1]
  return { status: run.status, passed: passed ? Number(passed) : undefined, failed: failed ? Number(failed) : 0, detail: run.detail ?? '' }
}

const fill = (s, v) => String(s ?? '').replace(/\{(name|detail)\}/g, (_, k) => v[k] ?? '')
const known = (s, v) => [...String(s ?? '').matchAll(/\{(name|detail)\}/g)].every(m => v[m[1]])
// A [title, text, fallback] entry: the text falls back when its fields are unknown.
const words = (entry, v) => ({ title: fill(entry[0], v), text: known(entry[1], v) ? fill(entry[1], v) : fill(entry[2] ?? '', v) })
const frDetail = (d, locale) => (locale === 'fr' ? String(d ?? '').replace(/(\d+) passed/g, (_, n) => `${n} réussi${n === '1' ? '' : 's'}`).replace(/(\d+) failed/g, (_, n) => `${n} échoué${n === '1' ? '' : 's'}`) : String(d ?? ''))

// The guided tour: a visitor's request through what was built, then what keeps it safe.
// Each stop: { room, from, concept, title, text }.
export function tour(shelf, { level = 'beginner', locale = 'en', checks = null } = {}) {
  const t = (TOUR[locale] ?? TOUR.en)[level === 'beginner' ? 'beginner' : 'intermediate']
  const last = room => [...shelf].reverse().find(o => roomOf(o.scene) === room && (room !== 'api' || /route|endpoint/.test(o.object)))
  const stops = []
  let from = ''
  const add = (room, key, item, extra = {}) => {
    const v = { name: item ? shown(item) : '', detail: frDetail(extra.detail, locale) }
    stops.push({ room, from, concept: conceptOf(item?.scene ?? room) ?? conceptOf(room), ...words(t[key], v) })
    from = room
  }
  const door = last('auth'), screen = last('frontend'), order = last('api'), ledger = last('database')
  if (door) add('auth', 'auth', door)
  if (screen) add('frontend', 'frontend', screen)
  if (order) add('api', 'api', order)
  if (ledger && order) add('database', 'database', ledger)
  if (screen && order) { stops.push({ room: 'frontend', from, concept: 'interface', ...words(t.back, {}) }); from = 'frontend' }
  if (shelf.some(o => o.scene === 'tests') || checks) add('tests', 'tests', last('tests') ?? { scene: 'tests', object: 'test', name: '' }, { detail: checks?.status === 'done' ? checks.detail : '' })
  const save = [...shelf].reverse().find(o => o.scene === 'git' && o.object === 'commit')
  if (save) add('git', 'git', save)
  const safe = last('config')
  if (safe) add('config', 'config', safe)
  const supply = last('deps')
  if (supply) add('deps', 'deps', supply)
  if (shelf.some(o => o.scene === 'infra' && o.object === 'deploy')) { stops.push({ room: 'sign', from, concept: 'deploy', ...words(t.deploy, {}) }); from = 'sign' }
  // A tour needs a trip: one stop alone is just the live view again.
  return stops.length >= 2 ? stops : []
}

// What the app can do now: one line per notion built during this request.
export function recap(shelf, since, locale = 'en') {
  const r = RECAP[locale] ?? RECAP.en
  const lines = []
  const seen = new Set()
  for (const o of shelf.filter(x => x.ts >= since)) {
    const room = o.scene === 'infra' ? (o.object === 'deploy' ? 'deploy' : '') : o.scene === 'docs' || (o.scene === 'git' && o.object !== 'commit') ? '' : roomOf(o.scene)
    const key = room === 'api' && !/route|endpoint/.test(o.object) ? '' : room
    if (!r[key] || seen.has(key + (key === 'git' || key === 'tests' || key === 'config' || key === 'deploy' ? '' : o.name))) continue
    seen.add(key + (key === 'git' || key === 'tests' || key === 'config' || key === 'deploy' ? '' : o.name))
    lines.push(fill(r[key], { name: shown(o) }))
  }
  return { title: lines.length ? r.title : r.none, lines: lines.slice(0, 5), more: Math.max(0, lines.length - 5), empty: r.noneSub }
}
