// The blueprint: everything the agent has built so far, drawn in place and
// growing as the hooks see it, with a caret where the agent works now. Zones
// are boxes (frontend, backend, database, code), the rest are strips (tests,
// git, also), the prompt is the task line. `model` lays it out as data, shared
// with the vector drawing in svg.mjs; `blueprint` draws it as text. Pure: no
// I/O, no clock of its own. A text line is an array of segments { text, tone };
// `plain` joins them and the renderer paints the tones: a scene name for its
// color, `dim`, `bold`, `fail`.

import { glyph, toAscii } from './pictograms.mjs'
import { clean } from './compose.mjs'

export const TYPE_MS = 600
const MIN_BOX = 20
const MAX_BOX = 48
const NAME = 24
const BAR = 10
const SPIN = ['◐', '◓', '◑', '◒']
const SPIN_ASCII = ['|', '/', '-', '\\']

export const ZONES = [
  { id: 'frontend', scenes: ['frontend'], lead: 'frontend' },
  { id: 'backend', scenes: ['api', 'auth'], lead: 'api' },
  { id: 'database', scenes: ['database'], lead: 'database' },
  { id: 'code', scenes: ['code'], lead: 'code' },
]
export const STRIPS = [
  { id: 'tests', scenes: ['tests'], lead: 'tests' },
  { id: 'git', scenes: ['git'], lead: 'git' },
  { id: 'also', scenes: ['deps', 'infra', 'config', 'build', 'docs', 'agents'], lead: 'deps' },
]

const cells = s => [...s].length
const seg = (text, tone = '') => ({ text, tone })
export const plain = line => line.map(s => s.text).join('')
const width = line => line.reduce((n, s) => n + cells(s.text), 0)
const fit = (s, w) => (cells(s) > w ? [...s].slice(0, Math.max(0, w - 1)).join('') + '…' : s)
const head = (s, n) => [...s].slice(0, n).join('')
export const counts = detail => { const m = /(\d+) passed/.exec(detail ?? ''), f = /(\d+) failed/.exec(detail ?? ''); return m || f ? { passed: Number(m?.[1] ?? 0), failed: Number(f?.[1] ?? 0) } : null }

// ---------------------------------------------------------------- model
// Where the agent is: a zone, a strip or the task line, and whether the current thing is a run.
function locate(state) {
  const c = state.current
  const run = (state.runs ?? {})[`${c.scene}/${c.object}`]
  const isRun = Boolean(run && run.ts === c.ts && run.name === c.name)
  const zone = ZONES.find(z => z.scenes.includes(c.scene))
  const strip = STRIPS.find(z => z.scenes.includes(c.scene))
  return { key: `${c.scene}/${c.object}/${c.name}`, isRun, run, zone: zone?.id, strip: strip?.id, task: !zone && !strip }
}

// One drawn thing: a shelf item, a run, or the agent's current spot with nothing on the shelf yet.
function entryOf(o, { target = false, run = null } = {}) {
  const status = run ? run.status : o.status
  return { scene: o.scene, object: o.object, key: o.key, ts: run ? run.ts : o.ts, name: o.name || o.object || o.scene, detail: run ? run.detail ?? '' : '', status, running: status === 'start', failed: status === 'fail', isRun: Boolean(run), verdict: false, target, keep: target }
}
const spot = (state, target) => {
  const c = state.current
  return entryOf({ scene: c.scene, object: c.object, key: target.key, name: c.name || c.object, status: c.status, ts: c.ts }, { target: true, run: target.isRun ? target.run : null })
}

function zoneOf(def, state, target) {
  const items = (state.shelf ?? []).filter(o => def.scenes.includes(o.scene)).map(o => entryOf(o))
  if (target.zone === def.id) {
    const at = target.isRun ? -1 : items.findIndex(e => e.key === target.key)
    if (at >= 0) items[at] = { ...items[at], target: true, keep: true }
    else items.push(spot(state, target))
  }
  return { id: def.id, lead: def.lead, items }
}

function stripOf(def, state, target) {
  const runs = Object.values(state.runs ?? {}).filter(r => def.scenes.includes(r.scene))
  const entries = (state.shelf ?? []).filter(o => def.scenes.includes(o.scene)).map(o => entryOf(o))
  const ofRun = r => entryOf({ scene: r.scene, object: r.object, key: `${r.scene}/${r.object}/${r.name}`, name: r.name, ts: r.ts }, { run: r })
  // The suite's last run leads the tests strip, with its verdict; the "also" strip keeps every run it saw.
  if (def.id === 'tests' && runs.length) entries.unshift({ ...ofRun(runs.reduce((a, b) => (b.ts > a.ts ? b : a))), verdict: true, keep: true })
  if (def.id === 'also') {
    for (const r of runs) if (!entries.some(e => e.scene === r.scene && e.object === r.object && e.name === r.name)) entries.push(ofRun(r))
    entries.sort((a, b) => a.ts - b.ts)
  }
  if (target.strip === def.id) {
    const c = state.current
    const at = entries.findIndex(e => (target.isRun ? e.isRun && e.scene === c.scene && e.object === c.object : e.key === target.key))
    if (at >= 0) entries[at] = { ...entries[at], target: true, keep: true }
    else entries.push(spot(state, target))
  }
  return { id: def.id, lead: def.lead, entries }
}

function taskOf(state, target) {
  const c = state.current
  const text = c.scene === 'think' && c.name ? c.name : state.task ?? ''
  if (!text && !target.task) return null
  return { text, target: target.task, running: target.task && target.isRun && target.run.status === 'start' }
}

// The layout as data: the task line, the zones that hold something, the strips that hold something.
export function model(state) {
  const target = locate(state)
  return {
    task: taskOf(state, target),
    zones: ZONES.map(z => zoneOf(z, state, target)).filter(z => z.items.length),
    strips: STRIPS.map(s => stripOf(s, state, target)).filter(s => s.entries.length),
  }
}

// ---------------------------------------------------------------- text
// Exactly `w` cells: clipped with an ellipsis, then padded; same-tone cells regrouped.
function squeeze(line, w) {
  if (w <= 0) return []
  const cs = []
  for (const s of line) for (const ch of s.text) cs.push([ch, s.tone])
  const out = cs.length > w ? [...cs.slice(0, w - 1), ['…', cs[w - 1][1]]] : cs
  while (out.length < w) out.push([' ', ''])
  const segs = []
  for (const [ch, tone] of out) {
    if (segs.length && segs[segs.length - 1].tone === tone) segs[segs.length - 1].text += ch
    else segs.push(seg(ch, tone))
  }
  return segs
}

// The name of the thing under the caret, typed in letter by letter when it just landed.
export function typed(name, ts, { now = 0, reveal = true } = {}) {
  const age = now - (ts ?? 0)
  if (!reveal || !(age >= 0 && age < TYPE_MS)) return { text: name, typing: false }
  return { text: head(name, Math.max(1, Math.ceil((cells(name) * age) / TYPE_MS))), typing: true }
}
const caret = (ctx, lead, typing) => seg(typing || ctx.caretOn ? '▌' : ' ', `${lead} bold`)
const spinner = ctx => (ctx.ascii ? SPIN_ASCII : SPIN)[ctx.tick % 4]
// A written test is an empty box, not a check: the check is for a run that passed.
const g = (key, ctx) => (key === 'test' ? (ctx.ascii ? '_' : '□') : glyph(key, { ascii: ctx.ascii }))
const name = (s, ctx) => clean(s, { ascii: ctx.ascii })

// glyph, name, a spinner or mark for runs, the caret when the agent is here.
function drawEntry(e, ctx, lead, room) {
  const { text, typing } = e.target ? typed(name(e.name, ctx), e.ts, ctx) : { text: name(e.name, ctx), typing: false }
  const tone = e.failed ? 'fail' : ''
  if (e.verdict) {
    // While the name types in, the caret follows the letters; the verdict comes once the name is whole.
    if (typing) return [seg(g(e.object, ctx), e.scene), seg(' ' + fit(text, NAME), 'bold'), caret(ctx, lead, true)]
    const verdict = e.failed ? 'fail' : lead
    const words = e.running ? 'running' : e.detail || (e.failed ? 'failed' : 'passed')
    const segs = [seg(g(e.object, ctx), e.scene), seg(' ' + fit(text, NAME)), seg('  ' + (e.running ? spinner(ctx) : e.failed ? '✗' : '✓') + ' ', verdict), seg(fit(name(words, ctx), room), verdict)]
    const c = counts(e.detail)
    if (c && !e.running) {
      const k = Math.round((BAR * c.passed) / Math.max(1, c.passed + c.failed))
      segs.push(seg('  ' + '▓'.repeat(k), lead), seg('░'.repeat(BAR - k), 'dim'))
    }
    if (e.target) segs.push(caret(ctx, lead, typing))
    return segs
  }
  const mark = e.isRun ? (e.running ? ' ' + spinner(ctx) : e.failed ? '' : ' ✓') : ''
  const n = fit(text, Math.max(1, room - cells(mark) - (e.target ? 1 : 0)))
  const segs = [seg(e.failed ? '✗' : e.object ? g(e.object, ctx) : '·', tone || e.scene), seg(' '), seg(n, tone || (e.target ? 'bold' : ''))]
  if (mark) segs.push(seg(mark, e.failed ? 'fail' : lead))
  if (e.target) segs.push(caret(ctx, lead, typing))
  return segs
}

function box(zone, boxW, inner, ctx) {
  const isTarget = zone.items.some(e => e.target)
  const border = isTarget ? zone.lead : 'dim'
  const shown = zone.items.slice(-inner)
  const over = zone.items.length - shown.length
  const label = fit(` ${zone.id}${over ? ' +' + over : ''} `, Math.max(1, boxW - 5))
  const lines = [[seg('┌─ ', border), seg(g(zone.lead, ctx), zone.lead), seg(label, isTarget ? `${zone.lead} bold` : 'dim'), seg('─'.repeat(Math.max(0, boxW - 5 - cells(label))) + '┐', border)]]
  for (let i = 0; i < inner; i++) {
    const body = shown[i] ? drawEntry(shown[i], ctx, zone.lead, boxW - 6) : [seg(' ')]
    lines.push([seg('│ ', border), ...squeeze(body, boxW - 4), seg(' │', border)])
  }
  lines.push([seg('└' + '─'.repeat(boxW - 2) + '┘', border)])
  return lines
}

function stripLine(strip, ctx) {
  const entries = [...strip.entries]
  const label = [seg(g(strip.lead, ctx), strip.lead), seg(' ' + strip.id, strip.lead)]
  const draw = () => entries.map(e => drawEntry(e, ctx, strip.lead, NAME))
  // Too wide: the oldest things go first, an ellipsis marks where they were; the caret's thing always stays.
  let dropAt = -1
  let parts = draw()
  const total = () => width(label) + parts.reduce((n, p) => n + 2 + width(p), 0) + (dropAt >= 0 ? 3 : 0)
  while (total() > ctx.width && entries.some(e => !e.keep)) {
    dropAt = entries.findIndex(e => !e.keep)
    entries.splice(dropAt, 1)
    parts = draw()
  }
  const line = [...label]
  parts.forEach((p, i) => {
    if (i === dropAt) line.push(seg('  …', 'dim'))
    line.push(seg('  '), ...p)
  })
  if (dropAt === parts.length) line.push(seg('  …', 'dim'))
  return line
}

function taskLine(task, ctx) {
  if (!task.text) return [caret(ctx, 'think', false), seg(' waiting for the agent', 'dim')]
  const line = [seg(g('think', ctx) + ' ', 'think'), seg(fit(name(task.text, ctx), Math.max(1, ctx.width - 4)))]
  if (task.target) {
    if (task.running) line.push(seg(' ' + spinner(ctx), 'think'))
    line.push(caret(ctx, 'think', false))
  }
  return line
}

export function blueprint(state, { width: W = 80, height: H = 24, tick = 0, now = 0, ascii = false, reveal = true } = {}) {
  const ctx = { width: W, tick, now, ascii, reveal, caretOn: tick % 8 < 6 }
  const { task, zones, strips } = model(state)

  // Room: boxes first (three lines each), then the task line, then the strips, then the boxes grow to their items.
  const cols = Math.max(1, Math.min(zones.length || 1, Math.floor((W + 1) / (MIN_BOX + 1))))
  const boxW = Math.min(MAX_BOX, Math.floor((W - (cols - 1)) / cols))
  const rows = []
  for (let i = 0; i < zones.length; i += cols) rows.push(zones.slice(i, i + cols))
  let avail = H
  while (rows.length && rows.length * 3 > avail) rows.pop()
  const inner = rows.map(() => 1)
  avail -= rows.length * 3
  const showTask = Boolean(task) && avail >= 1
  if (showTask) avail--
  const shownStrips = []
  for (const s of strips) if (avail >= 1) { shownStrips.push(s); avail-- }
  for (let grew = true; grew && avail > 0;) {
    grew = false
    rows.forEach((row, r) => {
      if (avail > 0 && inner[r] < Math.max(...row.map(z => z.items.length))) { inner[r]++; avail--; grew = true }
    })
  }

  const lines = []
  if (showTask) lines.push(taskLine(task, ctx))
  rows.forEach((row, r) => {
    const boxes = row.map(z => box(z, boxW, inner[r], ctx))
    for (let i = 0; i < boxes[0].length; i++) lines.push(boxes.flatMap((b, k) => (k ? [seg(' '), ...b[i]] : b[i])))
  })
  for (const s of shownStrips) lines.push(stripLine(s, ctx))
  if (!lines.length) lines.push(task ? taskLine(task, ctx) : [caret(ctx, 'think', false), seg(' waiting for the agent', 'dim')])

  const out = lines.slice(0, H).map(line => squeeze(line, W))
  return { lines: ascii ? out.map(line => line.map(s => seg(toAscii(s.text), s.tone))) : out, width: W, height: out.length }
}
