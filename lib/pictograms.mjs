// The art: one pictogram per scene (animated), one glyph per scene and object,
// and small cards for the thing being made. Box-drawing only: every character
// is one terminal cell, so the drawings line up in any monospace font and in
// the Claude Code band. Pure: no I/O.

export const OBJECTS = {
  database: ['table', 'migration', 'seed', 'index', 'query'],
  api: ['endpoint', 'route', 'model', 'service', 'middleware', 'schema', 'server', 'request'],
  frontend: ['component', 'page', 'style', 'hook', 'asset'],
  tests: ['test', 'run', 'lint'],
  git: ['commit', 'branch', 'push', 'pr'],
  deps: ['package'],
  infra: ['container', 'pipeline', 'deploy'],
  config: ['env', 'setting'],
  docs: ['page'],
  auth: ['guard', 'token', 'login'],
  build: ['bundle'],
  agents: ['agent'],
  explore: ['read', 'search', 'fetch'],
  shell: ['command'],
  think: ['task'],
  code: ['file'],
  idle: [],
}

const LABELS = {
  database: 'backend · database', api: 'backend · api', frontend: 'frontend · ui', tests: 'quality · tests',
  git: 'git', deps: 'dependencies', infra: 'infrastructure', config: 'configuration', docs: 'documentation',
  auth: 'security · auth', build: 'build', agents: 'subagents', explore: 'exploring', shell: 'shell',
  think: 'thinking', code: 'code', idle: 'idle',
}
export const label = scene => LABELS[scene] ?? scene

// What the agent is doing with an object, as a caption.
const VERBS = {
  table: 'creating table', migration: 'writing migration', seed: 'seeding data', index: 'adding index', query: 'querying',
  endpoint: 'exposing endpoint', route: 'wiring route', model: 'shaping model', service: 'writing service', middleware: 'adding middleware', schema: 'defining schema', server: 'running server', request: 'calling',
  component: 'building component', page: 'laying out page', style: 'styling', hook: 'writing hook', asset: 'adding asset',
  test: 'writing test', run: 'running tests', lint: 'checking code',
  commit: 'committing', branch: 'branching', push: 'pushing', pr: 'opening pull request',
  package: 'installing', container: 'containerizing', pipeline: 'running pipeline', deploy: 'deploying',
  env: 'setting environment', setting: 'configuring', guard: 'guarding access', token: 'handling tokens', login: 'building login',
  bundle: 'building', agent: 'delegating', read: 'reading', search: 'searching', fetch: 'fetching', command: 'running',
  task: 'working on', file: 'writing',
}
const DONE = {
  table: 'created table', migration: 'ran migration', seed: 'seeded data', index: 'added index', query: 'queried',
  endpoint: 'exposed endpoint', route: 'wired route', model: 'shaped model', service: 'wrote service', middleware: 'added middleware', schema: 'defined schema', server: 'started server', request: 'called',
  component: 'built component', page: 'laid out page', style: 'styled', hook: 'wrote hook', asset: 'added asset',
  test: 'wrote test', run: 'ran tests', lint: 'checked code',
  commit: 'committed', branch: 'branched', push: 'pushed', pr: 'opened pull request',
  package: 'installed', container: 'containerized', pipeline: 'ran pipeline', deploy: 'deployed',
  env: 'set environment', setting: 'configured', guard: 'guarded access', token: 'handled tokens', login: 'built login',
  bundle: 'built', agent: 'delegated', read: 'read', search: 'searched', fetch: 'fetched', command: 'ran',
  task: 'worked on', file: 'wrote',
}
export const verb = (object, scene, status) => (status === 'done' || status === 'fail' ? DONE[object] : VERBS[object]) ?? VERBS[object] ?? (scene === 'idle' ? 'waiting' : 'working on')

// ANSI 256 colors, one per scene.
const COLORS = { database: 75, api: 215, frontend: 177, tests: 114, git: 210, deps: 221, infra: 80, config: 246, docs: 252, auth: 214, build: 173, agents: 183, explore: 245, shell: 243, think: 228, code: 111, idle: 242 }
export const sceneColor = scene => COLORS[scene] ?? 250
// The same palette as hex, for surfaces that take CSS colors (the Claude Code band).
const HEX = { database: '#5fafff', api: '#ffaf5f', frontend: '#d787ff', tests: '#87d787', git: '#ff8787', deps: '#ffd75f', infra: '#5fd7d7', config: '#949494', docs: '#d0d0d0', auth: '#ffaf00', build: '#d7875f', agents: '#d7afff', explore: '#8a8a8a', shell: '#767676', think: '#ffff87', code: '#87afff', idle: '#6c6c6c' }
export const sceneHex = scene => HEX[scene] ?? '#bcbcbc'

const GLYPHS = {
  database: '▤', api: '⇄', frontend: '◫', tests: '✓', git: '●', deps: '⊞', infra: '▣', config: '◎', docs: '▬', auth: '◉', build: '⊠', agents: '◒', explore: '∗', shell: '$', think: '✧', code: '▫', idle: '◌',
  table: '▦', migration: '▤', seed: '✱', index: '▥', query: '≡',
  endpoint: '⇄', route: '⇄', model: '◈', service: '◆', middleware: '◇', schema: '≣', server: '▣', request: '→',
  component: '◫', page: '▭', style: '◐', hook: '↻', asset: '◍',
  test: '✓', run: '▶', lint: '✎',
  commit: '●', branch: '⋔', push: '↑', pr: '⇉',
  package: '⊞', container: '▣', pipeline: '≫', deploy: '▲',
  env: '◦', setting: '◎', guard: '◘', token: '◉', login: '◙', bundle: '⊠', agent: '◒',
  read: '·', search: '∗', fetch: '↓', command: '$', task: '✧', file: '▫',
}
const GLYPHS_ASCII = {
  database: '=', api: '>', frontend: '#', tests: 'v', git: '*', deps: '%', infra: '[', config: '~', docs: '"', auth: '@', build: '^', agents: '&', explore: '?', shell: '$', think: '!', code: '{', idle: 'o',
  table: '#', migration: '=', seed: '*', index: '+', query: ';',
  endpoint: '>', route: '>', model: '%', service: '&', middleware: '|', schema: ':', server: '[', request: '-',
  component: '#', page: '_', style: '~', hook: '@', asset: '.',
  test: 'v', run: '>', lint: "'",
  commit: 'o', branch: 'Y', push: '^', pr: '}',
  package: '%', container: '[', pipeline: '>', deploy: '^',
  env: '.', setting: '~', guard: '!', token: '@', login: '@', bundle: '^', agent: '&',
  read: '.', search: '?', fetch: 'v', command: '$', task: '!', file: '-',
}
export const glyph = (key, { ascii = false } = {}) => (ascii ? GLYPHS_ASCII[key] ?? '.' : GLYPHS[key] ?? '·')

// One ASCII cell for every non-ASCII cell the art uses: widths never change.
const ASCII_MAP = {
  '─': '-', '│': '|', '┌': '+', '┐': '+', '└': '+', '┘': '+', '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
  '╭': '.', '╮': '.', '╰': "'", '╯': "'", '╱': '/', '╲': '\\', '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
  '▓': '#', '▒': '%', '░': '.', '▪': '*', '▫': 'o', '●': 'O', '○': 'o', '◉': '@', '◎': '@', '◦': '.', '·': '.',
  '▸': '>', '▶': '>', '◀': '<', '◁': '<', '▲': '^', '▼': 'v', '▮': '|', '▬': '-', '▭': '_', '▦': '#', '▤': '=', '▥': '+', '▣': '#',
  '⊞': '#', '⊠': 'x', '⊟': '-', '◫': '#', '◈': '%', '◆': '&', '◇': '^', '◐': '(', '◑': ')', '◒': '&', '◓': '&', '◍': 'o', '◌': 'o', '◘': '!', '◙': '@',
  '≡': '=', '≣': '=', '⇄': '~', '⇉': '>', '≫': '>', '↑': '^', '↓': 'v', '→': '>', '←': '<', '↻': '@', '✓': 'v', '✗': 'x', '✎': "'", '✱': '*', '✧': '*', '✦': '*',
  '∿': '~', '⋔': 'Y', '∗': '*', '▀': '^', '▄': '_', '█': '#', '▁': '_', '▂': '.', '▃': ':', '▅': '-', '▆': '=', '▇': '+', '∙': '.',
}
export const toAscii = s => [...s].map(ch => (ch.codePointAt(0) < 0x7f ? ch : ASCII_MAP[ch] ?? '?')).join('')

const cells = s => [...s].length
const padTo = (s, w) => s + ' '.repeat(Math.max(0, w - cells(s)))
export const fit = (s, w) => (cells(s) > w ? [...s].slice(0, Math.max(0, w - 1)).join('') + '…' : s)
const fitAscii = (s, w, ascii) => (ascii ? toAscii(fit(s, w)) : fit(s, w))
