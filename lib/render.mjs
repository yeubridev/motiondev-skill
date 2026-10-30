// Composes one text frame of the canvas: pictogram, caption, object card,
// shelf and ticker, squared to the box it is given. Pure: no I/O, no clock of its own.

import { glyph, label, verb, pictogram, objectCard, sceneColor, fit, toAscii } from './pictograms.mjs'

const ANSI = /\x1b\[[0-9;]*m/g
export const stripAnsi = s => s.replace(ANSI, '')
const cells = s => [...s].length
export const visibleWidth = s => cells(stripAnsi(s))
const pad = (s, w) => s + ' '.repeat(Math.max(0, w - visibleWidth(s)))
const clip = (s, w) => {
  if (visibleWidth(s) <= w) return s
  // Clip on visible cells, keeping escape codes, then close the color.
  let out = ''
  let seen = 0
  for (const piece of s.split(/(\x1b\[[0-9;]*m)/)) {
    if (piece.startsWith('\x1b[')) { out += piece; continue }
    for (const ch of piece) { if (seen >= w - 1) break; out += ch; seen++ }
  }
  return out + '…' + (s.includes('\x1b[') ? '\x1b[0m' : '')
}

const paint = on => ({
  fg: (s, n) => (on ? `\x1b[38;5;${n}m${s}\x1b[0m` : s),
  bold: s => (on ? `\x1b[1m${s}\x1b[22m` : s),
  dim: s => (on ? `\x1b[2m${s}\x1b[22m` : s),
})

const REVEAL_MS = 900
const SPIN = ['◐', '◓', '◑', '◒']
const SPIN_ASCII = ['|', '/', '-', '\\']

const clock = (ts, utc) => {
  const d = new Date(ts)
  const h = utc ? d.getUTCHours() : d.getHours()
  const m = utc ? d.getUTCMinutes() : d.getMinutes()
  const s = utc ? d.getUTCSeconds() : d.getSeconds()
  return [h, m, s].map(x => String(x).padStart(2, '0')).join(':')
}

const marker = (state, tick, ascii) => {
  if (state.running || state.current.status === 'start') return (ascii ? SPIN_ASCII : SPIN)[tick % 4]
  if (state.current.status === 'fail') return ascii ? 'x' : '✗'
  if (state.current.status === 'done') return ascii ? 'v' : '✓'
  return ''
}

// The gist of one event, for a ticker or a tail.
export function gist(e, { ascii = false } = {}) {
  const name = e.name ?? ''
  if (e.kind === 'session') return e.status === 'start' ? `session ${e.detail ?? ''}`.trim() : 'session ended'
  if (e.kind === 'turn') return e.status === 'start' ? `prompt: ${name}` : 'turn done'
  const where = e.file ? `${e.tool ?? ''} ${e.file}`.trim() : e.tool && e.tool !== 'Bash' ? e.tool : ''
  const what = e.object ? `${e.object}${name ? ' ' + name : ''}` : name
  const tail = [e.status === 'fail' ? 'failed' : e.status === 'start' ? 'started' : '', e.detail].filter(Boolean).join(' · ')
  const text = [where, what].filter(Boolean).join(ascii ? ' -> ' : ' → ') + (tail ? ` (${tail})` : '')
  return ascii ? toAscii(text) : text
}

export function tickerLine(e, { width = 80, ascii = false, color = false, utc = false } = {}) {
  const p = paint(color)
  const g = glyph(e.object ?? e.scene, { ascii })
  const head = `${clock(e.ts, utc)} ${p.fg(g, sceneColor(e.scene))} `
  const body = gist(e, { ascii })
  const text = e.weight === 'minor' ? p.dim(body) : e.status === 'fail' ? p.fg(body, 203) : body
  return clip(head + text, width)
}

// One line for a status bar: glyph, scene, object, name, how much is built, and whether it runs.
export function oneLine(state, { ascii = false } = {}) {
  const c = state.current
  const parts = [`${glyph(c.scene, { ascii })} ${c.scene}`]
  if (c.object) parts.push(c.object + (c.name ? ` "${fit(c.name, 40)}"` : ''))
  if (state.shelf.length) parts.push(`${state.shelf.length} built`)
  if (state.running) parts.push('running')
  else if (c.status === 'fail') parts.push(ascii ? 'FAILED' : '✗ failed')
  const line = parts.join(' · ')
  return ascii ? toAscii(line) : line
}

function shelfLines(state, width, ascii, p) {
  if (!state.shelf.length) return []
  const items = state.shelf.map(o => `${p.fg(glyph(o.object, { ascii }), sceneColor(o.scene))} ${ascii ? toAscii(fit(o.name || o.object, 24)) : fit(o.name || o.object, 24)}`)
  const lines = []
  let line = p.dim('built ') + ' '
  for (const item of items) {
    if (visibleWidth(line) + visibleWidth(item) + 2 > width) { lines.push(line); line = '       ' }
    line += item + '  '
  }
  lines.push(line)
  return lines.map(l => clip(l.trimEnd(), width))
}

// Exactly `height` lines of exactly `width` cells.
export function frame(state, { width = 80, height = 24, tick = 0, now = Date.now(), color = false, ascii = false, utc = false, reveal = true, footer = true } = {}) {
  const p = paint(color)
  const c = state.current
  const scene = c.scene
  const col = sceneColor(scene)
  const age = Math.max(0, now - (state.changedAt || 0))
  const art = pictogram(scene, { ascii })
  const animate = state.running || scene === 'idle' || scene === 'think' || age < 4000
  const frameIndex = animate ? tick % art.frames.length : 0
  const revealed = reveal && age < REVEAL_MS ? Math.ceil((art.height * age) / REVEAL_MS) : art.height
  const picture = art.frames[frameIndex].map((line, i) => (i < revealed ? p.fg(line, col) : ' '.repeat(art.width)))

  const title = `${p.bold(p.fg(ascii ? '*' : '◉', col))} ${p.bold('motiondev')}  ${state.project || ''}`.trimEnd()
  const right = [state.turns ? `turn ${state.turns}` : '', clock(now, utc)].filter(Boolean).join(' · ')
  const header = pad(title, Math.max(0, width - visibleWidth(right) - 1)) + ' ' + right

  const caption = []
  caption.push(p.bold(p.fg(ascii ? toAscii(label(scene)) : label(scene), col)))
  const m = marker(state, tick, ascii)
  const doing = c.object || scene !== 'idle' ? verb(c.object, scene, state.running ? 'start' : c.status) : 'waiting for the agent'
  const status = state.running ? '' : c.status === 'fail' ? 'failed' : c.status === 'done' && c.object ? 'done' : ''
  caption.push(`${m ? m + ' ' : ''}${doing}${status ? ' · ' + status : ''}`)
  if (c.name) caption.push(p.bold(ascii ? toAscii(fit(c.name, 40)) : fit(c.name, 40)))
  const last = state.ticker.at(-1)
  if (last && last.file && last.weight === 'major') caption.push(p.dim(fit(last.file, 40)))
  if (last && last.detail && last.weight === 'major') caption.push(p.dim(fit(last.detail, 40)))
  if (c.object && c.object !== 'read' && revealed >= art.height) {
    caption.push('')
    for (const line of objectCard(c.object, c.name, { ascii, maxWidth: 24 })) caption.push(p.fg(line, col))
  }

  const stacked = width < art.width + 30
  const body = []
  if (stacked) {
    for (const line of picture) body.push(line)
    for (const line of caption) body.push(line)
  } else {
    const rows = Math.max(picture.length, caption.length)
    for (let i = 0; i < rows; i++) body.push(`${picture[i] ?? ' '.repeat(art.width)}   ${caption[i] ?? ''}`)
  }

  const shelf = shelfLines(state, width, ascii, p)
  const tickerAll = state.ticker.map(e => tickerLine(e, { width, ascii, color, utc }))

  const lines = [header, '']
  for (const line of body) lines.push(line)
  const room = () => height - lines.length - 1
  if (shelf.length && room() >= shelf.length + 1) { lines.push(''); for (const line of shelf) lines.push(line) }
  if (room() >= 2) {
    lines.push('')
    const n = Math.min(tickerAll.length, room())
    for (const line of tickerAll.slice(tickerAll.length - n)) lines.push(line)
  }
  if (!footer) {
    while (lines.length < height) lines.push('')
    return lines.slice(0, height).map(line => pad(clip(line, width), width))
  }
  const foot = p.dim(ascii ? 'motiondev watch . q quits' : 'motiondev watch · q quits')
  while (lines.length < height - 1) lines.push('')
  const out = lines.slice(0, height - 1)
  out.push(foot)
  return out.map(line => pad(clip(line, width), width))
}
