# motiondev

**See what your coding agent is building, live.** Small pictograms form as the agent works: it moves to the backend and a database cylinder draws itself; it creates a `users` table and a little table card pops in; it writes an endpoint and the server box grows an arrow labelled `GET /users`; it runs the tests and a flask bubbles until the count comes back green.

Three places to look, one event stream:

- **In the Claude Code chat**, as a band above the prompt (terminal or desktop app).
- **In any terminal**, as an animated canvas (`motiondev watch`), for a second tmux pane or a spare window.
- **Under the Mac notch** (phase 2, [design ready](docs/mac-app.md)).

```
◉ motiondev  shop-api                                          turn 1 · 17:59:08

      ╭───╮           quality · tests
      │   │           ◓ running tests
      │ ◦ │           npm test
     ╱ ◦   ╲
    │   ◦ ◦ │          ▶ npm test
    │ ◦◦◦◦◦ │            test run
     ╰─────╯

built  ▦ users  ▦ orders  ▤ add_users  ⇄ GET /users  ⇄ POST /users  ◇ logger
       ◘ requireAuth  ◉ jwt  ◫ UserList  ▭ /users  ◐ globals  ✓ users API

17:59:07 ⇄ Edit src/routes/users.ts → endpoint GET /users (edit)
17:59:07 ✓ Write tests/users.test.ts → test users API
17:59:08 ▶ run npm test (started)
```

No dependencies. Node 18+, which every machine running Claude Code already has. Nothing leaves your machine: events are one JSON line each in `~/.motiondev/events.jsonl`, with a scene, an object and a name, never file contents.

## Install

### Claude Code plugin (band + hooks + skill)

Two separate prompts in Claude Code:

```
/plugin marketplace add yeubridev/motiondev-skill
```

```
/plugin install motiondev@motiondev
```

Start a new session. The band appears above the prompt as soon as the agent touches something: `More` opens the pictogram, `Hide` hides it for the session. The band needs Claude Code 2.1.290 or later in the terminal or the desktop app; the hooks and the terminal watcher work everywhere.

### Skill only (any agent that reads skills)

```bash
npx skills add yeubridev/motiondev-skill
```

This installs the `motiondev` skill: the agent narrates each unit of work with `scripts/emit.mjs`. Without the plugin there are no hooks, so only what the agent narrates shows up.

### From a clone

```bash
git clone https://github.com/yeubridev/motiondev-skill
claude --plugin-dir ./motiondev-skill
```

## Watch it

**Terminal canvas**, in a second pane or window:

```bash
npx github:yeubridev/motiondev-skill watch
```

Or, with the plugin installed, from its folder (`cat ~/.motiondev/plugin-root` prints it):

```bash
node "$(cat ~/.motiondev/plugin-root)/bin/motiondev.mjs" watch
```

`q` quits, `a` switches to pure ASCII, `c` clears the canvas. Without a TTY it prints one line per event instead.

**Demo**, no agent needed:

```bash
npx github:yeubridev/motiondev-skill demo
```

**Status line**, one line for your Claude Code status bar, in `~/.claude/settings.json`:

```json
{ "statusLine": { "type": "command", "command": "node \"$(cat ~/.motiondev/plugin-root)/bin/motiondev.mjs\" status" } }
```

It prints something like `▤ database · table "users" · 4 built`.

**tmux**, the canvas beside the agent:

```bash
tmux split-window -h -l 60 'npx github:yeubridev/motiondev-skill watch'
```

## Ask the agent to narrate

The hooks see every file and command, so the pictograms follow the agent with no effort from it. For richer captions ("add the users table", "review the diff"), invoke the skill: say "motiondev" or "show me what you're building" and the agent emits one event per unit of work with `node scripts/emit.mjs <scene> <object> <name>`. The scenes and objects are in [skills/motiondev/references/taxonomy.md](skills/motiondev/references/taxonomy.md).

## What you see

| the agent is | scene | pictogram |
|---|---|---|
| touching the schema, running a migration | database | a cylinder, then a table card with the table's name |
| writing routes, services, middleware | api | a server box with request and response arrows |
| writing components, pages, styles | frontend | a browser window |
| writing or running tests, linting | tests | a flask that bubbles until the count comes back |
| committing, branching, pushing, opening a PR | git | a commit graph |
| installing packages | deps | a parcel |
| writing Dockerfiles, pipelines, deploying | infra | a container stack |
| editing env and config files | config | a settings panel |
| writing docs | docs | a page |
| working on auth, tokens, guards | auth | a padlock |
| building, bundling | build | a conveyor |
| delegating to subagents | agents | robots |
| reading, searching | explore | a magnifier, in the ticker only |
| planning, between tasks | think, idle | a lightbulb, a sleeping cursor |

Every object built in the session goes on a shelf under the pictogram, one glyph each.

## How it works

```
Claude Code tool calls
   ├─ hooks/hooks.json ─► hooks/motiondev-hook.mjs ─► lib/classify.mjs ─► ~/.motiondev/events.jsonl
   │                                                                              ├─► motiondev watch   (terminal canvas)
   │                                                                              ├─► motiondev tail    (one line per event)
   │                                                                              └─► Mac notch app     (phase 2)
   └─ hooks/band.json ─► hooks/band/register.tsx ─► lib/classify.mjs ─► band above the prompt
skills/motiondev/SKILL.md ─► scripts/emit.mjs ─► events.jsonl   (agent narration, optional)
```

One pure classifier turns a tool call into `{ scene, object, name }` from the file path, the file's text (`CREATE TABLE users`, `router.get('/users')`, `export default function Button`) or the command (`npm test`, `git commit -m`, `prisma migrate dev --name`). One pure pictogram library holds the art. Every surface reads the same events, so they always agree. The design doc is [docs/superpowers/specs/2026-10-30-motiondev-design.md](docs/superpowers/specs/2026-10-30-motiondev-design.md).

## Configuration

| what | how |
|---|---|
| turn the hooks off | `MOTIONDEV=0` in the environment |
| move the event file | `MOTIONDEV_HOME=/path` (folder) or `MOTIONDEV_FILE=/path/events.jsonl` |
| size cap before rotation | `MOTIONDEV_MAX_BYTES` (default 5 MB; the previous file stays as `events.1.jsonl`) |
| hide the band for good | plugin setting `band` (`/plugin` → motiondev → configure), or `Hide` for one session |
| open the pictogram by default | plugin setting `details` |
| colors off | `NO_COLOR=1` or `--no-color` |
| pure ASCII | `--ascii`, or `a` in the watcher |

## Phase 2: the Mac notch

The event file is the whole contract. [docs/mac-app.md](docs/mac-app.md) says what macOS allows (an `NSPanel` under the camera housing, no private API), which SF Symbols stand for which scene, and a three-step plan. Nothing native is built yet.

## Built with

motiondev was designed and built with these skill stacks installed, each over 10k stars at the time (2026-10-30):

| stack | stars | what it gave this project |
|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | 309k | the workflow: brainstorm, write the design doc first, TDD (every module here started with a failing test), verification before claiming completion, and the `writing-skills` rules for SKILL.md |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 307k | `writing-for-agents` (pointers, progressive disclosure, no no-ops) and `codebase-design` (deep modules: the classifier and the art are pure, the I/O is thin) |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | 293k | the hook patterns: stdin JSON, exit 0 whatever happens, `${CLAUDE_PLUGIN_ROOT}`, async hooks that never slow the agent |
| [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) | 227k | the four principles in `CLAUDE.md`: think first, simplicity, surgical changes, goal-driven loops |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | 181k | the lazy-senior-dev bar (no dependency, the smallest thing that works) and the shape of a Claude Code band above the prompt |
| [tt-a1i/archify](https://github.com/tt-a1i/archify) | 92k | the idea of a typed intermediate representation rendered deterministically: motiondev's events are that IR, the pictograms its renderers |

## Development

```bash
npm test                   # node --test: classifier, protocol, art, renderer, hook, CLI
claude plugin validate .   # manifests, hooks, the band module
claude plugin test .       # the band, on terminal and desktop surfaces
node bin/motiondev.mjs demo
```

Rules for agents working on this repository are in `CLAUDE.md`.

## License

MIT.
