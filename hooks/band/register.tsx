// The motiondev window (a pane the surface frames and docks) and the compact
// band above the prompt. Same classifier and art as the terminal watcher; no Node here.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Canvas } from './types'
import { classify } from '../../lib/classify.mjs'
import type { Event, EventFields } from '../../lib/events.mjs'
import { SCENES, initialState, makeEvent, parseLines, reduce } from '../../lib/events.mjs'
import { compose } from '../../lib/compose.mjs'
import { blueprint as blueprintText } from '../../lib/blueprint.mjs'
import type { Segment } from '../../lib/blueprint.mjs'
import { fit, glyph, label, sceneHex, verb } from '../../lib/pictograms.mjs'
import { gist, oneLine } from '../../lib/render.mjs'
import { blueprint as blueprintSvg, illustrate } from '../../lib/svg.mjs'

const PANE = 'motiondev'
const TITLE = 'motiondev'
const USAGE = 'usage: /motiondev [close|status|view action|view blueprint|band on|band off]'
// How far back a fresh window looks in the event file: narration made before the plugin loaded.
const REPLAY_MS = 2 * 60 * 60 * 1000

// Change the tag when Canvas changes shape: it declines what an earlier version stored.
const canvas = atom({ plugin: 'motiondev', key: 'canvas' } as const, initialState(), { shape: 'canvas-5' })
const isHidden = atom({ plugin: 'motiondev', key: 'isHidden' } as const, false)
// The person closed the window: no prompt reopens it until they ask with /motiondev.
const isClosed = atom({ plugin: 'motiondev', key: 'isClosed' } as const, false)
const details = atom({ plugin: 'motiondev', key: 'details' } as const, false)
// What the window draws: the blueprint of the whole build, or the pictogram of the current action.
const viewMode = atom({ plugin: 'motiondev', key: 'view' } as const, 'blueprint')

const SPIN = ['◐', '◓', '◑', '◒']
const FAIL = '#ff6b6b'

// A blueprint segment's tone as Text props: a scene name is its color, `fail` is red, `dim` and `bold` as they say.
function toneProps(seg: Segment) {
  const flags = seg.tone.split(' ')
  const scene = flags.find(f => SCENES.includes(f))
  return { color: flags.includes('fail') ? FAIL : scene ? sceneHex(scene) : undefined, dimColor: flags.includes('dim'), weight: flags.includes('bold') ? ('semibold' as const) : undefined }
}

async function apply($: EngineInterface, fields: EventFields | null, now: number) {
  if (!fields) return
  const e = makeEvent({ ...fields, source: fields.source ?? 'band' }, now)
  await update($, canvas, (s: Canvas | null) => reduce(s ?? initialState(), e))
}

// This session's events the hooks or the agent's narration wrote to disk before the window existed.
async function recorded($: EngineInterface, now: number, session: string): Promise<Event[]> {
  const file = (await $.env.get('MOTIONDEV_FILE')) ?? `${(await $.env.get('MOTIONDEV_HOME')) ?? `${(await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE')) ?? '~'}/.motiondev`}/events.jsonl`
  const text = await $.fs.read(file).catch(() => '')
  const recent = parseLines(text).filter(e => now - e.ts < REPLAY_MS && (!e.session || e.session === session))
  const lastStart = recent.map(e => e.kind === 'session').lastIndexOf(true)
  return recent.slice(lastStart + 1).slice(-200)
}

const clock = (ts: number) => {
  const d = new Date(ts)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':')
}

// What the canvas says right now, shared by the window, the band and /motiondev status.
function summary(s: Canvas) {
  const c = s.current
  const status = s.running ? 'start' : c.status
  const mark = s.running ? SPIN[s.seq % 4] : c.status === 'fail' ? '✗' : c.status === 'done' && c.object ? '✓' : ''
  const doing = c.object || c.scene !== 'idle' ? verb(c.object, c.scene, status) : 'waiting for the agent'
  return { c, status, mark, doing, detail: c.detail ?? '', file: c.file ?? '', color: sceneHex(c.scene) }
}

// The drawing of the current action: animated while it runs (frames advance with each event), else its last frame.
function drawing(s: Canvas, maxWidth: number) {
  const c = s.current
  const art = compose({ scene: c.scene, object: c.object, name: c.name, detail: c.detail, status: s.running ? '' : c.status, running: s.running }, { maxWidth })
  return art.frames[s.running ? s.seq % art.frames.length : art.frames.length - 1] ?? []
}

const openPane = ($: EngineInterface, focus?: true) =>
  $.ui.open(focus ? { id: PANE, title: TITLE, focus, rows: 18 } : { id: PANE, title: TITLE, rows: 18 }).catch(() => ({ isPlaced: false as const, reason: 'refused' }))

export const register: Register = (on, options) => {
  let cwd = ''

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    const now = await $.clock.now()
    const id = await $.session.id().catch(() => '')
    const held = await read($, canvas)
    // session.start fires again on a reload, an enable or a worker respawn: keep what this session built.
    const isFresh = !held || !held.project || held.session !== id
    if (isFresh) {
      await apply($, classify({ event: 'SessionStart', source: 'startup', cwd, session_id: id }), now)
      for (const ev of await recorded($, now, id)) await update($, canvas, (s: Canvas | null) => reduce(s ?? initialState(), ev))
    }
    if (options.details === true) await update($, details, () => true)
    await $.command.register({ name: 'motiondev', description: 'Open the motiondev window: what the agent is building, live', argumentHint: '[close|status|band on|band off]' }).catch(() => undefined)
    if (options.pane !== false) {
      // Opened even with no surface attached yet: the desktop app attaches after start and then places it.
      const opened = await openPane($)
      if (!opened.isPlaced && e.isInteractive && isFresh) $.ui.toast('motiondev: type /motiondev to open the window')
    }

    return next(e)
  })

  on('command.run', { command: 'motiondev' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ')
    const s = (await read($, canvas)) ?? initialState()
    if (arg === 'close') {
      await update($, isClosed, () => true)
      await $.ui.close({ id: PANE }).catch(() => undefined)
      return { text: 'motiondev window closed. /motiondev opens it again.' }
    }
    if (arg === 'view action' || arg === 'view blueprint') {
      const mode = arg.slice(5)
      await update($, viewMode, () => mode)
      return { text: mode === 'action' ? 'motiondev window shows the current action. /motiondev view blueprint shows the whole build.' : 'motiondev window shows the blueprint of the whole build. /motiondev view action shows the current action.' }
    }
    if (arg === 'band off') { await update($, isHidden, () => true); return { text: 'motiondev band hidden for this session. /motiondev band on shows it.' } }
    if (arg === 'band on') { await update($, isHidden, () => false); return { text: 'motiondev band shown.' } }
    if (arg === 'status') {
      const rows = s.ticker.slice(-6).map(ev => `${clock(ev.ts)} ${glyph(ev.object ?? ev.scene)} ${gist(ev)}`)
      return { text: [oneLine(s), `${s.shelf.length} built: ${s.shelf.map(o => `${glyph(o.object)} ${o.name || o.object}`).join('  ') || 'nothing yet'}`, ...rows].join('\n') }
    }
    if (arg !== '') return { text: USAGE }
    await update($, isClosed, () => false)
    const opened = await openPane($, true)
    return { text: opened.isPlaced ? 'motiondev window open. ctrl+x tab focuses it, /motiondev close closes it.' : `motiondev window is waiting for a surface to draw it (${opened.reason}). The band above the prompt and \`motiondev watch\` in a terminal show the same.` }
  })

  on('prompt.submit', async ($, e, next) => {
    // A slash command is not a turn of the agent.
    if (!e.isMeta && !e.command) {
      await apply($, classify({ event: 'UserPromptSubmit', prompt: e.text, cwd }), await $.clock.now())
      // A prompt the person entered is an asked open: the window is placed at any width, no command needed.
      if (options.pane !== false && !(await read($, isClosed))) await openPane($)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') await update($, isClosed, () => true)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const { tool, tool_use_id, agentId, consent, requestMeta, ...input } = e as Record<string, unknown> & { tool: string }
    await apply($, classify({ event: 'PreToolUse', tool, input, cwd }), await $.clock.now())
    const ran = await next(e)
    const record = typeof ran.result === 'object' && ran.result !== null ? (ran.result as Record<string, unknown>) : {}
    const response = ran.deny !== undefined ? { isError: true } : { ...record, isError: ran.isError === true }
    await apply($, classify({ event: 'PostToolUse', tool, input, response, cwd }), await $.clock.now())

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // A subagent's loop ends inside the main turn: only the main loop's end closes it.
    if (e.agentId === undefined) await apply($, classify({ event: 'Stop', cwd }), await $.clock.now())

    return next(e)
  })

  // The window: the pictogram (vector on remote surfaces, cells on the terminal), the caption,
  // the card of the object being made, the shelf of what was built, and the last events.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = (await read($, canvas)) ?? initialState()
    const { c, mark, doing, detail, file, color } = summary(s)
    const columns = e.props.bodyColumns
    // The pane's own room, never the screen's: the newest events must stay inside it.
    const bodyRows = e.props.scroll.bodyRows
    const { Box, Text } = $.ui.resolve(e)
    const head = (
      <Box flexDirection="row" gap={1}>
        <Text color={color} weight="semibold">{glyph(c.scene)} motiondev</Text>
        <Text dimColor>{s.project}{s.turns ? ` · turn ${s.turns}` : ''}{s.running ? ' · running' : ''}</Text>
      </Box>
    )
    const width = Math.max(12, columns - 30)
    const captionLines = [label(c.scene), `${mark ? `${mark} ` : ''}${doing}`, c.name, detail, file].filter(Boolean).length
    const caption = (
      <Box flexDirection="column">
        <Text color={color} weight="semibold">{label(c.scene)}</Text>
        <Text>{mark ? `${mark} ` : ''}{doing}</Text>
        {c.name ? <Text weight="semibold">{fit(c.name, width)}</Text> : null}
        {detail ? <Text dimColor>{fit(detail, width)}</Text> : null}
        {file ? <Text dimColor>{fit(file, width)}</Text> : null}
      </Box>
    )
    // A failed thing stays on the shelf as a red ghost until the retry lands.
    const chips = s.shelf.slice(-24).map(o => `${o.status === 'fail' ? '✗' : glyph(o.object)} ${fit(o.name || o.object, 20)}`)
    const shelfRows = chips.length ? Math.ceil((7 + chips.reduce((n, chip) => n + [...chip].length + 2, 0)) / Math.max(20, columns)) : 1
    const shelf = chips.length ? (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text dimColor>built</Text>
        {s.shelf.slice(-24).map((o, i) => <Text color={o.status === 'fail' ? FAIL : sceneHex(o.scene)}>{chips[i]}</Text>)}
      </Box>
    ) : <Text dimColor>nothing built yet</Text>
    const ticker = (rows: number) => (
      <Box flexDirection="column">
        {s.ticker.slice(-Math.max(2, rows)).map(ev => (
          <Text dimColor={ev.weight === 'minor'} color={ev.status === 'fail' ? FAIL : undefined} mono size="caption">
            {clock(ev.ts)} {glyph(ev.object ?? ev.scene)} {fit(gist(ev), Math.max(20, columns - 12))}
          </Text>
        ))}
      </Box>
    )

    if ((await read($, viewMode)) !== 'action') {
      // The blueprint: the whole build in its zones with the caret where the agent is, a two-line caption, the ticker.
      const brief = (
        <Box flexDirection="column">
          <Text><Text color={color} weight="semibold">{mark ? `${mark} ` : ''}{doing}</Text>{c.name ? ` ${fit(c.name, width)}` : ''}</Text>
          {detail || file ? <Text dimColor>{fit([detail, file].filter(Boolean).join(' · '), Math.max(12, columns - 2))}</Text> : null}
        </Box>
      )
      const briefRows = detail || file ? 2 : 1
      if (e.surface === 'terminal') {
        const map = blueprintText(s, { width: Math.max(20, columns - 2), height: Math.max(3, bodyRows - briefRows - 6), reveal: false })
        return (
          <Box flexDirection="column" paddingX={1} rowGap={1}>
            {head}
            <Box flexDirection="column">{map.lines.map(line => <Text mono>{line.map(seg => <Text {...toneProps(seg)}>{seg.text}</Text>)}</Text>)}</Box>
            {brief}
            {ticker(bodyRows - (1 + map.lines.length + briefRows + 3))}
          </Box>
        )
      }
      const { Svg } = $.ui.resolve(e)
      return (
        <Box flexDirection="column" paddingX={1} rowGap={1}>
          {head}
          <Svg source={blueprintSvg(s, { width: 400, height: 225 })} alt={`blueprint: ${s.shelf.length} built, ${doing}${c.name ? ' ' + c.name : ''}`} isInteractive />
          {brief}
          {ticker(bodyRows - 12 - briefRows)}
        </Box>
      )
    }

    if (e.surface === 'terminal') {
      const art = drawing(s, Math.min(40, Math.max(24, columns - 2)))
      const artWidth = [...(art[0] ?? '')].length
      const side = columns >= artWidth + 26
      const bodyHeight = side ? Math.max(art.length, captionLines) : art.length + captionLines
      // head, the drawing, the shelf, and the three gaps between them.
      const room = bodyRows - (1 + bodyHeight + shelfRows + 3)
      const picture = <Box flexDirection="column">{art.map(line => <Text color={color} mono>{line}</Text>)}</Box>
      return (
        <Box flexDirection="column" paddingX={1} rowGap={1}>
          {head}
          {side ? <Box flexDirection="row" columnGap={3}>{picture}{caption}</Box> : <Box flexDirection="column">{picture}{caption}</Box>}
          {shelf}
          {ticker(room)}
        </Box>
      )
    }

    const { Svg } = $.ui.resolve(e)
    const alt = `${label(c.scene)}: ${doing}${c.name ? ' ' + c.name : ''}${detail ? ', ' + detail : ''}`
    // No width on the element: the drawing takes its own 400 px, scaled down to the slot when the pane is narrower.
    const action = c.status !== 'done' && c.status !== 'fail'
    return (
      <Box flexDirection="column" paddingX={1} rowGap={1}>
        {head}
        <Svg source={illustrate({ scene: c.scene, object: c.object, name: c.name, detail, status: s.running ? '' : c.status, running: s.running || action }, { width: 400, height: 225 })} alt={alt} isInteractive />
        {caption}
        {shelf}
        {ticker(bodyRows - 12 - captionLines - shelfRows)}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || options.band === false || (await read($, isHidden))) return next(e)
    // Other mods share this slot: theirs goes under ours. next(e) rejects only when nothing answers beneath.
    const below = await next(e).catch(() => undefined)

    const s = (await read($, canvas)) ?? initialState()
    const open = await read($, details)
    const { c, mark, doing, detail, file, color } = summary(s)
    const columns = e.surface === 'terminal' ? e.props.bodyColumns : 100
    const shelf = s.shelf.slice(-8).map(o => `${o.status === 'fail' ? '✗' : glyph(o.object)} ${fit(o.name || o.object, 18)}`).join('  ')
    const showWindow = async () => {
      // A press is an asked open, placed at any width; the band holds the keys, so no focus.
      const r = await openPane($)
      if (!r.isPlaced) $.ui.toast(`motiondev: window not drawn (${r.reason})`)
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const row = (
      <Box flexDirection="row" gap={1}>
        <Text color={color} weight="semibold">{glyph(c.scene)} {label(c.scene)}</Text>
        <Text>{mark ? `${mark} ` : ''}{doing}{c.name ? ' ' : ''}{c.name ? <Text weight="semibold">{fit(c.name, 32)}</Text> : null}</Text>
        {detail ? <Text dimColor>{fit(detail, 24)}</Text> : null}
        {s.shelf.length > 0 ? <Text dimColor>· built {s.shelf.length}</Text> : null}
        {s.shelf.length > 0 && columns > 70 ? <Text dimColor>{fit(shelf, Math.max(12, columns - 70))}</Text> : null}
        <Button key="window" label="Window" onPress={showWindow} />
        <Button key="details" label={open ? 'Less' : 'More'} onPress={() => update($, details, v => !v)} />
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )

    let mine = row
    if (open) {
      const art = drawing(s, Math.min(40, Math.max(24, columns - 2))).slice(0, Math.max(1, e.props.maxRows - 2))
      mine = (
        <Box flexDirection="column">
          {row}
          <Box flexDirection="row" gap={3}>
            <Box flexDirection="column">{art.map(line => <Text color={color} mono>{line}</Text>)}</Box>
            {file ? <Text dimColor>{fit(file, 40)}</Text> : null}
          </Box>
        </Box>
      )
    }

    return below ? <Box flexDirection="column">{mine}{below}</Box> : mine
  }).catch(($, e, next) => next(e))
}
