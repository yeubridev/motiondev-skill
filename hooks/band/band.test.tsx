import type { On, UiOpenResult } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'motiondev',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const

const PANE = {
  plugin: 'motiondev',
  component: 'Pane',
  requestId: 'motiondev',
  props: { title: 'motiondev', isFocused: false, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

// Nothing sits beneath the plugin in a test: these hooks stand for the engine.
const engine = (on: On, { open = () => ({ isPlaced: true }) as UiOpenResult, file = '', session = 'sess-1', toasts = [] as string[], result = { stdout: 'Tests: 1 failed, 7 passed, 8 total', stderr: '', interrupted: false }, fails = () => false }: { open?: () => UiOpenResult; file?: string; session?: string; toasts?: string[]; result?: Record<string, unknown>; fails?: () => boolean } = {}) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.env(on, { HOME: '/home/u' })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: session }))
  on('fs.read', (_, e) => (file && e.path === '/home/u/.motiondev/events.jsonl' ? { value: file } : Promise.reject(new Error('ENOENT'))))
  on('command.register', () => ({ value: { command: 'motiondev' } }))
  on('ui.open', () => ({ value: open() }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  on('tool.call', () => (fails() ? { result, isError: true } : { result }))
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('ui.close', () => ({ value: undefined }))
}
// A command's input beyond its name and args is the engine's to stamp; a test passes none.
const command = (args: string) => ({ command: 'motiondev', args, origin: {}, presentation: {} } as never)
const start = (surface: 'terminal' | 'desktop' | null = 'terminal') => ({ cwd: '/repo/shop', surface, isInteractive: surface !== null })

test('the window draws the blueprint on every surface: the build in its zones, the caret, the ticker', async ($, on) => {
  engine(on)
  await $.session.start(start())
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/db/schema.sql', content: 'CREATE TABLE users (id serial, email text);' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /motiondev/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /users/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /schema\.sql/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /id, email/ })).toBeDefined()
    if (surface === 'terminal') {
      // The database box holds the table, the caret after it; no action card.
      expect(await ui.find({ type: 'Text', text: /┌─/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /database/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /▌/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /╭──────────╮/ })).toBeUndefined()
    } else {
      const svg = await ui.find({ type: 'Svg' })
      expect(svg).toBeDefined()
      expect((svg as { props?: { source?: string } } | undefined)?.props?.source).toMatch(/database/)
    }
    await ui.unmount()
  }
})

test('/motiondev view action draws the action on its object instead, and view blueprint comes back', async ($, on) => {
  engine(on)
  await $.session.start(start())
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/db/schema.sql', content: 'CREATE TABLE users (id serial, email text);' })
  expect((await $.command.run(command('view action'))).text).toMatch(/current action/)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  // The table card sits inside the cylinder, its name and columns written on it, over the shelf.
  expect(await ui.find({ type: 'Text', text: /╭──────────╮/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /│ email\s+│/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /built/ })).toBeDefined()
  await ui.unmount()
  expect((await $.command.run(command('view blueprint'))).text).toMatch(/whole build/)
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /╭──────────╮/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /┌─/ })).toBeDefined()
  await ui.unmount()
})

test('a failed write is a red ghost in its zone until the retry lands', async ($, on) => {
  let failing = true
  engine(on, { fails: () => failing })
  await $.session.start(start())
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/src/components/UserList.tsx', content: 'export default function UserList() {}' })
  // The name is its own run of text inside the box's line, painted on its own.
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const ghost = await ui.find({ type: 'Text', text: /^UserList$/ })
  expect(ghost).toBeDefined()
  expect((ghost as { props?: { color?: string } } | undefined)?.props?.color).toBe('#ff6b6b')
  expect(await ui.find({ type: 'Text', text: /^✗$/ })).toBeDefined()
  await ui.unmount()
  failing = false
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/src/components/UserList.tsx', content: 'export default function UserList() {}' })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const whole = await ui.find({ type: 'Text', text: /^UserList$/ })
  expect(whole).toBeDefined()
  expect((whole as { props?: { color?: string } } | undefined)?.props?.color).not.toBe('#ff6b6b')
  expect(await ui.find({ type: 'Text', text: /^✗$/ })).toBeUndefined()
  await ui.unmount()
  const status = await $.command.run(command('status'))
  expect(status.text).toMatch(/1 built/)
})

test('the window opens at session start even before a surface attaches (the desktop app attaches later)', async ($, on) => {
  let opens = 0
  engine(on, { open: () => { opens += 1; return { isPlaced: false, reason: 'no surface attached' } } })
  await $.session.start(start(null))
  expect(opens).toBe(1)
})

test('a reload re-runs session.start without wiping what was built', async ($, on) => {
  engine(on)
  await $.session.start(start())
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/src/components/Button.tsx', content: 'export default function Button() {}' })
  await $.session.start(start())
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Button/ })).toBeDefined()
  await ui.unmount()
})

test('a fresh window replays this session from the event file (narration made before the plugin loaded)', async ($, on) => {
  const now = 1_700_000_000_000
  const file = [
    { ts: now - 9_000_000, kind: 'object', scene: 'docs', weight: 'major', source: 'agent', object: 'page', name: 'too old' },
    { ts: now - 60_000, kind: 'object', scene: 'database', weight: 'major', source: 'agent', object: 'table', name: 'orders', detail: 'id, total' },
    { ts: now - 30_000, kind: 'object', scene: 'api', weight: 'major', source: 'agent', object: 'endpoint', name: 'POST /orders' },
  ].map(e => JSON.stringify(e)).join('\n') + '\n'
  engine(on, { file })
  await $.session.start(start())
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /orders/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /POST \/orders/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /too old/ })).toBeUndefined()
  await ui.unmount()
})

test("the agent's narration through emit.mjs shows in the window", async ($, on) => {
  engine(on, { result: { stdout: 'motiondev · database · table users', stderr: '', interrupted: false } })
  await $.session.start(start())
  await $.tool.call({ tool: 'Bash', command: 'node /home/u/.claude/skills/motiondev/scripts/emit.mjs database table users --detail "id, email, password_hash"' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /users/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /id, email, password_hash/ })).toBeDefined()
  await ui.unmount()
})

test('the ticker fits the pane body, not the whole screen, and keeps the newest events', async ($, on) => {
  engine(on, { result: { stdout: '', stderr: '' } })
  await $.session.start(start())
  for (let i = 0; i < 12; i++) await $.tool.call({ tool: 'Bash', command: `echo step-${i}` })
  // Ten body rows: one for the head, one for the waiting caret, one for the caption, three gaps, four events.
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal', viewport: { columns: 120, rows: 50 }, props: { ...PANE.props, scroll: { offset: 0, bodyRows: 10 } } } as never)
  expect(await ui.find({ type: 'Text', text: /step-11/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /step-8\b/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /step-7\b/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /step-0\b/ })).toBeUndefined()
  await ui.unmount()
})

test("a subagent's end of turn does not mark the main turn done", async ($, on) => {
  engine(on)
  await $.session.start(start())
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/db/schema.sql', content: 'CREATE TABLE users (id int);' })
  await $.turn.complete({ answer: '', durationMs: 10, agentId: 'sub-1' } as never)
  let status = await $.command.run(command('status'))
  expect(status.text).not.toMatch(/turn done/)
  await $.turn.complete({ answer: '', durationMs: 10 } as never)
  status = await $.command.run(command('status'))
  expect(status.text).toMatch(/turn done/)
})

test('a slash command is not a new turn', async ($, on) => {
  engine(on)
  await $.session.start(start())
  await $.prompt.submit({ text: '/motiondev status', command: { name: 'motiondev', args: 'status' } } as never)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /turn 1/ })).toBeUndefined()
  await ui.unmount()
})

test('/motiondev opens the window, reports status, tolerates spacing and explains unknown words', async ($, on) => {
  let opens = 0
  engine(on, { open: () => { opens += 1; return { isPlaced: true } } })
  await $.session.start(start())
  expect(opens).toBe(1)
  expect((await $.command.run(command(''))).text).toMatch(/window open/)
  expect(opens).toBe(2)
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/src/components/Button.tsx', content: 'export default function Button() {}' })
  const status = await $.command.run(command('  STATUS '))
  expect(status.text).toMatch(/frontend/)
  expect(status.text).toMatch(/1 built/)
  expect((await $.command.run(command('band  off'))).text).toMatch(/hidden/)
  expect((await $.command.run(command('band   on'))).text).toMatch(/shown/)
  expect((await $.command.run(command('banana'))).text).toMatch(/usage/)
  expect((await $.command.run(command('view sideways'))).text).toMatch(/usage/)
  expect(opens).toBe(2)
})

// The kit raises no person's close (ui.close is the engine's to raise); /motiondev close sets the same latch.
test('the window opens by itself with the first prompt, and stays closed once closed', async ($, on) => {
  let opens = 0
  engine(on, { open: () => { opens += 1; return { isPlaced: true } } })
  await $.session.start(start())
  expect(opens).toBe(1)
  await $.prompt.submit({ text: 'add a users table' } as never)
  expect(opens).toBe(2)
  await $.command.run(command('close'))
  await $.prompt.submit({ text: 'and an endpoint' } as never)
  expect(opens).toBe(2)
  await $.command.run(command(''))
  expect(opens).toBe(3)
  await $.prompt.submit({ text: 'and the tests' } as never)
  expect(opens).toBe(4)
})

test('an unplaced window gets one toast pointing at /motiondev, not one per reload', async ($, on) => {
  const toasts: string[] = []
  engine(on, { open: () => ({ isPlaced: false, reason: 'too narrow' }), toasts })
  await $.session.start(start())
  await $.session.start(start())
  expect(toasts.join(' ')).toMatch(/\/motiondev/)
  expect(toasts.length).toBe(1)
})

test('the band unfolds the pictogram in a monospaced face on the desktop too, and says when it fails', async ($, on) => {
  engine(on)
  await $.session.start(start())
  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect(await band.find({ type: 'Text', text: /7 passed, 1 failed/ })).toBeDefined()
    expect(await band.find({ type: 'Text', text: /┌─ ▶ run/ })).toBeUndefined()
    await band.press({ key: 'details' })
    const art = await band.find({ type: 'Text', text: /┌─ ▶ run/ })
    expect(art).toBeDefined()
    expect((art as { props?: { mono?: boolean } } | undefined)?.props?.mono).toBe(true)
    await band.press({ key: 'details' })
    await band.unmount()
  }
})

test('Hide yields the band to the engine', async ($, on) => {
  engine(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /motiondev|idle/ })).toBeDefined()
  await ui.press({ key: 'hide' })
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('a canvas an earlier version stored is declined and the window starts idle', async ($, on) => {
  mock.clock(on)
  on('state.get', (_, e) => ({ value: e.key === 'canvas' ? { value: { current: { scene: 'nowhere' } }, version: 1 } : { value: undefined, version: 0 } }))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /waiting for the agent/ })).toBeDefined()
  await ui.unmount()
})
