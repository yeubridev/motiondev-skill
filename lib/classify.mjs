// Turns one Claude Code hook payload (or mod event) into a motiondev event.
// Pure: no I/O, no Node globals. Rules are ordered; the first that applies wins.

const IGNORED = /(^|\/)(\.motiondev\/|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$|bun\.lockb?$|Cargo\.lock$|poetry\.lock$|uv\.lock$|go\.sum$|Gemfile\.lock$|composer\.lock$|\.DS_Store$)/
const TEST_PATH = /(^|\/)(__tests__|tests?|e2e|spec|specs|cypress|playwright)\/|\.(test|spec)\.[a-z]+$|(^|\/)(test_[^/]+\.py|[^/]+_test\.(py|go|rs|rb)|conftest\.py|[^/]+\.feature)$/i
const DEP_FILE = /(^|\/)(package\.json|requirements[^/]*\.txt|Cargo\.toml|go\.mod|Gemfile|composer\.json|Pipfile|pubspec\.yaml)$/
const BUILD_FILE = /(^|\/)((vite|webpack|rollup|tsup|esbuild|turbo|rspack)\.config\.[a-z]+|Makefile|CMakeLists\.txt|build\.gradle(\.kts)?|turbo\.json|justfile|Taskfile\.ya?ml)$/i
const CONTAINER = /(^|\/)(Dockerfile[^/]*|[^/]+\.dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml|\.dockerignore)$/
const PIPELINE = /(^|\/)(\.github\/workflows\/|\.gitlab-ci\.ya?ml$|Jenkinsfile$|\.circleci\/|bitbucket-pipelines\.ya?ml$|azure-pipelines\.ya?ml$|\.travis\.ya?ml$)/
const DEPLOY = /(^|\/)(k8s|kubernetes|helm|terraform|infra|deploy|ansible|charts)\/|\.tf$|(^|\/)(fly\.toml|vercel\.json|netlify\.toml|Procfile|serverless\.ya?ml|render\.ya?ml|app\.yaml|cdk\.json)$/
const ENV_FILE = /(^|\/)\.env(\.[^/]+)?$/
const CONFIG_FILE = /(^|\/)([^/]+\.config\.[a-z]+|tsconfig[^/]*\.json|jsconfig\.json|\.eslintrc[^/]*|\.prettierrc[^/]*|\.babelrc|pyproject\.toml|setup\.cfg|setup\.py|settings\.py|\.editorconfig|\.gitignore|\.gitattributes|\.npmrc|\.nvmrc|\.tool-versions|[^/]+\.(toml|ini|cfg|ya?ml|properties))$|(^|\/)config\/|(^|\/)\.claude\//
const DB_PATH = /\.(sql|prisma)$|(^|\/)(migrations?|migrate|db|database|alembic|drizzle)\/|(^|\/)(schema\.(ts|js|py|rb)|knexfile\.[jt]s|drizzle\.config\.[jt]s)$|(^|\/)seeds?[^/]*\.[a-z]+$/i
const MIGRATION_PATH = /(^|\/)(migrations?|migrate|alembic\/versions)\//i
const AUTH_PATH = /(^|\/|[._-])(auth|authn|authz|login|signin|signup|logout|jwt|oauth|oidc|passport|sessions?|permissions?|rbac|guards?|tokens?)([._\-/]|$)/i
const API_PATH = /(^|\/)(routes?|api|controllers?|handlers?|endpoints?|services?|middlewares?|resolvers?|graphql|rpc|server)\/|(^|\/)[^/]+\.(controller|service|resolver|handler|router|routes)\.[a-z]+$|\.(graphql|gql|proto)$|(^|\/)(server|app|main|index)\.(ts|js|mjs|py|go|rb|rs)$/i
const FRONT_PATH = /(^|\/)(components?|pages|views?|screens?|widgets?|ui|layouts?|app)\//i
const STYLE_EXT = /\.(css|scss|sass|less|styl|pcss)$/i
const ASSET_EXT = /\.(svg|png|jpe?g|gif|ico|webp|avif|woff2?|ttf|otf|eot|mp4|mp3|wav|webm)$/i
const COMPONENT_EXT = /\.(tsx|jsx|vue|svelte|astro|html)$/i

const SHELL_READ = new Set(['ls', 'll', 'la', 'cat', 'head', 'tail', 'less', 'more', 'tree', 'pwd', 'which', 'whereis', 'type', 'wc', 'stat', 'file', 'du', 'df', 'env', 'printenv', 'date', 'uname', 'id', 'whoami', 'hostname', 'ps', 'top', 'htop', 'lsof', 'netstat', 'ss', 'ping', 'dig', 'nslookup', 'man', 'help', 'history', 'jq', 'yq', 'bat', 'exa', 'eza', 'diff', 'cmp', 'md5sum', 'sha256sum', 'sort', 'uniq', 'cut', 'nl', 'od', 'xxd', 'strings', 'readlink', 'realpath', 'basename', 'dirname', 'sleep', 'true', 'false', 'test', '['])
const SHELL_SEARCH = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ag', 'ack', 'find', 'fd', 'fdfind', 'locate'])
const GIT_READ = new Set(['status', 'diff', 'log', 'show', 'blame', 'fetch', 'pull', 'remote', 'rev-parse', 'ls-files', 'ls-remote', 'describe', 'reflog', 'shortlog', 'grep', 'config', 'stash', 'cherry', 'worktree', 'submodule', 'rev-list', 'cat-file', 'check-ignore', 'tag', 'branch'])
const TEST_HEADS = new Set(['pytest', 'jest', 'vitest', 'mocha', 'ava', 'tap', 'playwright', 'cypress', 'rspec', 'phpunit', 'karma', 'minitest', 'nose2', 'tox', 'nox', 'bats', 'ctest', 'gotestsum'])
const LINT_HEADS = new Set(['eslint', 'prettier', 'ruff', 'black', 'flake8', 'mypy', 'pyright', 'pylint', 'isort', 'golangci-lint', 'gofmt', 'goimports', 'staticcheck', 'rubocop', 'stylelint', 'biome', 'oxlint', 'swiftlint', 'swiftformat', 'shellcheck', 'hadolint', 'clippy', 'rustfmt', 'ktlint', 'detekt', 'checkstyle', 'markdownlint', 'actionlint', 'tflint', 'yamllint', 'htmlhint', 'dprint', 'knip', 'depcheck'])
const BUILD_HEADS = new Set(['webpack', 'rollup', 'esbuild', 'tsup', 'parcel', 'ninja', 'cmake', 'zig', 'bazel', 'buck2', 'gradlew', 'mvnw', 'xcodebuild', 'meson', 'unbuild', 'rspack', 'rolldown'])
const SERVER_HEADS = new Set(['uvicorn', 'gunicorn', 'hypercorn', 'daphne', 'nodemon', 'ts-node-dev', 'tsx', 'air', 'hugo', 'jekyll', 'expo', 'ngrok', 'caddy', 'nginx', 'serve', 'http-server', 'live-server', 'browser-sync', 'wrangler'])
const MIGRATION_HEADS = new Set(['prisma', 'alembic', 'knex', 'drizzle-kit', 'sequelize', 'sequelize-cli', 'typeorm', 'flyway', 'liquibase', 'atlas', 'dbmate', 'goose', 'migrate', 'sqlx', 'diesel', 'supabase', 'mikro-orm', 'kysely'])
const QUERY_HEADS = new Set(['psql', 'sqlite3', 'sqlite', 'mysql', 'mariadb', 'mongosh', 'mongo', 'redis-cli', 'pgcli', 'mycli', 'litecli', 'duckdb', 'clickhouse-client', 'usql'])
const CONTAINER_HEADS = new Set(['docker', 'docker-compose', 'podman', 'nerdctl', 'buildah', 'colima', 'lima'])
const DEPLOY_HEADS = new Set(['kubectl', 'helm', 'terraform', 'tofu', 'pulumi', 'fly', 'flyctl', 'vercel', 'netlify', 'gcloud', 'aws', 'az', 'heroku', 'railway', 'render', 'sam', 'cdk', 'ansible', 'ansible-playbook', 'kustomize', 'argocd', 'skaffold', 'eb', 'cf', 'doctl', 'linode-cli', 'firebase', 'amplify', 'serverless', 'sls', 'cap', 'kamal', 'dokku', 'coolify'])
const PKG_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun', 'deno'])
const REQUEST_HEADS = new Set(['curl', 'http', 'https', 'httpie', 'xh', 'wget', 'hurl', 'grpcurl'])
const PY_HEADS = new Set(['python', 'python3', 'py'])

const METHODS = 'get|post|put|patch|delete|head|options|all'

export function relative(file, cwd) {
  if (!file) return ''
  let f = String(file).replace(/\\/g, '/')
  if (cwd) {
    const c = String(cwd).replace(/\\/g, '/').replace(/\/+$/, '')
    if (c && (f === c || f.startsWith(c + '/'))) f = f.slice(c.length + 1) || '.'
  }
  return f
}

const base = file => file.split('/').pop() ?? file
const stem = file => base(file).replace(/\.[^.]+$/, '')
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)
const oneLine = s => String(s ?? '').replace(/\s+/g, ' ').trim()

// Next.js file routes: app/api/users/[id]/route.ts -> /api/users/[id]; pages/api/orders.ts -> /api/orders.
export function routeFromFile(file) {
  const f = relative(file).replace(/^(src\/)?/, '')
  let m = /(^|\/)app\/(.*?)(?:\/)?(route|page|layout)\.[a-z]+$/.exec(f)
  if (m) return '/' + m[2].split('/').filter(s => s && !/^\(.*\)$/.test(s) && s !== '@').join('/')
  m = /(^|\/)pages\/(.*?)\.[a-z]+$/.exec(f)
  if (m) return '/' + m[2].replace(/(^|\/)index$/, '')
  return null
}

function endpointFrom(text, file) {
  const t = text ?? ''
  const rel = relative(file)
  if (/(^|\/)(app\/.*\/route|pages\/api\/.*)\.[jt]sx?$/.test(rel) || /(^|\/)app\/route\.[jt]s$/.test(rel)) {
    const route = routeFromFile(rel)
    const m = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/.exec(t)
    if (route) return m ? `${m[1]} ${route}` : route
  }
  let m = new RegExp(`\\b(?:app|router|server|fastify|api|r|e|g|mux|http|srv|v\\d)\\.(${METHODS})\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'i').exec(t)
  if (m) return `${m[1].toUpperCase()} ${m[2]}`
  m = new RegExp(`@\\w+\\.(${METHODS})\\(\\s*['"]([^'"]+)['"]`, 'i').exec(t)
  if (m) return `${m[1].toUpperCase()} ${m[2]}`
  m = /@\w+\.route\(\s*['"]([^'"]+)['"](?:[^)]*methods\s*=\s*[[(]\s*['"](\w+)['"])?/.exec(t)
  if (m) return `${(m[2] ?? 'GET').toUpperCase()} ${m[1]}`
  m = /@(Get|Post|Put|Patch|Delete)(?:Mapping)?\(\s*(?:['"]([^'"]*)['"])?/.exec(t)
  if (m) return `${m[1].toUpperCase()} ${m[2] || '/'}`
  m = /\.(?:HandleFunc|Handle|Route|Path)\(\s*"([^"]+)"/.exec(t)
  if (m) return m[1]
  m = new RegExp(`^\\s*(${METHODS})\\s+['"]([^'"]+)['"]`, 'im').exec(t)
  if (m) return `${m[1].toUpperCase()} ${m[2]}`
  return null
}

function tableFrom(text) {
  const t = text ?? ''
  const rules = [
    [/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(?:\w+["`']?\.["`']?)?(\w+)/i, 'table'],
    [/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)/i, 'index'],
    [/^\s*model\s+(\w+)\s*\{/m, 'table'],
    [/\b(?:pg|mysql|sqlite|mssql)Table\(\s*['"](\w+)['"]/, 'table'],
    [/__tablename__\s*=\s*['"](\w+)['"]/, 'table'],
    [/class\s+(\w+)\s*\(\s*(?:models\.)?(?:Model|Base|BaseModel|DeclarativeBase|db\.Model)\s*\)/, 'table'],
    [/\bmongoose\.model\(\s*['"](\w+)['"]|\bmodel\(\s*['"](\w+)['"]\s*,\s*\w*[sS]chema/, 'table'],
    [/@Entity\((?:\s*['"](\w+)['"])?\)[\s\S]*?class\s+(\w+)/, 'table'],
    [/\.define\(\s*['"](\w+)['"]/, 'table'],
    [/create_table\s+[:"'](\w+)/, 'table'],
    [/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+["`']?(\w+)/i, 'query'],
    [/\bINSERT\s+INTO\b|\.insert\(|\.createMany\(|\.bulk_create\(|\.seed\(/i, 'seed'],
  ]
  for (const [re, object] of rules) {
    const m = re.exec(t)
    if (m) return { object, name: m.slice(1).find(Boolean) ?? null }
  }
  return null
}

function componentFrom(text, file) {
  const t = text ?? ''
  let m = /export\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(t)
    ?? /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(t)
    ?? /export\s+(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=/.exec(t)
    ?? /export\s+default\s+([A-Z][\w$]*)/.exec(t)
    ?? /@Component[\s\S]*?class\s+(\w+)/.exec(t)
  return m ? m[1] : stem(file)
}

function testNameFrom(text, file) {
  const t = text ?? ''
  const m = /\bdescribe\(\s*['"`]([^'"`]+)/.exec(t)
    ?? /(?:^|\n)\s*(?:it|test)\(\s*['"`]([^'"`]+)/.exec(t)
    ?? /\bdef\s+(test_\w+)/.exec(t)
    ?? /\bfunc\s+(Test\w+)/.exec(t)
    ?? /#\[test\]\s*(?:async\s+)?fn\s+(\w+)/.exec(t)
    ?? /\b(?:it|test|scenario)\s+['"]([^'"]+)['"]/.exec(t)
  return m ? m[1] : stem(file).replace(/[._-](test|spec)$/, '')
}

// What a file is, from its path and (when known) its text. `file` is relative to the project.
export function classifyPath(file, text) {
  const f = relative(file)
  if (!f || IGNORED.test(f)) return null
  const b = base(f)
  const s = stem(f)
  if (TEST_PATH.test(f) && !DEP_FILE.test(f)) return { scene: 'tests', object: 'test', name: testNameFrom(text, f) }
  if (DEP_FILE.test(f)) return { scene: 'deps', object: 'package', name: b }
  if (BUILD_FILE.test(f)) return { scene: 'build', object: 'bundle', name: /\.config\./.test(b) ? b.split('.')[0] : b }
  if (CONTAINER.test(f)) return { scene: 'infra', object: 'container', name: /^docker-compose|^compose/.test(b) ? s : b }
  if (PIPELINE.test(f)) return { scene: 'infra', object: 'pipeline', name: s }
  if (DEPLOY.test(f)) return { scene: 'infra', object: 'deploy', name: /\.ya?ml$/.test(b) ? s : b }
  if (/\.(md|mdx|rst|adoc)$/i.test(b) || /(^|\/)docs?\//i.test(f)) return { scene: 'docs', object: 'page', name: s }
  if (ENV_FILE.test(f)) return { scene: 'config', object: 'env', name: b }
  if (DB_PATH.test(f) || MIGRATION_PATH.test(f)) {
    const found = tableFrom(text)
    if (MIGRATION_PATH.test(f)) return { scene: 'database', object: 'migration', name: s, detail: found?.name ?? undefined }
    if (/^seed/i.test(b)) return { scene: 'database', object: 'seed', name: s }
    if (found) return { scene: 'database', object: found.object, name: found.name ?? s }
    return { scene: 'database', object: /\.sql$/i.test(b) ? 'query' : 'table', name: s }
  }
  if (CONFIG_FILE.test(f) && !COMPONENT_EXT.test(b)) return { scene: 'config', object: 'setting', name: /\.config\.|^tsconfig|^\./.test(b) ? b.replace(/^\./, '').split('.')[0] : s }
  const table = tableFrom(text)
  if (table && table.object === 'table' && table.name) return { scene: 'database', object: 'table', name: table.name }
  const endpoint = endpointFrom(text, f)
  if (AUTH_PATH.test(f)) {
    const object = /middleware|guard|permission|rbac|authz/i.test(f) ? 'guard' : /jwt|token|oauth|oidc|session/i.test(f) ? 'token' : 'login'
    const name = COMPONENT_EXT.test(b) ? componentFrom(text, f) : s
    return { scene: 'auth', object, name, detail: endpoint ?? undefined }
  }
  if (endpoint) return { scene: 'api', object: 'endpoint', name: endpoint }
  if (API_PATH.test(f)) {
    const object = /\.(graphql|gql|proto)$/i.test(b) ? 'schema' : /middleware/i.test(f) ? 'middleware' : /service/i.test(f) ? 'service' : /(^|\/)models?\//i.test(f) ? 'model' : /(^|\/)server\.[a-z]+$/i.test(f) ? 'server' : /controller|handler|resolver|routes?|api|endpoint/i.test(f) ? 'route' : null
    if (object) return { scene: 'api', object, name: s.split('.')[0] }
  }
  if (STYLE_EXT.test(b)) return { scene: 'frontend', object: 'style', name: s }
  if (ASSET_EXT.test(b) || /(^|\/)(public|static|assets)\//i.test(f)) return { scene: 'frontend', object: 'asset', name: b }
  if (/(^|\/)(page|layout)\.[jt]sx?$/.test(f) || /(^|\/)pages\/[^/]+\.[jt]sx?$/.test(f) && !/(^|\/)pages\/api\//.test(f)) return { scene: 'frontend', object: 'page', name: routeFromFile(f) ?? s }
  if (/(^|\/)hooks?\//i.test(f) || /^use[A-Z]/.test(s)) return { scene: 'frontend', object: 'hook', name: s }
  if (COMPONENT_EXT.test(b)) return { scene: 'frontend', object: /\.html$/i.test(b) ? 'page' : 'component', name: componentFrom(text, f) }
  if (FRONT_PATH.test(f)) return { scene: 'frontend', object: 'component', name: componentFrom(text, f) }
  return { scene: 'code', object: 'file', name: b }
}

// Splits a shell line on && ; || and |, outside quotes.
function segments(command) {
  const out = []
  let cur = ''
  let q = null
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (q) { cur += c; if (c === q) q = null; continue }
    if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue }
    if (c === '&' && command[i + 1] === '&' || c === '|' && command[i + 1] === '|') { out.push(cur); cur = ''; i++; continue }
    if (c === ';' || c === '|' || c === '\n') { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out.map(s => s.trim()).filter(Boolean)
}

function words(segment) {
  const w = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? []
  while (w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]) || ['sudo', 'time', 'nohup', 'exec', 'command', 'env'].includes(w[0]))) w.shift()
  if (['npx', 'bunx', 'pnpx'].includes(w[0])) w.shift()
  if ((w[0] === 'pnpm' || w[0] === 'yarn') && w[1] === 'dlx') w.splice(0, 2)
  if (w[0] === 'npm' && w[1] === 'exec') w.splice(0, 2)
  if (w[0] === 'uv' && w[1] === 'run') w.splice(0, 2)
  if (w[0] === 'poetry' && w[1] === 'run') w.splice(0, 2)
  if (w[0] === 'bundle' && w[1] === 'exec') w.splice(0, 2)
  return w.map(x => x.replace(/^(['"])(.*)\1$/, '$2'))
}

const unquote = s => s.replace(/^(['"])([\s\S]*)\1$/, '$2')
const flagless = args => args.filter(a => !a.startsWith('-'))

const VALUE_FLAGS = /^(--features|-F|--registry|--target|--index|--index-url|--extra-index-url|--python|--group|--filter|--prefix|--cwd|--dir|--extra|--optional|--save-prefix|--tag|--rename|--path|--git|--branch|--rev|-C|-c|--constraint|--find-links|-f)$/
function packagesFrom(args) {
  const names = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (VALUE_FLAGS.test(a)) { i++; continue }
    if (a.startsWith('-')) continue
    if (['install', 'add', 'i', 'ci', 'sync', 'pip', 'update', 'get', 'require', 'tidy', 'download', 'mod', 'deps.get', 'pub', '.'].includes(a)) continue
    names.push(a)
  }
  return names.length ? names.join(', ') : 'install'
}

function requestFrom(w) {
  let method = /\s-d\b|\s--data(?:-\w+)?\b|\s--json\b/.test(' ' + w.join(' ')) ? 'POST' : 'GET'
  const mi = w.findIndex(a => a === '-X' || a === '--request')
  if (mi >= 0 && w[mi + 1]) method = w[mi + 1].toUpperCase()
  const m2 = w.find(a => /^(-X|--request=)\w+/.test(a))
  if (m2) method = m2.replace(/^(-X|--request=)/, '').toUpperCase()
  if (w[0] === 'http' || w[0] === 'xh') { const verb = w.find(a => /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i.test(a)); if (verb) method = verb.toUpperCase() }
  const url = w.slice(1).find(a => /^(https?:\/\/|localhost|127\.0\.0\.1|0\.0\.0\.0|\w[\w.-]*:\d+)/.test(a))
  if (!url) return `${method} request`
  const path = url.replace(/^https?:\/\//, '').replace(/^[^/]*/, '') || '/'
  return `${method} ${path}`
}

// What one command segment means: { scene, object, name?, run } or null for nothing special.
function classifySegment(segment) {
  const w = words(segment)
  if (!w.length) return null
  const [head, sub = '', ...rest] = w
  const args = w.slice(1)
  const text = segment.trim()
  const run = (scene, object, name = text) => ({ scene, object, name, run: true })
  const once = (scene, object, name = text) => ({ scene, object, name, run: false })
  const minor = (object, name = text) => ({ scene: 'explore', object, name, run: false, weight: 'minor' })

  if (PKG_MANAGERS.has(head)) {
    const script = sub === 'run' || sub === 'run-script' ? rest[0] ?? '' : sub
    if (/^(test|t|tst)$|^test:/.test(script) || (head === 'pnpm' || head === 'bun') && TEST_HEADS.has(script) || script === 'vitest' || script === 'jest') return run('tests', 'run')
    if (/^(lint|typecheck|type-check|check|format|fmt|prettier|eslint)(:|$)/.test(script)) return run('tests', 'lint')
    if (/^(build|compile|bundle|dist)(:|$)/.test(script) || (head === 'bun' && script === 'build')) return run('build', 'bundle')
    if (/^(dev|start|serve|preview|watch)(:|$)/.test(script)) return run('api', 'server')
    if (['install', 'i', 'add', 'ci', 'up', 'update', 'upgrade'].includes(sub)) return run('deps', 'package', packagesFrom(args))
    if (head === 'yarn' && !sub) return run('deps', 'package', 'install')
    if (['ls', 'list', 'view', 'info', 'outdated', 'audit', 'why', 'show', 'search', 'explain', 'root', 'config', 'cache', 'whoami', 'ping', 'version', '-v', '--version'].includes(sub)) return minor('read')
    if (head === 'deno' && ['test'].includes(sub)) return run('tests', 'run')
    if (head === 'deno' && ['run', 'serve'].includes(sub)) return run('api', 'server')
    if (head === 'deno' && ['lint', 'fmt', 'check'].includes(sub)) return run('tests', 'lint')
    if (head === 'bun' && sub === 'test') return run('tests', 'run')
    if (script) return run('shell', 'command')
    return null
  }
  if (TEST_HEADS.has(head)) return run('tests', 'run')
  if (LINT_HEADS.has(head)) return run('tests', 'lint')
  if (head === 'tsc') return /--noEmit|--noemit|-p\s|--project|--watch/.test(text) && /--noEmit/i.test(text) ? run('tests', 'lint') : run('build', 'bundle')
  if (BUILD_HEADS.has(head)) return /\btest\b/.test(text) && head === 'xcodebuild' ? run('tests', 'run') : run('build', 'bundle')
  if (head === 'make') return /\b(test|check|lint)\b/.test(sub) ? run('tests', sub === 'lint' ? 'lint' : 'run') : /\b(run|serve|dev|start|up)\b/.test(sub) ? run('api', 'server') : /\b(install|deps)\b/.test(sub) ? run('deps', 'package') : /\b(deploy|release|publish)\b/.test(sub) ? run('infra', 'deploy') : run('build', 'bundle')
  if (head === 'cargo') {
    if (sub === 'test' || sub === 'nextest') return run('tests', 'run')
    if (sub === 'clippy' || sub === 'fmt' || sub === 'check') return run('tests', 'lint')
    if (sub === 'build') return run('build', 'bundle')
    if (sub === 'add' || sub === 'install' || sub === 'update') return run('deps', 'package', packagesFrom(args))
    if (sub === 'run' || sub === 'watch') return run('api', 'server')
    if (['tree', 'metadata', 'search', 'info', '--version', 'version'].includes(sub)) return minor('read')
    return run('build', 'bundle')
  }
  if (head === 'go') {
    if (sub === 'test') return run('tests', 'run')
    if (sub === 'vet' || sub === 'fmt') return run('tests', 'lint')
    if (sub === 'build' || sub === 'generate') return run('build', 'bundle')
    if (sub === 'get' || sub === 'mod' || sub === 'install') return run('deps', 'package', packagesFrom(args))
    if (sub === 'run') return run('api', 'server')
    if (['list', 'env', 'version', 'doc'].includes(sub)) return minor('read')
    return run('shell', 'command')
  }
  if (head === 'node') {
    if (args.includes('--test') || args.some(a => /\.(test|spec)\.[cm]?js$/.test(a))) return run('tests', 'run')
    if (/\b(server|app|index|main|dev|serve)\.[cm]?js\b/.test(text)) return run('api', 'server')
    if (['-v', '--version', '-e', '-p', '--eval', '--print'].includes(sub)) return minor('read')
    return run('shell', 'command')
  }
  if (PY_HEADS.has(head)) {
    if (sub === '-m') {
      const mod = rest[0] ?? ''
      if (/^(pytest|unittest|nose2?|tox|doctest)$/.test(mod)) return run('tests', 'run')
      if (/^(ruff|black|flake8|mypy|pylint|isort|pyright)$/.test(mod)) return run('tests', 'lint')
      if (/^(pip|uv)$/.test(mod)) return run('deps', 'package', packagesFrom(rest.slice(1)))
      if (/^(http\.server|flask|uvicorn|gunicorn|django)$/.test(mod)) return run('api', 'server')
      if (mod === 'build') return run('build', 'bundle')
      return run('shell', 'command')
    }
    if (/manage\.py$/.test(sub)) {
      const cmd = rest[0] ?? ''
      if (/migrat/.test(cmd)) return run('database', 'migration')
      if (cmd === 'test') return run('tests', 'run')
      if (cmd === 'runserver') return run('api', 'server')
      if (/^(loaddata|dumpdata|dbshell|sqlmigrate)$/.test(cmd)) return run('database', 'query')
      if (/^(shell|check|showmigrations)$/.test(cmd)) return minor('read')
      return run('shell', 'command')
    }
    if (/\.py$/.test(sub) && /(^|\/)(app|main|server|run|serve|wsgi|asgi)\.py$/.test(sub)) return run('api', 'server')
    if (/(^|\/)test_?\w*\.py$/.test(sub)) return run('tests', 'run')
    if (/(^|\/)(seed|migrate)\w*\.py$/.test(sub)) return run('database', /seed/.test(sub) ? 'seed' : 'migration')
    if (['--version', '-V', '-c'].includes(sub)) return minor('read')
    return run('shell', 'command')
  }
  if (head === 'pip' || head === 'pip3' || head === 'pipenv' || head === 'poetry' || head === 'conda' || head === 'uv') {
    if (['install', 'add', 'sync', 'update', 'lock'].includes(sub)) return run('deps', 'package', packagesFrom(args))
    if (head === 'uv' && sub === 'pip' && rest[0] === 'install') return run('deps', 'package', packagesFrom(rest.slice(1)))
    if (['list', 'show', 'freeze', 'check', 'tree', 'env', '--version'].includes(sub)) return minor('read')
    return run('shell', 'command')
  }
  if (['gem', 'bundle', 'composer', 'brew', 'apt', 'apt-get', 'apk', 'yum', 'dnf', 'pacman', 'mix', 'pod', 'flutter', 'dart', 'swift', 'dotnet', 'mvn', 'gradle', 'sbt', 'lein', 'stack', 'cabal', 'nix', 'opam', 'rustup', 'nvm', 'pyenv', 'asdf', 'mise', 'volta'].includes(head)) {
    if (['install', 'add', 'require', 'i', '-S', 'deps.get', 'pub', 'package', 'use', 'global', 'shell'].includes(sub) || head === 'bundle' && !sub) return run('deps', 'package', packagesFrom(args))
    if (sub === 'test' || sub === 'spec') return run('tests', 'run')
    if (['build', 'package', 'compile', 'assemble', 'publish', 'release'].includes(sub)) return run('build', 'bundle')
    if (['run', 'serve', 'phx.server', 'watch'].includes(sub)) return run('api', 'server')
    if (['list', 'ls', 'info', 'show', 'search', 'outdated', 'which', 'current', '--version', 'version'].includes(sub)) return minor('read')
    return run('shell', 'command')
  }
  if (head === 'git') {
    if (sub === 'commit') {
      const i = args.findIndex(a => /^(-m|--message|-am|-cm)$/.test(a))
      const inline = args.find(a => /^--message=/.test(a))
      const msg = inline ? inline.replace(/^--message=/, '') : i >= 0 ? args[i + 1] : null
      return once('git', 'commit', msg ? unquote(msg) : 'commit')
    }
    if (sub === 'checkout' || sub === 'switch') {
      const i = args.findIndex(a => /^(-b|-B|-c|-C|--create|--orphan)$/.test(a))
      if (i >= 0 && args[i + 1]) return once('git', 'branch', args[i + 1])
      return minor('read')
    }
    if (sub === 'branch' && flagless(rest).length && !rest.some(a => /^(-d|-D|--delete|-m|--list|-a|-r|-v|-vv|--show-current)$/.test(a))) return once('git', 'branch', flagless(rest)[0])
    if (sub === 'push') return once('git', 'push', flagless(rest).filter(a => a !== 'origin').pop() ?? 'push')
    if (sub === 'merge' || sub === 'rebase' || sub === 'cherry-pick' || sub === 'revert') return once('git', 'commit', `${sub} ${flagless(rest)[0] ?? ''}`.trim())
    if (sub === 'init') return once('git', 'branch', 'init')
    if (sub === 'tag' && flagless(rest).length) return once('git', 'commit', `tag ${flagless(rest)[0]}`)
    if (sub === 'clone') return run('deps', 'package', flagless(rest)[0] ?? 'clone')
    if (sub === 'add' || sub === 'rm' || sub === 'mv' || sub === 'restore' || sub === 'reset' || sub === 'clean') return { scene: 'shell', object: 'command', name: text, run: false, weight: 'minor' }
    if (GIT_READ.has(sub) || sub === 'grep') return minor(sub === 'grep' ? 'search' : 'read')
    return { scene: 'shell', object: 'command', name: text, run: false, weight: 'minor' }
  }
  if (head === 'gh') {
    if (sub === 'pr' && rest[0] === 'create') {
      const i = rest.findIndex(a => /^(-t|--title)$/.test(a))
      const inline = rest.find(a => /^--title=/.test(a))
      return once('git', 'pr', inline ? unquote(inline.replace(/^--title=/, '')) : i >= 0 && rest[i + 1] ? unquote(rest[i + 1]) : 'pull request')
    }
    if (sub === 'pr' && /^(merge|close|ready|edit|review|comment)$/.test(rest[0] ?? '')) return once('git', 'pr', `${rest[0]} ${rest[1] ?? ''}`.trim())
    if (sub === 'repo' && rest[0] === 'create') return once('git', 'branch', rest[1] ?? 'repo')
    if (sub === 'release' && rest[0] === 'create') return once('git', 'commit', `release ${rest[1] ?? ''}`.trim())
    if (sub === 'workflow' && rest[0] === 'run' || sub === 'run' && rest[0] === 'rerun') return run('infra', 'pipeline')
    if (sub === 'issue' && rest[0] === 'create') return once('git', 'pr', `issue ${rest.find(a => !a.startsWith('-')) ?? ''}`.trim())
    return minor('read')
  }
  if (head === 'act') return run('infra', 'pipeline')
  if (MIGRATION_HEADS.has(head)) {
    if (/^(studio|validate|format|version|status|list|--version|-v|help)$/.test(sub) || head === 'supabase' && sub !== 'db' && sub !== 'migration') return minor('read')
    const i = args.findIndex(a => /^(--name|-n)$/.test(a))
    const inline = args.find(a => /^--name=/.test(a))
    const name = inline ? inline.replace(/^--name=/, '') : i >= 0 && args[i + 1] ? args[i + 1] : text
    return run('database', 'migration', name)
  }
  if (QUERY_HEADS.has(head)) return run('database', 'query')
  if (head === 'rails' || head === 'rake' || head === 'bin/rails') {
    if (/^db:/.test(sub)) return run('database', /seed/.test(sub) ? 'seed' : 'migration')
    if (sub === 'test' || sub === 'spec') return run('tests', 'run')
    if (sub === 's' || sub === 'server') return run('api', 'server')
    if (sub === 'g' || sub === 'generate') return once('code', 'file', rest.join(' ') || 'generate')
    if (sub === 'routes' || sub === 'c' || sub === 'console') return minor('read')
    return run('shell', 'command')
  }
  if (head === 'php') return /artisan/.test(sub) && rest[0] === 'serve' ? run('api', 'server') : /artisan/.test(sub) && /migrate/.test(rest[0] ?? '') ? run('database', 'migration') : /artisan/.test(sub) && rest[0] === 'test' ? run('tests', 'run') : run('shell', 'command')
  if (CONTAINER_HEADS.has(head)) {
    const verb = sub === 'compose' ? rest[0] ?? '' : sub
    if (/^(ps|logs|images|inspect|stats|top|info|version|ls|events|port|diff|history|--version)$/.test(verb)) return minor('read')
    return run('infra', 'container')
  }
  if (DEPLOY_HEADS.has(head)) {
    const verb = `${sub} ${rest[0] ?? ''}`
    if (/^(get|describe|logs|top|version|status|list|ls|show|output|plan|validate|whoami|auth|config|info|login|help|--version|releases|regions|ips)\b/.test(verb)) return minor('read')
    return run('infra', 'deploy')
  }
  if (REQUEST_HEADS.has(head)) {
    if (head === 'wget' && !/localhost|127\.0\.0\.1|:\d{4}/.test(text)) return minor('fetch')
    return once('api', 'request', requestFrom(w))
  }
  if (SERVER_HEADS.has(head)) return head === 'wrangler' && !/deploy|publish|dev/.test(sub) ? minor('read') : run('api', 'server')
  if (['flask', 'fastapi', 'django-admin', 'next', 'nuxt', 'astro', 'remix', 'vite', 'ng', 'nest', 'gatsby', 'svelte-kit', 'sails', 'adonis', 'strapi', 'storybook', 'turbo', 'nx', 'lerna', 'ember', 'meteor', 'expo', 'react-native'].includes(head)) {
    if (/^(build|export|generate|compile|package|prerender)$/.test(sub)) return run('build', 'bundle')
    if (/^(test|e2e|lint|check)$/.test(sub)) return run('tests', sub === 'lint' || sub === 'check' ? 'lint' : 'run')
    if (/^(dev|start|serve|run|preview|runserver)$/.test(sub) || !sub) return run('api', 'server')
    if (/^(g|generate|new|add|init|create)$/.test(sub)) return once('code', 'file', rest.join(' ') || sub)
    if (head === 'turbo' || head === 'nx') return /test/.test(text) ? run('tests', 'run') : /lint/.test(text) ? run('tests', 'lint') : /build/.test(text) ? run('build', 'bundle') : run('shell', 'command')
    return run('shell', 'command')
  }
  if (head === 'create-react-app' || head === 'create-next-app' || head === 'create-vite' || head === 'create-t3-app' || head === 'degit' || head === 'cookiecutter' || head === 'copier' || head === 'yo') return run('code', 'file', `scaffold ${flagless(args)[0] ?? ''}`.trim())
  if (head === 'cd' || head === 'export' || head === 'source' || head === '.' || head === 'set' || head === 'unset' || head === 'alias' || head === 'ulimit' || head === 'umask') return null
  if (head === 'echo' || head === 'printf') return { scene: 'shell', object: 'command', name: text, run: false, weight: 'minor' }
  if (SHELL_SEARCH.has(head)) return minor('search')
  if (SHELL_READ.has(head)) return minor('read')
  if (head === 'sed' && /^-n/.test(sub) || head === 'awk' && !/-i\b|>\s*\S/.test(text)) return minor('read')
  if (['mkdir', 'touch', 'cp', 'mv', 'rm', 'rmdir', 'ln', 'chmod', 'chown', 'tee', 'truncate', 'install', 'rsync', 'scp', 'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'xz', 'sed', 'awk', 'perl', 'ruby', 'kill', 'pkill', 'killall', 'wait', 'trap', 'read'].includes(head)) return { scene: 'shell', object: 'command', name: text, run: false, weight: 'minor' }
  if (/^\.\/[\w.-]+$|\.(sh|bash|zsh)$/.test(head)) return run('shell', 'command')
  return { scene: 'shell', object: 'command', name: text, run: false, weight: 'minor' }
}

// What a whole shell line means: the first segment with a scene of its own, or the quietest reading of the line.
export function classifyCommand(command) {
  const line = oneLine(command)
  if (!line) return null
  const parts = segments(String(command)).map(classifySegment).filter(Boolean)
  const major = parts.find(p => !p.weight && p.scene !== 'shell') ?? parts.find(p => !p.weight)
  if (major) return { ...major, name: cut(major.name, 80) }
  if (!parts.length) return { scene: 'shell', object: 'command', name: cut(line, 80), run: false, weight: 'minor' }
  const search = parts.find(p => p.object === 'search')
  const read = parts.find(p => p.scene === 'explore')
  const pick = search ?? read ?? parts[0]
  return { ...pick, name: cut(line, 80) }
}

const PASS = /(\d+)\s+(?:passed|passing|pass\b|ok\b)|(?:#\s*pass|ℹ pass)\s+(\d+)|Tests:\s+(?:\d+ failed, )?(\d+) passed|test result: \w+\. (\d+) passed/i
const FAIL = /(\d+)\s+(?:failed|failing|failures?\b)|(?:#\s*fail|ℹ fail)\s+(\d+)|(\d+) failed;?/i
const BROKEN = /(?:^|\n)\s*(?:FAIL|FAILED|ERROR|error\[E\d+\]|npm ERR!|Error:|TypeError|ReferenceError|SyntaxError|Traceback \(most recent call last\)|panicked at|error TS\d+|✗|✖|×)\b|Tests failed|Build failed|Compilation failed|exited with code [1-9]/

function runOutcome(response, kind) {
  const r = response ?? {}
  const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}\n${typeof r === 'string' ? r : r.output ?? ''}`
  const code = r.exit_code ?? r.exitCode ?? r.code ?? r.returncode
  const num = re => { const m = re.exec(out); return m ? Number(m.slice(1).find(x => x !== undefined)) : undefined }
  const passed = num(PASS)
  const failed = num(FAIL)
  let status = 'done'
  if (typeof code === 'number' && code !== 0) status = 'fail'
  if (r.interrupted || r.isError || r.is_error) status = 'fail'
  if (failed > 0) status = 'fail'
  if (status === 'done' && kind !== 'tests' && BROKEN.test(out)) status = 'fail'
  if (status === 'done' && kind === 'tests' && passed === undefined && /(?:^|\n)\s*FAIL(?:ED)?\b|Tests failed|not ok \d/.test(out)) status = 'fail'
  const parts = []
  if (passed !== undefined) parts.push(`${passed} passed`)
  if (failed) parts.push(`${failed} failed`)
  return { status, detail: parts.join(', ') || undefined }
}

const bashEvent = (call, rule) => {
  const isPre = call.event === 'PreToolUse'
  const lasting = rule.scene === 'git' || rule.scene === 'deps' || rule.object === 'migration' || rule.scene === 'infra' && rule.object !== 'pipeline' || rule.scene === 'code'
  if (isPre) return rule.run ? { kind: 'run', scene: rule.scene, object: rule.object, name: rule.name, status: 'start', tool: 'Bash' } : null
  if (rule.weight === 'minor') return { kind: 'scene', scene: rule.scene, object: rule.object, name: rule.name, weight: 'minor', tool: 'Bash' }
  const outcome = rule.run ? runOutcome(call.response, rule.scene) : { status: 'done' }
  return { kind: lasting && outcome.status !== 'fail' ? 'object' : 'run', scene: rule.scene, object: rule.object, name: rule.name, status: outcome.status, detail: outcome.detail, tool: 'Bash' }
}

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'str_replace_editor', 'str_replace_based_edit_tool', 'create_file'])
const READ_TOOLS = new Set(['Read', 'LS', 'Glob', 'Grep', 'NotebookRead', 'view', 'ReadMcpResourceTool', 'ListMcpResourcesTool'])

function fileEvent(call) {
  const input = call.input ?? {}
  const file = input.file_path ?? input.notebook_path ?? input.path ?? ''
  const text = input.content ?? input.new_string ?? input.new_source ?? input.file_text ?? input.new_str ?? (Array.isArray(input.edits) ? input.edits.map(e => e.new_string ?? '').join('\n') : '')
  const rel = relative(file, call.cwd)
  const rule = classifyPath(rel, text)
  if (!rule) return null
  const r = call.response ?? {}
  const status = r.isError || r.is_error ? 'fail' : 'done'
  return { kind: 'object', ...rule, file: rel, tool: call.tool, status, detail: rule.detail ?? (call.tool === 'Write' ? undefined : 'edit') }
}

function readEvent(call) {
  const input = call.input ?? {}
  if (call.tool === 'Grep' || call.tool === 'Glob') return { kind: 'scene', scene: 'explore', object: 'search', name: cut(oneLine(input.pattern ?? input.query ?? ''), 60), weight: 'minor', tool: call.tool }
  return { kind: 'scene', scene: 'explore', object: 'read', name: relative(input.file_path ?? input.notebook_path ?? input.path ?? input.uri ?? '', call.cwd) || call.tool, weight: 'minor', tool: call.tool }
}

export function classify(call) {
  const event = call.event ?? call.hook_event_name
  const cwd = call.cwd
  if (event === 'SessionStart') {
    if (call.source === 'compact') return null
    return { kind: 'session', scene: 'idle', status: 'start', detail: base((cwd ?? '').replace(/\\/g, '/').replace(/\/+$/, '')) || 'project', session: call.session_id, tool: 'SessionStart' }
  }
  if (event === 'UserPromptSubmit') {
    const text = oneLine(call.prompt ?? call.text ?? '')
    const name = text.length > 72 ? text.slice(0, 71).replace(/\s+\S*$/, '').trimEnd() + '…' : text
    return { kind: 'turn', scene: 'think', object: 'task', status: 'start', name }
  }
  if (event === 'Stop') return { kind: 'turn', scene: 'idle', status: 'done', weight: 'minor' }
  if (event !== 'PreToolUse' && event !== 'PostToolUse') return null
  const tool = call.tool ?? call.tool_name ?? ''
  const input = call.input ?? call.tool_input ?? {}
  const c = { ...call, event, tool, input, response: call.response ?? call.tool_response }
  if (tool === 'Bash' || tool === 'PowerShell' || tool === 'shell' || tool === 'bash') {
    const rule = classifyCommand(input.command ?? input.cmd ?? '')
    return rule ? bashEvent(c, rule) : null
  }
  if (event === 'PreToolUse') {
    if (tool === 'Agent' || tool === 'Task') return { kind: 'run', scene: 'agents', object: 'agent', name: cut(oneLine(input.description ?? input.subagent_type ?? 'subagent'), 60), status: 'start', tool }
    return null
  }
  if (tool === 'Agent' || tool === 'Task') return { kind: 'run', scene: 'agents', object: 'agent', name: cut(oneLine(input.description ?? input.subagent_type ?? 'subagent'), 60), status: 'done', tool }
  if (EDIT_TOOLS.has(tool)) return fileEvent(c)
  if (READ_TOOLS.has(tool)) return readEvent(c)
  if (tool === 'WebFetch') { let host = ''; try { host = new URL(input.url).hostname } catch { host = oneLine(input.url ?? '') } return { kind: 'scene', scene: 'explore', object: 'fetch', name: host, weight: 'minor', tool } }
  if (tool === 'WebSearch') return { kind: 'scene', scene: 'explore', object: 'fetch', name: cut(oneLine(input.query ?? ''), 60), weight: 'minor', tool }
  if (tool === 'ExitPlanMode' || tool === 'EnterPlanMode') return { kind: 'scene', scene: 'think', object: 'task', name: tool === 'ExitPlanMode' ? 'plan ready' : 'planning', weight: 'major', tool }
  if (tool === 'TodoWrite') return { kind: 'note', scene: 'think', object: 'task', name: `${Array.isArray(input.todos) ? input.todos.length : 0} todos`, weight: 'minor', tool }
  if (tool === 'TaskCreate' || tool === 'TaskUpdate' || tool === 'TaskList' || tool === 'TaskGet') return { kind: 'note', scene: 'think', object: 'task', name: cut(oneLine(input.subject ?? tool), 60), weight: 'minor', tool }
  if (tool === 'AskUserQuestion') return { kind: 'note', scene: 'think', object: 'task', name: 'question', weight: 'minor', tool }
  if (tool === 'Skill') return { kind: 'note', scene: 'think', object: 'task', name: `skill ${oneLine(input.skill ?? '')}`.trim(), weight: 'minor', tool }
  if (/^mcp__/.test(tool)) {
    const m = /^mcp__([^_]+(?:_[^_]+)*?)__(.+)$/.exec(tool)
    const server = m?.[1] ?? 'mcp'
    const action = m?.[2] ?? tool
    if (/github|gitlab|bitbucket/.test(server) && /pull_request|merge_request|pr\b/.test(action) && /create|open/.test(action)) return { kind: 'object', scene: 'git', object: 'pr', name: cut(oneLine(input.title ?? 'pull request'), 60), status: 'done', tool }
    if (/github|gitlab/.test(server) && /push_files|create_or_update_file|create_branch|merge_pull_request/.test(action)) return { kind: 'object', scene: 'git', object: /branch/.test(action) ? 'branch' : /merge/.test(action) ? 'pr' : 'commit', name: cut(oneLine(input.message ?? input.branch ?? input.title ?? action), 60), status: 'done', tool }
    return { kind: 'scene', scene: 'explore', object: 'fetch', name: `${server}: ${action}`.slice(0, 60), weight: 'minor', tool }
  }
  return null
}
