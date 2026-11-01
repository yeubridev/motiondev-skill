// The pure part of the mod: run with `node --test tests/lib.node.mjs`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { explain, row, timeline } from '../lib/explain.mjs'
import { CONCEPTS, LESSONS, answered, conceptOf, here, initialProgress, mastery, quiz, rank, seen, stands, streakDays, weakest } from '../lib/lessons.mjs'
import { diagram, notions } from '../lib/concepts.mjs'
import { PHRASES, TOUR } from '../lib/phrases.mjs'
import { chapter, checksOf, progress, recap, tour, withPlan, withPrompt, initialStory } from '../lib/story.mjs'
import { map, roomOf, shown, spot } from '../lib/map.mjs'

const OBJECTS = {
  database: ['table', 'migration', 'seed', 'index', 'query'],
  api: ['endpoint', 'route', 'model', 'service', 'middleware', 'schema', 'server', 'request'],
  frontend: ['component', 'page', 'style', 'hook', 'asset'],
  tests: ['test', 'run', 'lint'], git: ['commit', 'branch', 'push', 'pr'], deps: ['package'],
  infra: ['container', 'pipeline', 'deploy'], config: ['env', 'setting'], docs: ['page'],
  auth: ['guard', 'token', 'login'], build: ['bundle'], agents: ['agent'],
  explore: ['read', 'search', 'fetch'], shell: ['command'], think: ['task'], code: ['file'],
}
const SHELF = [
  { key: 'a', scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', ts: 10 },
  { key: 'b', scene: 'config', object: 'env', name: '.env.example', detail: '', ts: 11 },
  { key: 'c', scene: 'api', object: 'route', name: 'users', detail: '', ts: 12 },
  { key: 'd', scene: 'auth', object: 'login', name: 'login', detail: '', ts: 13 },
  { key: 'e', scene: 'frontend', object: 'component', name: 'MemberList', detail: '', ts: 14 },
  { key: 'f', scene: 'tests', object: 'test', name: 'users', detail: '', ts: 15 },
  { key: 'g', scene: 'git', object: 'commit', name: 'feat: membres et connexion', detail: '', ts: 16 },
]

test('every object the classifier knows has words at both levels, in both languages', () => {
  for (const locale of ['fr', 'en']) for (const level of ['beginner', 'intermediate']) {
    const table = PHRASES[locale][level]
    for (const [scene, objects] of Object.entries(OBJECTS)) for (const object of objects) {
      assert.ok(table[`${scene}/${object}`] ?? table[object], `${locale}/${level}: no words for ${scene}/${object}`)
    }
  }
})

// A beginner never meets a technical word without its explanation.
const JARGON = /\b(api|endpoint|commit|middleware|jwt|schema|schéma|migration|docker|css|hook|composant|component|requête|query|deploy|build|token|jeton|lint|repository|dépôt|route|frontend|backend)\b/i
test('the beginner level tells one story without jargon, in short lines', () => {
  for (const locale of ['fr', 'en']) for (const [key, entry] of Object.entries(PHRASES[locale].beginner)) {
    for (const line of entry) assert.doesNotMatch(line, JARGON, `${locale} ${key}: "${line}"`)
    assert.ok([...entry[0]].length <= 60, `${locale} ${key}: title over 60 characters`)
    for (const line of entry.slice(1)) assert.ok([...line].length <= 140, `${locale} ${key}: caption over 140 characters`)
  }
  for (const locale of ['fr', 'en']) for (const [key, entry] of Object.entries(TOUR[locale].beginner)) for (const line of entry) assert.doesNotMatch(line, JARGON, `${locale} tour ${key}`)
})

test('the same table reads four ways, its columns in the sentence', () => {
  const c = { scene: 'database', object: 'table', name: 'users', detail: 'id, email, password_hash', file: 'prisma/schema.prisma', tool: 'Write' }
  const beginner = explain(c, { level: 'beginner', locale: 'fr' })
  assert.equal(beginner.title, 'Claude ouvre le registre « users » dans la réserve')
  assert.match(beginner.subtitle, /id, email, password_hash/)
  assert.equal(explain({ ...c, detail: '' }, { level: 'beginner', locale: 'fr' }).subtitle, 'Une ligne par élément : c’est là que l’app retiendra tout.', 'falls back without columns')
  assert.equal(explain(c, { level: 'intermediate', locale: 'fr' }).title, 'Table users')
  assert.equal(explain(c, { level: 'advanced', locale: 'fr' }).title, 'database · table users')
  const dev = explain(c, { level: 'dev', locale: 'fr' })
  assert.equal(dev.title, 'database/table prisma/schema.prisma')
  assert.ok(dev.mono)
})

test('a failing run is a plot twist for the beginner and a count for the intermediate', () => {
  const c = { scene: 'tests', object: 'run', name: 'npm test', detail: '11 passed, 1 failed', status: 'fail' }
  assert.match(explain(c, { level: 'beginner', locale: 'fr' }).subtitle, /normal/)
  assert.equal(explain(c, { level: 'intermediate', locale: 'en' }).title, 'Tests: 11 passed, 1 failed')
  assert.equal(explain({ scene: 'git', object: 'commit', name: 'feat: x' }, { level: 'intermediate', locale: 'fr' }).title, 'Commit « feat: x »', 'no double colon')
})

test('an unknown edit stays honest and a missing name leaves no hole', () => {
  assert.equal(explain({ scene: 'code', object: 'file', name: '' }, { level: 'beginner', locale: 'en' }).title, 'Claude changes the app’s code')
  assert.equal(explain({ scene: 'idle' }, { level: 'beginner', locale: 'fr' }).title, 'Le restaurant attend votre commande')
})

test('the dev timeline drops plan echoes and starts shown again by their result', () => {
  const r = row({ ts: new Date(2026, 9, 30, 21, 4, 12).getTime(), tool: 'mcp__ccd_turn__update_plan', name: 'x', status: 'done' })
  assert.equal(r.tool, 'update_plan')
  const t = timeline([
    { tool: 'mcp__ccd_turn__update_plan', name: 'p', status: '' },
    { tool: 'Bash', name: 'npm test', status: 'start' },
    { tool: 'Bash', name: 'npm test', status: 'fail' },
    { tool: 'Write', name: 'a.ts', status: 'done' },
  ])
  assert.deepEqual(t.map(e => `${e.tool}:${e.status}`), ['Bash:fail', 'Write:done'])
})

test('the plan comes from the agent’s own list, whatever tool wrote it', () => {
  let s = withPrompt(initialStory(), '  Crée une app\n de membres ', 5)
  assert.equal(s.prompt, 'Crée une app de membres')
  assert.equal(s.since, 5)
  assert.equal(s.ended, false)
  s = withPlan(s, 'TodoWrite', { todos: [{ content: 'Lire le projet', status: 'completed' }, { content: 'Table users', status: 'in_progress' }, { content: 'API', status: 'pending' }] })
  assert.deepEqual(s.steps.map(x => x.status), ['done', 'active', 'todo'])
  assert.deepEqual(progress(s.steps), { index: 2, total: 3, done: 1 })
  s = withPlan(s, 'mcp__ccd_turn__update_plan', { advance: true })
  assert.deepEqual(s.steps.map(x => x.status), ['done', 'done', 'active'])
  assert.equal(withPlan(s, 'Read', { file_path: 'x' }), s)
})

test('Task steps are followed by their id, whatever request made them', () => {
  let s = withPlan(withPrompt(initialStory(), 'first'), 'TaskCreate', { subject: 'A' }, { task: { id: '1' } })
  s = withPlan(withPrompt(s, 'second'), 'TaskCreate', { subject: 'B' }, { task: { id: '4' } })
  s = withPlan(s, 'TaskUpdate', { taskId: '4', status: 'completed' })
  assert.deepEqual(s.steps, [{ title: 'B', status: 'done', id: '4' }])
  assert.equal(withPlan(s, 'TaskCreate', { subject: 'C' }, {}), s)
})

test('the story has chapters and an end', () => {
  assert.equal(chapter('think', { locale: 'fr' }), 'Le plan')
  assert.equal(chapter('database', { locale: 'fr' }), 'La construction')
  assert.equal(chapter('tests', { locale: 'en' }), 'The tasting')
  assert.equal(chapter('git', { ended: true, locale: 'fr' }), 'Fin du service')
})

test('the recap says what the app can do now, from this request only', () => {
  const r = recap(SHELF, 12, 'fr')
  assert.equal(r.title, 'Votre app sait maintenant…')
  assert.deepEqual(r.lines, ['répondre à la commande /users', 'vérifier qui entre avec « login »', 'afficher « MemberList »', 'se vérifier toute seule', 'revenir à la version « feat: membres et connexion »'])
  assert.equal(recap(SHELF, 99, 'fr').title, 'Fin du service')
})

test('the guided tour follows one request through what was built', () => {
  const checks = checksOf([{ scene: 'tests', status: 'done', detail: '2 passed' }])
  const stops = tour(SHELF, { level: 'beginner', locale: 'fr', checks })
  assert.deepEqual(stops.map(s => s.room), ['auth', 'frontend', 'api', 'database', 'frontend', 'tests', 'git', 'config'])
  assert.deepEqual(stops.map(s => s.from), ['', 'auth', 'frontend', 'api', 'database', 'frontend', 'tests', 'git'])
  assert.match(stops[2].text, /\/users/)
  assert.match(stops[5].text, /^2 réussis/)
  assert.equal(stops[3].concept, 'database')
  // One room alone is no trip.
  assert.deepEqual(tour(SHELF.slice(0, 1), { locale: 'fr' }), [])
})

// Every opened element is closed, in order.
const balanced = svg => {
  const stack = []
  for (const [, close, tag, , self] of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    if (self) continue
    if (close) { if (stack.pop() !== tag) return false } else stack.push(tag)
  }
  return stack.length === 0
}

test('the restaurant map is well-formed for every scene and level, still with motion off, never looping', () => {
  const shelf = [...SHELF, { key: 'x', scene: 'frontend', object: 'component', name: 'Card <b>&"x"', detail: '', ts: 20 }]
  const steps = [{ title: 'a', status: 'done' }, { title: 'b', status: 'active' }, { title: 'c', status: 'todo' }]
  for (const level of ['beginner', 'intermediate', 'advanced']) for (const [sc, objects] of Object.entries({ ...OBJECTS, idle: [''] })) for (const object of objects) for (const running of [true, false]) {
    const m = { scene: sc, object, name: 'users <b>', running, status: running ? '' : 'done', shelf, steps, prev: 'frontend', level, locale: 'fr' }
    const svg = map(m)
    assert.match(svg, /^<svg[^>]*viewBox="0 0 360 212"[\s\S]*<\/svg>$/, `${sc}/${object}`)
    assert.ok(balanced(svg), `${level} ${sc}/${object}: unbalanced`)
    assert.doesNotMatch(svg, /<b>|<script|\son\w+=/, `${sc}/${object}: unescaped or scripted`)
    assert.ok(svg.length < 131072)
    // Motion plays once, within a few seconds: nothing loops forever.
    assert.doesNotMatch(svg, /indefinite/, `${sc}/${object} loops`)
    assert.doesNotMatch(map({ ...m, motion: false }), /<animate|<set /, `${sc}/${object} moves with motion off`)
  }
})

test('Claude walks from the room it was in, along the street, to the room it builds', () => {
  const svg = map({ scene: 'database', object: 'table', name: 'users', status: 'done', shelf: SHELF.slice(0, 1), prev: 'street', level: 'beginner', locale: 'fr' })
  const [px, py] = spot('street')
  const [x, y] = spot('database')
  assert.ok(svg.includes(`<g transform="translate(${x} ${y})"><animateMotion path="M${px - x} ${py - y}V${152 - y}H0V0"`), 'walks along the street and ends where it stands without animation')
  assert.match(svg, />Réserve</)
  assert.match(svg, />users</)
  assert.doesNotMatch(map({ scene: 'database', object: 'table', name: 'users', shelf: SHELF.slice(0, 1), prev: 'database' }), /animateMotion path="M\d/, 'already there: no walk')
  assert.equal(roomOf('code'), 'api')
  assert.equal(shown({ scene: 'api', object: 'route', name: 'users' }), '/users')
  assert.equal(shown({ scene: 'api', object: 'endpoint', name: 'GET /users' }), 'GET /users')
})

test('every notion has a lesson with its room, its limit and a question about the person’s project', () => {
  for (const locale of ['fr', 'en']) for (const id of CONCEPTS) {
    const l = LESSONS[locale][id]
    assert.ok(l?.title && l.room && l.short && l.image && l.what && l.here?.length && l.limit, `${locale}/${id}`)
    assert.match(l.limit, locale === 'fr' ? /^Sauf / : /^Except /, `${locale}/${id}: the limit says where the picture breaks`)
    assert.equal(l.quiz.length, 2)
    for (const item of [...l.quiz, ...(l.ask ? [l.ask] : [])]) {
      // Answers of about the same length: the longest must not give the right one away.
      const lens = item.a.map(a => [...a].length)
      assert.ok(Math.max(...lens) - Math.min(...lens) <= 12, `${locale}/${id}: "${item.q}" answers differ too much in length`)
    }
    for (let n = 0; n < 3; n++) {
      const q = quiz(id, locale, n, 'users')
      assert.equal(q.answers.length, 3)
      assert.equal(q.answers[q.right], q.best, `${locale}/${id}/${n}: right answer lost`)
    }
  }
  assert.match(quiz('database', 'fr', 0, 'users').q, /« users »/, 'the project question comes first')
  assert.ok(new Set(CONCEPTS.map(id => quiz(id, 'fr', 0).right)).size > 1, 'the right answer moves')
  assert.equal(here(LESSONS.fr.database, { name: 'users', detail: 'id, email' }), 'La table « users » aura une ligne par élément, avec ces colonnes : id, email.')
  assert.equal(here(LESSONS.fr.database, { name: 'users' }), 'La table « users » aura une ligne par élément.')
  assert.match(here(LESSONS.fr.tests, { status: 'fail' }), /attrapé/)
})

test('what Claude builds maps to a notion', () => {
  assert.equal(conceptOf('database'), 'database')
  assert.equal(conceptOf('frontend'), 'interface')
  assert.equal(conceptOf('infra'), 'deploy')
  assert.equal(conceptOf('explore'), null)
})

test('only right answers earn XP, mastery tops at two, the streak forgives one missed day', () => {
  const day = 86400000
  let p = seen(initialProgress(), 'api')
  p = answered(p, 'api', false, 1_700_000_000_000)
  assert.equal(p.xp, 0)
  p = answered(p, 'api', true, 1_700_000_000_000 + day)
  p = answered(p, 'api', true, 1_700_000_000_000 + day)
  p = answered(p, 'api', true, 1_700_000_000_000 + 3 * day)
  assert.equal(p.xp, 30)
  assert.equal(mastery(p, 'api'), 2)
  assert.equal(p.streak.days, 3, 'one missed day kept the streak')
  assert.equal(answered(p, 'api', true, 1_700_000_000_000 + 6 * day).streak.days, 1, 'two missed days restart it')
})

test('the rank comes from notions mastered, and review picks the least known', () => {
  let p = seen(seen(initialProgress(), 'api'), 'git')
  assert.equal(rank(p, 'fr').title, 'Apprenti')
  p = answered(answered(p, 'git', true, 0), 'git', true, 0)
  assert.equal(rank(p, 'fr').title, 'Commis')
  assert.equal(rank(p, 'fr').next, 'Cuisinier')
  assert.equal(weakest(p), 'api')
  assert.equal(weakest(initialProgress()), null)
})

test('every notion draws a well-formed bridge diagram, and the path draws every notion', () => {
  for (const locale of ['fr', 'en']) for (const id of CONCEPTS) for (const motion of [true, false]) {
    const svg = diagram(id, { name: 'users <b>', detail: 'id, email, password_hash', status: 'fail', locale, motion })
    assert.match(svg, /^<svg[^>]*viewBox="0 0 360 156"[\s\S]*<\/svg>$/, `${locale}/${id}`)
    assert.ok(balanced(svg), `${locale}/${id}: unbalanced`)
    assert.doesNotMatch(svg, /<b>|<script|indefinite/, `${locale}/${id}`)
    if (!motion) assert.doesNotMatch(svg, /<animate|<set /, `${locale}/${id} moves with motion off`)
    assert.ok(svg.includes(`>${LESSONS[locale][id].room.replace(/’/g, '’')}<`), `${locale}/${id}: the room is named`)
  }
  assert.match(diagram('database', { name: 'users', detail: 'id, email', locale: 'fr' }), />lea@mail\.fr</, 'sample rows read as data')
  const svg = notions({ xp: 0, streak: { last: '', days: 0 }, concepts: { interface: { seen: 1, correct: 2 } } }, 'api', 'fr')
  assert.ok(balanced(svg))
  assert.equal((svg.match(/<circle cx="\d+" cy="\d+" r="15"/g) ?? []).length >= CONCEPTS.length, true)
  assert.match(svg, />Écran</)
  assert.match(svg, />Commis</)
})

// Regressions from the review.
test('the recap claims only what was built: docs, a push or a Dockerfile are not a version or a launch', () => {
  const shelf = [
    { key: '1', scene: 'docs', object: 'page', name: 'README', detail: '', ts: 1 },
    { key: '2', scene: 'git', object: 'push', name: 'main', detail: '', ts: 2 },
    { key: '3', scene: 'infra', object: 'container', name: 'Dockerfile', detail: '', ts: 3 },
    { key: '4', scene: 'git', object: 'commit', name: 'feat: x', detail: '', ts: 4 },
  ]
  assert.deepEqual(recap(shelf, 0, 'en').lines, ['go back to the version “feat: x”'])
})

test('a build is not a launch, a command is not a route, an edit marker is not a column', () => {
  assert.equal(conceptOf('build'), null)
  assert.equal(stands('api', { scene: 'api', object: 'server', name: 'npm run dev' }), false)
  assert.equal(stands('api', { scene: 'api', object: 'route', name: 'users' }), true)
  assert.equal(stands('database', { scene: 'database', object: 'query', name: 'psql' }), false)
  assert.equal(explain({ scene: 'database', object: 'table', name: 'users', detail: 'edit' }, { level: 'beginner', locale: 'en' }).subtitle, 'One line per item: this is where the app remembers things.')
})

test('a deleted task leaves the plan, and a stored streak ends when it is stale', () => {
  let s = withPlan(withPrompt(initialStory(), 'x'), 'TaskCreate', { subject: 'A' }, { task: { id: '1' } })
  s = withPlan(s, 'TaskCreate', { subject: 'B' }, { task: { id: '2' } })
  s = withPlan(s, 'TaskUpdate', { taskId: '2', status: 'deleted' })
  assert.deepEqual(s.steps.map(x => x.title), ['A'])
  const now = Date.UTC(2026, 10, 1, 12)
  const p = { xp: 0, streak: { last: '2026-10-01', days: 5 }, concepts: {} }
  assert.equal(streakDays(p, now), 0)
  assert.equal(streakDays({ ...p, streak: { last: '2026-10-31', days: 5 } }, now), 5)
})
