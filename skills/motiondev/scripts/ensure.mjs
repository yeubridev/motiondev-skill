#!/usr/bin/env node
// Makes sure the motiondev plugin (hooks + the window in the chat) is installed and enabled,
// installing it with the claude CLI when it is not, and prints what the person types next.
// Exit 0: ready (or ready after the printed steps). Exit 2: could not install; the output says what to do.
import { spawnSync } from 'node:child_process'

const ID = 'motiondev@motiondev'
const MARKETPLACE = 'yeubridev/motiondev-skill'
const claude = args => spawnSync('claude', args, { encoding: 'utf8', timeout: 180000 })

const MANUAL = `Install it by hand: type these two prompts in Claude Code, one at a time,
  /plugin marketplace add ${MARKETPLACE}
  /plugin install ${ID}
then /reload-plugins and /motiondev.
Until then, show the canvas in your own replies: run
  npx -y github:${MARKETPLACE} snapshot
and paste its output in a fenced code block (a tool result is folded in the chat; your reply is not).`

const READY = 'Ready: type /motiondev to open the motiondev window in the chat (ctrl+x tab focuses it, /motiondev close closes it).'
const RELOAD = 'Done. Now type /reload-plugins, then /motiondev: the motiondev window opens in the chat and follows every tool call.'

function fail(why) {
  console.log(`motiondev: ${why}\n${MANUAL}`)
  process.exit(2)
}

const listed = claude(['plugin', 'list', '--json'])
if (listed.error || listed.status !== 0) fail(`the claude CLI is not available here (${listed.error?.code ?? listed.stderr?.trim() ?? 'exit ' + listed.status}).`)
let plugins = []
try { plugins = JSON.parse(listed.stdout || '[]') } catch { fail('could not read `claude plugin list --json`.') }
const mine = plugins.find(p => p.id === ID || String(p.id).startsWith('motiondev@'))

if (mine?.enabled) {
  console.log(`motiondev: the plugin is installed and enabled (${mine.id}). ${READY}`)
  process.exit(0)
}
if (process.env.MOTIONDEV_NO_INSTALL === '1') fail(mine ? 'the plugin is installed but disabled.' : 'the plugin is not installed.')

const steps = mine ? [['plugin', 'enable', mine.id]] : [['plugin', 'marketplace', 'add', MARKETPLACE], ['plugin', 'install', ID]]
for (const args of steps) {
  const r = claude(args)
  if (r.error || r.status !== 0) fail(`\`claude ${args.join(' ')}\` failed: ${(r.stderr || r.stdout || r.error?.message || '').trim().split('\n').pop()}`)
}
console.log(`motiondev: ${mine ? 'enabled the plugin' : `installed the plugin ${ID} from github.com/${MARKETPLACE}`}. ${RELOAD}`)
