// Action-centric pictograms: the zone on the left, an arrow, the object card on
// the right. Every cell is one terminal column: box drawing (U+2500-257F),
// block elements (U+2580-259F), geometric shapes (U+25A0-25FF), arrows
// (U+2190-21FF), ASCII and the ellipsis. Pure: no I/O, no Node globals.

const W = 40, H = 8, ZONE_W = 16, ARROW_X = 16, CARD_X = 19

// ---------------------------------------------------------------- text utils
const cells = s => [...s].length
const padTo = (s, w) => (cells(s) >= w ? [...s].slice(0, w).join('') : s + ' '.repeat(w - cells(s)))
export const fit = (s, w) => (cells(s) > w ? [...s].slice(0, Math.max(0, w - 1)).join('') + '…' : s)
const center = (s, w) => {
  s = fit(s, w)
  const left = Math.floor((w - cells(s)) / 2)
  return ' '.repeat(left) + s + ' '.repeat(w - cells(s) - left)
}
const head = (s, n) => [...s].slice(0, n).join('')
const split = (s, max = 3) => String(s ?? '').split(',').map(x => x.trim()).filter(Boolean).slice(0, max)
// A name is data, never a key into the tables below: `constructor` must not find Object's.
const own = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined)

// Names and details come from code and commands: one cell per character, no control codes.
const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6\u{1f000}-\u{1faff}\u{20000}-\u{3fffd}]/gu
export function clean(s, { ascii = false } = {}) {
  let t = String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ')
  t = ascii ? t.normalize('NFD').replace(/\p{M}/gu, '') : t.normalize('NFC').replace(/\p{M}/gu, '')
  return t.replace(/\p{Cf}/gu, '').replace(WIDE, '?').replace(/ {2,}/g, ' ').trim()
}

// One ASCII cell for every non-ASCII cell the art uses, so widths never change.
export const ASCII_MAP = {
  '─': '-', '│': '|', '┌': '+', '┐': '+', '└': '+', '┘': '+', '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
  '╭': '.', '╮': '.', '╰': "'", '╯': "'", '╱': '/', '╲': '\\', '╌': '-', '╎': ':', '╷': "'", '╵': "'", '╶': '-', '╴': '-',
  '═': '=', '║': '|', '╔': '+', '╗': '+', '╚': '+', '╝': '+',
  '━': '=', '┃': '|', '┏': '#', '┓': '#', '┗': '#', '┛': '#',
  '▓': '#', '▒': '%', '░': '.', '█': '#', '▀': '^', '▄': '_', '▔': '~', '▌': '|', '▐': '|',
  '▪': '*', '▫': 'o', '■': '#', '□': '_', '●': 'O', '○': 'o', '◉': '@', '◎': '@', '◦': '.',
  '◇': '<', '◆': '*', '◫': '#', '▣': '#', '▤': '=', '▥': '+', '▦': '#', '▩': '%', '▬': '-', '▭': '_',
  '▲': '^', '▼': 'v', '▶': '>', '◀': '<', '▴': '^', '▸': '>', '◡': 'u', '◌': 'o', '◒': '&',
  '⇄': '~', '⇉': '>', '→': '>', '←': '<', '…': '~',
}
export const toAscii = s => [...s].map(ch => (ch.codePointAt(0) < 0x7f ? ch : ASCII_MAP[ch] ?? '?')).join('')

// ---------------------------------------------------------------- canvas
const blank = (w, h) => Array.from({ length: h }, () => Array(w).fill(' '))
const grid = lines => lines.map(l => [...padTo(l, ZONE_W)])
const rows = cv => cv.map(r => r.join(''))
function put(cv, x, y, lines, clip, transparent = false) {
  lines.forEach((line, dy) => {
    const yy = y + dy
    if (yy < 0 || yy >= cv.length) return
    if (clip && (yy < clip.y0 || yy > clip.y1)) return
    ;[...line].forEach((ch, dx) => {
      const xx = x + dx
      if (xx < 0 || xx >= cv[yy].length) return
      if (clip && (xx < clip.x0 || xx > clip.x1)) return
      if (transparent && ch === ' ') return
      cv[yy][xx] = ch
    })
  })
}
const stamp = (cv, x, y, lines) => put(cv, x, y, lines, undefined, true)
const at = (cv, x, y, s) => put(cv, x, y, [s])

// ---------------------------------------------------------------- objects
export const GLYPH = {
  table: '▤', migration: '▥', seed: '▦', index: '▥', query: '▬',
  endpoint: '⇄', route: '⇄', model: '◆', service: '◆', middleware: '◇', schema: '▤', server: '▣', request: '→',
  component: '◫', page: '▭', style: '◆', hook: '◇', asset: '▫',
  test: '□', run: '▶', lint: '▸',
  commit: '●', branch: '○', push: '▲', pr: '⇉',
  package: '▦', container: '▣', pipeline: '⇉', deploy: '▲',
  env: '◎', setting: '◎', guard: '▣', token: '◉', login: '◉',
  bundle: '▩', agent: '◒', read: '◌', search: '◌', fetch: '←', command: '$', task: '◇', file: '▫', idle: '◌',
}
const VERB = {
  'docs/page': 'writing', 'tests/run': 'running',
  table: 'creating', migration: 'applying', seed: 'seeding', index: 'indexing', query: 'querying',
  endpoint: 'exposing', route: 'wiring', model: 'shaping', service: 'writing', middleware: 'inserting', schema: 'defining', server: 'starting', request: 'calling',
  component: 'building', page: 'laying out', style: 'styling', hook: 'writing', asset: 'adding',
  test: 'writing', run: 'running', lint: 'linting',
  commit: 'committing', branch: 'branching', push: 'pushing', pr: 'opening',
  package: 'installing', container: 'building', pipeline: 'running', deploy: 'deploying',
  env: 'setting', setting: 'configuring', guard: 'guarding', token: 'minting', login: 'building',
  bundle: 'bundling', agent: 'delegating', read: 'reading', search: 'searching', fetch: 'fetching', command: 'running', task: 'thinking', file: 'writing', idle: 'waiting',
}
const DONE = {
  'docs/page': 'written',
  table: 'created', migration: 'applied', seed: 'seeded', index: 'indexed', query: 'queried',
  endpoint: 'exposed', route: 'wired', model: 'shaped', service: 'written', middleware: 'inserted', schema: 'defined', server: 'started', request: 'called',
  component: 'built', page: 'laid out', style: 'styled', hook: 'written', asset: 'added',
  test: 'written', run: 'passed', lint: 'linted',
  commit: 'committed', branch: 'branched', push: 'pushed', pr: 'opened',
  package: 'installed', container: 'built', pipeline: 'ran', deploy: 'live',
  env: 'set', setting: 'configured', guard: 'guarding', token: 'minted', login: 'built',
  bundle: 'bundled', agent: 'reported', read: 'read', search: 'found', fetch: 'fetched', command: 'ran', task: 'done', file: 'written', idle: 'idle',
}
// Which way the arrow points: the card goes into the zone, or the zone emits it.
const INTO = new Set(['table', 'migration', 'seed', 'index', 'middleware', 'component', 'page', 'style', 'hook', 'asset', 'commit', 'pr', 'container', 'env', 'setting', 'page', 'test', 'guard', 'token', 'login', 'file', 'schema', 'model', 'service'])

// ---------------------------------------------------------------- zones
// Each zone returns the frames of the action, 16 cells wide and 8 rows tall.

const CYLINDER = [
  '  ╭──────────╮  ',
  ' ╭╯          ╰╮ ',
  ' │╰──────────╯│ ',
  ' │            │ ',
  ' │            │ ',
  ' │            │ ',
  ' ╰╮          ╭╯ ',
  '  ╰──────────╯  ',
]
const WINDOW = [
  '┌──────────────┐',
  '│ ○ ○ ○ ░░░░░░ │',
  '├──────────────┤',
  '│              │',
  '│              │',
  '│              │',
  '│              │',
  '└──────────────┘',
]
const FLASK = [
  '    ╶┬────┬╴    ',
  '     │    │     ',
  '     │    │     ',
  '    ╱      ╲    ',
  '   ╱        ╲   ',
  '  ╱          ╲  ',
  ' │            │ ',
  ' ╰────────────╯ ',
]
const flask = (liquid, bubbles = []) => {
  const cv = grid(FLASK)
  at(cv, 3, 5, liquid.repeat(10))
  at(cv, 2, 6, liquid.repeat(12))
  bubbles.forEach(([x, y, ch]) => at(cv, x, y, ch))
  return rows(cv)
}

const ZONES = {
  // The table card slides into the cylinder, clipped by its walls.
  table({ name }) {
    const card = ['┌────────┐', '│' + center(name, 8) + '│', '└────────┘']
    return [11, 7, 3].map(x => {
      const cv = grid(CYLINDER)
      put(cv, x, 3, card, { x0: 2, x1: 13, y0: 3, y1: 5 })
      return rows(cv)
    })
  },
  // A new layer fills in at the bottom of the stack, then takes the migration's name.
  migration({ name }) {
    return [3, 7, 10].map((n, k) => {
      const cv = grid(CYLINDER)
      at(cv, 3, 3, '▒'.repeat(10))
      at(cv, 3, 4, '▒'.repeat(10))
      at(cv, 3, 5, k === 2 ? center(name, 10) : '▓'.repeat(n) + '░'.repeat(10 - n))
      if (k === 2) at(cv, 2, 5, '▸')
      return rows(cv)
    })
  },
  // The request leaves the server carrying its method; the client screen lights up.
  endpoint({ name }) {
    const base = [
      '┌─────┐         ',
      '│▪▪▪  │         ',
      '│     │     ┌──┐',
      '│ srv │     │  │',
      '│     │     └──┘',
      '│▪▪▪  │      ┴  ',
      '│     │         ',
      '└─────┘         ',
    ]
    const m = head((name || '').split(/\s+/)[0] || 'req', 4)
    const wire = ['─▶   ', padTo(m, 4).replace(/ /g, '─') + '▶', '────▶']
    return wire.map((w, k) => {
      const cv = grid(base)
      at(cv, 7, 3, w)
      if (k === 2) at(cv, 13, 3, '▓▓')
      return rows(cv)
    })
  },
  // A packet runs through the middleware box, which lights up while it holds it.
  middleware({ name }) {
    return [0, 1, 2].map(k => {
      const cv = grid([
        '┌──────────────┐',
        '│ srv          │',
        '│              │',
        '│    ┌──────┐  │',
        '│    │      │  │',
        '│    └──────┘  │',
        '│              │',
        '└──────────────┘',
      ])
      at(cv, 1, 3, k === 0 ? ' ●─▶' : ' ──▶')
      if (k === 1) put(cv, 5, 3, ['┏━━━━━━┓', '┃' + center(name, 6) + '┃', '┗━━━━━━┛'])
      else at(cv, 6, 4, center(name, 6))
      at(cv, 13, 3, k === 2 ? '●▶' : '─▶')
      return rows(cv)
    })
  },
  // The component block appears in the browser window, then gets its name.
  component({ name }) {
    const ghost = ['┌╌╌╌╌╌╌╌╌╌╌┐', '╎          ╎', '╎          ╎', '└╌╌╌╌╌╌╌╌╌╌┘']
    const box = ['┌──────────┐', '│          │', '│          │', '└──────────┘']
    const full = ['┌──────────┐', '│' + center(name, 10) + '│', '│ ▪▪▪▪▪ ▪▪ │', '└──────────┘']
    return [ghost, box, full].map(b => {
      const cv = grid(WINDOW)
      put(cv, 2, 3, b)
      return rows(cv)
    })
  },
  // The page's url sits in the address bar while the page body paints in.
  page({ name }) {
    return [0, 1, 2].map(k => {
      const cv = grid(WINDOW)
      at(cv, 1, 1, ' ○○ ' + padTo(fit(name, 9), 9) + ' ')
      if (k >= 1) at(cv, 2, 3, '▀▀▀▀▀▀▀▀▀▀▀▀')
      if (k >= 2) {
        at(cv, 2, 4, '░░░░░░ ░░░░░')
        at(cv, 2, 5, '░░░░░░ ░░░░░')
        at(cv, 2, 6, '▒▒▒▒        ')
      }
      return rows(cv)
    })
  },
  // The flask bubbles while the suite runs, settles when it passes, boils over when it fails.
  run({ status }) {
    if (status === 'done') return [flask('▓')]
    if (status === 'fail') return [flask('▒', [[5, 4, '▴'], [9, 4, '▴'], [7, 3, '▴'], [6, 2, '▴']])]
    return [
      flask('▓', [[5, 5, '○'], [9, 5, '◦'], [7, 4, '◦']]),
      flask('▓', [[4, 5, '◦'], [8, 5, '○'], [6, 4, '○'], [8, 3, '◦']]),
      flask('▓', [[6, 5, '◦'], [10, 5, '○'], [5, 4, '◦'], [7, 2, '◦'], [9, 3, '○']]),
    ]
  },
  // A drop falls into the flask: one more case in the suite.
  test() {
    return [
      flask('▓', [[7, 1, '●']]),
      flask('▓', [[7, 3, '●']]),
      flask('▓', [[7, 5, '●'], [6, 4, '◦'], [8, 4, '◦']]),
    ]
  },
  // The new commit node lights up at the top of the graph and gets its message on a tag.
  commit({ name }) {
    const base = [
      '  ○             ',
      '  │             ',
      '  ●             ',
      '  │╲            ',
      '  │ ●           ',
      '  │╱            ',
      '  ●             ',
      '  │             ',
    ]
    return ['○', '◉', '●'].map((node, k) => {
      const cv = grid(base)
      at(cv, 2, 0, node)
      if (k === 2) at(cv, 3, 0, '◀' + padTo(fit(name, 12), 12))
      return rows(cv)
    })
  },
  // The feature branch draws its merge line back into main; the merge node lights up.
  pr({ name }) {
    const base = [
      '  │             ',
      '  │             ',
      '  ○             ',
      '  │             ',
      '  │ ●           ',
      '  │╱            ',
      '  ●             ',
      '  │             ',
    ]
    return [0, 1, 2].map(k => {
      const cv = grid(base)
      if (k >= 1) at(cv, 3, 3, '╲')
      if (k === 2) at(cv, 2, 2, '◉◀' + padTo(fit(name, 12), 12))
      return rows(cv)
    })
  },
  // The parcel opens and the packages it holds show their names.
  package({ name }) {
    const closed = [
      '                ',
      '                ',
      '  ┌──────────┐  ',
      '  ├────┬┬────┤  ',
      '  │    ││    │  ',
      '  │    ││    │  ',
      '  │    ││    │  ',
      '  └────┴┴────┘  ',
    ]
    const open = [
      '╱              ╲',
      ' ╱            ╲ ',
      '  ┌──────────┐  ',
      '  │          │  ',
      '  │          │  ',
      '  │          │  ',
      '  │          │  ',
      '  └──────────┘  ',
    ]
    const cv = grid(open)
    at(cv, 3, 0, '◇')
    at(cv, 12, 0, '◇')
    split(name).forEach((p, i) => at(cv, 3, 3 + i, ' ▪ ' + padTo(fit(p, 7), 7)))
    return [closed, open, rows(cv)]
  },
  // Image layers stack up inside the container, the top one carrying the file's name.
  container({ name }) {
    const base = [
      '                ',
      '                ',
      '                ',
      '                ',
      '                ',
      ' ║▓▓▓▓▓▓▓▓▓▓▓▓║ ',
      ' ╚════════════╝ ',
      '~~~~~~~~~~~~~~~~',
    ]
    return [0, 1, 2].map(k => {
      const cv = grid(base)
      if (k >= 1) at(cv, 1, 4, '║▒▒▒▒▒▒▒▒▒▒▒▒║')
      if (k >= 2) {
        at(cv, 1, 3, '║' + center(name, 12) + '║')
        at(cv, 1, 2, '╔════════════╗')
      }
      return rows(cv)
    })
  },
  // The rocket lifts off the pad, smoke spreading under it.
  deploy({ status }) {
    const rocket = ['  ▲  ', ' ╱█╲ ', ' │○│ ', '╱███╲']
    const frame = (y, flame, smoke) => {
      const cv = grid(['', '', '', '', '', '', '', '  ▔▔▔▔▔▔▔▔▔▔▔▔  '])
      put(cv, 5, y, rocket)
      at(cv, 5, y + 4, flame)
      smoke.forEach((s, i) => at(cv, 0, 7 - i, s))
      return rows(cv)
    }
    if (status === 'done') {
      const cv = grid(['', '', '', '', '', '', '', '  ▔▔▔▔▔▔▔▔▔▔▔▔  '])
      put(cv, 5, 0, rocket)
      at(cv, 5, 4, ' ▼▼▼ ')
      at(cv, 2, 1, '◇')
      at(cv, 12, 2, '◇')
      at(cv, 3, 4, '◇')
      return [rows(cv)]
    }
    return [
      frame(3, ' ▼▼▼ ', ['     ░░░░░      ']),
      frame(2, '  ▼  ', ['   ░░░░░░░░░    ', '     ░░░░░      ']),
      frame(1, ' ▼▼▼ ', [' ░░░░░░░░░░░░░  ', '   ░░░░░░░░░    ', '     ░░░░░      ']),
    ]
  },
  // Sliders move on the settings panel while the file's name is typed in.
  env({ name }) {
    const knobs = [[2, 7, 10], [4, 5, 9], [6, 3, 8]]
    const n = cells(fit(name, 12))
    return [0, 1, 2].map(k => {
      const cv = grid([
        '┌──────────────┐',
        '│              │',
        '│              │',
        '│              │',
        '├──────────────┤',
        '│              │',
        '│              │',
        '└──────────────┘',
      ])
      knobs.forEach((row, i) => {
        const line = [...'─'.repeat(12)]
        line[row[k]] = '○'
        at(cv, 2, 1 + i, line.join(''))
      })
      const shown = k === 2 ? fit(name, 12) : head(fit(name, 12), Math.ceil((n * (k + 1)) / 3))
      at(cv, 2, 5, k === 2 ? shown : shown + '▌')
      return rows(cv)
    })
  },
  // The right-hand page of the open book fills with lines under the page's title.
  page_docs({ name }) {
    const base = [
      ' ╭──────┬──────╮',
      ' │ ──── │      │',
      ' │ ──── │      │',
      ' │ ──── │      │',
      ' │ ──── │      │',
      ' │ ──── │      │',
      ' ╰──────┴──────╯',
      '                ',
    ]
    const lines = [[' ▌    '], [' ──── ', ' ──▌  '], [' ──── ', ' ──── ', ' ───  ', ' ─▌   ']]
    return lines.map(ls => {
      const cv = grid(base)
      at(cv, 9, 1, center(name, 6))
      ls.forEach((l, i) => at(cv, 9, 2 + i, l))
      return rows(cv)
    })
  },
  // A visitor reaches the locked door, is checked, and the door opens for it.
  guard() {
    const door = ['│▓▓▓▓▓│', '│▓▓◉▓▓│', '│▓▓▓▓▓│', '│▓▓▓▓▓│', '│▓▓▓▓▓│', '│▓▓▓▓▓│']
    const open = ['│     │', '│     │', '│     │', '│     │', '│     │', '│     │']
    const frame = (panel, visitor) => {
      const cv = grid(['       ╭─────╮  ', '', '', '', '', '', '', ' ▔▔▔▔▔▔▔▔▔▔▔▔▔▔ '])
      put(cv, 7, 1, panel)
      at(cv, 0, 3, visitor)
      return rows(cv)
    }
    const checking = door.map((l, i) => (i === 1 ? '│▓▓○▓▓│' : l))
    return [frame(door, ' ●─▶   '), frame(checking, '    ●? '), frame(open, '       │ ●─▶ │ ')]
  },
  // The key slides into the lock, which lights up once it turns.
  token() {
    const key = ['╭──╮    ', '│  ├─┬─┬', '╰──╯ ╵ ╵']
    const lock = [' ╭─╮ ', '┌┴─┴┐', '│ ◎ │', '└───┘']
    return [0, 2, 4].map((x, k) => {
      const cv = grid(['', '', '', '', '', '', '', ''])
      stamp(cv, x, 2, key)
      stamp(cv, 11, 1, lock)
      if (k === 2) {
        at(cv, 13, 3, '◉')
        at(cv, 10, 0, '◇')
      }
      return rows(cv)
    })
  },
  // Source files pour into the funnel, the press squeezes, one bundle comes out.
  bundle() {
    const base = [
      '                ',
      ' ╲          ╱   ',
      '  ╲        ╱    ',
      '   ╲      ╱     ',
      '    ╲____╱      ',
      '     ┌──┐       ',
      '     │  │       ',
      '     └──┘       ',
    ]
    const f0 = grid(base); at(f0, 0, 0, ' ▫  ▫  ▫  ▫     '); at(f0, 6, 6, '  ')
    const f1 = grid(base); at(f1, 3, 2, ' ▫▫ ▫▫ '); at(f1, 6, 6, '░░')
    const f2 = grid(base); at(f2, 6, 6, '▓▓'); at(f2, 9, 7, '▶ ▣')
    return [rows(f0), rows(f1), rows(f2)]
  },
  // The agent hands a message to a fresh sub-agent, which wakes up.
  agent() {
    const base = [
      '  ╷          ╷  ',
      '╭─┴─╮      ╭─┴─╮',
      '│◉ ◉│      │○ ○│',
      '│ ▬ │      │ ▬ │',
      '╰───╯      ╰───╯',
      '  ╵ ╵       ╵ ╵ ',
      '                ',
      '                ',
    ]
    const msgs = ['▪▶    ', ' ─▪▶  ', '  ──▪▶']
    return msgs.map((m, k) => {
      const cv = grid(base)
      at(cv, 5, 3, m)
      if (k === 2) {
        at(cv, 12, 2, '◉ ◉')
        at(cv, 13, 3, '◡')
      }
      return rows(cv)
    })
  },
  // The magnifier scans down the file.
  read() {
    const base = [
      '  ┌───────┐     ',
      '  │ ───── │     ',
      '  │ ──── ─│     ',
      '  │ ────  │     ',
      '  │ ───── │     ',
      '  │ ──    │     ',
      '  └───────┘     ',
      '                ',
    ]
    return [1, 2, 3].map(y => {
      const cv = grid(base)
      put(cv, 7, y, ['╭──╮', '│▒▒│', '╰──╯'])
      at(cv, 11, y + 3, '╲')
      return rows(cv)
    })
  },
  // The command is typed at the prompt, then its output appears.
  command({ name }) {
    const cmd = fit(name, 10)
    const n = cells(cmd)
    return [0, 1, 2].map(k => {
      const cv = grid([
        '┌──────────────┐',
        '│ ○ ○ ○        │',
        '├──────────────┤',
        '│ $            │',
        '│              │',
        '│              │',
        '│              │',
        '└──────────────┘',
      ])
      const typed = k === 2 ? cmd : head(cmd, Math.ceil((n * (k + 1)) / 3))
      at(cv, 4, 3, k === 2 ? typed : typed + '▌')
      if (k === 2) at(cv, 2, 4, '░░░░░░░░')
      return rows(cv)
    })
  },
  // The bulb warms up and lights, with rays.
  task() {
    const base = [
      '      ╭───╮     ',
      '     ╭╯   ╰╮    ',
      '     │     │    ',
      '     ╰╮   ╭╯    ',
      '      ╰┬─┬╯     ',
      '       ├─┤      ',
      '       ╰─╯      ',
      '                ',
    ]
    return ['◇', '◆', '◉'].map((core, k) => {
      const cv = grid(base)
      at(cv, 8, 2, core)
      if (k === 2) {
        at(cv, 7, 2, '▓' + core + '▓')
        at(cv, 2, 0, '╲')
        at(cv, 13, 0, '╱')
        at(cv, 1, 2, '──')
        at(cv, 13, 2, '──')
      }
      return rows(cv)
    })
  },
  // Code lines are typed into the file, which carries its name on the tab.
  file({ name }) {
    const base = [
      '   ┌───────┬╮   ',
      '   │       ├┘   ',
      '   │        │   ',
      '   │        │   ',
      '   │        │   ',
      '   │        │   ',
      '   │        │   ',
      '   └────────┘   ',
    ]
    const lines = [['▌'], ['─────', ' ──▌'], ['─────', ' ───', ' ────', '──', '▌']]
    return lines.map(ls => {
      const cv = grid(base)
      at(cv, 4, 1, padTo(fit(name, 7), 7))
      ls.forEach((l, i) => at(cv, 5, 2 + i, l))
      return rows(cv)
    })
  },
  // Nothing to do: the coffee steams.
  idle() {
    const base = [
      '                ',
      '                ',
      '                ',
      '   ┌────────┐╮  ',
      '   │        ││  ',
      '   │        │╯  ',
      '   ╰────────╯   ',
      '  ╶────────────╴',
    ]
    const steam = [['     )  (  )    ', '    (  )  (     '], ['    (  )  (     ', '     )  (  )    '], ['     )  (  )    ', '     )  (  )    ']]
    return steam.map(([a, b]) => {
      const cv = grid(base)
      at(cv, 0, 1, a)
      at(cv, 0, 2, b)
      return rows(cv)
    })
  },
}

// Objects the taxonomy knows but this sheet does not draw on their own borrow a zone.
const SCENE_ZONE = {
  database: 'table', api: 'endpoint', frontend: 'component', tests: 'test', git: 'commit', deps: 'package',
  infra: 'container', config: 'env', docs: 'page_docs', auth: 'guard', build: 'bundle', agents: 'agent',
  explore: 'read', shell: 'command', think: 'task', code: 'file', idle: 'idle',
}
const OBJECT_ZONE = { request: 'endpoint', route: 'endpoint', server: 'endpoint', login: 'guard', push: 'commit', branch: 'pr', pipeline: 'container', lint: 'run', setting: 'env', search: 'read', fetch: 'read', style: 'component', hook: 'file' }
function zoneFor(scene, object) {
  if (scene === 'docs' && object === 'page') return ZONES.page_docs
  if (own(ZONES, object) && object !== 'page_docs') return own(ZONES, object)
  if (own(OBJECT_ZONE, object)) return own(ZONES, own(OBJECT_ZONE, object))
  return own(ZONES, own(SCENE_ZONE, scene)) ?? ZONES.idle
}

// ---------------------------------------------------------------- arrow
const ARROWS = {
  out: ['╌─▶', '─╌▶', '──▶'],
  in: ['◀─╌', '◀╌─', '◀──'],
  idle: ['╌╌╌', ' ╌ ', '╌╌╌'],
}
const arrowFor = (scene, object) => (scene === 'idle' ? 'idle' : INTO.has(object) ? 'in' : 'out')
const verbOf = (scene, object) => own(VERB, scene + '/' + object) ?? own(VERB, object) ?? 'working'
const doneOf = (scene, object) => own(DONE, scene + '/' + object) ?? own(DONE, object) ?? 'done'

// ---------------------------------------------------------------- card
// The card: the object's kind on the top border, its name, then up to three
// lines of detail and a status line. Width is the room left of the arrow.
function cardBody({ scene, object, name, detail, status, running }, k, inner) {
  const body = []
  const text = w => fit(String(w), inner - 2)
  if (object === 'run') {
    const parts = split(detail)
    const passed = parts.find(p => /pass/.test(p)), failed = parts.find(p => /fail/.test(p))
    const bar = n => '▓'.repeat(n) + '░'.repeat(inner - 2 - n)
    if (status === 'done') {
      body.push(text('■ ' + (passed || detail || 'passed')), bar(inner - 2))
    } else if (status === 'fail') {
      const p = Number((passed ?? '').match(/\d+/)?.[0]), f = Number((failed ?? '').match(/\d+/)?.[0])
      const ratio = p >= 0 && f > 0 ? p / (p + f) : 0.8
      body.push(text('■ ' + (passed || 'some passed')), text('□ ' + (failed || detail || 'failed')), bar(Math.round((inner - 2) * ratio)))
    } else {
      body.push(text('running' + '.'.repeat(k + 1)), bar(Math.round(((inner - 2) * (k + 1)) / 4)))
    }
    return body
  }
  if (object === 'package' && !detail) {
    split(name).forEach(p => body.push(text('▪ ' + p)))
  } else if (object === 'env') {
    split(detail).forEach(d => body.push(text(d.includes('=') ? d : d + '=▪▪▪▪')))
  } else {
    split(detail).forEach(d => body.push(text(d)))
  }
  if (body.length < 3 || !running) {
    const verb = verbOf(scene, object)
    const done = doneOf(scene, object)
    const line = status === 'fail' ? '□ failed' : status === 'done' ? '■ ' + done : verb + '.'.repeat(k + 1)
    if (body.length < 4) body.push(text(line))
  }
  return body.slice(0, 4)
}

function card(spec, k, width) {
  const inner = width - 2
  const { scene, object, name } = spec
  const kind = scene === 'idle' ? 'idle' : object || scene
  const count = split(name, Infinity).length
  const headerName = object === 'package' && !spec.detail && count > 1 ? `${count} packages` : name || ''
  const lines = [
    titleBorder(kind, own(GLYPH, kind) ?? '▫', inner),
    '│ ' + padTo(fit(headerName, inner - 2), inner - 2) + ' │',
    '├' + '─'.repeat(inner) + '┤',
    ...cardBody(spec, k, inner).map(b => '│ ' + padTo(b, inner - 2) + ' │'),
    '└' + '─'.repeat(inner) + '┘',
  ]
  return lines
}

// Title border: "┌─ ▤ table ────┐". Pad the title with dashes, keeping the
// single spaces around the glyph and the kind.
function titleBorder(kind, glyph, inner) {
  const label = cells(kind) <= inner - 6 ? ' ' + glyph + ' ' + kind + ' ' : ' ' + glyph + ' '
  return '┌─' + label + '─'.repeat(Math.max(0, inner - 1 - cells(label))) + '┐'
}

// ---------------------------------------------------------------- compose
export function compose(spec = {}, { ascii = false, maxWidth = 40 } = {}) {
  const { scene = 'idle', object = scene === 'idle' ? 'idle' : 'file', status } = spec
  const name = clean(spec.name, { ascii })
  const detail = clean(spec.detail, { ascii })
  const running = spec.running ?? (status !== 'done' && status !== 'fail')
  const width = Math.max(24, Math.min(W, maxWidth))
  const cardW = width - CARD_X
  const ctx = { scene, object, name: name || (scene === 'idle' ? 'nothing yet' : object), detail, status, running }
  let zoneFrames = zoneFor(scene, object)(ctx)
  if (!running) zoneFrames = [zoneFrames[zoneFrames.length - 1]]
  const arrows = ARROWS[arrowFor(scene, object)]
  const frames = zoneFrames.map((zone, k) => {
    const cv = blank(width, H)
    put(cv, 0, 0, zone)
    at(cv, ARROW_X, 3, running ? arrows[k % arrows.length] : arrows[2])
    const lines = card(ctx, running ? k : 2, cardW)
    put(cv, CARD_X, Math.floor((H - lines.length) / 2), lines)
    return rows(cv).map(l => (ascii ? toAscii(l) : l))
  })
  return { frames, width, height: H }
}

// Problems in the authored art: lines wider than the zone, characters outside
// the allowed blocks, missing ASCII mappings. Empty when all is well.
export function lint(result) {
  const problems = []
  const ok = cp => cp < 0x7f || (cp >= 0x2500 && cp <= 0x25ff) || (cp >= 0x2190 && cp <= 0x21ff) || cp === 0x2026
  result.frames.forEach((f, i) => {
    if (f.length !== result.height) problems.push(`frame ${i}: ${f.length} rows`)
    f.forEach((line, j) => {
      if (cells(line) !== result.width) problems.push(`frame ${i} row ${j}: width ${cells(line)}`)
      for (const ch of line) {
        const cp = ch.codePointAt(0)
        if (!ok(cp)) problems.push(`frame ${i} row ${j}: U+${cp.toString(16)} not allowed`)
        if (cp >= 0x7f && !(ch in ASCII_MAP)) problems.push(`frame ${i} row ${j}: ${ch} has no ascii twin`)
      }
    })
  })
  return problems
}
