// The motiondev window (a pane the surface frames and docks) and the compact
// band above the prompt. Same classifier and art as the terminal watcher; no Node here.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Canvas } from './types'
import { classify } from '../../lib/classify.mjs'
import type { Event, EventFields } from '../../lib/events.mjs'
import { initialState, makeEvent, reduce } from '../../lib/events.mjs'
import { fit, glyph, label, objectCard, pictogram, sceneHex, verb } from '../../lib/pictograms.mjs'
import { gist, oneLine } from '../../lib/render.mjs'
import { illustrate } from '../../lib/svg.mjs'

const PANE = 'motiondev'
const TITLE = 'motiondev'

// Change the tag when Canvas changes shape: it declines what an earlier version stored.
const canvas = atom({ plugin: 'motiondev', key: 'canvas' } as const, initialState(), { shape: 'canvas-2' })
const isHidden = atom({ plugin: 'motiondev', key: 'isHidden' } as const, false)
const details = atom({ plugin: 'motiondev', key: 'details' } as const, false)

const SPIN = ['◐', '◓', '◑', '◒']

async function apply($: EngineInterface, fields: EventFields | null, now: number) {
  if (!fields) return
  const e = makeEvent({ ...fields, source: 'band' }, now)
  await update($, canvas, (s: Canvas | null) => reduce(s ?? initialState(), e))
}

const clock = (ts: number) => {
  const d = new Date(ts)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(x => String(x).padStart(2, '0')).join(':')
}

// What the canvas says right now, shared by the pane, the band and /motiondev status.
function summary(s: Canvas) {
  const c = s.current
  const status = s.running ? 'start' : c.status
  const mark = s.running ? SPIN[s.ticker.length % 4] : c.status === 'fail' ? '✗' : c.status === 'done' && c.object ? '✓' : ''
  const doing = c.object || c.scene !== 'idle' ? verb(c.object, c.scene, status) : 'waiting for the agent'
  const last = s.ticker[s.ticker.length - 1]
  const detail = last && last.weight === 'major' ? last.detail ?? '' : ''
  const file = last && last.weight === 'major' ? last.file ?? '' : ''
  return { c, status, mark, doing, detail, file, color: sceneHex(c.scene) }
}

const openPane = ($: EngineInterface, focus?: true) =>
  $.ui.open(focus ? { id: PANE, title: TITLE, focus, rows: 18 } : { id: PANE, title: TITLE, rows: 18 }).catch(() => ({ isPlaced: false as const, reason: 'refused' }))

export const register: Register = (on, options) => {
  let cwd = ''

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    const now = await $.clock.now()
    await update($, canvas, () => initialState())
    await apply($, classify({ event: 'SessionStart', source: 'startup', cwd }), now)
    if (options.details === true) await update($, details, () => true)
    await $.command.register({ name: 'motiondev', description: 'Open the motiondev window: what the agent is building, live', argumentHint: '[close|status|band on|band off]' }).catch(() => undefined)
    if (options.pane !== false && e.surface !== null) {
      // Unasked, a pane is drawn only on a wide surface; the person's /motiondev places it anywhere.
      const opened = await openPane($)
      if (!opened.isPlaced && e.isInteractive) $.ui.toast('motiondev: type /motiondev to open the window')
    }

    return next(e)
  })

  on('command.run', { command: 'motiondev' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const s = (await read($, canvas)) ?? initialState()
    if (arg === 'close') { await $.ui.close({ id: PANE }).catch(() => undefined); return { text: 'motiondev window closed. /motiondev opens it again.' } }
    if (arg === 'band off') { await update($, isHidden, () => true); return { text: 'motiondev band hidden for this session. /motiondev band on shows it.' } }
    if (arg === 'band on') { await update($, isHidden, () => false); return { text: 'motiondev band shown.' } }
    if (arg === 'status') {
      const rows = s.ticker.slice(-6).map(ev => `${clock(ev.ts)} ${glyph(ev.object ?? ev.scene)} ${gist(ev)}`)
      return { text: [oneLine(s), `${s.shelf.length} built: ${s.shelf.map(o => `${glyph(o.object)} ${o.name || o.object}`).join('  ') || 'nothing yet'}`, ...rows].join('\n') }
    }
    const opened = await openPane($, true)
    return { text: opened.isPlaced ? 'motiondev window open. ctrl+x tab focuses it, /motiondev close closes it.' : `motiondev window is waiting for a surface to draw it (${opened.reason}). The band above the prompt and \`motiondev watch\` in a terminal show the same.` }
  })

  on('prompt.submit', async ($, e, next) => {
    if (!e.isMeta) await apply($, classify({ event: 'UserPromptSubmit', prompt: e.text, cwd }), await $.clock.now())

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
    await apply($, classify({ event: 'Stop', cwd }), await $.clock.now())

    return next(e)
  })

  // The window: the pictogram (vector on remote surfaces, cells on the terminal), the caption,
  // the card of the object being made, the shelf of what was built, and the last events.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = (await read($, canvas)) ?? initialState()
    const { c, mark, doing, detail, file, color } = summary(s)
    const columns = e.props.bodyColumns
    const rows = e.viewport?.rows ?? e.props.scroll.bodyRows
    const { Box, Text } = $.ui.resolve(e)
    const head = (
      <Box flexDirection="row" gap={1}>
        <Text color={color} bold>{glyph(c.scene)} motiondev</Text>
        <Text dimColor>{s.project}{s.turns ? ` · turn ${s.turns}` : ''}{s.running ? ' · running' : ''}</Text>
      </Box>
    )
    const caption = (
      <Box flexDirection="column">
        <Text color={color} bold>{label(c.scene)}</Text>
        <Text>{mark ? `${mark} ` : ''}{doing}</Text>
        {c.name ? <Text bold>{fit(c.name, Math.max(12, columns - 30))}</Text> : null}
        {detail ? <Text dimColor>{fit(detail, Math.max(12, columns - 30))}</Text> : null}
        {file ? <Text dimColor>{fit(file, Math.max(12, columns - 30))}</Text> : null}
      </Box>
    )
    const shelf = s.shelf.length ? (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text dimColor>built</Text>
        {s.shelf.slice(-24).map(o => <Text color={sceneHex(o.scene)}>{glyph(o.object)} {fit(o.name || o.object, 20)}</Text>)}
      </Box>
    ) : <Text dimColor>nothing built yet</Text>
    const tickerRows = Math.max(2, rows - (e.surface === 'terminal' ? 12 : 14))
    const ticker = (
      <Box flexDirection="column">
        {s.ticker.slice(-tickerRows).map(ev => (
          <Text dimColor={ev.weight === 'minor'} color={ev.status === 'fail' ? '#ff6b6b' : undefined} mono size="caption">
            {clock(ev.ts)} {glyph(ev.object ?? ev.scene)} {fit(gist(ev), Math.max(20, columns - 12))}
          </Text>
        ))}
      </Box>
    )

    if (e.surface === 'terminal') {
      const art = pictogram(c.scene)
      const frameIndex = s.running || c.scene === 'idle' || c.scene === 'think' ? s.ticker.length % art.frames.length : 0
      const card = c.object && c.object !== 'read' ? objectCard(c.object, c.name, { maxWidth: Math.min(26, Math.max(12, columns - art.width - 6)) }) : []
      const side = columns >= art.width + 30
      const picture = <Box flexDirection="column">{(art.frames[frameIndex] ?? []).map(line => <Text color={color}>{line}</Text>)}</Box>
      const cardBox = card.length ? <Box flexDirection="column">{card.map(line => <Text color={color}>{line}</Text>)}</Box> : null
      return (
        <Box flexDirection="column" paddingX={1} rowGap={1}>
          {head}
          {side ? <Box flexDirection="row" columnGap={3}>{picture}<Box flexDirection="column" rowGap={1}>{caption}{cardBox}</Box></Box> : <Box flexDirection="column">{picture}{caption}{cardBox}</Box>}
          {shelf}
          {ticker}
        </Box>
      )
    }

    const { Svg } = $.ui.resolve(e)
    const width = Math.min(360, Math.max(240, Math.floor(columns * 4)))
    const alt = `${label(c.scene)}: ${doing}${c.name ? ' ' + c.name : ''}${detail ? ', ' + detail : ''}`
    return (
      <Box flexDirection="column" paddingX={1} rowGap={1}>
        {head}
        <Svg source={illustrate({ scene: c.scene, object: c.object, name: c.name, detail, status: c.status, running: s.running }, { width, height: Math.round(width * 9 / 16) })} alt={alt} width={width} isInteractive />
        {shelf}
        {ticker}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || options.band === false || (await read($, isHidden))) return next(e)
    // Other mods share this slot: theirs goes under ours. next(e) rejects only when nothing answers beneath.
    const below = await next(e).catch(() => undefined)

    const s = (await read($, canvas)) ?? initialState()
    const open = await read($, details)
    const { c, mark, doing, detail, color } = summary(s)
    const columns = e.surface === 'terminal' ? e.props.bodyColumns : 100
    const shelf = s.shelf.slice(-8).map(o => `${glyph(o.object)} ${fit(o.name || o.object, 18)}`).join('  ')

    const { Box, Button, Text } = $.ui.resolve(e)
    const row = (
      <Box flexDirection="row" gap={1}>
        <Text color={color} bold>{glyph(c.scene)} {label(c.scene)}</Text>
        <Text>{mark ? `${mark} ` : ''}{doing}{c.name ? ' ' : ''}{c.name ? <Text bold>{fit(c.name, 32)}</Text> : null}</Text>
        {detail ? <Text dimColor>{fit(detail, 24)}</Text> : null}
        {s.shelf.length ? <Text dimColor>· built {s.shelf.length}</Text> : null}
        {s.shelf.length && columns > 70 ? <Text dimColor>{fit(shelf, Math.max(12, columns - 70))}</Text> : null}
        <Button key="window" label="Window" onPress={() => openPane($, true)} />
        <Button key="details" label={open ? 'Less' : 'More'} onPress={() => update($, details, v => !v)} />
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )

    let mine = row
    if (open) {
      const art = pictogram(c.scene)
      const frameIndex = s.running || c.scene === 'idle' || c.scene === 'think' ? s.ticker.length % art.frames.length : 0
      const card = c.object && c.object !== 'read' ? objectCard(c.object, c.name, { maxWidth: 24 }) : []
      const rowsRoom = Math.max(1, Math.min(art.height, e.props.maxRows - 2))
      const last = s.ticker[s.ticker.length - 1]
      mine = (
        <Box flexDirection="column">
          {row}
          <Box flexDirection="row" gap={3}>
            <Box flexDirection="column">
              {(art.frames[frameIndex] ?? []).slice(0, rowsRoom).map(line => <Text color={color}>{line}</Text>)}
            </Box>
            <Box flexDirection="column">
              {last && last.file ? <Text dimColor>{fit(last.file, 40)}</Text> : null}
              {card.map(line => <Text color={color}>{line}</Text>)}
            </Box>
          </Box>
        </Box>
      )
    }

    return below ? <Box flexDirection="column">{mine}{below}</Box> : mine
  })
}
