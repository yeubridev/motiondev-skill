#!/usr/bin/env node
// motiondev: watch, tail, emit, demo, status, clear, path.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SCENES, makeEvent, reduce, initialState, parseLines } from '../lib/events.mjs'
import { OBJECTS, glyph } from '../lib/pictograms.mjs'
import { frame, oneLine, tickerLine, gist } from '../lib/render.mjs'
import { append, readAll, clear, eventsPath, fileSource } from '../hooks/store.mjs'

const HELP = `motiondev: see what your coding agent is building, live.

  motiondev watch     animated canvas of the current session (q quits, a toggles ascii, c clears)
  motiondev tail      one line per event, follows the file (--no-follow to stop)
  motiondev emit      <scene> [object] [name...] [--status start|done|fail] [--detail text] [--minor]
  motiondev demo      play the bundled scenario (--speed 2, --loop)
  motiondev status    one line for a status bar
  motiondev clear     empty the event file
  motiondev path      print the event file

Options: --ascii, --no-color, --fps 8, --utc, --once, --width N, --height N, --file PATH
Scenes: ${SCENES.join(', ')}
Events live in $MOTIONDEV_HOME/events.jsonl (default ~/.motiondev). MOTIONDEV=0 turns the hooks off.
`

function parseArgs(argv) {
  const opts = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--') { opts._.push(...argv.slice(i + 1)); break }
    if (a.startsWith('--')) {
      const [key, inline] = a.slice(2).split('=')
      if (key.startsWith('no-')) { opts[key.slice(3)] = false; continue }
      const takesValue = ['detail', 'status', 'kind', 'fps', 'file', 'width', 'height', 'speed', 'session'].includes(key)
      if (inline !== undefined) opts[key] = inline
      else if (takesValue && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) opts[key] = argv[++i]
      else opts[key] = true
    } else opts._.push(a)
  }
  return opts
}

const num = (v, d) => (v === undefined ? d : Number(v) || d)

function renderOpts(opts) {
  return {
    ascii: Boolean(opts.ascii),
    color: opts.color === false || process.env.NO_COLOR ? false : Boolean(process.stdout.isTTY),
    utc: Boolean(opts.utc),
  }
}

function emit(opts, out) {
  const [scene, maybeObject, ...rest] = opts._
  if (!scene || !SCENES.includes(scene)) {
    out.err(`unknown scene: ${scene ?? '(none)'}\nScenes: ${SCENES.join(', ')}\nUsage: motiondev emit <scene> [object] [name...] [--status start|done|fail] [--detail text]`)
    return 1
  }
  const known = new Set(Object.values(OBJECTS).flat())
  const object = maybeObject && known.has(maybeObject) ? maybeObject : undefined
  const name = (object ? rest : [maybeObject, ...rest]).filter(Boolean).join(' ')
  const runLike = new Set(['run', 'lint', 'query', 'server', 'agent', 'request', 'pipeline', 'deploy', 'bundle'])
  const kind = opts.kind ?? (opts.status === 'start' || (object && runLike.has(object)) ? 'run' : object ? 'object' : 'scene')
  const e = makeEvent({ kind, scene, object, name, status: opts.status ?? (kind === 'run' ? 'done' : undefined), detail: opts.detail, file: opts.file, weight: opts.minor ? 'minor' : undefined, source: 'agent', session: opts.session }, Date.now())
  append(e)
  out.log(`motiondev ${glyph(scene)} ${scene} · ${gist(e)}`)
  return 0
}

function replayed(events) {
  let state = initialState()
  for (const e of events) state = reduce(state, e)
  return state
}

// Plays a scenario on a clock: each line's `delay` is the pause before it, scaled by speed.
function scriptSource(lines, { speed = 1, loop = false } = {}) {
  let queue = []
  let at = 0
  const arm = () => {
    at = Date.now()
    queue = lines.map(l => { at += (l.delay ?? 800) / speed; return { at, fields: l } })
  }
  arm()
  return {
    initial: () => [],
    drain: () => lines.map((l, i) => makeEvent({ ...l, source: 'demo' }, Date.now() - (lines.length - i) * 1000)),
    poll: () => {
      const now = Date.now()
      const due = []
      while (queue.length && queue[0].at <= now) due.push(makeEvent({ ...queue.shift().fields, source: 'demo' }, now))
      if (!queue.length && loop) arm()
      return due
    },
    isLive: false,
  }
}

function scenario() {
  const file = new URL('../demo/scenario.jsonl', import.meta.url)
  return fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => JSON.parse(l))
}

function apply(state, events) {
  for (const e of events) state = e.reset ? initialState() : reduce(state, e)
  return state
}

async function watch(source, opts, out) {
  const ro = renderOpts(opts)
  const fps = Math.min(30, Math.max(1, num(opts.fps, 8)))
  const size = () => ({ width: num(opts.width, process.stdout.columns || 80), height: num(opts.height, process.stdout.rows || 24) })
  let state = apply(initialState(), source.initial())
  if (opts.once) {
    state = apply(state, source.drain())
    out.log(frame(state, { ...size(), ...ro, tick: 0, now: Date.now(), reveal: false }).join('\n'))
    return 0
  }
  if (!process.stdout.isTTY) {
    for (const e of state.ticker) out.log(tickerLine(e, { width: size().width, ...ro }))
    await new Promise(() => setInterval(() => { for (const e of source.poll()) { if (!e.reset) out.log(tickerLine(e, { width: size().width, ...ro })) } }, 250))
    return 0
  }
  let tick = 0
  let ascii = ro.ascii
  let last = size()
  const write = s => process.stdout.write(s)
  const draw = () => {
    const box = size()
    if (box.width !== last.width || box.height !== last.height) { write('\x1b[2J'); last = box }
    write('\x1b[H' + frame(state, { ...box, ...ro, ascii, tick, now: Date.now() }).join('\n'))
  }
  const leave = () => { write('\x1b[?25h\x1b[?1049l'); try { process.stdin.setRawMode(false) } catch { /* not a tty */ } process.exit(0) }
  write('\x1b[?1049h\x1b[?25l\x1b[2J')
  process.stdout.on('resize', draw)
  process.on('SIGINT', leave)
  process.on('SIGTERM', leave)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', key => {
      const k = key.toString()
      if (k === 'q' || k === '\u0003' || k === '\u001b') leave()
      if (k === 'a') { ascii = !ascii; write('\x1b[2J') }
      if (k === 'c') { state = initialState(); write('\x1b[2J') }
      draw()
    })
  }
  draw()
  setInterval(() => { state = apply(state, source.poll()); tick++; draw() }, Math.round(1000 / fps))
  await new Promise(() => {})
  return 0
}

async function tail(opts, out) {
  const ro = renderOpts(opts)
  const width = num(opts.width, process.stdout.columns || 80)
  const source = fileSource(opts.file || eventsPath())
  for (const e of source.initial()) if (!e.reset) out.log(tickerLine(e, { width, ...ro }))
  if (opts.follow === false) return 0
  await new Promise(() => setInterval(() => { for (const e of source.poll()) if (!e.reset) out.log(tickerLine(e, { width, ...ro })) }, 250))
  return 0
}

export async function main(argv, out = { log: s => console.log(s), err: s => console.error(s) }) {
  const opts = parseArgs(argv)
  const cmd = opts._.shift()
  if (!cmd || cmd === 'help' || opts.help) { out.log(HELP); return 0 }
  const file = opts.file || eventsPath()
  switch (cmd) {
    case 'emit': return emit(opts, out)
    case 'status': out.log(oneLine(replayed(readAll(file)), { ascii: Boolean(opts.ascii) })); return 0
    case 'clear': clear(file); return 0
    case 'path': out.log(file); return 0
    case 'tail': return tail(opts, out)
    case 'watch': return watch(fileSource(file), opts, out)
    case 'demo': return watch(scriptSource(scenario(), { speed: num(opts.speed, 1), loop: Boolean(opts.loop) }), opts, out)
    default: out.err(`unknown command: ${cmd}\n${HELP}`); return 1
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  main(process.argv.slice(2)).then(code => { if (code) process.exit(code) })
}
