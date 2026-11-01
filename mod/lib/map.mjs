// The app drawn as a restaurant seen from above, one floor plan for every level.
// The front of house is what visitors use: the front door (access), the dining
// room (interface), the kitchen with its pass (server and API), the pantry
// (data). Behind the scenes: tasting (tests), the recipe book (versions), the
// suppliers (dependencies), the safe (settings). Claude is the chef: it walks
// out of one room, along the street, into the room it works in.
// Only what changed animates; loops run only while an action runs; motion off
// draws the same plan still. Pure string building.

const ACCENT = '#0a84ff'
const OK = '#30d158'
const BAD = '#ff453a'
const INK = '#8e8e93'
const CLAY = '#d97757'
const CLAY_SIDE = '#b65f42'
const EYE = '#1d1d1f'
const HAT = '#f5f5f7'
const GREY = a => `rgba(142,142,147,${a})`
const BLUE = a => `rgba(10,132,255,${a})`
const SANS = '-apple-system, system-ui, sans-serif'
// Motion tokens: enter .35s on a soft ease-out, travel on an ease-in-out.
const OUT = 'calcMode="spline" keyTimes="0;1" keySplines=".22 1 .36 1"'
const INOUT = 'calcMode="spline" keyTimes="0;1" keySplines=".4 0 .2 1"'

// Enter once after `at` seconds: fade and slide in. The element's own state is the end state,
// so a surface that does not animate still shows it; the animation holds it hidden until `at`.
export function appear(inner, at = 0, from = '0 6', motion = true) {
  if (!motion) return inner
  const d = (at + 0.4).toFixed(2), k = (at / (at + 0.4)).toFixed(3)
  return `<g><animate attributeName="opacity" values="0;0;1" keyTimes="0;${k};1" dur="${d}s" fill="freeze"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${from};${from};0 0" keyTimes="0;${k};1" dur="${d}s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;.22 1 .36 1"/>${inner}</g>`
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch])
const cut = (s, n) => { const a = [...String(s ?? '')]; return a.length > n ? a.slice(0, n - 1).join('') + '…' : a.join('') }
const text = (x, y, s, { size = 10.5, fill = INK, weight = 600, anchor = 'start', mono = false } = {}) =>
  `<text x="${x}" y="${y}" font-family="${mono ? 'ui-monospace, Menlo, monospace' : SANS}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`

// ---- the plan ---------------------------------------------------------------------

export const ROOMS = {
  auth: { x: 6, y: 34, w: 58, h: 100, front: true },
  frontend: { x: 64, y: 34, w: 98, h: 100, front: true },
  api: { x: 162, y: 34, w: 96, h: 100, front: true },
  database: { x: 258, y: 34, w: 96, h: 100, front: true },
  tests: { x: 6, y: 156, w: 87, h: 52 },
  git: { x: 93, y: 156, w: 87, h: 52 },
  deps: { x: 180, y: 156, w: 87, h: 52 },
  config: { x: 267, y: 156, w: 87, h: 52 },
}
const STREET = 145
const LANE = 98 // the height where orders travel, through every inner door
const SIGN = { x: 290, y: 6, w: 64, h: 20 }

// Where each kind of work happens. The street is where Claude thinks and reads.
export const roomOf = scene => ({
  auth: 'auth', frontend: 'frontend', api: 'api', code: 'api', build: 'api', database: 'database',
  tests: 'tests', git: 'git', docs: 'git', deps: 'deps', config: 'config', infra: 'sign',
})[scene] ?? 'street'

const LABELS = {
  fr: {
    beginner: { auth: 'Accueil', frontend: 'Salle', api: 'Cuisine', database: 'Réserve', tests: 'Dégustation', git: 'Carnet', deps: 'Fournisseurs', config: 'Coffre', plan: 'Plan', behind: 'En coulisses', closed: 'Fermé', open: 'Ouvert' },
    intermediate: { auth: 'Accès', frontend: 'Interface', api: 'Serveur · API', database: 'Base de données', tests: 'Tests', git: 'Git', deps: 'Dépendances', config: 'Réglages', plan: 'Plan', behind: 'Outils du projet', closed: 'Hors ligne', open: 'En ligne' },
    advanced: { auth: 'Auth', frontend: 'Frontend', api: 'API', database: 'Database', tests: 'Tests', git: 'Git', deps: 'Deps', config: 'Config', plan: 'Plan', behind: 'Tooling', closed: 'local', open: 'deployed' },
  },
  en: {
    beginner: { auth: 'Front door', frontend: 'Dining room', api: 'Kitchen', database: 'Pantry', tests: 'Tasting', git: 'Recipe book', deps: 'Suppliers', config: 'Safe', plan: 'Plan', behind: 'Behind the scenes', closed: 'Closed', open: 'Open' },
    intermediate: { auth: 'Access', frontend: 'Interface', api: 'Server · API', database: 'Database', tests: 'Tests', git: 'Git', deps: 'Dependencies', config: 'Settings', plan: 'Plan', behind: 'Project tools', closed: 'Offline', open: 'Online' },
    advanced: { auth: 'Auth', frontend: 'Frontend', api: 'API', database: 'Database', tests: 'Tests', git: 'Git', deps: 'Deps', config: 'Config', plan: 'Plan', behind: 'Tooling', closed: 'local', open: 'deployed' },
  },
}
export const labels = (level, locale) => { const l = LABELS[locale] ?? LABELS.en; return l[level] ?? l[level === 'dev' ? 'advanced' : 'beginner'] }

// Where Claude stands: just inside the room's street door, or on the street.
export function spot(room) {
  if (room === 'sign') return [SIGN.x + 14, STREET + 7]
  const r = ROOMS[room]
  if (!r) return [30, STREET + 7]
  return r.front ? [r.x + r.w / 2, r.y + r.h - 2] : [r.x + 18, r.y + 1]
}

// ---- small drawings -------------------------------------------------------------

export const tone = (on, bad) => (bad ? { fill: 'rgba(255,69,58,.16)', line: BAD } : on ? { fill: BLUE(0.18), line: ACCENT } : { fill: GREY(0.16), line: INK })
// Pictograms about 26 wide, centred on the origin.
export const PICTO = {
  frontend: c => `<rect x="-13" y="-10" width="26" height="19" rx="3" fill="${c.fill}" stroke="${c.line}"/><path d="M-9 -5h12M-9 -1h8" stroke="${c.line}" stroke-linecap="round" stroke-opacity=".75"/><rect x="-9" y="3" width="9" height="3.4" rx="1.7" fill="${c.line}"/>`,
  auth: c => `<rect x="-8" y="-11" width="16" height="22" rx="2" fill="${c.fill}" stroke="${c.line}"/><path d="M-3 -1v-2.6a3 3 0 0 1 6 0v2.6" fill="none" stroke="${c.line}" stroke-width="1.4"/><rect x="-4.6" y="-1" width="9.2" height="7" rx="1.6" fill="${c.line}"/>`,
  // An order ticket: what the dining room asks the kitchen for.
  api: c => `<path d="M-11 -11h22v18l-3.7 3-3.6-3-3.7 3-3.7-3-3.6 3-3.7-3z" fill="${c.fill}" stroke="${c.line}" stroke-linejoin="round"/><path d="M-7 -6h14M-7 -2h9M-7 2h11" stroke="${c.line}" stroke-linecap="round" stroke-opacity=".75"/>`,
  code: c => `<path d="M-12 -2h24v8a5 5 0 0 1-5 5h-14a5 5 0 0 1-5-5z" fill="${c.fill}" stroke="${c.line}" stroke-linejoin="round"/><path d="M-14 -2h28M-4 -7c0-2 2-2 2-4M3 -7c0-2 2-2 2-4" stroke="${c.line}" stroke-linecap="round" fill="none"/>`,
  // A ledger: a book whose pages are a table, one line per item.
  database: c => `<rect x="-12" y="-11" width="24" height="22" rx="2.5" fill="${c.fill}" stroke="${c.line}"/><path d="M-12 -5h24M-12 0h24M-12 5h24M-4 -11v22M4 -11v22" stroke="${c.line}" stroke-opacity=".55"/>`,
  tests: c => `<rect x="-9" y="-11" width="18" height="22" rx="2.5" fill="${c.fill}" stroke="${c.line}"/><rect x="-4" y="-13" width="8" height="4" rx="1.5" fill="${c.line}"/><path d="M-5 -3l1.6 1.6 3-3.2M-5 4l1.6 1.6 3-3.2" fill="none" stroke="${c.line}" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 -2h3M2 5h3" stroke="${c.line}" stroke-linecap="round"/>`,
  git: c => `<path d="M-10 -11h17a3 3 0 0 1 3 3v19h-17a3 3 0 0 1-3-3z" fill="${c.fill}" stroke="${c.line}" stroke-linejoin="round"/><path d="M-10 8a3 3 0 0 1 3-3h17" fill="none" stroke="${c.line}"/><path d="M2 -11v8l2.5-2 2.5 2v-8" fill="${c.line}"/>`,
  deps: c => `<rect x="-12" y="-1" width="13" height="11" rx="1.5" fill="${c.fill}" stroke="${c.line}"/><rect x="1" y="-1" width="11" height="11" rx="1.5" fill="${c.fill}" stroke="${c.line}"/><rect x="-6" y="-12" width="12" height="11" rx="1.5" fill="${c.fill}" stroke="${c.line}"/><path d="M-12 4h13M1 4h11M-6 -7h12" stroke="${c.line}" stroke-opacity=".55"/>`,
  config: c => `<rect x="-11" y="-11" width="22" height="22" rx="3" fill="${c.fill}" stroke="${c.line}"/><circle cx="0" cy="0" r="5.5" fill="none" stroke="${c.line}"/><path d="M0 0l3-3" stroke="${c.line}" stroke-linecap="round"/><path d="M-8 -11v-1.5M8 -11v-1.5" stroke="${c.line}" stroke-linecap="round"/>`,
}
const pictoFor = item => (item.scene === 'code' || item.scene === 'build' || (item.scene === 'api' && /service|server|model|middleware|schema/.test(item.object)) ? PICTO.code : PICTO[roomOf(item.scene) === 'api' ? 'api' : item.scene] ?? PICTO.code)

// An address reads as one: "users" served by the API shows as /users.
export const shown = item => (roomOf(item.scene) === 'api' && /route|endpoint/.test(item.object) && !/^(\/|GET|POST|PUT|PATCH|DELETE)\b/i.test(item.name) ? '/' + item.name : item.name || item.object)

// Claude as a chef, feet on the origin: the clay block, two eyes, a toque.
function chef(scale = 1) {
  return `<g${scale !== 1 ? ` transform="scale(${scale})"` : ''}>` +
    `<ellipse cx="0" cy="1" rx="9" ry="2.4" fill="#000" fill-opacity=".18"/>` +
    [-6.5, -2.5, 1, 5].map(x => `<rect x="${x}" y="-4.5" width="2.4" height="4.5" rx="1" fill="${CLAY_SIDE}"/>`).join('') +
    `<rect x="-11.5" y="-13" width="3" height="5" rx="1.5" fill="${CLAY}"/><rect x="8.5" y="-13" width="3" height="5" rx="1.5" fill="${CLAY}"/>` +
    `<rect x="-8.5" y="-17" width="18" height="13" rx="3" fill="${CLAY_SIDE}"/><rect x="-9" y="-18" width="18" height="13" rx="3" fill="${CLAY}"/>` +
    `<rect x="-5" y="-15" width="2.4" height="4" rx="1" fill="${EYE}"/><rect x="2.6" y="-15" width="2.4" height="4" rx="1" fill="${EYE}"/>` +
    `<rect x="-6" y="-23" width="12" height="5" rx="1" fill="${HAT}" stroke="rgba(0,0,0,.18)" stroke-width=".6"/>` +
    `<g fill="${HAT}" stroke="rgba(0,0,0,.18)" stroke-width=".6"><circle cx="-4" cy="-26" r="4"/><circle cx="4" cy="-26" r="4"/><circle cx="0" cy="-28" r="4.6"/></g>` +
    `<rect x="-5.4" y="-24" width="10.8" height="3" fill="${HAT}"/>` +
    `</g>`
}
const visitor = fill => `<circle cx="0" cy="-12" r="3.4" fill="${fill}"/><path d="M-5 0v-4a5 5 0 0 1 10 0v4z" fill="${fill}"/>`

// ---- the map --------------------------------------------------------------------------

/**
 * One moment of the session, drawn: { scene, object, name, status, running, motion,
 * shelf, steps, prev, level, locale, focus }. `prev` is the room Claude comes from;
 * `focus` = { room, from } is a guided-tour stop that replaces the live moment.
 */
export function map({ scene = 'idle', object = '', name = '', status = '', running = false, motion = true, shelf = [], steps = [], prev = '', level = 'beginner', locale = 'en', focus = null, checks = null } = {}) {
  const L = labels(level, locale)
  const tech = level === 'advanced' || level === 'dev'
  const live = motion && running
  const here = focus ? focus.room : roomOf(scene)
  const bad = !focus && status === 'fail'
  const fresh = !focus && !running && status === 'done'
  const enter = (inner, at = 0, from = '0 6') => appear(inner, at, from, motion)
  const pulse = (x, y, at) => motion
    ? `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${ACCENT}" stroke-width="1.5" opacity="0"><animate attributeName="r" from="14" to="30" begin="${at}s" dur=".7s" fill="freeze" ${OUT}/><animate attributeName="opacity" values=".8;0" begin="${at}s" dur=".7s" fill="freeze"/></circle>`
    : ''
  let out = ''

  // The plan as order tickets on a rail: done ones ticked, the active one lit.
  const tickets = steps.slice(0, 9)
  out += text(8, 21, L.plan, { fill: here === 'street' && scene === 'think' ? ACCENT : INK })
  if (tickets.length) {
    const x0 = 40
    out += `<path d="M${x0 - 4} 8H${x0 + tickets.length * 24}" stroke="${GREY(0.5)}" stroke-width="1.2" stroke-linecap="round"/>`
    out += tickets.map((s, i) => {
      const x = x0 + i * 24
      const on = s.status === 'active'
      const c = s.status === 'done' ? { fill: GREY(0.16), line: INK } : on ? { fill: BLUE(0.2), line: ACCENT } : { fill: 'none', line: GREY(0.5) }
      const mark = s.status === 'done'
        ? `<path d="M${x + 6} ${18}l2.4 2.4 4.6-5" fill="none" stroke="${OK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
        : text(x + 10, 21.5, String(i + 1), { size: 9, fill: on ? ACCENT : INK, anchor: 'middle' })
      const card = `<path d="M${x + 10} 8v3" stroke="${GREY(0.5)}"/><rect x="${x}" y="11" width="20" height="16" rx="2.5" fill="${c.fill}" stroke="${c.line}"/>${mark}`
      return on && live ? `<g>${card}<animateTransform attributeName="transform" type="rotate" values="0 ${x + 10} 8;3 ${x + 10} 8;-3 ${x + 10} 8;0 ${x + 10} 8" dur="1.6s" repeatCount="2"/></g>` : card
    }).join('')
    if (steps.length > 9) out += text(x0 + 9 * 24 + 2, 22, `+${steps.length - 9}`, { size: 9 })
  }

  // The shop sign: closed until the app is online.
  const online = shelf.some(o => o.scene === 'infra' && o.object === 'deploy') || (scene === 'infra' && fresh)
  const signOn = here === 'sign'
  const sign = `<rect x="${SIGN.x}" y="${SIGN.y}" width="${SIGN.w}" height="${SIGN.h}" rx="10" fill="${online ? OK : 'none'}" fill-opacity="${online ? 0.9 : 0}" stroke="${online ? OK : signOn ? ACCENT : GREY(0.5)}"/>` +
    text(SIGN.x + SIGN.w / 2, SIGN.y + 13.5, online ? L.open : L.closed, { size: 10, fill: online ? '#ffffff' : signOn ? ACCENT : INK, anchor: 'middle' })
  out += online && scene === 'infra' && fresh ? enter(sign, 0.3) + pulse(SIGN.x + SIGN.w / 2, SIGN.y + 10, 0.5) : sign

  // Floors first, the active room tinted.
  for (const [k, r] of Object.entries(ROOMS)) {
    const on = k === here
    out += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${on ? (bad ? 'rgba(255,69,58,.08)' : BLUE(0.08)) : GREY(0.05)}"/>`
  }

  // Walls: a floor plan with door gaps on the street, the pass between dining room and kitchen.
  const wall = d => `<path d="${d}" fill="none" stroke="${GREY(0.5)}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
  const gaps = (y, xs, from, to) => { let d = '', x = from; for (const g of xs) { d += `M${x} ${y}H${g - 7}`; x = g + 7 } return d + `M${x} ${y}H${to}` }
  const front = Object.values(ROOMS).filter(r => r.front)
  const back = Object.values(ROOMS).filter(r => !r.front)
  out += wall(`M6 34H354V134M6 34V86M6 110V134` + gaps(134, front.map(r => r.x + r.w / 2), 6, 354) +
    `M64 34V86M64 110V134M162 34V86M162 110V134M258 34V86M258 110V134`)
  out += wall(gaps(156, back.map(r => r.x + 18), 6, 354) + `M6 156V208H354V156M93 156V208M180 156V208M267 156V208`)
  // Door swings: the street entrance and the door from the front door to the dining room.
  out += `<path d="M6 86a24 24 0 0 1 0 24M64 86a24 24 0 0 0 0 24M258 86a24 24 0 0 1 0 24" fill="none" stroke="${GREY(0.3)}" stroke-dasharray="2 2"/>`
  // The pass: a counter through the wall where orders go in and plates come out.
  const passOn = here === 'api' || (focus && (focus.from === 'api' || focus.room === 'api'))
  out += `<rect x="158.5" y="86" width="7" height="24" rx="1.5" fill="${passOn ? BLUE(0.3) : GREY(0.25)}" stroke="${passOn ? ACCENT : GREY(0.5)}"/>`
  out += text(352, 151, L.behind, { size: 9, weight: 500, fill: GREY(0.8), anchor: 'end' })

  // What each room holds: its last pieces in the front rooms, one summary behind the scenes.
  for (const [k, r] of Object.entries(ROOMS)) {
    const items = shelf.filter(o => roomOf(o.scene) === k)
    const on = k === here
    const room = r.front ? items.slice(k === 'auth' ? -1 : -2) : items
    const more = items.length - room.length
    const label = L[k] + (more > 0 && r.front ? ` +${more}` : '')
    out += text(r.x + 7, r.y + 14, label, { size: [...label].length > 13 ? 9.5 : 10.5, fill: on ? (bad ? BAD : ACCENT) : INK })
    if (r.front) {
      room.forEach((item, i) => {
        const cx = room.length === 1 ? r.x + r.w / 2 : r.x + r.w * (i ? 0.72 : 0.28)
        const isNow = on && item.object === object && item.name === name && !focus
        const p = `<g transform="translate(${cx} ${r.y + 32})">${pictoFor(item)(tone(isNow || (focus && on), isNow && bad))}</g>` +
          text(cx, r.y + 55, cut(shown(item), k === 'auth' ? 9 : 13), { size: 9.5, weight: 500, fill: isNow ? ACCENT : INK, anchor: 'middle', mono: tech })
        out += isNow && fresh ? enter(p, 0.45, '0 8') + pulse(cx, r.y + 32, 0.7) : p
      })
    } else if (items.length || (on && !focus)) {
      const px = r.x + r.w - 20
      const last = items[items.length - 1]
      const summary = summarize(k, items, { checks, locale })
      const p = `<g transform="translate(${px} ${r.y + 32})">${PICTO[k](tone(on, on && bad))}</g>` + text(r.x + 7, r.y + 30, summary, { size: 9.5, weight: 500, fill: on ? (bad ? BAD : ACCENT) : INK })
      out += on && (fresh || bad) && last ? enter(p, 0.4) : p
    }
  }

  // Test results at the tasting table: one mark per check, failures in red.
  if (here === 'tests' && !focus && (status === 'done' || status === 'fail')) {
    const r = ROOMS.tests
    const bx = r.x + r.w - 9, by = r.y + 21
    out += enter(`<circle cx="${bx}" cy="${by}" r="6" fill="${bad ? BAD : OK}"/>` + (bad
      ? `<path d="M${bx - 2.4} ${by - 2.4}l4.8 4.8M${bx + 2.4} ${by - 2.4}l-4.8 4.8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`
      : `<path d="M${bx - 2.6} ${by}l1.8 1.8 3.4-3.6" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`), 0.5)
  }

  // A request travels: from the dining room through the pass, to the pantry and back.
  const has = k => shelf.some(o => roomOf(o.scene) === k)
  const route = (from, to) => {
    const pts = { auth: [35, LANE], frontend: [113, LANE], api: [210, LANE], database: [306, LANE] }
    const a = pts[from] ?? spot(from), b = pts[to] ?? spot(to)
    return a && b ? `M${a[0]} ${a[1]}L${b[0]} ${b[1]}` : ''
  }
  const travel = (d, dur, at = 0.3) => d && motion
    ? `<path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="3 3" opacity=".55"/><rect x="-4.5" y="-3.5" width="9" height="7" rx="1.5" fill="${ACCENT}" opacity="0"><set attributeName="opacity" to="1" begin="${at}s"/><animateMotion path="${d}" begin="${at}s" dur="${dur}s" fill="freeze" ${INOUT}/></rect>`
    : d ? `<path d="${d}" fill="none" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="3 3" opacity=".55"/>` : ''
  if (focus && focus.from && focus.from !== focus.room) out += travel(route(focus.from, focus.room), 1.1)
  else if (!focus && scene === 'api' && has('frontend') && motion) {
    // The whole round trip: order in, to the pantry if there is one, plate back.
    const end = has('database') ? 306 : 210
    const d = `M113 ${LANE}H${end}H113`
    out += `<path d="M113 ${LANE}H${end}" fill="none" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="3 3" opacity=".5"/>` +
      `<rect x="-4.5" y="-3.5" width="9" height="7" rx="1.5" fill="${ACCENT}" opacity="0"><set attributeName="opacity" to="1" begin=".6s"/><animateMotion path="${d}" begin=".6s" dur="2.8s" fill="freeze" calcMode="linear"/><set attributeName="opacity" to="0" begin="3.4s"/></rect>`
  }

  // A visitor comes to the front door, is checked, then goes in.
  if (!focus && scene === 'auth' && motion) {
    out += `<g opacity="0"><set attributeName="opacity" to="1" begin=".5s"/><animateMotion path="M-6 ${LANE}L35 ${LANE}L35 ${LANE}L100 ${LANE}" keyPoints="0;.3;.45;.7;1" keyTimes="0;.3;.55;.8;1" begin=".5s" dur="2.8s" fill="freeze" calcMode="linear"/>${visitor(GREY(0.75))}</g>`
  }

  // A helper chef in the kitchen while a subagent runs.
  if (!focus && scene === 'agents') {
    const r = ROOMS.api
    out += enter(`<g transform="translate(${r.x + 24} ${r.y + r.h - 4})">${live ? `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur=".5s" repeatCount="6"/>${chef(0.72)}</g>` : chef(0.72)}</g>`, 0.4)
  }

  // Claude: walks from the last room along the street, settles, then works or rests.
  const [x, y] = spot(focus ? focus.room : here)
  const [px, py] = prev && !focus ? spot(prev) : [x, y]
  const work = live ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -2.5;0 0" begin="1s" dur=".45s" repeatCount="6"/>` : ''
  const shake = bad && motion ? `<animateTransform attributeName="transform" type="translate" values="0 0;-2 0;2 0;-2 0;0 0" begin=".3s" dur=".4s" fill="freeze"/>` : ''
  const body = `<g>${work}${shake}${chef(0.9)}</g>`
  if (motion && (px !== x || py !== y)) {
    // The walk is relative to where Claude ends: without animation it simply stands there.
    const d = `M${px - x} ${py - y}V${STREET + 7 - y}H0V0`
    const dur = Math.min(1.2, Math.max(0.55, (Math.abs(px - x) + Math.abs(py - y)) / 260)).toFixed(2)
    out += `<g transform="translate(${x} ${y})"><animateMotion path="${d}" dur="${dur}s" fill="freeze" ${INOUT}/><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.6;0 0" dur=".24s" repeatCount="${Math.round(dur / 0.24)}"/>${body}</g></g>`
  } else {
    out += `<g transform="translate(${x} ${y})">${body}</g>`
  }
  if (scene === 'idle' && !focus && motion) out += `<text x="${x + 12}" y="${y - 30}" font-family="${SANS}" font-size="9" font-weight="600" fill="${INK}">z<animate attributeName="y" values="${y - 28};${y - 38}" dur="2s" repeatCount="2"/><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="2" fill="freeze"/></text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 212" width="360" height="212" role="img">${out}</svg>`
}

// The one line under a back room's pictogram.
function summarize(room, items, { checks, locale }) {
  const fr = locale === 'fr'
  if (room === 'tests') {
    if (checks?.passed !== undefined || checks?.failed) return [checks.passed ? `${checks.passed} ✓` : '', checks.failed ? `${checks.failed} ✗` : ''].filter(Boolean).join('  ')
    return items.length ? (fr ? `${items.length} fichier${items.length > 1 ? 's' : ''}` : `${items.length} file${items.length > 1 ? 's' : ''}`) : ''
  }
  if (room === 'git') {
    const n = items.filter(o => o.object === 'commit').length
    return n ? (fr ? `${n} version${n > 1 ? 's' : ''}` : `${n} version${n > 1 ? 's' : ''}`) : cut(items[items.length - 1]?.name ?? '', 12)
  }
  const last = items[items.length - 1]
  // ".env.example" is the safe's ".env": the template of the secrets, not a second safe.
  const n = String(last?.name || last?.object || '').replace(/^(\.env)\.(example|sample|local|template)$/, '$1')
  return last ? cut(n, items.length > 1 ? 6 : 9) + (items.length > 1 ? ` +${items.length - 1}` : '') : ''
}
