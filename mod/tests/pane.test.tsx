import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import { quiz } from '../lib/lessons.mjs'

const PANE = {
  plugin: 'motiondev-v2',
  component: 'Pane',
  requestId: 'motiondev-v2',
  props: { title: 'motiondev', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// Nothing sits beneath the plugin in a test: these hooks stand for the engine.
const engine = (on: On, { lang = 'fr_FR.UTF-8', forks = [] as string[], toasts = [] as string[], stored = {} as Record<string, unknown>, wait = Promise.resolve() } = {}) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.env(on, { LANG: lang })
  mock.store(on, stored)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('command.register', () => ({ value: { command: 'motiondev-v2' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  on('tool.call', (_, e) => ({ result: e.tool === 'TaskCreate' ? { task: { id: '7', subject: 'x' } } : { stdout: '', stderr: '' } }))
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('model.fork', async (_, e) => { forks.push(e.prompt); await wait; return { value: { isAnswered: true, text: '1. La table garde les membres.', usage: { input_tokens: 120, output_tokens: 80, cache_creation_input_tokens: 0, cache_read_input_tokens: 9000 } } } })
  return clock
}
const start = { cwd: '/repo/members-app', surface: 'desktop', isInteractive: true } as const
const command = (args: string) => ({ command: 'motiondev-v2', args, origin: {}, presentation: {} } as never)
const schema = { tool: 'Write', file_path: '/repo/members-app/prisma/schema.prisma', content: 'model users {\n  id String @id\n  email String\n  password_hash String\n}' } as const

test('a first open asks two questions, then explains in plain words', async ($, on) => {
  engine(on)
  await $.session.start(start)
  for (const surface of ['terminal', 'desktop'] as const) {
    await $.command.run(command('reset'))
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /Vous codez/ })).toBeDefined()
    await ui.press({ key: 'answer-beginner' })
    expect(await ui.find({ type: 'Text', text: /apprendre en chemin/ })).toBeDefined()
    await ui.press({ key: 'learn-no' })
    expect(await ui.find({ type: 'Text', text: /Le restaurant attend votre commande/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the beginner follows the thread from the request to the plan', async ($, on) => {
  engine(on)
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.prompt.submit({ text: 'Crée une app où les gens s’inscrivent' } as never)
  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'Lire le projet', status: 'completed', activeForm: '' }, { content: 'Préparer la base', status: 'in_progress', activeForm: '' }, { content: 'Page d’inscription', status: 'pending', activeForm: '' }] } as never)
  await $.tool.call(schema)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /s’inscrivent/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Étape 2 sur 3/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Claude ouvre le registre « users » dans la réserve/ })).toBeDefined()
    if (surface === 'desktop') expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('the level switch redraws the same moment, down to the raw stream', async ($, on) => {
  engine(on)
  await $.session.start(start)
  await $.command.run(command('level intermediate'))
  await $.tool.call(schema)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^Table users$/ })).toBeDefined()
  await ui.press({ key: 'level-advanced' })
  expect(await ui.find({ type: 'Text', text: /database · table users/ })).toBeDefined()
  await ui.press({ key: 'level-dev' })
  expect(await ui.find({ type: 'Text', text: /Chronologie/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /schema\.prisma/ })).toBeDefined()
  await ui.unmount()
})

test('what was just built becomes a lesson, a quiz answered right earns XP, a new notion is announced once', async ($, on) => {
  const toasts: string[] = []
  engine(on, { toasts })
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.command.run(command('learn on'))
  await $.tool.call(schema)
  await $.tool.call(schema)
  expect(toasts.filter(t => /Nouvelle notion : La base de données/.test(t)).length).toBe(1)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^La base de données$/ })).toBeDefined()
  await ui.press({ key: 'quiz-start' })
  const q = quiz('database', 'fr', 0, 'users')
  expect(await ui.find({ type: 'Text', text: /retrouver une information de « users »/ })).toBeDefined()
  await ui.press({ key: `quiz-${q?.right ?? 0}` })
  expect(await ui.find({ type: 'Text', text: /Exact/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /10 XP/ })).toBeDefined()
  await ui.unmount()
})

test('going further asks the model only when pressed, and shows what it cost', async ($, on) => {
  const forks: string[] = []
  const clock = engine(on, { forks })
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.command.run(command('learn on'))
  await $.prompt.submit({ text: 'Ajoute les membres' } as never)
  await $.tool.call(schema)
  await $.turn.complete({ answer: '', durationMs: 10 } as never)
  await clock.settle()
  expect(forks.length).toBe(0)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'deeper' })
  await clock.settle()
  expect(forks.length).toBe(1)
  expect(forks[0]).toMatch(/ne sait pas coder/)
  expect(await ui.find({ type: 'Text', text: /200 tokens \+ 9000 relus en cache/ })).toBeDefined()
  await ui.unmount()
})

test('an explanation that comes back after the next request is dropped', async ($, on) => {
  let release = () => {}
  const clock = engine(on, { wait: new Promise<void>(r => { release = r }) })
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.command.run(command('learn on'))
  await $.tool.call(schema)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  void ui.press({ key: 'deeper' })
  await clock.settle()
  await $.prompt.submit({ text: 'Maintenant le bouton' } as never)
  release()
  await clock.settle()
  expect(await ui.find({ type: 'Text', text: /Dans votre code/ })).toBeUndefined()
  await ui.unmount()
})

test('a choice made in an earlier session skips the questions', async ($, on) => {
  engine(on, { stored: { settings: { level: 'dev', locale: 'en', learn: false, onboarded: true, motion: true } } })
  await $.session.start(start)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Do you code/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /0 built · 0 requests/ })).toBeDefined()
  await ui.unmount()
})

test('a Task step is ticked by its id on a second request', async ($, on) => {
  engine(on)
  await $.session.start(start)
  await $.command.run(command('level intermediate'))
  await $.prompt.submit({ text: 'Deuxième demande' } as never)
  await $.tool.call({ tool: 'TaskCreate', subject: 'Préparer la base', description: '' } as never)
  await $.tool.call({ tool: 'TaskUpdate', taskId: '7', status: 'completed' } as never)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Étape 1 sur 1/ })).toBeDefined()
  await ui.unmount()
})

const built = async ($: any) => {
  await $.prompt.submit({ text: 'Une app de membres' } as never)
  await $.tool.call(schema)
  await $.tool.call({ tool: 'Write', file_path: '/repo/members-app/src/api/users.mjs', content: '// GET /users' } as never)
  await $.tool.call({ tool: 'Write', file_path: '/repo/members-app/src/components/MemberList.jsx', content: 'export function MemberList() {}' } as never)
  await $.turn.complete({ answer: '', durationMs: 10 } as never)
}

test('a finished request recaps what the app can do, then tours one request through it', async ($, on) => {
  const toasts: string[] = []
  engine(on, { toasts })
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.command.run(command('learn on'))
  await built($)
  expect(toasts.length).toBe(1)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /Votre app sait maintenant/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /afficher « MemberList »/ })).toBeDefined()
  await ui.press({ key: 'tour-start' })
  expect(await ui.find({ type: 'Text', text: /^1 sur 4$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Il s’installe en salle/ })).toBeDefined()
  await ui.press({ key: 'tour-next' })
  expect(await ui.find({ type: 'Text', text: /La salle passe commande/ })).toBeDefined()
  // The lesson follows the tour stop.
  expect(await ui.find({ type: 'Text', text: /^L’API$/ })).toBeDefined()
  await ui.press({ key: 'tour-quit' })
  expect(await ui.find({ type: 'Text', text: /Votre app sait maintenant/ })).toBeDefined()
  await ui.unmount()
})

test('a wrong answer shows the right one and offers a retry; a quiz keeps its notion while Claude moves on', async ($, on) => {
  engine(on)
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.command.run(command('learn on'))
  await $.tool.call(schema)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'quiz-start' })
  const q = quiz('database', 'fr', 0, 'users')
  await ui.press({ key: `quiz-${((q?.right ?? 0) + 1) % 3}` })
  expect(await ui.find({ type: 'Text', text: /La bonne réponse : Dans la table « users »/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Sauf qu/ })).toBeDefined()
  // The next try is another question: the revealed answer is not a free point.
  await ui.press({ key: 'quiz-retry' })
  expect(await ui.find({ type: 'Text', text: /retrouver une information de « users »/ })).toBeUndefined()
  await $.tool.call({ tool: 'Write', file_path: '/repo/members-app/src/api/users.mjs', content: '// GET /users' } as never)
  expect(await ui.find({ type: 'Text', text: /^La base de données$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /une ligne représente/ })).toBeDefined()
  // A quiz can always be left.
  await ui.press({ key: 'quiz-quit' })
  expect(await ui.find({ type: 'Text', text: /^L’API$/ })).toBeDefined()
  await ui.unmount()
})

test('a new session opens on a recall of what was met last time', async ($, on) => {
  engine(on, { stored: { settings: { level: 'beginner', locale: 'fr', learn: true, onboarded: true, motion: true }, progress: { xp: 10, streak: { last: '', days: 0 }, concepts: { api: { seen: 1, correct: 1 } } } } })
  await $.session.start(start)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^La dernière fois$/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', text: /Une question pour s’en souvenir/ })).toBeDefined()
  await ui.unmount()
})

test('a double press counts one answer once', async ($, on) => {
  engine(on)
  await $.session.start(start)
  await $.command.run(command('level beginner'))
  await $.command.run(command('learn on'))
  await $.tool.call(schema)
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'quiz-start' })
  const q = quiz('database', 'fr', 0, 'users')
  await Promise.all([ui.press({ key: `quiz-${q?.right ?? 0}` }), ui.press({ key: `quiz-${q?.right ?? 0}` })])
  expect(await ui.find({ type: 'Text', text: /Acquis 1 sur 2/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /· 10 XP/ })).toBeDefined()
  await ui.unmount()
})
