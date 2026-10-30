import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'motiondev',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const

test('the band follows a Write and a failed test run, on terminal and desktop', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: { stdout: 'Tests: 1 failed, 7 passed, 8 total', stderr: '', interrupted: false } }))

  await $.session.start({ cwd: '/repo/shop', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Write', file_path: '/repo/shop/db/schema.sql', content: 'CREATE TABLE users (id int);' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /database/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /users/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /built 1/ })).toBeDefined()
    await ui.unmount()
  }

  await $.tool.call({ tool: 'Bash', command: 'npm test' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /tests/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /7 passed, 1 failed/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /╭───╮/ })).toBeUndefined()
  await ui.press({ key: 'details' })
  expect(await ui.find({ type: 'Text', text: /╭───╮/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /npm test/ })).toBeDefined()
  await ui.unmount()
})

test('Hide yields the band to the engine', async ($, on) => {
  mock.clock(on)
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

test('a canvas an earlier version stored is declined and the band starts idle', async ($, on) => {
  mock.clock(on)
  on('state.get', (_, e) => ({ value: e.key === 'canvas' ? { value: { current: { scene: 'nowhere' } }, version: 1 } : { value: undefined, version: 0 } }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /idle/ })).toBeDefined()
  await ui.unmount()
})
