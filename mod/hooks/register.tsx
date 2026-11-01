// motiondev V2 as a mod: what the agent builds, told as a story at the level of
// the person watching, in a pane of cards beside the chat. The app is drawn as a
// restaurant Claude builds room by room. "Live" follows Claude, then recaps what
// the app can do and offers a guided tour of one request through it; "Understand"
// turns what was just built into a short lesson and, at pauses, a quiz about the
// person's own project; "Your path" keeps notions, a rank and a streak across
// sessions. Words, lessons and quizzes are local, so watching and learning cost
// no token; only "Go further" asks the model, outside the agent's own context.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import type { Lesson, Level, Prefs, Progress, Quiz, Tour } from '../types'
import { classify } from '../lib/classify.mjs'
import type { EventFields } from '../lib/events.mjs'
import { initialState, makeEvent, reduce } from '../lib/events.mjs'
import { LEVELS, explain, localeOf, row, timeline, ui } from '../lib/explain.mjs'
import { CONCEPTS, answered, conceptOf, here, initialProgress, lesson, mastery, quiz, seen, stands, streakDays, weakest } from '../lib/lessons.mjs'
import { diagram, notions } from '../lib/concepts.mjs'
import { chapter, checksOf, initialStory, progress, recap, tour, withPlan, withPrompt } from '../lib/story.mjs'
import { map, roomOf, shown } from '../lib/map.mjs'

const PANE = 'motiondev-v2'
const TITLE = 'motiondev'
const USAGE = 'usage: /motiondev-v2 [level beginner|intermediate|advanced|dev] [learn on|off] [lang fr|en] [motion on|off] [reset] [close]'

const DEFAULTS: Prefs = { level: '', locale: 'en', learn: false, onboarded: false, motion: true }
const NO_LESSON: Lesson = { status: 'idle', text: '', tokens: 0, cached: 0, turn: 0, concept: '' }
const NO_QUIZ: Quiz = { concept: '', step: 'idle', n: 0, pick: -1, name: '' }
const NO_TOUR: Tour = { at: -1 }

// Change a tag when its value changes shape: it declines what an earlier version stored.
const canvas = atom({ plugin: 'motiondev-v2', key: 'canvas' } as const, initialState(), { shape: 'canvas-1' })
const story = atom({ plugin: 'motiondev-v2', key: 'story' } as const, initialStory(), { shape: 'story-3' })
const settings = atom({ plugin: 'motiondev-v2', key: 'settings' } as const, DEFAULTS, { shape: 'settings-1' })
const lessonAtom = atom({ plugin: 'motiondev-v2', key: 'lesson' } as const, NO_LESSON, { shape: 'lesson-3' })
const progressAtom = atom({ plugin: 'motiondev-v2', key: 'progress' } as const, initialProgress() as Progress, { shape: 'progress-1' })
const quizAtom = atom({ plugin: 'motiondev-v2', key: 'quiz' } as const, NO_QUIZ, { shape: 'quiz-2' })
const tourAtom = atom({ plugin: 'motiondev-v2', key: 'tour' } as const, NO_TOUR, { shape: 'tour-1' })
const isClosed = atom({ plugin: 'motiondev-v2', key: 'isClosed' } as const, false)

const isLevel = (v: string): v is Level => (LEVELS as readonly string[]).includes(v)
const learns = (s: Prefs) => s.level === 'beginner' || s.level === 'intermediate'
// Test counts come from the runner in English.
// "edit" marks an Edit in the timeline; it is not a column or a count.
const real = (d: string) => (d === 'edit' ? '' : d)
const counts = (d: string, locale: string) => (locale === 'fr' ? d.replace(/(\d+) passed/g, (_, n) => `${n} réussi${n === '1' ? '' : 's'}`).replace(/(\d+) failed/g, (_, n) => `${n} échoué${n === '1' ? '' : 's'}`) : d)

async function apply($: EngineInterface, fields: EventFields | null, now: number) {
  if (!fields) return
  const e = makeEvent({ ...fields, source: fields.source ?? 'mod' }, now)
  await update($, canvas, s => reduce(s ?? initialState(), e))
}

// Prefs and progress live in the session for drawing and in the store so they outlast it.
async function save($: EngineInterface, patch: Partial<Prefs>) {
  const next = await update($, settings, s => ({ ...(s ?? DEFAULTS), ...patch }))
  await $.store.set('settings', next)
  return next
}
async function learned($: EngineInterface, change: (p: Progress) => Progress) {
  const next = await update($, progressAtom, p => change(p ?? (initialProgress() as Progress)))
  await $.store.set('progress', next)
  return next
}

const openPane = ($: EngineInterface, focus?: true) =>
  $.ui.open(focus ? { id: PANE, title: TITLE, focus } : { id: PANE, title: TITLE }).catch(() => ({ isPlaced: false as const, reason: 'refused' }))

// "Go further": one question over the session's own transcript (served from the
// prompt cache), never a message in the agent's context.
function deeperPrompt(level: Level | '', locale: 'fr' | 'en', title: string, name: string) {
  const beginner = level === 'beginner'
  return locale === 'fr'
    ? `Explique ${beginner ? 'à quelqu’un qui ne sait pas coder' : 'à quelqu’un qui débute en code, en nommant les vrais termes'} comment fonctionne « ${title} » dans ce que tu viens de construire${name ? ` (${name})` : ''} : à quoi ça sert dans son app, comment c’est relié au reste, et une erreur courante à éviter. En français, 120 mots au plus, sans code.`
    : `Explain ${beginner ? 'to someone who does not code' : 'to someone learning to code, naming the real terms'} how “${title}” works in what you just built${name ? ` (${name})` : ''}: what it is for in their app, how it connects to the rest, and one common mistake to avoid. 120 words at most, no code.`
}

async function teach($: EngineInterface, concept: string, title: string, name: string) {
  const s = await read($, settings)
  const turn = (await read($, canvas)).turns
  await update($, lessonAtom, () => ({ ...NO_LESSON, status: 'loading', turn, concept }))
  const r = await $.model.fork({ prompt: deeperPrompt(s.level, s.locale, title, name) })
  // A new request started while the model answered: this lesson belongs to a turn no longer on screen.
  if ((await read($, canvas)).turns !== turn) return
  const u = 'usage' in r ? r.usage : undefined
  const tokens = u ? u.input_tokens + u.output_tokens : 0
  const cached = u ? (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) : 0
  await update($, lessonAtom, () => (r.isAnswered ? { status: 'ready', text: r.text, tokens, cached, turn, concept } : { status: 'error', text: '', tokens, cached, turn, concept }))
}

export const register: Register = on => {
  let cwd = ''
  // One "new notion" toast per request: seven in a row would be noise.
  let announced = -1
  let answering = false

  on('session.start', async ($, e, next) => {
    cwd = e.cwd
    const stored = (await $.store.get('settings')) as Partial<Prefs> | undefined
    const lang = (await $.env.get('LANG')) ?? (await $.env.get('LC_ALL')) ?? ''
    await update($, settings, () => ({ ...DEFAULTS, locale: localeOf(lang), ...(stored ?? {}) }))
    const kept = (await $.store.get('progress')) as Partial<Progress> | undefined
    await update($, progressAtom, () => ({ ...(initialProgress() as Progress), ...(kept ?? {}) }))
    const id = await $.session.id().catch(() => '')
    const held = await read($, canvas)
    // A reload runs session.start again: keep what this session built.
    if (!held.project || held.session !== id) {
      await apply($, classify({ event: 'SessionStart', source: 'startup', cwd, session_id: id }), await $.clock.now())
      await update($, story, () => initialStory())
      await update($, lessonAtom, () => NO_LESSON)
      await update($, quizAtom, () => NO_QUIZ)
      await update($, tourAtom, () => NO_TOUR)
    }
    await $.command.register({ name: 'motiondev-v2', description: 'What Claude builds, explained at your level', argumentHint: '[level …|learn on|off|lang fr|en|reset|close]' }).catch(() => undefined)
    if (!(await read($, isClosed))) void openPane($)

    return next(e)
  })

  on('command.run', { command: 'motiondev-v2' }, async ($, e) => {
    const [verb = '', value = ''] = e.args.trim().toLowerCase().split(/\s+/)
    if (verb === 'close') {
      await update($, isClosed, () => true)
      await $.ui.close({ id: PANE }).catch(() => undefined)
      return { text: 'motiondev closed. /motiondev-v2 opens it again.' }
    }
    if (verb === 'level' && isLevel(value)) { await save($, { level: value, onboarded: true }); return { text: `motiondev level: ${value}.` } }
    if (verb === 'learn' && (value === 'on' || value === 'off')) { await save($, { learn: value === 'on' }); return { text: `motiondev learning ${value}.` } }
    if (verb === 'lang' && (value === 'fr' || value === 'en')) { await save($, { locale: value }); return { text: `motiondev language: ${value}.` } }
    if (verb === 'motion' && (value === 'on' || value === 'off')) { await save($, { motion: value === 'on' }); return { text: `motiondev motion ${value}.` } }
    if (verb === 'reset') await save($, { level: '', onboarded: false, learn: false })
    else if (verb !== '') return { text: USAGE }
    await update($, isClosed, () => false)
    const opened = await openPane($, true)
    return { text: opened.isPlaced ? 'motiondev open.' : `motiondev is waiting for a surface to draw it (${opened.reason}).` }
  })

  on('prompt.submit', async ($, e, next) => {
    // A slash command is not a turn of the agent.
    if (!e.isMeta && !e.command) {
      const now = await $.clock.now()
      await apply($, classify({ event: 'UserPromptSubmit', prompt: e.text, cwd }), now)
      await update($, story, s => withPrompt(s ?? initialStory(), e.text, now))
      await update($, lessonAtom, () => NO_LESSON)
      await update($, tourAtom, () => NO_TOUR)
      if (!(await read($, isClosed))) void openPane($)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') await update($, isClosed, () => true)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const { tool, tool_use_id, agentId, consent, requestMeta, ...input } = e as Record<string, unknown> & { tool: string }
    await apply($, classify({ event: 'PreToolUse', tool, input, cwd }), await $.clock.now())
    const ran = await next(e)
    const record = typeof ran.result === 'object' && ran.result !== null ? (ran.result as Record<string, unknown>) : {}
    // The agent's own plan is the thread a beginner follows; a subagent's is not.
    if (agentId === undefined) await update($, story, s => withPlan(s ?? initialStory(), tool, input, record))
    const response = ran.deny !== undefined ? { isError: true } : { ...record, isError: ran.isError === true }
    const after = classify({ event: 'PostToolUse', tool, input, response, cwd })
    await apply($, after, await $.clock.now())
    // Something built that belongs to a notion: the notion is met, and announced the first time.
    const concept = after && (after.kind === 'object' || after.kind === 'run') && after.status !== 'fail' ? conceptOf(after.scene ?? '') : null
    if (concept) {
      const s = await read($, settings)
      const before = (await read($, progressAtom)).concepts?.[concept]?.seen ?? 0
      await learned($, p => seen(p, concept))
      const l = lesson(concept, s.locale)
      const turn = (await read($, canvas)).turns
      if (!before && s.learn && learns(s) && l && announced !== turn) {
        announced = turn
        $.ui.toast(ui(s.locale).unlocked(l.title))
      }
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // A subagent's loop ends inside the main turn: only the main loop's end closes it.
    if (e.agentId === undefined) {
      await apply($, classify({ event: 'Stop', cwd }), await $.clock.now())
      await update($, story, s => ({ ...(s ?? initialStory()), ended: true }))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const s = await read($, settings)
    const w = ui(s.locale)
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const graphic = e.surface !== 'terminal'
    const choose = (level: Level) => () => save($, learns({ ...s, level }) ? { level } : { level, onboarded: true })
    const card = (key: string, title: string, aside: string, ...body: RenderChildren[]) => (
      <Box key={key} flexDirection="column" borderStyle="round" borderColor="subtle" paddingX="md" paddingY="sm" rowGap="sm">
        <Box flexDirection="row" justifyContent="space-between" columnGap="sm">
          <Text size="caption" weight="semibold" dimColor>{title}</Text>
          {aside ? <Text size="caption" dimColor>{aside}</Text> : null}
        </Box>
        {body}
      </Box>
    )
    const svg = (source: string, alt: string) => {
      if (!graphic) return null
      const { Svg } = $.ui.resolve(e)
      return <Svg source={source} alt={alt} isInteractive={s.motion ? true : undefined} />
    }

    // ---- onboarding: two questions, the second only where learning makes sense
    if (!s.onboarded) {
      const second = s.level === 'beginner' || s.level === 'intermediate'
      return (
        <Box flexDirection="column" paddingX="md" paddingY="sm" rowGap="md">
          <Box flexDirection="column">
            <Text size="title" weight="semibold">{w.welcome}</Text>
            <Text dimColor wrap="wrap">{w.welcomeSub}</Text>
          </Box>
          {second ? (
            <Box flexDirection="column" rowGap="sm">
              <Text size="heading" weight="semibold">{w.askLearn}</Text>
              <Button key="learn-yes" hotkey="1" variant="primary" onPress={() => save($, { learn: true, onboarded: true })}>{w.learnYes[0]} · <Text dimColor>{w.learnYes[1]}</Text></Button>
              <Button key="learn-no" hotkey="2" onPress={() => save($, { learn: false, onboarded: true })}>{w.learnNo[0]} · <Text dimColor>{w.learnNo[1]}</Text></Button>
            </Box>
          ) : (
            <Box flexDirection="column" rowGap="sm">
              <Text size="heading" weight="semibold">{w.askCode}</Text>
              {LEVELS.map((level, i) => (
                <Button key={`answer-${level}`} hotkey={String(i + 1)} onPress={choose(level)}>{w.answers[level][0]} · <Text dimColor>{w.answers[level][1]}</Text></Button>
              ))}
            </Box>
          )}
          <Box flexDirection="row" columnGap="sm">
            <Button key="skip" plain label={w.skip} onPress={() => save($, { level: s.level || 'intermediate', onboarded: true })} />
            <Button key="locale" plain label={s.locale === 'fr' ? 'English' : 'Français'} onPress={() => save($, { locale: s.locale === 'fr' ? 'en' : 'fr' })} />
          </Box>
        </Box>
      )
    }

    const level = (s.level || 'intermediate') as Level
    const c = await read($, canvas)
    const st = await read($, story)
    const tr = await read($, tourAtom)
    const current = c.current
    const lastTool = [...c.ticker].reverse().find(ev => ev.weight === 'major')?.tool ?? ''
    const status = c.running ? '' : current.status
    const x = explain({ ...current, name: current.name ? shown(current) : '', status, tool: lastTool, detail: counts(current.detail, s.locale) }, { level, locale: s.locale })
    const teaches = learns({ ...s, level })
    const checks = checksOf(c.ticker)
    const ended = st.ended && !c.running
    const stops = ended && level !== 'dev' ? tour(c.shelf, { level, locale: s.locale, checks }) : []
    const stop = tr.at >= 0 && tr.at < stops.length ? stops[tr.at] : null

    // The level switch: a segmented control, the current level filled.
    const header = (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap="sm" flexWrap="wrap">
        <Text weight="semibold">{c.project || TITLE}{c.running ? <Text color="suggestion"> ●</Text> : null}</Text>
        <Box flexDirection="row" columnGap="xs">
          {LEVELS.map((l, i) => (
            <Button key={`level-${l}`} hotkey={String(i + 1)} variant={l === level ? 'primary' : 'secondary'} label={w.levels[l]} onPress={() => save($, { level: l })} />
          ))}
        </Box>
      </Box>
    )

    // ---- Live: the plan of the restaurant, what Claude does and what it is for
    const before = [...c.ticker].reverse().find(ev => ev.weight === 'major' && (ev.scene !== current.scene || (ev.object ?? '') !== current.object || (ev.name ?? '') !== current.name))
    const prev = before ? roomOf(before.scene) : ''
    const picture = graphic
      ? svg(map({ ...current, status, running: c.running, motion: s.motion, shelf: c.shelf, steps: st.steps, prev, level: level === 'dev' ? 'advanced' : level, locale: s.locale, checks, focus: stop ? { room: stop.room, from: stop.from } : null }),
        stop ? `${stop.title}. ${stop.text}` : [x.title, x.subtitle].filter(Boolean).join('. '))
      : <Text color={status === 'fail' ? 'error' : status === 'done' ? 'success' : 'suggestion'}>{c.running ? '◐' : status === 'fail' ? '✗' : status === 'done' ? '✓' : '●'}</Text>
    const p = progress(st.steps)
    const active = st.steps.find(step => step.status === 'active')?.title ?? ''
    const r = ended && level !== 'dev' && level !== 'advanced' ? recap(c.shelf, st.since, s.locale) : null
    let words: RenderChildren
    if (stop) {
      words = (
        <Box flexDirection="column">
          <Text size="heading" weight="semibold" wrap="wrap">{stop.title}</Text>
          <Text dimColor wrap="wrap">{stop.text}</Text>
        </Box>
      )
    } else if (r) {
      words = (
        <Box flexDirection="column">
          <Text size="heading" weight="semibold" wrap="wrap">{r.title}</Text>
          {r.lines.length ? r.lines.map((line, i) => <Text key={`recap-${i}`} wrap="wrap"><Text color="success">✓</Text> {line}</Text>) : <Text dimColor wrap="wrap">{r.empty}</Text>}
          {r.more ? <Text dimColor>{w.more(r.more)}</Text> : null}
        </Box>
      )
    } else {
      words = (
        <Box flexDirection="column">
          <Text size="heading" weight="semibold" wrap="wrap" mono={x.mono}>{x.title}</Text>
          {x.subtitle ? <Text dimColor wrap="wrap" mono={x.mono}>{x.subtitle}</Text> : null}
          {!graphic && x.chips.length ? <Text mono size="footnote" dimColor>{x.chips.join('  ·  ')}</Text> : null}
        </Box>
      )
    }
    const steps = p && !stop && !ended && level !== 'dev'
      ? <Text size="footnote" dimColor wrap="truncate-end">{graphic ? '' : `${'▰'.repeat(p.done)}${'▱'.repeat(Math.max(0, p.total - p.done))}  `}{w.step(p.index, p.total)}{active ? ` · ${active}` : ''}</Text>
      : null
    const go = (at: number) => () => update($, tourAtom, () => ({ at }))
    const actions = stop ? (
      <Box flexDirection="row" columnGap="sm" alignItems="center">
        {tr.at < stops.length - 1
          ? <Button key="tour-next" variant="primary" label={w.tourNext} onPress={go(tr.at + 1)} />
          : <Button key="tour-end" variant="primary" label={w.tourEnd} onPress={go(-1)} />}
        {tr.at > 0 ? <Button key="tour-back" label={w.tourBack} onPress={go(tr.at - 1)} /> : null}
        {tr.at < stops.length - 1 ? <Button key="tour-quit" plain label={w.tourQuit} onPress={go(-1)} /> : null}
      </Box>
    ) : stops.length ? (
      <Box flexDirection="row">
        <Button key="tour-start" variant="primary" label={w.tourStart} onPress={go(0)} />
      </Box>
    ) : null
    const live = card('live', stop ? w.tourTitle : w.now, stop ? w.of(tr.at + 1, stops.length) : chapter(current.scene, { ended, locale: s.locale }),
      teaches && st.prompt && !stop ? <Text dimColor size="footnote" wrap="truncate-end">“{st.prompt}”</Text> : null,
      picture, words, steps, actions)

    // ---- dev: the raw stream as its own card
    if (level === 'dev') {
      const rows = timeline(c.ticker).slice(-Math.max(4, (e.props.scroll?.bodyRows ?? 20) - 12)).map(row)
      return (
        <Box flexDirection="column" paddingX="md" paddingY="sm" rowGap="md">
          {header}
          {live}
          {card('timeline', w.timeline, w.built(c.shelf.length, c.turns),
            rows.length === 0 ? <Text dimColor mono>{w.nothing}</Text> : <Box flexDirection="column">{rows.map(r => (
              <Text mono size="footnote" color={r.isFail ? 'error' : undefined} dimColor={!r.isFail} wrap="truncate-end">{r.time}  {r.tool.padEnd(10).slice(0, 10)} {r.target}{r.outcome ? `  ${r.outcome}` : ''}</Text>
            ))}</Box>)}
        </Box>
      )
    }

    const footer = (
      <Box flexDirection="row" justifyContent="flex-end" columnGap="md">
        {teaches ? <Button key="learn" plain dimColor label={s.learn ? w.learnHide : w.learnShow} onPress={() => save($, { learn: !s.learn })} /> : null}
        {graphic ? <Button key="motion" plain dimColor label={s.motion ? w.motionOff : w.motionOn} onPress={() => save($, { motion: !s.motion })} /> : null}
      </Box>
    )
    if (!s.learn || !teaches) {
      return (
        <Box flexDirection="column" paddingX="md" paddingY="sm" rowGap="md">
          {header}
          {live}
          {footer}
        </Box>
      )
    }

    // ---- Understand: the notion behind what was just built, its bridge picture, and a quiz at pauses
    const pg = await read($, progressAtom)
    const qz = await read($, quizAtom)
    const ls = await read($, lessonAtom)
    const lastOf = (id: string) => [...c.shelf].reverse().find(o => stands(id, o))
    // A quiz in progress keeps its notion on screen; then the tour stop, the moment, the last thing built.
    const lastBuilt = [...c.shelf].reverse().find(o => conceptOf(o.scene))
    let concept = qz.step !== 'idle' ? qz.concept : stop?.concept || conceptOf(current.scene) || (lastBuilt ? conceptOf(lastBuilt.scene) : null)
    // Nothing built yet: what was met last time, so a new session opens on a recall.
    const recall = !concept
    if (!concept) concept = weakest(pg)
    let understand: RenderChildren = null
    const l = concept ? lesson(concept, s.locale) : null
    if (concept && l) {
      const id = concept
      const fromNow = stands(id, current) && current.name ? current : null
      const item = fromNow ?? lastOf(id) ?? null
      const name = item ? shown(item) : ''
      const m = mastery(pg, id)
      const asking = qz.concept === id && qz.step !== 'idle'
      const q = quiz(id, s.locale, asking ? qz.n : pg.concepts?.[id]?.correct ?? 0, asking ? qz.name : name)
      const startQuiz = () => update($, quizAtom, () => ({ concept: id, step: 'asking' as const, n: pg.concepts?.[id]?.correct ?? 0, pick: -1, name }))
      const pick = (i: number) => async () => {
        // Two presses before the redraw (a double click, a hotkey held) must count one answer once.
        if (answering) return
        answering = true
        try {
          if ((await read($, quizAtom)).step !== 'asking') return
          await update($, quizAtom, z => ({ ...(z ?? NO_QUIZ), step: 'answered' as const, pick: i }))
          const now = await $.clock.now()
          const right = q !== null && i === q.right
          const after = await learned($, prog => answered(prog, id, right, now))
          if (right && mastery(after, id) === 2 && m < 2) $.ui.toast(w.masteredToast(l.title))
        } finally {
          answering = false
        }
      }
      const deeper = <Button key="deeper" label={w.deeper} onPress={() => teach($, id, l.title, name)} />
      const later = <Button key="quiz-quit" plain dimColor label={w.later} onPress={() => update($, quizAtom, () => NO_QUIZ)} />
      // After a wrong answer the next try is another question: the revealed answer would be a free point.
      const another = () => update($, quizAtom, z => ({ ...(z ?? NO_QUIZ), step: 'asking' as const, pick: -1, n: (z?.n ?? 0) + 1 }))
      let quizArea: RenderChildren = null
      if (asking && q && qz.step === 'asking') {
        quizArea = (
          <Box flexDirection="column" rowGap="xs">
            <Text weight="semibold" wrap="wrap">{q.q}</Text>
            {q.answers.map((a, i) => <Button key={`quiz-${i}`} hotkey={String(i + 1)} label={a} onPress={pick(i)} />)}
            {later}
          </Box>
        )
      } else if (asking && q && qz.step === 'answered') {
        const right = qz.pick === q.right
        quizArea = (
          <Box flexDirection="column" rowGap="xs">
            <Text weight="semibold" color={right ? 'success' : 'error'}>{right ? `✓ ${w.right(10)}` : `✗ ${w.wrong()}`}</Text>
            {right ? null : <Text wrap="wrap">{w.answer(q.best)}</Text>}
            <Text dimColor wrap="wrap">{q.why}</Text>
            <Text dimColor size="footnote" wrap="wrap">{l.limit}</Text>
            <Box flexDirection="row" columnGap="sm">
              {!right
                ? <Button key="quiz-retry" variant="primary" label={w.retry} onPress={another} />
                : m < 2
                  ? <Button key="quiz-next" variant="primary" label={w.nextQuestion} onPress={startQuiz} />
                  : <Button key="quiz-done" variant="primary" label={w.finish} onPress={() => update($, quizAtom, () => NO_QUIZ)} />}
              {deeper}
              {m < 2 ? later : null}
            </Box>
          </Box>
        )
      } else if (!c.running) {
        // Questions wait for a pause in the work: an interruption mid-build costs more than it teaches.
        quizArea = (
          <Box flexDirection="row" columnGap="sm">
            <Button key="quiz-start" variant="primary" label={recall ? w.recallStart : w.quizStart} onPress={startQuiz} />
            {deeper}
          </Box>
        )
      }
      const statusHere = fromNow ? status : ''
      const mastered = m >= 2 && !asking
      understand = card('understand', recall ? w.lastTime : w.learn, w.mastery(m),
        <Box flexDirection="column">
          <Text size="heading" weight="semibold">{l.title}</Text>
          <Text dimColor size="footnote">{w.image(l.room)}</Text>
        </Box>,
        // Guidance fades as the notion is mastered: the picture is no longer needed.
        mastered ? null : svg(diagram(id, { name, detail: counts(real(item?.detail ?? ''), s.locale), status: statusHere, locale: s.locale, motion: s.motion }), l.what),
        <Box flexDirection="column">
          {mastered ? null : <Text wrap="wrap">{level === 'beginner' ? l.image : l.what}</Text>}
          {item || statusHere === 'fail' ? <Text dimColor wrap="wrap">{here(l, { name, detail: counts(real(item?.detail ?? ''), s.locale), status: statusHere })}</Text> : null}
        </Box>,
        quizArea,
        ls.concept === id && ls.status === 'loading' ? <Text dimColor>{w.lessonLoading}</Text> : null,
        ls.concept === id && ls.status === 'error' ? <Text dimColor>{w.lessonError}</Text> : null,
        ls.concept === id && ls.status === 'ready' ? (
          <Box flexDirection="column">
            <Text size="caption" weight="semibold" dimColor>{w.lesson}</Text>
            <Markdown text={ls.text} />
            <Text dimColor size="caption">{w.lessonCost(ls.tokens, ls.cached ?? 0)}</Text>
          </Box>
        ) : null)
    }

    // ---- Your path: the rank, the nine notions, a review of the weakest
    const done = CONCEPTS.filter(id => mastery(pg, id) >= 2).length
    const met = CONCEPTS.filter(id => (pg.concepts?.[id]?.seen ?? 0) > 0).length
    const trail = graphic
      ? svg(notions(pg, concept ?? '', s.locale, { motion: s.motion }), w.mastered(done, CONCEPTS.length))
      : <Text dimColor>{CONCEPTS.map(id => `${mastery(pg, id) >= 2 ? '●' : (pg.concepts?.[id]?.seen ?? 0) > 0 ? '◐' : '○'} ${lesson(id, s.locale)?.short ?? id}`).join('   ')}</Text>
    const weak = weakest(pg)
    const review = weak && qz.step === 'idle' && !c.running && weak !== concept
      ? <Button key="review" label={w.review} onPress={() => update($, quizAtom, () => ({ concept: weak, step: 'asking' as const, n: pg.concepts?.[weak]?.correct ?? 0, pick: -1, name: (() => { const o = lastOf(weak); return o ? shown(o) : '' })() }))} />
      : null
    const journey = card('path', w.path, w.streak(streakDays(pg, await $.clock.now())), trail,
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" columnGap="sm">
        <Text dimColor size="footnote">{w.tally(met, done)} · {w.xp(pg.xp ?? 0)}</Text>
        {review}
      </Box>)

    return (
      <Box flexDirection="column" paddingX="md" paddingY="sm" rowGap="md">
        {header}
        {live}
        {understand}
        {journey}
        {footer}
      </Box>
    )
  })
}
