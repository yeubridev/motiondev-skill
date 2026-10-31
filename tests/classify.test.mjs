import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classify, classifyPath, classifyCommand, routeFromFile } from '../lib/classify.mjs'

const post = (tool, input, response = {}) => ({ event: 'PostToolUse', tool, input, response, cwd: '/repo' })
const pre = (tool, input) => ({ event: 'PreToolUse', tool, input, cwd: '/repo' })
const write = (file_path, content = '') => post('Write', { file_path, content })
const edit = (file_path, new_string = '') => post('Edit', { file_path, old_string: 'x', new_string })
const pick = (e, keys = ['scene', 'object', 'name']) => Object.fromEntries(keys.map(k => [k, e?.[k]]))

// Files: path first, then content for the name.
const FILES = [
  ['/repo/db/schema.sql', 'CREATE TABLE IF NOT EXISTS users (id serial);', { scene: 'database', object: 'table', name: 'users' }],
  ['/repo/db/schema.sql', 'CREATE INDEX idx_users_email ON users(email);', { scene: 'database', object: 'index', name: 'idx_users_email' }],
  ['/repo/prisma/schema.prisma', 'model Order {\n id Int @id\n}', { scene: 'database', object: 'table', name: 'Order' }],
  ['/repo/src/db/schema.ts', "export const users = pgTable('users', { id: serial('id') })", { scene: 'database', object: 'table', name: 'users' }],
  ['/repo/app/models.py', "class Invoice(models.Model):\n    pass", { scene: 'database', object: 'table', name: 'Invoice' }],
  ['/repo/app/models/user.py', "class User(Base):\n    __tablename__ = 'users'", { scene: 'database', object: 'table', name: 'users' }],
  ['/repo/migrations/0003_add_orders.sql', 'ALTER TABLE orders ADD COLUMN total int;', { scene: 'database', object: 'migration', name: '0003_add_orders' }],
  ['/repo/db/seed.ts', "await db.insert(users).values([...])", { scene: 'database', object: 'seed', name: 'seed' }],
  ['/repo/src/routes/users.ts', "router.get('/users', list)\nrouter.post('/users', create)", { scene: 'api', object: 'endpoint', name: 'GET /users' }],
  ['/repo/api/main.py', '@app.post("/orders")\nasync def create(): ...', { scene: 'api', object: 'endpoint', name: 'POST /orders' }],
  ['/repo/app/api/users/route.ts', 'export async function GET() {}', { scene: 'api', object: 'endpoint', name: 'GET /api/users' }],
  ['/repo/src/users/users.controller.ts', "@Get(':id')\nfindOne() {}", { scene: 'api', object: 'endpoint', name: 'GET :id' }],
  ['/repo/cmd/server/main.go', 'r.HandleFunc("/health", health)', { scene: 'api', object: 'endpoint', name: '/health' }],
  ['/repo/src/services/billing.ts', 'export class BillingService {}', { scene: 'api', object: 'service', name: 'billing' }],
  ['/repo/src/middleware/logger.ts', 'export const logger = () => {}', { scene: 'api', object: 'middleware', name: 'logger' }],
  ['/repo/schema.graphql', 'type Query { users: [User] }', { scene: 'api', object: 'schema', name: 'schema' }],
  ['/repo/src/middleware/auth.ts', 'export const requireAuth = () => {}', { scene: 'auth', object: 'guard', name: 'auth' }],
  ['/repo/src/lib/jwt.ts', 'export const sign = () => {}', { scene: 'auth', object: 'token', name: 'jwt' }],
  ['/repo/app/login/page.tsx', 'export default function Login() {}', { scene: 'auth', object: 'login', name: 'Login' }],
  ['/repo/src/components/Button.tsx', 'export default function Button() {}', { scene: 'frontend', object: 'component', name: 'Button' }],
  ['/repo/src/components/Card.tsx', 'export const Card = () => null', { scene: 'frontend', object: 'component', name: 'Card' }],
  ['/repo/src/components/Modal.vue', '<template></template>', { scene: 'frontend', object: 'component', name: 'Modal' }],
  ['/repo/app/users/page.tsx', 'export default function Page() {}', { scene: 'frontend', object: 'page', name: '/users' }],
  ['/repo/app/(shop)/cart/page.tsx', '', { scene: 'frontend', object: 'page', name: '/cart' }],
  ['/repo/pages/index.tsx', '', { scene: 'frontend', object: 'page', name: '/' }],
  ['/repo/src/styles/globals.css', 'body {}', { scene: 'frontend', object: 'style', name: 'globals' }],
  ['/repo/src/hooks/useCart.ts', 'export function useCart() {}', { scene: 'frontend', object: 'hook', name: 'useCart' }],
  ['/repo/public/logo.svg', '<svg/>', { scene: 'frontend', object: 'asset', name: 'logo.svg' }],
  ['/repo/src/components/Button.test.tsx', "describe('Button', () => {})", { scene: 'tests', object: 'test', name: 'Button' }],
  ['/repo/tests/test_orders.py', 'def test_create_order(): pass', { scene: 'tests', object: 'test', name: 'test_create_order' }],
  ['/repo/pkg/cart/cart_test.go', 'func TestTotal(t *testing.T) {}', { scene: 'tests', object: 'test', name: 'TestTotal' }],
  ['/repo/e2e/checkout.spec.ts', "test('pays', async () => {})", { scene: 'tests', object: 'test', name: 'pays' }],
  ['/repo/Dockerfile', 'FROM node:22', { scene: 'infra', object: 'container', name: 'Dockerfile' }],
  ['/repo/docker-compose.yml', 'services:', { scene: 'infra', object: 'container', name: 'docker-compose' }],
  ['/repo/.github/workflows/ci.yml', 'on: push', { scene: 'infra', object: 'pipeline', name: 'ci' }],
  ['/repo/infra/main.tf', 'resource "aws_s3_bucket" "b" {}', { scene: 'infra', object: 'deploy', name: 'main.tf' }],
  ['/repo/k8s/deployment.yaml', 'kind: Deployment', { scene: 'infra', object: 'deploy', name: 'deployment' }],
  ['/repo/.env.local', 'PORT=3000', { scene: 'config', object: 'env', name: '.env.local' }],
  ['/repo/tsconfig.json', '{}', { scene: 'config', object: 'setting', name: 'tsconfig' }],
  ['/repo/eslint.config.js', 'export default []', { scene: 'config', object: 'setting', name: 'eslint' }],
  ['/repo/pyproject.toml', '[project]', { scene: 'config', object: 'setting', name: 'pyproject' }],
  ['/repo/config/settings.py', 'DEBUG = True', { scene: 'config', object: 'setting', name: 'settings' }],
  ['/repo/vite.config.ts', 'export default {}', { scene: 'build', object: 'bundle', name: 'vite' }],
  ['/repo/Makefile', 'all:', { scene: 'build', object: 'bundle', name: 'Makefile' }],
  ['/repo/package.json', '{"dependencies":{}}', { scene: 'deps', object: 'package', name: 'package.json' }],
  ['/repo/requirements.txt', 'fastapi', { scene: 'deps', object: 'package', name: 'requirements.txt' }],
  ['/repo/Cargo.toml', '[package]', { scene: 'deps', object: 'package', name: 'Cargo.toml' }],
  ['/repo/README.md', '# shop', { scene: 'docs', object: 'page', name: 'README' }],
  ['/repo/docs/api.md', '', { scene: 'docs', object: 'page', name: 'api' }],
  ['/repo/CLAUDE.md', '', { scene: 'docs', object: 'page', name: 'CLAUDE' }],
  ['/repo/src/utils/slug.ts', 'export const slug = () => {}', { scene: 'code', object: 'file', name: 'slug.ts' }],
  ['/repo/lib/parser.rs', 'fn parse() {}', { scene: 'code', object: 'file', name: 'parser.rs' }],
]

for (const [file, content, want] of FILES) {
  test(`Write ${file} -> ${want.scene}/${want.object} "${want.name}"`, () => {
    const e = classify(write(file, content))
    assert.deepEqual(pick(e), want)
    assert.equal(e.kind, 'object')
    assert.equal(e.file, file.replace('/repo/', ''), 'file is relative to cwd')
  })
}

test('a created table carries its columns as detail', () => {
  const sql = classify(write('/repo/db/schema.sql', 'CREATE TABLE users (\n  id serial PRIMARY KEY,\n  email text NOT NULL,\n  password_hash text\n);'))
  assert.equal(sql.detail, 'id, email, password_hash')
  const prisma = classify(write('/repo/prisma/schema.prisma', 'model Order {\n  id    Int @id @default(autoincrement())\n  total Int\n  user  User @relation(fields: [userId], references: [id])\n  userId Int\n}'))
  assert.equal(prisma.detail, 'id, total, user, userId')
  const drizzle = classify(write('/repo/src/db/schema.ts', "export const users = pgTable('users', {\n  id: serial('id').primaryKey(),\n  email: text('email').notNull(),\n})"))
  assert.equal(drizzle.detail, 'id, email')
  const django = classify(write('/repo/app/models.py', 'class Invoice(models.Model):\n    number = models.CharField(max_length=20)\n    total = models.DecimalField()\n\n    def __str__(self): return self.number'))
  assert.equal(django.detail, 'number, total')
  const many = classify(write('/repo/db/schema.sql', 'CREATE TABLE wide (a int, b int, c int, d int, e int, f int, g int, h int);'))
  assert.equal(many.detail, 'a, b, c, d, e, f, …')
})

test('Edit sniffs the new text and keeps the file rule', () => {
  const e = classify(edit('/repo/prisma/schema.prisma', 'model Payment {\n id Int @id\n}'))
  assert.deepEqual(pick(e), { scene: 'database', object: 'table', name: 'Payment' })
  assert.equal(e.tool, 'Edit')
})

test('MultiEdit and NotebookEdit are classified by path', () => {
  const m = classify(post('MultiEdit', { file_path: '/repo/src/components/Nav.tsx', edits: [{ old_string: 'a', new_string: 'export function Nav() {}' }] }))
  assert.deepEqual(pick(m), { scene: 'frontend', object: 'component', name: 'Nav' })
  const n = classify(post('NotebookEdit', { notebook_path: '/repo/analysis.ipynb', new_source: 'x' }))
  assert.deepEqual(pick(n), { scene: 'code', object: 'file', name: 'analysis.ipynb' })
})

test('a write inside .motiondev or a lockfile is ignored', () => {
  assert.equal(classify(write('/home/u/.motiondev/events.jsonl', '{}')), null)
  assert.equal(classify(write('/repo/package-lock.json', '{}')), null)
})

test('reads and searches are minor explore events', () => {
  const r = classify(post('Read', { file_path: '/repo/src/app.ts' }))
  assert.deepEqual(pick(r, ['scene', 'object', 'name', 'weight']), { scene: 'explore', object: 'read', name: 'src/app.ts', weight: 'minor' })
  const g = classify(post('Grep', { pattern: 'TODO', path: '/repo' }))
  assert.deepEqual(pick(g), { scene: 'explore', object: 'search', name: 'TODO' })
  const gl = classify(post('Glob', { pattern: '**/*.ts' }))
  assert.equal(gl.object, 'search')
  const w = classify(post('WebFetch', { url: 'https://example.com/docs/x' }))
  assert.deepEqual(pick(w), { scene: 'explore', object: 'fetch', name: 'example.com' })
  const s = classify(post('WebSearch', { query: 'prisma relations' }))
  assert.deepEqual(pick(s), { scene: 'explore', object: 'fetch', name: 'prisma relations' })
})

test('subagents start and finish', () => {
  const a = classify(pre('Agent', { description: 'Review the diff', prompt: '...' }))
  assert.deepEqual(pick(a, ['scene', 'object', 'name', 'status', 'kind']), { scene: 'agents', object: 'agent', name: 'Review the diff', status: 'start', kind: 'run' })
  const b = classify(post('Agent', { description: 'Review the diff' }, {}))
  assert.equal(b.status, 'done')
  const t = classify(pre('Task', { description: 'Explore repo' }))
  assert.equal(t.scene, 'agents')
})

test('planning and todo tools are think events', () => {
  const p = classify(post('ExitPlanMode', {}))
  assert.deepEqual(pick(p, ['scene', 'object', 'weight']), { scene: 'think', object: 'task', weight: 'major' })
  const t = classify(post('TodoWrite', { todos: [{ content: 'a' }, { content: 'b' }] }))
  assert.deepEqual(pick(t, ['scene', 'object', 'name', 'weight']), { scene: 'think', object: 'task', name: '2 todos', weight: 'minor' })
})

test('a prompt starts a turn and a stop ends it', () => {
  const u = classify({ event: 'UserPromptSubmit', prompt: 'Add a users table with email and password hash, then expose GET /users. Make it quick please.', cwd: '/repo' })
  assert.equal(u.kind, 'turn')
  assert.equal(u.status, 'start')
  assert.equal(u.scene, 'think')
  assert.ok(u.name.length <= 72 && u.name.startsWith('Add a users table'))
  assert.match(u.name, /\S…$/, 'cut on a word boundary with an ellipsis')
  assert.doesNotMatch(u.name, /expose GET \/users\. Ma…$/, 'no word cut in half')
  const s = classify({ event: 'Stop', cwd: '/repo' })
  assert.deepEqual(pick(s, ['kind', 'status', 'weight']), { kind: 'turn', status: 'done', weight: 'minor' })
})

test('a session start resets and names the project after its folder', () => {
  const s = classify({ event: 'SessionStart', source: 'startup', cwd: '/home/u/code/shop-api', session_id: 'abc' })
  assert.deepEqual(pick(s, ['kind', 'status', 'detail', 'session']), { kind: 'session', status: 'start', detail: 'shop-api', session: 'abc' })
  assert.equal(classify({ event: 'SessionStart', source: 'compact', cwd: '/x' }), null)
})

// Bash: runs start at PreToolUse and end at PostToolUse; other commands are one event.
const COMMANDS = [
  ['npm test', { scene: 'tests', object: 'run', name: 'npm test' }],
  ['cd packages/api && pnpm vitest run src/users', { scene: 'tests', object: 'run', name: 'pnpm vitest run src/users' }],
  ['pytest -q tests/test_orders.py', { scene: 'tests', object: 'run', name: 'pytest -q tests/test_orders.py' }],
  ['go test ./...', { scene: 'tests', object: 'run', name: 'go test ./...' }],
  ['cargo test', { scene: 'tests', object: 'run', name: 'cargo test' }],
  ['node --test', { scene: 'tests', object: 'run', name: 'node --test' }],
  ['npx eslint . --fix', { scene: 'tests', object: 'lint', name: 'npx eslint . --fix' }],
  ['ruff check .', { scene: 'tests', object: 'lint', name: 'ruff check .' }],
  ['npx tsc --noEmit', { scene: 'tests', object: 'lint', name: 'npx tsc --noEmit' }],
  ['npm run build', { scene: 'build', object: 'bundle', name: 'npm run build' }],
  ['cargo build --release', { scene: 'build', object: 'bundle', name: 'cargo build --release' }],
  ['make', { scene: 'build', object: 'bundle', name: 'make' }],
  ['npm install express zod', { scene: 'deps', object: 'package', name: 'express, zod' }],
  ['npm i', { scene: 'deps', object: 'package', name: 'install' }],
  ['pnpm add -D vitest', { scene: 'deps', object: 'package', name: 'vitest' }],
  ['pip install fastapi uvicorn', { scene: 'deps', object: 'package', name: 'fastapi, uvicorn' }],
  ['uv add httpx', { scene: 'deps', object: 'package', name: 'httpx' }],
  ['cargo add serde --features derive', { scene: 'deps', object: 'package', name: 'serde' }],
  ['go get github.com/gorilla/mux', { scene: 'deps', object: 'package', name: 'github.com/gorilla/mux' }],
  ['git commit -m "feat: add users table"', { scene: 'git', object: 'commit', name: 'feat: add users table' }],
  ["git commit -am 'fix: totals'", { scene: 'git', object: 'commit', name: 'fix: totals' }],
  ['git checkout -b feat/users', { scene: 'git', object: 'branch', name: 'feat/users' }],
  ['git switch -c fix/cart', { scene: 'git', object: 'branch', name: 'fix/cart' }],
  ['git push -u origin feat/users', { scene: 'git', object: 'push', name: 'feat/users' }],
  ['gh pr create --title "Add users" --body x', { scene: 'git', object: 'pr', name: 'Add users' }],
  ['npx prisma migrate dev --name add_users', { scene: 'database', object: 'migration', name: 'add_users' }],
  ['alembic upgrade head', { scene: 'database', object: 'migration', name: 'alembic upgrade head' }],
  ['python manage.py makemigrations', { scene: 'database', object: 'migration', name: 'python manage.py makemigrations' }],
  ['psql -d shop -c "select 1"', { scene: 'database', object: 'query', name: 'psql -d shop -c "select 1"' }],
  ['sqlite3 dev.db ".tables"', { scene: 'database', object: 'query', name: 'sqlite3 dev.db ".tables"' }],
  ['docker build -t shop .', { scene: 'infra', object: 'container', name: 'docker build -t shop .' }],
  ['docker compose up -d', { scene: 'infra', object: 'container', name: 'docker compose up -d' }],
  ['kubectl apply -f k8s/', { scene: 'infra', object: 'deploy', name: 'kubectl apply -f k8s/' }],
  ['terraform apply', { scene: 'infra', object: 'deploy', name: 'terraform apply' }],
  ['fly deploy', { scene: 'infra', object: 'deploy', name: 'fly deploy' }],
  ['curl -s http://localhost:3000/users', { scene: 'api', object: 'request', name: 'GET /users' }],
  ['curl -X POST localhost:3000/orders -d "{}"', { scene: 'api', object: 'request', name: 'POST /orders' }],
  ['npm run dev', { scene: 'api', object: 'server', name: 'npm run dev' }],
  ['uvicorn app.main:app --reload', { scene: 'api', object: 'server', name: 'uvicorn app.main:app --reload' }],
  // A file written from the shell is that file, not a read: the agent builds with it.
  ["cat > prisma/schema.prisma <<'EOF'\nmodel users {\n  id String @id\n  email String\n}\nEOF", { scene: 'database', object: 'table', name: 'users' }],
  ["mkdir -p src/components && cat <<'EOF' > src/components/MemberList.jsx\nexport default function MemberList() {}\nEOF", { scene: 'frontend', object: 'component', name: 'MemberList' }],
  ["echo 'body {}' | tee src/styles/globals.css", { scene: 'frontend', object: 'style', name: 'globals' }],
  ['echo "a > b" > src/styles/app.css', { scene: 'frontend', object: 'style', name: 'app' }],
]

test('Bash: output sent to a log or /dev/null is not a file the agent builds', () => {
  assert.deepEqual(pick(classify(post('Bash', { command: 'npm test > out.log' }, { stdout: '', stderr: '' })), ['scene', 'object']), { scene: 'tests', object: 'run' })
  assert.equal(classify(post('Bash', { command: 'cat README.md > /dev/null' }, {}))?.scene, 'explore')
  assert.equal(classify(post('Bash', { command: 'echo done >&2' }, {}))?.scene, 'shell')
  assert.equal(classify(pre('Bash', { command: "cat > a.ts <<'EOF'\nx\nEOF" })), null, 'a write is one event, once it ran')
  assert.equal(classify(post('Bash', { command: "cat > src/app.css <<'EOF'\nx\nEOF" }, {}))?.detail, undefined, 'a whole file written is no edit')
})

for (const [command, want] of COMMANDS) {
  test(`Bash: ${command} -> ${want.scene}/${want.object} "${want.name}"`, () => {
    assert.deepEqual(pick(classify(post('Bash', { command }, { stdout: '', stderr: '' }))), want)
  })
}

test("the agent's own narration reaches the canvas as the event it names", () => {
  const e = classify(post('Bash', { command: 'node /home/u/.claude/skills/motiondev/scripts/emit.mjs database table users --detail "id, email"' }, { stdout: 'motiondev · database · table users', stderr: '' }))
  assert.deepEqual(pick(e, ['kind', 'scene', 'object', 'name', 'detail', 'source', 'weight']), { kind: 'object', scene: 'database', object: 'table', name: 'users', detail: 'id, email', source: 'agent', weight: 'major' })
  assert.equal(e.narrated, true)
  const cli = classify(post('Bash', { command: 'node "$(cat ~/.motiondev/plugin-root)/bin/motiondev.mjs" emit api endpoint GET /users' }, {}))
  assert.deepEqual(pick(cli), { scene: 'api', object: 'endpoint', name: 'GET /users' })
  const run = classify(post('Bash', { command: 'node scripts/emit.mjs tests run npm test --status start' }, {}))
  assert.deepEqual(pick(run, ['kind', 'status', 'name']), { kind: 'run', status: 'start', name: 'npm test' })
  assert.equal(classify(pre('Bash', { command: 'node scripts/emit.mjs database table users' })), null, 'nothing before it ran')
  assert.equal(classify(post('Bash', { command: 'node scripts/emit.mjs kitchen sink' }, { stdout: '', stderr: 'unknown scene: kitchen', exit_code: 1 })), null, 'a refused emit is nothing')
})

test("motiondev's own commands are not part of the build", () => {
  for (const command of ['node bin/motiondev.mjs snapshot', 'npx -y github:yeubridev/motiondev-skill snapshot', 'node /x/skills/motiondev/scripts/ensure.mjs', 'motiondev watch', 'node "$(cat ~/.motiondev/plugin-root)/bin/motiondev.mjs" status']) {
    assert.equal(classify(post('Bash', { command }, {})), null, command)
    assert.equal(classify(pre('Bash', { command })), null, command)
  }
})

test('a denied or failed commit, push or pull request is a failure, not a built object', () => {
  const denied = classify(post('Bash', { command: 'git push origin main' }, { isError: true }))
  assert.deepEqual(pick(denied, ['kind', 'status']), { kind: 'run', status: 'fail' })
  const failed = classify(post('Bash', { command: 'git commit -m "feat: x"' }, { stdout: '', stderr: 'nothing to commit', exit_code: 1 }))
  assert.deepEqual(pick(failed, ['kind', 'status']), { kind: 'run', status: 'fail' })
  const titled = classify(post('Bash', { command: 'git commit -m "Error: handle timeouts"' }, { stdout: '[main 1a2b3c] Error: handle timeouts', stderr: '' }))
  assert.deepEqual(pick(titled, ['kind', 'status']), { kind: 'object', status: 'done' }, 'a title that reads like an error is not a failure')
})

test('runs start at PreToolUse and only runs do', () => {
  const start = classify(pre('Bash', { command: 'npm test' }))
  assert.deepEqual(pick(start, ['kind', 'status']), { kind: 'run', status: 'start' })
  assert.equal(classify(pre('Bash', { command: 'git commit -m x' })), null)
  assert.equal(classify(pre('Bash', { command: 'ls -la' })), null)
  assert.equal(classify(pre('Bash', { command: 'npm install' })).status, 'start')
  assert.equal(classify(pre('Bash', { command: 'docker build .' })).status, 'start')
})

test('a finished test run reports pass and fail counts', () => {
  const ok = classify(post('Bash', { command: 'npm test' }, { stdout: '# tests 12\n# pass 12\n# fail 0\n', stderr: '' }))
  assert.deepEqual(pick(ok, ['kind', 'status', 'detail']), { kind: 'run', status: 'done', detail: '12 passed' })
  const bad = classify(post('Bash', { command: 'pytest' }, { stdout: '==== 2 failed, 10 passed in 1.2s ====', stderr: '' }))
  assert.deepEqual(pick(bad, ['status', 'detail']), { status: 'fail', detail: '10 passed, 2 failed' })
  const err = classify(post('Bash', { command: 'npm run build' }, { stdout: '', stderr: 'error TS2322: x', exit_code: 2 }))
  assert.equal(err.status, 'fail')
  const interrupted = classify(post('Bash', { command: 'npm test' }, { stdout: '', stderr: '', interrupted: true }))
  assert.equal(interrupted.status, 'fail')
})

test('reads from the shell are minor explore, file juggling is minor shell', () => {
  assert.deepEqual(pick(classify(post('Bash', { command: 'ls -la src' })), ['scene', 'object', 'weight']), { scene: 'explore', object: 'read', weight: 'minor' })
  assert.deepEqual(pick(classify(post('Bash', { command: 'rg -n "TODO" src' })), ['scene', 'object']), { scene: 'explore', object: 'search' })
  assert.deepEqual(pick(classify(post('Bash', { command: 'git status' })), ['scene', 'object']), { scene: 'explore', object: 'read' })
  assert.deepEqual(pick(classify(post('Bash', { command: 'mkdir -p src/routes && touch src/routes/users.ts' })), ['scene', 'object', 'weight']), { scene: 'shell', object: 'command', weight: 'minor' })
  assert.deepEqual(pick(classify(post('Bash', { command: 'echo hi' })), ['scene', 'object']), { scene: 'shell', object: 'command' })
})

test('MCP tools: GitHub PRs are git, the rest is a minor fetch', () => {
  const pr = classify(post('mcp__github__create_pull_request', { title: 'Add users' }))
  assert.deepEqual(pick(pr), { scene: 'git', object: 'pr', name: 'Add users' })
  const other = classify(post('mcp__linear__create_issue', { title: 'x' }))
  assert.deepEqual(pick(other, ['scene', 'object', 'weight']), { scene: 'explore', object: 'fetch', weight: 'minor' })
})

test('helpers: routeFromFile and classifyPath/classifyCommand are exported for the band', () => {
  assert.equal(routeFromFile('app/api/users/[id]/route.ts'), '/api/users/[id]')
  assert.equal(routeFromFile('pages/api/orders.ts'), '/api/orders')
  assert.equal(routeFromFile('app/page.tsx'), '/')
  assert.equal(classifyPath('src/components/X.tsx').scene, 'frontend')
  assert.equal(classifyCommand('npm test').scene, 'tests')
})
