// Teaching pictures. Each lesson diagram is a bridge: the room of the restaurant
// on top (the same pictogram as on the map), then the real thing drawn with the
// person's own names (their table and its columns, their route, their component).
// One short animation shows the mechanism once, then the picture holds still.
// And the path: a kitchen rank earned by notions mastered, and the nine notions.
// Pure string building.
import { CONCEPTS, LESSONS, mastery, rank } from './lessons.mjs'
import { PICTO, appear, tone } from './map.mjs'

const ACCENT = '#0a84ff'
const OK = '#30d158'
const BAD = '#ff453a'
const INK = '#8e8e93'
const GREY = a => `rgba(142,142,147,${a})`
const BLUE = a => `rgba(10,132,255,${a})`
const SANS = '-apple-system, system-ui, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const OUT = 'calcMode="spline" keyTimes="0;1" keySplines=".22 1 .36 1"'

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
const cut = (s, n) => { const a = [...String(s ?? '')]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join('') }
const chips = d => String(d ?? '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)
const t = (x, y, s, { size = 10, fill = INK, weight = 500, anchor = 'start', mono = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="${mono ? MONO : SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`
const arrow = (d, head, c = INK) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/><path d="${head}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
const can = (cx, cy, rx, h, c = INK, f = GREY(0.14)) => `<path d="M${cx - rx} ${cy - h / 2}v${h}a${rx} ${Math.round(rx / 3)} 0 0 0 ${rx * 2} 0v-${h}" fill="${f}" stroke="${c}"/><ellipse cx="${cx}" cy="${cy - h / 2}" rx="${rx}" ry="${Math.round(rx / 3)}" fill="${f}" stroke="${c}"/>`
const person = (cx, cy, c = INK) => `<circle cx="${cx}" cy="${cy - 9}" r="6" fill="${GREY(0.18)}" stroke="${c}"/><path d="M${cx - 10} ${cy + 12}a10 10 0 0 1 20 0" fill="${GREY(0.18)}" stroke="${c}"/>`

const WORDS = {
  fr: { row: 'une ligne = un élément', col: 'une colonne = une information', screen: 'Écran', api: 'API', base: 'Base', reads: 'lit', rows: 'lignes', answer: 'réponse', brick: ['une brique d’écran', 'réutilisable partout'], code: 'votre code', checks: 'vérifications', result: 'résultat', checksNote: 'L’ordinateur vérifie à votre place', back: 'on peut revenir en arrière', snap: 'Chaque commit est une photo du projet', app: 'votre app', others: 'Du code écrit par d’autres, réutilisé', you: 'vous', theApp: 'l’app', who: 'On vérifie qui entre', kept: ['gardé hors', 'du code'], home: 'chez vous', online: 'en ligne', everyone: 'tout le monde', live: 'Votre app, accessible à tous' },
  en: { row: 'one row = one item', col: 'one column = one detail', screen: 'Screen', api: 'API', base: 'Database', reads: 'reads', rows: 'rows', answer: 'answer', brick: ['a piece of screen', 'reusable anywhere'], code: 'your code', checks: 'checks', result: 'result', checksNote: 'The computer checks for you', back: 'you can go back', snap: 'Each commit is a snapshot of the project', app: 'your app', others: 'Code written by others, reused', you: 'you', theApp: 'the app', who: 'Who comes in is checked', kept: ['kept out', 'of the code'], home: 'your computer', online: 'online', everyone: 'everyone', live: 'Your app, reachable by all' },
}

// "11 passed, 1 failed" in any language, as symbols: 11 ✓  1 ✗
const score = d => { const p = /(\d+)\s+(?:passed|réussi)/.exec(d ?? '')?.[1]; const f = /(\d+)\s+(?:failed|échoué)/.exec(d ?? '')?.[1]; return [p && `${p} ✓`, f && `${f} ✗`].filter(Boolean).join('  ') }

// A believable value for a column, so the table reads as data and not as grey bars.
function sample(col, i) {
  const c = col.toLowerCase()
  if (/^id$|_id$|^uuid/.test(c)) return String(i + 1)
  if (/mail/.test(c)) return ['lea@mail.fr', 'tom@mail.fr', 'ana@mail.fr'][i]
  if (/pass|hash|secret|token/.test(c)) return '••••••••'
  if (/name|nom|title|titre/.test(c)) return ['Léa', 'Tom', 'Ana'][i]
  if (/date|_at$|time/.test(c)) return ['2026-11-01', '2026-11-02', '2026-11-03'][i]
  if (/price|prix|amount|total/.test(c)) return ['12,00', '8,50', '21,00'][i]
  if (/^is_|^has_|active|done/.test(c)) return ['oui', 'non', 'oui'][i]
  return '…'
}

const DRAW = {
  database(c, w, k) {
    const cols = (chips(c.detail).length ? chips(c.detail) : ['id', 'email', 'name']).slice(0, 3)
    const x0 = 16, cw = 328 / cols.length
    const head = `<path d="M${x0} 8a6 6 0 0 1 6-6h316a6 6 0 0 1 6 6v14H${x0}z" fill="${BLUE(0.16)}"/>` + t(x0 + 10, 16, cut(c.name || 'table', 30), { size: 11, fill: ACCENT, weight: 700, mono: true })
    const colRow = cols.map((n, i) => (i === 1 ? `<rect x="${x0 + i * cw}" y="22" width="${cw}" height="62" fill="none" stroke="${ACCENT}" stroke-dasharray="3 2"/>` : '') + t(x0 + 10 + i * cw, 35, cut(n, 17), { mono: true, weight: 600, fill: INK })).join('')
    const row = i => {
      const y = 40 + i * 15
      return `<path d="M${x0} ${y}h328" stroke="${GREY(0.3)}" stroke-width=".6"/>` + cols.map((n, j) => t(x0 + 10 + j * cw, y + 11, cut(sample(n, i), 17), { mono: true, size: 9.5, fill: i === 0 ? ACCENT : INK })).join('')
    }
    const first = `<rect x="${x0 + 1}" y="40" width="326" height="15" fill="${BLUE(0.12)}"/>` + row(0)
    // The aha: a new row is written, and it stays.
    const fresh = appear(row(2), 0.6, '24 0', k.motion)
    const frame = `<rect x="${x0}" y="2" width="328" height="84" rx="6" fill="none" stroke="${GREY(0.45)}"/>`
    const legend = `<rect x="${x0}" y="96" width="12" height="9" rx="2" fill="${BLUE(0.25)}"/>` + t(x0 + 18, 104, w.row, { size: 10, fill: INK, weight: 600 }) +
      `<rect x="190" y="96" width="12" height="9" rx="2" fill="none" stroke="${ACCENT}" stroke-dasharray="3 2"/>` + t(208, 104, w.col, { size: 10, fill: INK, weight: 600 })
    return head + first + row(1) + fresh + colRow + frame + legend
  },
  api(c, w, k) {
    const box = (x, label, picto, on) => `<rect x="${x}" y="22" width="60" height="52" rx="9" fill="${on ? BLUE(0.14) : GREY(0.12)}" stroke="${on ? ACCENT : GREY(0.55)}"/>` +
      `<g transform="translate(${x + 30} 48)">${PICTO[picto](tone(on))}</g>` + t(x + 30, 90, label, { anchor: 'middle', weight: 600, fill: on ? ACCENT : INK })
    const route = cut(c.name || '/users', 10)
    const out = arrow('M80 38H146', 'M141 33l5 5-5 5', ACCENT) + arrow('M214 38H280', 'M275 33l5 5-5 5', ACCENT)
    const back = arrow('M280 60H214', 'M219 55l-5 5 5 5') + arrow('M146 60H80', 'M85 55l-5 5 5 5')
    const labels = t(113, 31, `GET ${route}`, { anchor: 'middle', size: 9, mono: true, fill: ACCENT, weight: 600 }) + t(247, 31, w.reads, { anchor: 'middle', size: 9.5, fill: ACCENT }) +
      t(247, 74, w.rows, { anchor: 'middle', size: 9.5 }) + t(113, 74, `200 · ${w.answer}`, { anchor: 'middle', size: 9.5 })
    // The aha: the order goes in, the answer comes back.
    const ticket = k.motion
      ? `<rect x="-5" y="-4" width="10" height="8" rx="1.5" fill="${ACCENT}" opacity="0"><set attributeName="opacity" to="1" begin=".4s"/><animateMotion path="M50 38H314V60H50" begin=".4s" dur="2.6s" fill="freeze" calcMode="linear"/><set attributeName="opacity" to="0" begin="3s"/></rect>`
      : ''
    return box(18, w.screen, 'frontend', false) + box(152, w.api, 'api', true) + box(286, w.base, 'database', false) + out + back + labels + ticket
  },
  interface(c, w, k) {
    const frame = `<rect x="16" y="2" width="208" height="100" rx="10" fill="${GREY(0.08)}" stroke="${GREY(0.5)}"/><path d="M16 18h208" stroke="${GREY(0.4)}" stroke-width=".6"/>` +
      [28, 36, 44].map(x => `<circle cx="${x}" cy="10" r="2.2" fill="${GREY(0.5)}"/>`).join('')
    const name = cut(c.name || 'Component', 20)
    const main = `<rect x="30" y="26" width="180" height="32" rx="7" fill="${BLUE(0.14)}" stroke="${ACCENT}"/>` + t(120, 46, name, { anchor: 'middle', mono: true, fill: ACCENT, weight: 700, size: 11 })
    const again = `<rect x="30" y="64" width="86" height="30" rx="7" fill="${BLUE(0.06)}" stroke="${ACCENT}" stroke-dasharray="3 3"/>` + t(73, 83, cut(name, 11), { anchor: 'middle', mono: true, fill: ACCENT, size: 9.5 })
    const other = `<rect x="124" y="64" width="86" height="30" rx="7" fill="${GREY(0.14)}"/>`
    // The aha: the same brick is placed again.
    const reuse = appear(again, 0.6, '0 -30', k.motion)
    return frame + main + reuse + other + `<path d="M214 42L234 42" stroke="${ACCENT}" stroke-dasharray="2 2"/>` + t(238, 40, w.brick[0], { size: 10.5, fill: ACCENT, weight: 600 }) + t(238, 53, w.brick[1], { size: 10 })
  },
  tests(c, w, k) {
    const fail = c.status === 'fail'
    const code = `<rect x="16" y="14" width="88" height="72" rx="8" fill="${GREY(0.12)}" stroke="${GREY(0.45)}"/>` + [26, 38, 50, 62, 74].map((y, i) => `<rect x="${i % 2 ? 34 : 26}" y="${y}" width="${[52, 40, 58, 30, 46][i]}" height="4" rx="2" fill="${GREY(0.45)}"/>`).join('')
    const checks = [0, 1, 2].map(i => {
      const y = 24 + i * 26
      const bad = fail && i === 2
      const mark = bad ? `<path d="M154 ${y - 3}l6 6M160 ${y - 3}l-6 6" stroke="${BAD}" stroke-width="1.8" stroke-linecap="round"/>` : `<path d="M153.5 ${y}l2.5 2.5 4.5-5" fill="none" stroke="${OK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
      // The aha: each check is tasted in turn.
      const shownMark = appear(mark, 0.5 + i * 0.45, '0 0', k.motion)
      return `<rect x="150" y="${y - 7}" width="14" height="14" rx="4" fill="none" stroke="${GREY(0.5)}"/>` + shownMark + `<rect x="172" y="${y - 2}" width="${[64, 50, 72][i]}" height="4" rx="2" fill="${GREY(0.45)}"/>`
    }).join('')
    const c2 = fail ? BAD : OK
    const verdict = `<circle cx="304" cy="52" r="24" fill="${fail ? 'rgba(255,69,58,.14)' : 'rgba(48,209,88,.16)'}" stroke="${c2}"/>` +
      (fail ? `<path d="M296 44l16 16M312 44l-16 16" stroke="${BAD}" stroke-width="2.5" stroke-linecap="round"/>` : `<path d="M294 52l7 7 12-14" fill="none" stroke="${OK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`)
    const shownVerdict = appear(verdict, 1.9, '0 0', k.motion)
    return code + arrow('M110 52H140', 'M135 47l5 5-5 5') + checks + arrow('M254 52H272', 'M267 47l5 5-5 5') + shownVerdict +
      t(60, 104, w.code, { anchor: 'middle', weight: 600 }) + t(192, 104, w.checks, { anchor: 'middle', weight: 600 }) + t(304, 104, score(c.detail) || w.result, { anchor: 'middle', weight: 700, fill: c.detail ? c2 : INK })
  },
  git(c, w, k) {
    const photo = (x, on) => `<rect x="${x}" y="40" width="34" height="28" rx="6" fill="${on ? BLUE(0.16) : GREY(0.14)}" stroke="${on ? ACCENT : GREY(0.5)}"/><path d="M${x + 6} 62l7-8 5 5 6-7 6 10" fill="none" stroke="${on ? ACCENT : GREY(0.6)}" stroke-width="1.3" stroke-linejoin="round"/>`
    const xs = [30, 100, 170, 240]
    // The aha: a new page joins the book.
    const last = appear(photo(240, true), 0.5, '20 0', k.motion)
    return `<path d="M20 54H330" stroke="${GREY(0.4)}" stroke-width="2"/>` + xs.slice(0, 3).map(x => photo(x, false)).join('') + last +
      xs.slice(0, 3).map((x, i) => t(x + 17, 84, `v${i + 1}`, { anchor: 'middle', mono: true })).join('') +
      t(340, 100, cut(c.name || 'commit', 34), { anchor: 'end', mono: true, fill: ACCENT, weight: 700 }) + `<path d="M257 72v18" stroke="${ACCENT}" stroke-width="1" stroke-dasharray="2 2"/>` +
      `<path d="M257 36Q187 0 121 34" fill="none" stroke="${ACCENT}" stroke-width="1.3" stroke-dasharray="3 3"/><path d="M121 28l0 6 6 1" fill="none" stroke="${ACCENT}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` +
      t(189, 12, w.back, { anchor: 'middle', size: 9.5, fill: ACCENT, weight: 600 }) + t(20, 116, w.snap, { size: 10.5 })
  },
  deps(c, w, k) {
    const app = `<rect x="128" y="36" width="104" height="44" rx="10" fill="${BLUE(0.14)}" stroke="${ACCENT}"/>` + t(180, 62, w.app, { anchor: 'middle', fill: ACCENT, weight: 700, size: 11 })
    const box = (x, y, label, on) => `<rect x="${x}" y="${y}" width="74" height="28" rx="7" fill="${on ? BLUE(0.12) : GREY(0.14)}" stroke="${on ? ACCENT : GREY(0.5)}"/>` + t(x + 37, y + 18, label, { anchor: 'middle', mono: true, fill: on ? ACCENT : INK, size: 9.5, weight: on ? 700 : 500 })
    const name = cut(c.name || 'package', 11)
    // The aha: the delivery arrives ready-made.
    const delivered = appear(box(268, 48, name, true), 0.5, '30 0', k.motion)
    return t(180, 12, w.others, { anchor: 'middle', size: 10.5, fill: ACCENT, weight: 600 }) +
      box(18, 22, 'dates', false) + box(18, 78, 'charts', false) + delivered +
      arrow('M94 36H124', 'M119 31l5 5-5 5') + arrow('M94 92H124', 'M119 87l5 5-5 5') + arrow('M266 62H236', 'M241 57l-5 5 5 5', ACCENT) + app
  },
  auth(c, w, k) {
    const shield = `<path d="M180 22l26 10v18c0 18-11 30-26 36-15-6-26-18-26-36V32z" fill="${BLUE(0.14)}" stroke="${ACCENT}" stroke-linejoin="round"/>` +
      `<rect x="170" y="48" width="20" height="16" rx="3" fill="${ACCENT}"/><path d="M174 48v-4a6 6 0 0 1 12 0v4" fill="none" stroke="${ACCENT}" stroke-width="2"/>`
    // The aha: checked at the door, then let in.
    const walker = k.motion ? `<g opacity="0"><set attributeName="opacity" to="1" begin=".4s"/><animateMotion path="M54 58H150H150H262" keyPoints="0;.35;.55;1" keyTimes="0;.35;.6;1" begin=".4s" dur="2.6s" fill="freeze" calcMode="linear"/><set attributeName="opacity" to="0" begin="3s"/><circle r="5" fill="${OK}"/></g>` : ''
    return t(180, 10, w.who, { anchor: 'middle', size: 10.5, fill: ACCENT, weight: 600 }) + person(54, 58) + t(54, 96, w.you, { anchor: 'middle', weight: 600 }) +
      arrow('M74 58H146', 'M141 53l5 5-5 5') + shield + arrow('M214 58H262', 'M257 53l5 5-5 5', OK) +
      `<rect x="268" y="38" width="68" height="40" rx="8" fill="${GREY(0.14)}" stroke="${GREY(0.5)}"/>` + t(302, 62, w.theApp, { anchor: 'middle', weight: 600 }) +
      t(180, 106, cut(c.name || 'login', 24), { anchor: 'middle', mono: true, fill: ACCENT, weight: 600 }) + walker
  },
  config(c, w) {
    const keys = (chips(c.detail).length ? chips(c.detail) : ['DATABASE_URL', 'SESSION_SECRET', 'PORT']).slice(0, 3)
    const rows = keys.map((key, i) => {
      const y = 32 + i * 26
      const secret = !/port|host|env|mode/i.test(key)
      return t(54, y, cut(key, 16), { mono: true, weight: 600, fill: i === 0 ? ACCENT : INK }) + t(190, y, secret ? '••••••••' : '3000', { mono: true, fill: secret ? ACCENT : INK })
    }).join('')
    return `<rect x="38" y="8" width="222" height="88" rx="10" fill="${GREY(0.1)}" stroke="${GREY(0.5)}"/>` + rows +
      `<g transform="translate(282 36)"><rect x="0" y="8" width="18" height="14" rx="3" fill="${ACCENT}"/><path d="M4 8v-3a5 5 0 0 1 10 0v3" fill="none" stroke="${ACCENT}" stroke-width="2"/></g>` +
      t(272, 76, w.kept[0], { size: 10.5, fill: ACCENT, weight: 600 }) + t(272, 89, w.kept[1], { size: 10 })
  },
  deploy(c, w) {
    const laptop = `<rect x="26" y="34" width="62" height="40" rx="5" fill="${GREY(0.14)}" stroke="${INK}"/><path d="M18 80h78" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
    const cloud = `<path d="M150 72h62a17 17 0 0 0 2-34a24 24 0 0 0-45-6a17 17 0 0 0-19 40z" fill="${BLUE(0.14)}" stroke="${ACCENT}"/>`
    return t(180, 12, w.live, { anchor: 'middle', size: 10.5, fill: ACCENT, weight: 600 }) + laptop + arrow('M100 54H138', 'M133 49l5 5-5 5', ACCENT) + cloud + arrow('M236 54H262', 'M257 49l5 5-5 5', ACCENT) +
      person(282, 54) + person(306, 48) + person(330, 54) +
      t(57, 100, w.home, { anchor: 'middle', weight: 600 }) + t(184, 100, w.online, { anchor: 'middle', weight: 700, fill: ACCENT }) + t(306, 100, w.everyone, { anchor: 'middle', weight: 600 })
  },
}

const ROOM_OF = { interface: 'frontend', database: 'database', api: 'api', auth: 'auth', tests: 'tests', git: 'git', deps: 'deps', config: 'config' }
const sign = c => `<rect x="-12" y="-7" width="24" height="14" rx="7" fill="${c.fill}" stroke="${c.line}"/><circle cx="0" cy="0" r="2.4" fill="${c.line}"/>`
const icon = (id, c) => (ROOM_OF[id] ? PICTO[ROOM_OF[id]](c) : sign(c))
const width = (s, size) => [...String(s)].length * size * 0.56

// The bridge: the room of the restaurant, an arrow, the real name.
function bridge(id, locale) {
  const l = (LESSONS[locale] ?? LESSONS.en)[id]
  const roomW = width(l.room, 11)
  return `<g transform="translate(26 15) scale(.8)">${icon(id, tone(false))}</g>` + t(46, 19, l.room, { size: 11, weight: 600 }) +
    arrow(`M${54 + roomW} 15h22`, `M${71 + roomW} 10l5 5-5 5`, ACCENT) + t(84 + roomW, 19, l.title, { size: 11, weight: 700, fill: ACCENT })
}

export function diagram(id, { name = '', detail = '', status = '', locale = 'en', motion = true } = {}) {
  const draw = DRAW[id]
  if (!draw) return ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 156" width="360" height="156" role="img">${bridge(id, locale)}<g transform="translate(0 36)">${draw({ name, detail, status }, WORDS[locale] ?? WORDS.en, { motion })}</g></svg>`
}

// The path: the rank and how far the next one is, then the nine notions in two rows,
// each a ring that fills as it is learned (half for one right answer, full when mastered).
export function notions(progress, current, locale = 'en', { motion = true } = {}) {
  const lessons = LESSONS[locale] ?? LESSONS.en
  const r = rank(progress, locale)
  const fr = locale === 'fr'
  const bar = 344 * Math.max(0.03, r.ratio)
  let out = t(8, 14, r.title, { size: 12, weight: 700, fill: ACCENT }) +
    t(352, 14, r.next ? (fr ? `${r.need} notion${r.need > 1 ? 's' : ''} à maîtriser pour ${r.next}` : `${r.need} notion${r.need > 1 ? 's' : ''} to master for ${r.next}`) : (fr ? 'Toutes les notions maîtrisées' : 'Every notion mastered'), { size: 10, anchor: 'end' }) +
    `<rect x="8" y="21" width="344" height="5" rx="2.5" fill="${GREY(0.2)}"/>` +
    `<rect x="8" y="21" width="${bar}" height="5" rx="2.5" fill="${ACCENT}">${motion ? `<animate attributeName="width" values="0;0;${bar}" keyTimes="0;.25;1" dur=".8s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;.22 1 .36 1"/>` : ''}</rect>`
  const at = i => (i < 5 ? [36 + i * 72, 58] : [72 + (i - 5) * 72, 112])
  out += CONCEPTS.map((id, i) => {
    const [x, y] = at(i)
    const m = mastery(progress, id)
    const known = (progress.concepts?.[id]?.seen ?? 0) > 0
    const here = id === current
    const R = 15, C = 2 * Math.PI * R
    const ring = !known
      ? `<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${GREY(0.35)}" stroke-dasharray="2 3"/>`
      : `<circle cx="${x}" cy="${y}" r="${R}" fill="${m >= 2 ? BLUE(0.16) : 'none'}" stroke="${GREY(0.3)}" stroke-width="2.5"/>` +
        (m ? `<circle cx="${x}" cy="${y}" r="${R}" fill="none" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${(C * m / 2).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${x} ${y})"/>` : '')
    const picto = `<g transform="translate(${x} ${y}) scale(.52)">${icon(id, known ? (m >= 2 || here ? tone(true) : tone(false)) : { fill: 'none', line: GREY(0.4) })}</g>`
    const badge = m >= 2 ? `<circle cx="${x + 11}" cy="${y - 11}" r="5.5" fill="${OK}"/><path d="M${x + 8.6} ${y - 11}l1.6 1.6 3-3.2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>` : ''
    const halo = here ? `<circle cx="${x}" cy="${y}" r="${R + 5}" fill="none" stroke="${ACCENT}" stroke-width="1" stroke-opacity=".6"/>` : ''
    return halo + ring + picto + badge + t(x, y + 30, lessons[id].short, { anchor: 'middle', size: 10, fill: here ? ACCENT : known ? INK : GREY(0.6), weight: here ? 700 : 500 })
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 150" width="360" height="150" role="img">${out}</svg>`
}
