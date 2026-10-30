// The motiondev window (a pane the surface frames and docks) and the compact
// band above the prompt. Same classifier and art as the terminal watcher; no Node here.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Canvas } from './types'
import { classify } from '../../lib/classify.mjs'
import type { Event, EventFields } from '../../lib/events.mjs'
import { initialState, makeEvent, parseLines, reduce } from '../../lib/events.mjs'
import { fit, glyph, label, objectCard, pictogram, sceneHex, verb } from '../../lib/pictograms.mjs'
import { gist, oneLine } from '../../lib/render.mjs'
import { illustrate } from '../../lib/svg.mjs'

const PANE = 'motiondev'
const TITLE = 'motiondev'
const USAGE = 'usage: /motiondev [close|status|band on|band off]'
// How far back a fresh window looks in the event file: narration made before the plugin loaded.
const REPLAY_MS = 2 * 60 * 60 * 1000

// Change the tag when Canvas changes shape: it declines what an earlier version stored.
const canvas = atom({ plugin: 'motiondev', key: 'canvas' } as const, initialState(), { shape: 'canvas-4' })
const isHidden = atom({ plugin: 'motiondev', key: 'isHidden' } as const, false)
const details = atom({ plugin: 'motiondev', key: 'details' } as const, false)

const SPIN = ['◐', '◓', '◑', '◒']

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

const frameOf = (s: Canvas, frames: number) => (s.running || s.current.scene === 'idle' || s.current.scene === 'think' ? s.seq % frames : 0)

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
    if (arg === 'close') { await $.ui.close({ id: PANE }).catch(() => undefined); return { text: 'motiondev window closed. /motiondev opens it again.' } }
    if (arg === 'band off') { await update($, isHidden, () => true); return { text: 'motiondev band hidden for this session. /motiondev band on shows it.' } }
    if (arg === 'band on') { await update($, isHidden, () => false); return { text: 'motiondev band shown.' } }
    if (arg === 'status') {
      const rows = s.ticker.slice(-6).map(ev => `${clock(ev.ts)} ${glyph(ev.object ?? ev.scene)} ${gist(ev)}`)
      return { text: [oneLine(s), `${s.shelf.length} built: ${s.shelf.map(o => `${glyph(o.object)} ${o.name || o.object}`).join('  ') || 'nothing yet'}`, ...rows].join('\n') }
    }
    if (arg !== '') return { text: USAGE }
    const opened = await openPane($, true)
    return { text: opened.isPlaced ? 'motiondev window open. ctrl+x tab focuses it, /motiondev close closes it.' : `motiondev window is waiting for a surface to draw it (${opened.reason}). The band above the prompt and \`motiondev watch\` in a terminal show the same.` }
  })

  on('prompt.submit', async ($, e, next) => {
    // A slash command is not a turn of the agent.
    if (!e.isMeta && !e.command) await apply($, classify({ event: 'UserPromptSubmit', prompt: e.text, cwd }), await $.clock.now())

    return next(e)
  }).catch(($, e, next) => next(e))

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
    const chips = s.shelf.slice(-24).map(o => `${glyph(o.object)} ${fit(o.name || o.object, 20)}`)
    const shelfRows = chips.length ? Math.ceil((7 + chips.reduce((n, chip) => n + [...chip].length + 2, 0)) / Math.max(20, columns)) : 1
    const shelf = chips.length ? (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text dimColor>built</Text>
        {s.shelf.slice(-24).map((o, i) => <Text color={sceneHex(o.scene)}>{chips[i]}</Text>)}
      </Box>
    ) : <Text dimColor>nothing built yet</Text>
    const ticker = (rows: number) => (
      <Box flexDirection="column">
        {s.ticker.slice(-Math.max(2, rows)).map(ev => (
          <Text dimColor={ev.weight === 'minor'} color={ev.status === 'fail' ? '#ff6b6b' : undefined} mono size="caption">
            {clock(ev.ts)} {glyph(ev.object ?? ev.scene)} {fit(gist(ev), Math.max(20, columns - 12))}
          </Text>
        ))}
      </Box>
    )

    if (e.surface === 'terminal') {
      const art = pictogram(c.scene)
      const card = c.object && c.object !== 'read' ? objectCard(c.object, c.name, { maxWidth: Math.min(26, Math.max(12, columns - art.width - 6)), detail }) : []
      const side = columns >= art.width + 30
      const bodyHeight = side ? Math.max(art.height, captionLines + (card.length ? card.length + 1 : 0)) : art.height + captionLines + card.length
      // head, the drawing, the shelf, and the three gaps between them.
      const room = bodyRows - (1 + bodyHeight + shelfRows + 3)
      const picture = <Box flexDirection="column">{(art.frames[frameOf(s, art.frames.length)] ?? []).map(line => <Text color={color} mono>{line}</Text>)}</Box>
      const cardBox = card.length ? <Box flexDirection="column">{card.map(line => <Text color={color} mono>{line}</Text>)}</Box> : null
      return (
        <Box flexDirection="column" paddingX={1} rowGap={1}>
          {head}
          {side ? <Box flexDirection="row" columnGap={3}>{picture}<Box flexDirection="column" rowGap={1}>{caption}{cardBox}</Box></Box> : <Box flexDirection="column">{picture}{caption}{cardBox}</Box>}
          {shelf}
          {ticker(room)}
        </Box>
      )
    }

    const { Svg } = $.ui.resolve(e)
    const svgWidth = Math.min(360, Math.max(240, Math.floor(columns * 4)))
    const alt = `${label(c.scene)}: ${doing}${c.name ? ' ' + c.name : ''}${detail ? ', ' + detail : ''}`
    return (
      <Box flexDirection="column" paddingX={1} rowGap={1}>
        {head}
        <Svg source={illustrate({ scene: c.scene, object: c.object, name: c.name, detail, status: c.status, running: s.running }, { width: svgWidth, height: Math.round(svgWidth * 9 / 16) })} alt={alt} width={svgWidth} isInteractive />
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
    const shelf = s.shelf.slice(-8).map(o => `${glyph(o.object)} ${fit(o.name || o.object, 18)}`).join('  ')
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
        {s.shelf.length ? <Text dimColor>· built {s.shelf.length}</Text> : null}
        {s.shelf.length && columns > 70 ? <Text dimColor>{fit(shelf, Math.max(12, columns - 70))}</Text> : null}
        <Button key="window" label="Window" onPress={showWindow} />
        <Button key="details" label={open ? 'Less' : 'More'} onPress={() => update($, details, v => !v)} />
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )

    let mine = row
    if (open) {
      const art = pictogram(c.scene)
      const card = c.object && c.object !== 'read' ? objectCard(c.object, c.name, { maxWidth: 24, detail }) : []
      const rowsRoom = Math.max(1, Math.min(art.height, e.props.maxRows - 2))
      mine = (
        <Box flexDirection="column">
          {row}
          <Box flexDirection="row" gap={3}>
            <Box flexDirection="column">
              {(art.frames[frameOf(s, art.frames.length)] ?? []).slice(0, rowsRoom).map(line => <Text color={color} mono>{line}</Text>)}
            </Box>
            <Box flexDirection="column">
              {file ? <Text dimColor>{fit(file, 40)}</Text> : null}
              {card.map(line => <Text color={color} mono>{line}</Text>)}
            </Box>
          </Box>
        </Box>
      )
    }

    return below ? <Box flexDirection="column">{mine}{below}</Box> : mine
  })
}
