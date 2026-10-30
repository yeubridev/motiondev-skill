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
const engine = (on: On, open: () => UiOpenResult = () => ({ isPlaced: true })) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'motiondev' } }))
  on('ui.open', () => ({ value: open() }))
  on('ui.toast', () => ({ value: undefined }))
  on('tool.call', () => ({ result: { stdout: 'Tests: 1 failed, 7 passed, 8 total', stderr: '', interrupted: false } }))
}
// A command's input beyond its name and args is the engine's to stamp; a test passes none.
const command = (args: string) => ({ command: 'motiondev', args, origin: {}, presentation: {} } as never)

test('the window draws the scene, the object and the shelf on every surface', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/repo/shop', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/db/schema.sql', content: 'CREATE TABLE users (id serial, email text);' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: /motiondev/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /users/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /built/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /schema\.sql/ })).toBeDefined()
    if (surface === 'terminal') {
      expect(await ui.find({ type: 'Text', text: /╭─────────────╮/ })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /id, email/ })).toBeDefined()
    } else {
      const svg = await ui.find({ type: 'Svg' })
      expect(svg).toBeDefined()
    }
    await ui.unmount()
  }
})

test('a failed test run turns the window red and the band says so', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/repo/shop', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'npm test' })

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await pane.find({ type: 'Text', text: /7 passed, 1 failed/ })).toBeDefined()
  await pane.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /tests/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /7 passed, 1 failed/ })).toBeDefined()
  expect(await band.find({ type: 'Text', text: /╭───╮/ })).toBeUndefined()
  await band.press({ key: 'details' })
  expect(await band.find({ type: 'Text', text: /╭───╮/ })).toBeDefined()
  await band.unmount()
})

test('/motiondev opens the window on demand and reports status', async ($, on) => {
  let opens = 0
  engine(on, () => { opens += 1; return { isPlaced: true } })
  await $.session.start({ cwd: '/repo/shop', surface: 'terminal', isInteractive: true })
  expect(opens).toBe(1)
  const ran = await $.command.run(command(''))
  expect(opens).toBe(2)
  expect(ran.text).toMatch(/window open/)
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/src/components/Button.tsx', content: 'export default function Button() {}' })
  const status = await $.command.run(command('status'))
  expect(status.text).toMatch(/frontend/)
  expect(status.text).toMatch(/Button/)
  expect(status.text).toMatch(/1 built/)
})

test('an unplaced window gets a toast pointing at /motiondev', async ($, on) => {
  const toasts: string[] = []
  mock.clock(on, { now: 1_700_000_000_000 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'motiondev' } }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'too narrow' } }))
  on('ui.toast', (_, e) => { toasts.push(e.text); return { value: undefined } })
  await $.session.start({ cwd: '/repo/shop', surface: 'terminal', isInteractive: true })
  expect(toasts.join(' ')).toMatch(/\/motiondev/)
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
  expect(await ui.find({ type: 'Text', text: /nothing built yet/ })).toBeDefined()
  await ui.unmount()
})
