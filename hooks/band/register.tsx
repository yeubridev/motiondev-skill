// The band above the prompt: the scene the agent is in, what it is making, and
// what it has built. Same classifier and art as the terminal watcher; no Node here.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Canvas } from './types'
import { classify } from '../../lib/classify.mjs'
import type { EventFields } from '../../lib/events.mjs'
import { initialState, makeEvent, reduce } from '../../lib/events.mjs'
import { fit, glyph, label, objectCard, pictogram, sceneHex, verb } from '../../lib/pictograms.mjs'

// Change the tag when Canvas changes shape: it declines what an earlier version stored.
const canvas = atom({ plugin: 'motiondev', key: 'canvas' } as const, initialState(), { shape: 'canvas-1' })
const isHidden = atom({ plugin: 'motiondev', key: 'isHidden' } as const, false)
const details = atom({ plugin: 'motiondev', key: 'details' } as const, false)

const SPIN = ['◐', '◓', '◑', '◒']

async function apply($: EngineInterface, fields: EventFields | null, now: number) {
  if (!fields) return
  const e = makeEvent({ ...fields, source: 'band' }, now)
  await update($, canvas, (s: Canvas | null) => reduce(s ?? initialState(), e))
}

export const register: Register = (on, options) => {
  let cwd = ''

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    const now = await $.clock.now()
    await update($, canvas, () => initialState())
    await apply($, classify({ event: 'SessionStart', source: 'startup', cwd }), now)
    if (options.details === true) await update($, details, () => true)

    return next(e)
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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || options.band === false || (await read($, isHidden))) return next(e)
    // Other mods share this slot: theirs goes under ours. next(e) rejects only when nothing answers beneath.
    const below = await next(e).catch(() => undefined)

    const s = (await read($, canvas)) ?? initialState()
    const open = await read($, details)
    const c = s.current
    const color = sceneHex(c.scene)
    const status = s.running ? 'start' : c.status
    const mark = s.running ? SPIN[s.ticker.length % 4] : c.status === 'fail' ? '✗' : c.status === 'done' && c.object ? '✓' : ''
    const doing = c.object || c.scene !== 'idle' ? verb(c.object, c.scene, status) : 'waiting for the agent'
    const last = s.ticker[s.ticker.length - 1]
    const detail = last && last.weight === 'major' ? last.detail ?? '' : ''
    const columns = e.surface === 'terminal' ? e.props.bodyColumns : 100
    const shelf = s.shelf.slice(-8).map(o => `${glyph(o.object)} ${fit(o.name || o.object, 18)}`).join('  ')

    const { Box, Button, Text } = $.ui.resolve(e)
    const row = (
      <Box flexDirection="row" gap={1}>
        <Text color={color} bold>{glyph(c.scene)} {label(c.scene)}</Text>
        <Text>{mark ? `${mark} ` : ''}{doing}{c.name ? ' ' : ''}{c.name ? <Text bold>{fit(c.name, 32)}</Text> : null}</Text>
        {detail ? <Text dimColor>{fit(detail, 24)}</Text> : null}
        {s.shelf.length ? <Text dimColor>· built {s.shelf.length}</Text> : null}
        {s.shelf.length && columns > 70 ? <Text dimColor>{fit(shelf, Math.max(12, columns - 60))}</Text> : null}
        <Button key="details" label={open ? 'Less' : 'More'} onPress={() => update($, details, v => !v)} />
        <Button key="hide" label="Hide" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )

    let mine = row
    if (open) {
      const art = pictogram(c.scene)
      const frameIndex = s.running || c.scene === 'idle' || c.scene === 'think' ? s.ticker.length % art.frames.length : 0
      const card = c.object && c.object !== 'read' ? objectCard(c.object, c.name, { maxWidth: 24 }) : []
      const rows = Math.max(1, Math.min(art.height, e.props.maxRows - 2))
      mine = (
        <Box flexDirection="column">
          {row}
          <Box flexDirection="row" gap={3}>
            <Box flexDirection="column">
              {(art.frames[frameIndex] ?? []).slice(0, rows).map(line => <Text color={color}>{line}</Text>)}
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
