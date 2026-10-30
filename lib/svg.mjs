// Blueprint-meets-comic pictograms: one <svg> per scene, the action drawn on
// the object inside its zone. Pure string building, no I/O, no Node globals.

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const G = '#9a9a9a' // structure strokes
const INK = '#848484' // neutral text on a transparent ground (reads on dark and light)
const OK = '#6fcf6f'
const BAD = '#ff6b6b'
const HEX = { database: '#5fafff', api: '#ffaf5f', frontend: '#d787ff', tests: '#87d787', git: '#ff8787', deps: '#ffd75f', infra: '#5fd7d7', config: '#949494', docs: '#d0d0d0', auth: '#ffaf00', build: '#d7875f', agents: '#d7afff', explore: '#8a8a8a', shell: '#767676', think: '#ffff87', code: '#87afff', idle: '#6c6c6c' }

// [doing, done] per object; the scene label at the bottom reads "scene · verb".
const VERBS = {
  table: ['creating', 'created'], migration: ['migrating', 'migrated'], seed: ['seeding', 'seeded'], index: ['indexing', 'indexed'], query: ['querying', 'queried'],
  endpoint: ['exposing', 'exposed'], route: ['wiring route', 'route wired'], model: ['shaping model', 'model shaped'], service: ['writing service', 'service written'], middleware: ['plugging in', 'plugged in'], schema: ['defining schema', 'schema defined'], server: ['serving', 'served'], request: ['calling', 'called'],
  component: ['mounting', 'mounted'], page: ['laying out', 'laid out'], style: ['styling', 'styled'], hook: ['writing hook', 'hook written'], asset: ['adding asset', 'asset added'],
  test: ['writing test', 'test written'], run: ['running', 'passed'], lint: ['linting', 'linted'],
  commit: ['committing', 'committed'], branch: ['branching', 'branched'], push: ['pushing', 'pushed'], pr: ['opening PR', 'PR opened'],
  package: ['installing', 'installed'], container: ['packing', 'packed'], pipeline: ['running', 'ran'], deploy: ['launching', 'launched'],
  env: ['configuring', 'configured'], setting: ['configuring', 'configured'], guard: ['guarding', 'guarded'], token: ['signing', 'signed'], login: ['building login', 'login built'],
  bundle: ['bundling', 'bundled'], agent: ['delegating', 'delegated'], read: ['reading', 'read'], search: ['searching', 'searched'], fetch: ['fetching', 'fetched'], command: ['running', 'ran'],
  task: ['thinking', 'thought'], file: ['writing', 'written'],
  'docs/page': ['writing', 'written'], 'infra/pipeline': ['running', 'ran'],
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
const cut = (s, n) => { const a = [...String(s ?? '')]; return a.length > n ? a.slice(0, Math.max(0, n - 1)).join('') + '…' : a.join('') }
const list = (s, n, max) => String(s ?? '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).slice(0, n).map(x => cut(x, max))
const wrap = (s, n, lines) => {
  const out = []
  let cur = ''
  for (const w of String(s ?? '').split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= n) cur += ' ' + w
    else { out.push(cur); cur = w }
  }
  if (cur) out.push(cur)
  if (out.length > lines) { out.length = lines; out[lines - 1] = cut(out[lines - 1] + '…', n) }
  return out.map(l => cut(l, n))
}
const lum = hex => {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const inkOn = c => (lum(c) > 0.2 ? '#1c1c1c' : '#ffffff')

// Primitives.
const t = (x, y, s, { size = 12, fill = INK, weight = 400, anchor = 'start', op = 1, extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${op < 1 ? ` fill-opacity="${op}"` : ''}${extra}>${esc(s)}</text>`
const dash = (d, op = 0.55) => `<path d="${d}" fill="none" stroke="${G}" stroke-width="1.3" stroke-dasharray="4 4" stroke-opacity="${op}"/>`
const bar = (x, y, w, h = 6, op = 0.35, c = G) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${c}" fill-opacity="${op}"/>`
const an = (run, attr, values, dur, extra = '') => (run ? `<animate attributeName="${attr}" values="${values}" dur="${dur}" repeatCount="indefinite"${extra}/>` : '')
const tr = (run, type, values, dur, extra = '') => (run ? `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}" repeatCount="indefinite"${extra}/>` : '')
const EASE = ' calcMode="spline" keySplines=".3 0 .2 1;0 0 1 1" keyTimes="0;.55;1"'

// Motion lines trailing an object that moves toward `dir`.
function motion(x, y, dir, c = G) {
  const L = [9, 14, 9]
  const seg = i => {
    const o = (i - 1) * 8
    if (dir === 'right') return `M${x - 6 - L[i]} ${y + o}h${L[i]}`
    if (dir === 'left') return `M${x + 6} ${y + o}h${L[i]}`
    if (dir === 'down') return `M${x + o} ${y - 6 - L[i]}v${L[i]}`
    return `M${x + o} ${y + 6}v${L[i]}`
  }
  return `<path d="${seg(0)}${seg(1)}${seg(2)}" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-opacity=".7" fill="none"/>`
}

// Speech-bubble tag. (px, py) is the tip of the tail, `dir` is where the tail points.
function tag(px, py, s, c, { dir = 'down', size = 11, max = 16, dx = 0 } = {}) {
  s = cut(s, max)
  const w = Math.round([...s].length * size * 0.6 + 16)
  const h = size + 11
  let x, y
  if (dir === 'down') { x = px + dx - w / 2; y = py - 7 - h } else if (dir === 'up') { x = px + dx - w / 2; y = py + 7 } else if (dir === 'left') { x = px + 7; y = py + dx - h / 2 } else { x = px - 7 - w; y = py + dx - h / 2 }
  x = Math.round(Math.max(6, Math.min(314 - w, x)))
  y = Math.round(Math.max(4, Math.min(176 - h, y)))
  const tx = Math.max(x + 10, Math.min(x + w - 10, px))
  const ty = Math.max(y + 10, Math.min(y + h - 10, py))
  const tail = dir === 'down' ? `M${tx - 6} ${y + h - 1}L${px} ${py}L${tx + 6} ${y + h - 1}`
    : dir === 'up' ? `M${tx - 6} ${y + 1}L${px} ${py}L${tx + 6} ${y + 1}`
      : dir === 'left' ? `M${x + 1} ${ty - 6}L${px} ${py}L${x + 1} ${ty + 6}`
        : `M${x + w - 1} ${ty - 6}L${px} ${py}L${x + w - 1} ${ty + 6}`
  return `<g><path d="${tail}" fill="${c}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c}" stroke="#1c1c1c" stroke-opacity=".3"/>` +
    t(x + w / 2, y + h / 2 + size * 0.36, s, { size, fill: inkOn(c), weight: 700, anchor: 'middle' }) + `</g>`
}

// Opaque accent pill with text, centered at (cx, cy).
function pill(cx, cy, s, c, { size = 11, h = 18 } = {}) {
  const w = Math.round([...s].length * size * 0.6 + 14)
  return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${c}"/>` + t(cx, cy + size * 0.36, s, { size, fill: inkOn(c), weight: 700, anchor: 'middle' })
}
const pillWidth = (s, size = 11) => Math.round([...s].length * size * 0.6 + 14)

const check = (x, y, c, w = 2.5, inner = '') => `<path d="M${x - 5} ${y}l4 4 7-8" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${inner ? `>${inner}</path>` : '/>'}`
const cross = (x, y, c, w = 2.5) => `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`

function badge(status) {
  if (status === 'done') return `<g transform="translate(296 24)"><circle r="12" fill="${OK}"/>${check(0, 1, '#ffffff', 3)}</g>`
  if (status === 'fail') return `<g transform="translate(296 24)"><circle r="12" fill="${BAD}"/>${cross(0, 0, '#ffffff', 3)}</g>`
  return ''
}

// A light card the object is drawn on (reads as paper on both grounds).
const paper = (x, y, w, h, rx = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="#f6f6f6" stroke="${G}" stroke-width="1.5"/>`
const browser = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${G}" fill-opacity=".08" stroke="${G}" stroke-width="2"/><path d="M${x} ${y + 24}h${w}" stroke="${G}" stroke-width="1.5" stroke-opacity=".6"/>` +
  `<circle cx="${x + 14}" cy="${y + 12}" r="3.5" fill="${c}"/><circle cx="${x + 26}" cy="${y + 12}" r="3.5" fill="${c}" fill-opacity=".6"/><circle cx="${x + 38}" cy="${y + 12}" r="3.5" fill="${c}" fill-opacity=".3"/>`

// ---- scenes ----------------------------------------------------------------

function database(k) {
  const { c, run, ink } = k
  const cols = list(k.detail, 3, 13)
  k.detailDone = cols.length > 0
  let obj
  if (k.object === 'migration') {
    const rows = list(k.detail, 2, 14)
    obj = paper(40, 90, 104, 48, 3) +
      `<rect x="34" y="84" width="116" height="10" rx="5" fill="${c}"/><rect x="34" y="134" width="116" height="10" rx="5" fill="${c}"/>` +
      t(50, 112, cut(k.name, 13), { size: 12, fill: '#2a2a2a', weight: 700 }) +
      (rows.length ? t(50, 127, rows.join(' · '), { size: 10, fill: '#555' }) : `<path d="M50 123h50" stroke="${G}" stroke-width="2" stroke-linecap="round" stroke-opacity=".6"/>`) +
      `<path d="M126 104l6-6 6 6M132 98v24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
    k.detailDone = rows.length > 0
  } else {
    obj = paper(40, 84, 104, 60, 6) +
      `<path d="M40 90a6 6 0 0 1 6-6h92a6 6 0 0 1 6 6v14H40z" fill="${c}"/>` +
      `<path d="M48 88h5v8h-5zM55 88h5v8h-5z" fill="${ink}" fill-opacity=".8"/>` +
      t(66, 98, cut(k.name, 10), { size: 12, fill: ink, weight: 700 }) +
      `<path d="M40 117h104M40 130h104" stroke="${G}" stroke-width="1" stroke-opacity=".5"/>` +
      [0, 1, 2].map(i => cols[i]
        ? `<circle cx="50" cy="${110.5 + i * 13}" r="2" fill="${c}"/>` + t(56, 114 + i * 13, cols[i], { size: 10, fill: '#2a2a2a' })
        : bar(50, 108 + i * 13, [60, 44, 72][i], 5, 0.3)).join('')
  }
  const drop = `<g>${tr(run, 'translate', '0 -84;0 0;0 0', '2s', EASE)}${an(run, 'opacity', '0;1;1;1', '2s', ' keyTimes="0;.12;.95;1"')}${run ? motion(92, 86, 'down') : ''}${obj}</g>`
  return `<g transform="translate(0 -6)"><path d="M36 58v90a56 14 0 0 0 112 0V58" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="2.5"/>` +
    `<ellipse cx="92" cy="58" rx="56" ry="14" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="2.5"/>` +
    dash('M36 104a56 14 0 0 0 112 0') + dash('M18 166h130') +
    drop +
    `<path d="M36 58v90a56 14 0 0 0 112 0V58" fill="${c}" fill-opacity=".08" stroke="${c}" stroke-width="2.5"/></g>` +
    tag(150, 66, k.object === 'migration' ? '+ migration' : '+ table', c, { dir: 'left' })
}

function api(k) {
  const { c, run, ink } = k
  if (k.object === 'middleware') {
    k.detailDone = !!k.detail
    const packet = run
      ? `<circle cx="0" cy="104" r="6" fill="${G}"><animate attributeName="cx" values="30;290" dur="2s" repeatCount="indefinite"/><animate attributeName="fill" values="${G};${G};${c};${c}" keyTimes="0;.5;.5;1" dur="2s" repeatCount="indefinite"/></circle>`
      : `<circle cx="70" cy="104" r="6" fill="${G}"/><circle cx="250" cy="104" r="6" fill="${c}"/>`
    return `<path d="M20 90H296M20 118H296" stroke="${G}" stroke-width="2" stroke-opacity=".6"/>` +
      `<path d="M282 96l10 8-10 8" fill="none" stroke="${G}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".8"/>` +
      dash('M164 60v6') +
      `<rect x="118" y="66" width="92" height="76" rx="10" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="2.5"/>` +
      `<path d="M134 80h60l-22 22v18h-16v-18z" fill="${c}" fill-opacity=".7"/>` +
      packet +
      tag(164, 64, k.name, c, { dir: 'down' }) +
      (k.detail ? t(164, 160, cut(k.detail, 30), { size: 11, anchor: 'middle', op: 0.85 }) : '')
  }
  const m = /^([A-Z]{3,7})\s+(.+)$/.exec(String(k.name).trim())
  const method = m ? m[1] : ''
  const path = cut(m ? m[2] : k.name, 14)
  const mw = method ? pillWidth(method) : 0
  const label = (method ? pill(mw / 2, 0, method, c) : '') + t(method ? mw + 6 : 0, 4, path, { size: 13, weight: 700 })
  const server = `<rect x="28" y="56" width="76" height="92" rx="8" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="2.5"/>` +
    [0, 1, 2].map(i => `<rect x="38" y="${66 + i * 26}" width="56" height="16" rx="3" fill="${G}" fill-opacity=".25"/><circle cx="46" cy="${74 + i * 26}" r="3" fill="${c}">${i === 0 ? an(run, 'opacity', '1;.2;1', '1s') : ''}</circle>`).join('')
  return server + dash('M18 160h110') +
    `<path d="M104 104H226" stroke="${c}" stroke-width="3" stroke-linecap="round"/><path d="M218 96l10 8-10 8" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` + dash('M232 104h14') +
    `<rect x="248" y="78" width="40" height="54" rx="6" fill="${G}" fill-opacity=".15" stroke="${G}" stroke-width="2"/><rect x="256" y="88" width="24" height="28" rx="2" fill="${G}" fill-opacity=".3"/><circle cx="268" cy="124" r="2.5" fill="${G}"/>` +
    `<g transform="translate(110 86)"><g>${tr(run, 'translate', '0 0;44 0;44 0', '1.8s', EASE)}${an(run, 'opacity', '0;1;1;0', '1.8s', ' keyTimes="0;.15;.85;1"')}${run ? motion(-4, 0, 'right') : ''}${label}</g></g>`
}

function frontend(k) {
  const { c, run, ink } = k
  if (k.object === 'page') {
    const url = cut(k.name, 14)
    const uw = pillWidth(url)
    const grow = (i, w) => `<rect x="38" y="${126 + i * 11}" width="${w}" height="6" rx="3" fill="${G}" fill-opacity=".4">${an(run, 'width', `0;${w};${w}`, '2s', ` keyTimes="0;.6;1" begin="-${i * 0.4}s"`)}</rect>`
    return browser(24, 30, 176, 130, c) +
      `<rect x="72" y="35" width="120" height="14" rx="7" fill="${G}" fill-opacity=".2"/>` +
      `<rect x="74" y="34" width="${uw}" height="16" rx="8" fill="${c}"/>` + t(74 + uw / 2, 46, url, { size: 11, fill: ink, weight: 700, anchor: 'middle' }) +
      `<rect x="38" y="66" width="80" height="10" rx="3" fill="${c}" fill-opacity=".9"/>` +
      `<rect x="38" y="84" width="148" height="32" rx="6" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="1.5">${an(run, 'fill-opacity', '.1;.4;.1', '2s')}</rect>` +
      grow(0, 120) + grow(1, 96) + grow(2, 140) +
      dash('M200 100h6') + tag(206, 100, 'page', c, { dir: 'left' }) +
      dash('M38 164h148')
  }
  const name = '<' + cut(k.name, 10) + '/>'
  return browser(24, 30, 176, 130, c) +
    `<rect x="72" y="35" width="120" height="14" rx="7" fill="${G}" fill-opacity=".2"/>` +
    bar(38, 66, 56, 8) + bar(38, 82, 40, 8) + bar(38, 142, 150, 6) +
    dash('M60 102h52') + dash('M112 60v22') +
    `<g transform="translate(112 102)"><g>${tr(run, 'scale', '.4;1.08;1;1', '2s', ' keyTimes="0;.4;.55;1" calcMode="spline" keySplines=".2 0 .2 1;.3 0 .5 1;0 0 1 1"')}${an(run, 'opacity', '0;1;1;1', '2s', ' keyTimes="0;.3;.95;1"')}` +
    `<rect x="-52" y="-28" width="104" height="56" rx="8" fill="${c}"/>` +
    t(0, -4, name, { size: 12, fill: ink, weight: 700, anchor: 'middle' }) +
    `<rect x="-38" y="6" width="56" height="5" rx="2.5" fill="${ink}" fill-opacity=".35"/><rect x="-38" y="15" width="34" height="5" rx="2.5" fill="${ink}" fill-opacity=".35"/>` +
    `<path d="M-60 -36l-7-7M60 -36l7-7M-60 36l-7 7M60 36l7 7" stroke="${c}" stroke-width="2.5" stroke-linecap="round">${an(run, 'opacity', '0;0;1;0', '2s', ' keyTimes="0;.35;.5;.8"')}</path>` +
    `</g></g>` +
    tag(206, 102, 'component', c, { dir: 'left' })
}

// "11 passed, 1 failed" is too long for one line beside the badge: one count per line, two at most.
function countLines(counts, x, fill) {
  const parts = String(counts).split(/\s*[,;·]\s*/).filter(Boolean).slice(0, 2)
  if (parts.length < 2) return t(x, 124, counts, { size: [...counts].length > 12 ? 11 : 13, weight: 700, anchor: 'middle', fill })
  return parts.map((part, i) => t(x, 117 + i * 16, cut(part, 14), { size: 12, weight: 700, anchor: 'middle', fill })).join('')
}

function tests(k) {
  const { c, run, status, ink } = k
  const sc = status === 'done' ? OK : status === 'fail' ? BAD : c
  if (k.object === 'run') {
    k.detailDone = true
    const counts = k.detail ? cut(k.detail, 20) : run ? 'running…' : ''
    const bubbles = run
      ? [[70, '1.6s', '0s'], [84, '1.3s', '-0.5s'], [96, '1.9s', '-1s']].map(([x, d, b]) => `<circle cx="${x}" cy="140" r="3.5" fill="${sc}"><animate attributeName="cy" values="140;112" dur="${d}" begin="${b}" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="${d}" begin="${b}" repeatCount="indefinite"/></circle>`).join('')
      : `<circle cx="74" cy="126" r="3.5" fill="${sc}"/><circle cx="92" cy="134" r="2.5" fill="${sc}"/>`
    return `<path d="M50.4 110L38 134c-3 6 2 12 9 12h70c7 0 12-6 9-12l-12.4-24z" fill="${sc}" fill-opacity=".55"/>` + bubbles +
      `<path d="M70 44h24v28l32 62c3 6-2 12-9 12H47c-7 0-12-6-9-12l32-62z" fill="none" stroke="${sc}" stroke-width="2.5" stroke-linejoin="round"/><path d="M64 44h36" stroke="${sc}" stroke-width="2.5" stroke-linecap="round"/>` +
      dash('M18 162h120') + dash('M118 110h8') +
      tag(120, 80, k.name, c, { dir: 'left' }) +
      `<rect x="146" y="96" width="160" height="48" rx="10" fill="${sc}" fill-opacity=".15" stroke="${sc}" stroke-width="2"${run ? ' stroke-dasharray="6 4"' : ''}/>` +
      (status === 'done' ? `<g transform="translate(162 120)">${check(0, 0, OK, 3)}</g>` : status === 'fail' ? `<g transform="translate(162 120)">${cross(0, 0, BAD, 3)}</g>` : '') +
      countLines(counts, status ? 240 : 226, status ? sc : INK)
  }
  const rows = list(k.detail, 3, 18)
  k.detailDone = rows.length > 0
  const row = i => {
    const y = 90 + i * 19
    const last = i === 2
    const mark = last && status === 'fail' ? cross(122, y, BAD, 2.5) : last && run ? check(122, y, c, 2.5, an(run, 'opacity', '0;0;1;1', '1.6s', ' keyTimes="0;.5;.6;1"')) : check(122, y, last && status === 'done' ? OK : c)
    return `<rect x="116" y="${y - 7}" width="13" height="13" rx="3" fill="none" stroke="${G}" stroke-width="1.5"/>` + mark +
      (rows[i] ? t(138, y + 4, rows[i], { size: 11 }) : bar(138, y - 3, [96, 72, 120][i]))
  }
  return `<path d="M52 44h24v80a12 12 0 0 1-24 0z" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M46 44h36" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M52 94h24v30a12 12 0 0 1-24 0z" fill="${c}" fill-opacity=".5"/>` +
    `<circle cx="64" cy="118" r="3" fill="${c}">${an(run, 'cy', '122;98', '1.4s')}${an(run, 'opacity', '1;0', '1.4s')}</circle>` +
    dash('M42 70h8M42 86h8M42 102h8') +
    tag(64, 42, k.name, c, { dir: 'down' }) +
    `<rect x="100" y="56" width="196" height="96" rx="10" fill="${G}" fill-opacity=".08" stroke="${G}" stroke-width="2"/><rect x="180" y="48" width="40" height="14" rx="4" fill="${c}"/>` +
    t(116, 74, 'it(…)', { size: 11, weight: 700, op: 0.8 }) +
    row(0) + row(1) + row(2)
}

function git(k) {
  const { c, run, ink } = k
  if (k.object === 'pr') {
    return `<path d="M24 124H296" stroke="${G}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="44" cy="124" r="7" fill="${G}" fill-opacity=".5" stroke="${G}" stroke-width="2"/><circle cx="76" cy="124" r="7" fill="${G}" fill-opacity=".5" stroke="${G}" stroke-width="2"/>` +
      `<path d="M76 124C76 84 96 76 124 76H196" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="130" cy="76" r="7" fill="${c}"/><circle cx="166" cy="76" r="7" fill="${c}"/>` +
      `<path d="M196 76C236 76 244 86 244 114" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"${run ? ' stroke-dasharray="8 6"' : ''}>${an(run, 'stroke-dashoffset', '28;0', '1s')}</path>` +
      `<circle cx="244" cy="124" r="10" fill="${c}">${an(run, 'r', '10;12;10', '1.2s')}</circle>` +
      `<path d="M239 119l5 5 5-5M244 124v6" fill="none" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      dash('M166 58v8') + tag(166, 64, k.name, c, { dir: 'down', max: 24 }) +
      t(244, 150, 'merge → main', { size: 10, anchor: 'middle', op: 0.85 })
  }
  k.detailDone = true
  const node = `<g><g>${tr(run, 'translate', '-60 0;0 0;0 0', '2s', EASE)}${an(run, 'opacity', '0;1;1;1', '2s', ' keyTimes="0;.15;.95;1"')}` +
    `<path d="M140 100H200" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="200" cy="100" r="18" fill="${c}" fill-opacity=".25">${an(run, 'r', '12;26', '1.4s')}${an(run, 'fill-opacity', '.4;0', '1.4s')}</circle>` +
    `<circle cx="200" cy="100" r="10" fill="${c}"/><path d="M196 100h8M200 96v8" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    (run ? motion(184, 100, 'right') : '') +
    dash('M200 80v10') + tag(200, 88, k.name, c, { dir: 'down', max: 24 }) +
    `</g></g>`
  return `<path d="M24 100H140" stroke="${G}" stroke-width="3" stroke-linecap="round"/>` + dash('M210 100h90') +
    [44, 92, 140].map(x => `<circle cx="${x}" cy="100" r="7" fill="${G}" fill-opacity=".5" stroke="${G}" stroke-width="2"/>`).join('') +
    node + (k.detail ? t(200, 132, cut(k.detail, 20), { size: 11, anchor: 'middle', op: 0.85 }) : '')
}

function deps(k) {
  const { c, run } = k
  const names = list(k.name, 3, 12)
  const pos = [[100, 66], [152, 42], [116, 20]]
  const pills = names.map((n, i) => `<g>${tr(run, 'translate', '0 50;0 0;0 0', '2.2s', EASE + ` begin="-${i * 0.5}s"`)}${an(run, 'opacity', '0;1;1;1', '2.2s', ` keyTimes="0;.2;.95;1" begin="-${i * 0.5}s"`)}${pill(pos[i][0], pos[i][1], n, c)}</g>`).join('')
  return `<rect x="70" y="104" width="120" height="54" rx="4" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="2.5"/>` +
    `<path d="M70 104L46 76H106L130 104z" fill="${c}" fill-opacity=".5" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M130 104L154 76H214L190 104z" fill="${c}" fill-opacity=".5" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>` +
    dash('M130 104v54') + dash('M18 160h210') +
    (run ? motion(130, 72, 'up') : '') +
    pills + tag(192, 132, 'install', c, { dir: 'left' })
}

function infra(k) {
  const { c, run, ink } = k
  if (k.object === 'deploy') {
    k.detailDone = !!k.detail
    const rocket = `<g transform="translate(110 0)"><g>${tr(run, 'translate', '0 14;0 -26', '1.6s', ' calcMode="spline" keySplines=".4 0 .6 1" keyTimes="0;1"')}${an(run, 'opacity', '0;1;1;0', '1.6s', ' keyTimes="0;.15;.8;1"')}` +
      `<path d="M0 30C-14 50-18 70-18 100H18C18 70 14 50 0 30Z" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M-18 86L-32 112H-18zM18 86L32 112H18z" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>` +
      `<circle cx="0" cy="68" r="7" fill="#f6f6f6" stroke="${c}" stroke-width="2.5"/><path d="M-10 100h20l4 10H-14z" fill="${c}"/>` +
      `<g transform="translate(0 110)"><g>${tr(run, 'scale', '1 1;1 1.6;1 1', '.35s')}<path d="M-8 0c0 10 8 22 8 22s8-12 8-22z" fill="${c}" fill-opacity=".9"/><path d="M-4 0c0 6 4 12 4 12s4-6 4-12z" fill="#f6f6f6"/></g></g>` +
      (run ? motion(0, 134, 'up') : '') + `</g></g>`
    return dash('M50 150h120') + `<path d="M64 150v-8M156 150v-8" stroke="${G}" stroke-width="2" stroke-linecap="round"/>` +
      dash('M124 48Q190 8 250 26') + `<path d="M242 20l8 6-9 4" fill="none" stroke="${G}" stroke-width="1.3" stroke-opacity=".6"/>` +
      `<path d="M236 60a12 12 0 0 1 8-22a16 16 0 0 1 31-3a12 12 0 0 1 9 25z" fill="${G}" fill-opacity=".12" stroke="${G}" stroke-width="2"/>` +
      rocket + tag(134, 92, k.name, c, { dir: 'left' }) +
      (k.detail ? t(306, 80, cut(k.detail, 20), { size: 11, anchor: 'end', op: 0.85 }) : '')
  }
  const ribs = [56, 72, 88, 104, 120, 136, 152, 168, 184].map(x => `M${x} 84v64`).join('')
  const box = `<g><g>${tr(run, 'translate', '0 -76;0 0;0 0', '2.2s', EASE)}${an(run, 'opacity', '0;1;1;1', '2.2s', ' keyTimes="0;.1;.95;1"')}` +
    `<path d="M120 -40V76" stroke="${G}" stroke-width="2"/><path d="M110 78c0-8 20-8 20 0" fill="none" stroke="${G}" stroke-width="2.5"/>` +
    `<rect x="40" y="84" width="160" height="64" rx="4" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="2.5"/>` +
    `<path d="${ribs}" stroke="${c}" stroke-width="1.5" stroke-opacity=".5"/>` +
    `<path d="M176 108v16M182 108v16" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>` +
    paper(72, 104, 96, 24, 4) + t(120, 120, cut(k.name, 11), { size: 12, fill: '#2a2a2a', weight: 700, anchor: 'middle' }) +
    `</g></g>`
  return dash('M18 152h270') + (run ? `<rect x="40" y="84" width="160" height="64" rx="4" fill="none" stroke="${c}" stroke-width="1.5" stroke-dasharray="5 4" stroke-opacity=".6"/>` : '') +
    box + tag(202, 116, 'container', c, { dir: 'left' })
}

function config(k) {
  const { c, run, status } = k
  const keys = list(k.detail, 3, 12)
  k.detailDone = keys.length > 0
  const row = i => {
    const y = 76 + i * 28
    const on = i < 2 || status === 'done'
    const knob = i === 2 && run
      ? `<rect x="164" y="${y - 8}" width="32" height="16" rx="8" fill="${G}" fill-opacity=".4"><animate attributeName="fill" values="${G};${G};${c};${c}" keyTimes="0;.45;.55;1" dur="2s" repeatCount="indefinite"/><animate attributeName="fill-opacity" values=".4;.4;1;1" keyTimes="0;.45;.55;1" dur="2s" repeatCount="indefinite"/></rect><circle cx="172" cy="${y}" r="6" fill="#f6f6f6" stroke="${G}" stroke-width="1.5"><animate attributeName="cx" values="172;172;188;188" keyTimes="0;.45;.55;1" dur="2s" repeatCount="indefinite"/></circle>`
      : `<rect x="164" y="${y - 8}" width="32" height="16" rx="8" fill="${on ? c : G}" fill-opacity="${on ? 1 : 0.4}"/><circle cx="${on ? 188 : 172}" cy="${y}" r="6" fill="#f6f6f6" stroke="${G}" stroke-width="1.5"/>`
    return (keys[i] ? t(50, y + 4, keys[i], { size: 11, weight: 700 }) : bar(50, y - 3, [60, 44, 52][i])) + dash(`M136 ${y}h20`, 0.7) + knob
  }
  return `<rect x="36" y="52" width="172" height="104" rx="10" fill="${G}" fill-opacity=".08" stroke="${G}" stroke-width="2"/>` +
    tag(76, 50, k.name, c, { dir: 'down' }) +
    row(0) + row(1) + row(2) +
    dash('M208 104h6') + tag(214, 104, 'env', c, { dir: 'left' })
}

function docs(k) {
  const { c, run } = k
  const w = 92
  const pencil = `<g transform="translate(70 122)"><g>${tr(run, 'translate', `0 0;${w} 0;${w} 0`, '2s', ' keyTimes="0;.7;1"')}` +
    `<g transform="rotate(45)"><path d="M0 0l-5-9h10z" fill="#f6f6f6" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/><rect x="-5" y="-31" width="10" height="22" rx="1.5" fill="${c}"/><rect x="-5" y="-35" width="10" height="4" rx="1" fill="${G}"/></g>` +
    `</g></g>`
  return `<path d="M56 30H170l30 30V160H56z" fill="${G}" fill-opacity=".08" stroke="${G}" stroke-width="2" stroke-linejoin="round"/><path d="M170 30v30h30" fill="none" stroke="${G}" stroke-width="2" stroke-linejoin="round"/>` +
    t(70, 58, '# ' + cut(k.name, 12), { size: 13, weight: 700 }) + `<path d="M70 66h${Math.min(110, ([...('# ' + cut(k.name, 12))].length) * 7.8)}" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>` +
    bar(70, 78, 100) + bar(70, 92, 80) + bar(70, 106, 110) +
    `<rect x="70" y="119" width="${w}" height="6" rx="3" fill="${c}" fill-opacity=".9">${an(run, 'width', `0;${w};${w}`, '2s', ' keyTimes="0;.7;1"')}</rect>` +
    dash(`M70 146h110`) + pencil +
    dash('M200 100h6') + tag(206, 100, 'docs', c, { dir: 'left' })
}

function auth(k) {
  const { c, run, status, ink } = k
  if (k.object === 'token') {
    const seg = (i, x) => `<rect x="${x}" y="90" width="40" height="22" rx="5" fill="${c}" fill-opacity="${[0.45, 0.7, 1][i]}">${an(run, 'fill-opacity', `${[0.45, 0.7, 1][i]};.2;${[0.45, 0.7, 1][i]}`, '1.5s', ` begin="-${i * 0.5}s"`)}</rect>` + t(x + 20, 105, ['head', 'body', 'sig'][i], { size: 10, fill: inkOn(c), weight: 700, anchor: 'middle' })
    return `<g><g>${tr(run, 'rotate', '0 60 100;-25 60 100;0 60 100', '1.4s')}` +
      `<circle cx="60" cy="100" r="16" fill="none" stroke="${c}" stroke-width="4"/><circle cx="60" cy="100" r="4" fill="${c}"/>` +
      `<path d="M76 100H148M122 100v12M138 100v12M146 100v8" stroke="${c}" stroke-width="4" stroke-linecap="round"/></g></g>` +
      dash('M150 100h18') +
      seg(0, 168) + `<circle cx="210" cy="101" r="2" fill="${G}"/>` + seg(1, 212) + `<circle cx="254" cy="101" r="2" fill="${G}"/>` + seg(2, 256) +
      tag(236, 86, k.name, c, { dir: 'down' })
  }
  return dash('M18 112h88') + dash('M194 112h100') +
    `<path d="M286 106l8 6-8 6" fill="none" stroke="${G}" stroke-width="1.3" stroke-opacity=".6"/>` +
    `<circle cx="60" cy="112" r="7" fill="${G}">${an(run, 'cx', '36;102;96;36', '2s', ' keyTimes="0;.55;.65;1" calcMode="spline" keySplines=".4 0 .2 1;.3 0 .7 1;.4 0 .2 1"')}</circle>` +
    (run ? motion(50, 112, 'right') : '') +
    (status === 'done' ? `<circle cx="240" cy="112" r="7" fill="${OK}"/>` : '') +
    `<path d="M150 50l40 14v34c0 26-18 42-40 50c-22-8-40-24-40-50V64z" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M142 98v-7a8 8 0 0 1 16 0v7" fill="none" stroke="${c}" stroke-width="2.5"/><rect x="137" y="98" width="26" height="20" rx="4" fill="${c}"/><circle cx="150" cy="106" r="2.5" fill="${ink}"/><path d="M150 108v5" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>` +
    tag(150, 48, k.name, c, { dir: 'down' })
}

function build(k) {
  const { c, run, ink } = k
  const files = [[90, 0], [122, -0.5], [152, -1], [180, -1.5]].map(([x, b], i) => `<g>${tr(run, 'translate', '0 -30;0 40;0 40', '2s', ` keyTimes="0;.6;1" begin="${b}s"`)}${an(run, 'opacity', '0;1;1;0', '2s', ` keyTimes="0;.1;.6;.7" begin="${b}s"`)}<rect x="${x}" y="${run ? 36 : 60 + (i % 2) * 10}" width="14" height="16" rx="2" fill="${G}" fill-opacity=".6"/></g>`).join('')
  const out = k.detail ? cut(k.detail, 12) : 'bundle'
  k.detailDone = true
  return `<path d="M60 50H200L150 110V140H110V110Z" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>` +
    dash('M60 50H200') + dash('M130 140v10') + files +
    `<g transform="translate(200 118)"><g>${tr(run, 'rotate', '0;360', '2s', ' calcMode="linear"')}<circle r="12" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="3 3.4"/><circle r="6" fill="${c}"/></g></g>` +
    pill(130, 160, out, c) +
    tag(206, 60, k.name, c, { dir: 'left' })
}

function agents(k) {
  const { c, run } = k
  const robot = (x, y, s, extra = '') => `<g transform="translate(${x} ${y}) scale(${s})">${extra}` +
    `<path d="M0 -30v-14" stroke="${c}" stroke-width="2.5"/><circle cx="0" cy="-48" r="5" fill="${c}">${an(run, 'opacity', '1;.3;1', '1s')}</circle>` +
    `<rect x="-30" y="-30" width="60" height="50" rx="12" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="2.5"/>` +
    `<circle cx="-12" cy="-8" r="5" fill="${c}"/><circle cx="12" cy="-8" r="5" fill="${c}"/><path d="M-10 6h20" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<rect x="-20" y="22" width="40" height="24" rx="6" fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="2"/><path d="M-30 30h-10M30 30h10" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/></g>`
  const mini = `<g>${tr(run, 'scale', '0;1.1;1;1', '2.2s', ' keyTimes="0;.4;.5;1" calcMode="spline" keySplines=".2 0 .2 1;.3 0 .5 1;0 0 1 1"')}${an(run, 'opacity', '0;1;1;1', '2.2s', ' keyTimes="0;.3;.95;1"')}${robot(0, 0, 0.6)}</g>`
  return dash('M18 160h280') + dash('M110 118Q170 90 234 110') + `<path d="M226 104l8 6-9 4" fill="none" stroke="${G}" stroke-width="1.3" stroke-opacity=".6"/>` +
    robot(70, 100, 1) +
    `<g transform="translate(250 126)">${mini}</g>` +
    tag(104, 84, k.name, c, { dir: 'left', max: 20 })
}

function explore(k) {
  const { c, run } = k
  const lines = [0, 1, 2, 3, 4, 5].map(i => bar(76, 62 + i * 16, [100, 70, 118, 84, 60, 104][i], 6, 0.4)).join('')
  return `<rect x="60" y="44" width="150" height="116" rx="8" fill="${G}" fill-opacity=".08" stroke="${G}" stroke-width="2"/>` + lines +
    tag(135, 42, k.name, c, { dir: 'down', max: 18 }) +
    `<g>${tr(run, 'translate', '0 0;0 64;0 0', '2.4s', ' calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1" keyTimes="0;.5;1"')}` +
    `<rect x="128" y="74" width="44" height="7" rx="3.5" fill="${c}" fill-opacity=".8"/>` +
    `<circle cx="150" cy="78" r="23" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="3"/><path d="M167 95l22 22" stroke="${c}" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M139 69a12 12 0 0 1 10-6" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity=".6" stroke-linecap="round"/>` +
    `</g>` + dash('M220 100h20') + tag(240, 100, 'read', c, { dir: 'left' })
}

function shell(k) {
  const { c, run } = k
  k.detailDone = true
  const cmd = '$ ' + cut(k.name, 26)
  const cx = 48 + [...cmd].length * 7.8 + 3
  return `<rect x="30" y="40" width="260" height="112" rx="10" fill="#262626" fill-opacity=".92" stroke="${G}" stroke-width="2"/><path d="M30 62h260" stroke="${G}" stroke-width="1.5" stroke-opacity=".5"/>` +
    `<circle cx="46" cy="51" r="3.5" fill="${c}"/><circle cx="58" cy="51" r="3.5" fill="${c}" fill-opacity=".6"/><circle cx="70" cy="51" r="3.5" fill="${c}" fill-opacity=".3"/>` +
    t(48, 90, cmd, { size: 13, fill: '#e8e8e8', weight: 700 }) +
    `<rect x="${cx}" y="79" width="8" height="14" fill="#e8e8e8" fill-opacity="${run ? 1 : 0.4}">${an(run, 'opacity', '1;0;1', '1s', ' keyTimes="0;.5;1" calcMode="discrete"')}</rect>` +
    (k.detail ? t(48, 112, cut(k.detail, 30), { size: 11, fill: '#bdbdbd' }) : bar(48, 108, 90, 5, 0.35, '#bdbdbd') + bar(48, 122, 140, 5, 0.35, '#bdbdbd')) +
    dash('M18 160h284')
}

function think(k) {
  const { c, run } = k
  const lines = wrap(k.name, 16, 2)
  const rays = `<path d="M46 40v-8M30 48l-6-6M62 48l6-6M24 64h-8M68 64h8" stroke="${c}" stroke-width="2.5" stroke-linecap="round">${an(run, 'opacity', '1;.2;1', '1.4s')}</path>`
  return `<circle cx="46" cy="64" r="13" fill="${c}" stroke="${G}" stroke-width="2"/><rect x="40" y="77" width="12" height="8" rx="2" fill="${G}"/>` + rays +
    `<path d="M104 112a22 22 0 0 1 16-38a28 28 0 0 1 50-14a28 28 0 0 1 56 4a24 24 0 0 1 30 30a22 22 0 0 1-18 36H118a20 20 0 0 1-14-18z" fill="${c}" fill-opacity=".25" stroke="${G}" stroke-width="2"/>` +
    `<circle cx="88" cy="134" r="7" fill="${c}" fill-opacity=".25" stroke="${G}" stroke-width="2"/><circle cx="72" cy="148" r="4" fill="${c}" fill-opacity=".25" stroke="${G}" stroke-width="2"/>` +
    lines.map((l, i) => t(180, (lines.length === 1 ? 102 : 94) + i * 16, l, { size: 12, weight: 700, anchor: 'middle' })).join('') +
    `<circle cx="150" cy="60" r="3" fill="${G}" fill-opacity=".5">${an(run, 'cy', '62;56;62', '1.8s')}</circle><circle cx="210" cy="60" r="3" fill="${G}" fill-opacity=".5">${an(run, 'cy', '56;62;56', '1.8s')}</circle>`
}

function code(k) {
  const { c, run } = k
  const rows = [[[0, 28, c], [34, 60, G]], [[12, 40, G], [56, 26, c]], [[12, 74, G]], [[0, 18, c]]]
  const art = rows.map((r, i) => r.map(([x, w, col]) => bar(86 + x, 70 + i * 14, w, 6, col === c ? 0.9 : 0.4, col)).join('')).join('')
  const typed = `<rect x="98" y="126" width="54" height="6" rx="3" fill="${G}" fill-opacity=".4">${an(run, 'width', '0;54;54', '1.8s', ' keyTimes="0;.7;1"')}</rect>` +
    `<rect x="156" y="123" width="3" height="12" fill="${c}">${an(run, 'x', '98;156;156', '1.8s', ' keyTimes="0;.7;1"')}${an(run, 'opacity', '1;0;1', '1s', ' calcMode="discrete" keyTimes="0;.5;1"')}</rect>`
  return `<path d="M70 44H190l30 30V160H70z" fill="${G}" fill-opacity=".08" stroke="${G}" stroke-width="2" stroke-linejoin="round"/><path d="M190 44v30h30" fill="none" stroke="${G}" stroke-width="2" stroke-linejoin="round"/>` +
    tag(130, 42, k.name, c, { dir: 'down', max: 18 }) +
    art + typed + dash('M86 148h110') +
    t(256, 116, '{ }', { size: 26, fill: c, weight: 700, anchor: 'middle' }) + dash('M220 102h10')
}

function idle(k) {
  const { c } = k
  return dash('M18 150h284') +
    `<circle cx="160" cy="96" r="30" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="2.5"/>` +
    `<circle cx="160" cy="96" r="40" fill="none" stroke="${G}" stroke-width="1.3" stroke-dasharray="4 5" stroke-opacity=".5"><animateTransform attributeName="transform" type="rotate" from="0 160 96" to="360 160 96" dur="12s" repeatCount="indefinite"/></circle>` +
    `<path d="M146 94q6 5 12 0M162 94q6 5 12 0M152 108q8 4 16 0" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/>` +
    t(204, 76, 'z', { size: 13, fill: c, weight: 700 }) + t(214, 62, 'Z', { size: 16, fill: c, weight: 700 }) + t(228, 46, 'z', { size: 13, fill: c, weight: 700, op: 0.6 })
}

const SCENES = { database, api, frontend, tests, git, deps, infra, config, docs, auth, build, agents, explore, shell, think, code, idle }

export function illustrate({ scene = 'idle', object = '', name = '', detail = '', status = '', running = false } = {}, { width = 320, height = 180 } = {}) {
  const c = HEX[scene] ?? '#bcbcbc'
  const k = { scene, object: String(object ?? ''), name: String(name ?? ''), detail: String(detail ?? ''), status, run: !!running, c, ink: inkOn(c), detailDone: false }
  const draw = SCENES[scene] ?? idle
  const body = draw(k)
  const v = VERBS[`${scene}/${k.object}`] ?? VERBS[k.object]
  const verb = scene === 'idle' ? 'waiting' : v ? (status === 'done' ? v[1] : status === 'fail' ? 'failed' : v[0]) : k.object || 'working'
  const label = cut(`${scene} · ${verb}`, 24)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="${width}" height="${height}" role="img">` +
    body +
    (!k.detailDone && k.detail ? t(14, 172, cut(k.detail, 22), { size: 11, op: 0.85 }) : '') +
    t(306, 172, label, { size: 10, anchor: 'end', op: 0.8 }) +
    badge(status) +
    `</svg>`
}
