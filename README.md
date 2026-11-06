# motiondev

**See what your coding agent is building, live.** The blueprint of the build grows in front of you as the agent works: the frontend, the backend and the database are boxes that fill with what gets made, a caret sits where the agent is, names type themselves in the moment the hooks see them, a failed attempt stays in place as a red ghost until the retry lands, and the test strip goes red and then green. Instead of sentences that sum up what the agent did, you watch it try, fail and succeed.

Three places to look, one event stream:

- **In the Claude Code chat**, as a permanent window (a docked pane) with a vector blueprint in the desktop app and box-drawing art in the terminal, plus a one-line band above the prompt.
- **In any terminal**, as an animated canvas (`motiondev watch`), for a second tmux pane or a spare window.
- **Under the Mac notch** (phase 2, [design ready](docs/mac-app.md)).

```
◉ motiondev  shop-api                                          turn 1 · 20:01:29
✧ Build a users API with auth and a React list
┌─ ◫ frontend ───────────┐ ┌─ ⇄ backend ────────────┐ ┌─ ▤ database ───────────┐
│ ◫ UserList             │ │ ⇄ GET /users           │ │ ▦ users                │
│ ▭ /users               │ │ ⇄ POST /users          │ │ ▦ orders               │
│ ◐ globals              │ │ ◇ logger               │ │ ▤ add_users            │
│                        │ │ ◘ requireAuth          │ │                        │
│                        │ │ ◉ jwt                  │ │                        │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
✓ tests  ▶ npm test  ✗ 11 passed, 1 failed  ▓▓▓▓▓▓▓▓▓░▌  □ users API
⊞ also  ⊞ zod
20:01:18 ◫ Write src/components/UserList.tsx → component UserList
20:01:19 ▭ Write app/users/page.tsx → page /users
20:01:21 ✓ Write tests/users.test.ts → test users API
20:01:22 ▶ run npm test (started)
20:01:23 ▶ run npm test (failed · 11 passed, 1 failed)
```

The caret (`▌`) is the agent: here it just watched the suite fail. Next it will read the route, edit it (the caret jumps to `GET /users` in the backend box), run the tests again (the strip spins, then turns green), commit (a `● git` strip appears). Every box and strip accumulates for the whole session; the ticker under them keeps the last events.

The one-action view is still there (`v` in the watcher, `--view action`, `/motiondev view action`): the current action drawn on its object, the table card sliding into the cylinder with its columns, the request leaving the server, the flask bubbling, animated in the terminal and as a vector drawing in the desktop app.

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

Start a new session and send your first message: the motiondev window opens in the chat by itself. (`/motiondev` opens it any time.)

The window draws the blueprint as it grows, as a vector drawing in the desktop app, the editor and mobile, and as box-drawing art in the terminal: the `users` table appearing in the database box, `GET /users` in the backend box, `UserList` in the frontend box, the caret after whatever the agent is on, a red ghost where a write failed until the retry lands, the test strip with its counts and pass bar, the git strip with the commit, the push and the PR. Under the drawing: one line on the current action, and the last events. It stays open and follows every tool call. `ctrl+x tab` focuses it, `/motiondev close` closes it (it then stays closed until `/motiondev`), `/motiondev status` prints the same as text, `/motiondev view action` switches to the one-action pictogram (`/motiondev view blueprint` switches back).

The band above the prompt shows the same in one line: `Window` opens the window, `More` unfolds the pictogram, `Hide` hides the band for the session (`/motiondev band on` brings it back).

The window and the band need Claude Code 2.1.290 or later in the terminal or the desktop app. The hooks and the terminal watcher work everywhere, including VS Code and `claude -p`.

### Skill only (any agent that reads skills)

```bash
npx skills add yeubridev/motiondev-skill
```

The skill alone draws nothing: the window and the hooks live in the plugin. So the skill's first step installs the plugin for you (`claude plugin marketplace add` + `claude plugin install`, one Bash call you approve) and then asks you to type `/reload-plugins` and `/motiondev`. Where the plugin cannot be installed, the agent pastes a `motiondev snapshot` in its replies instead.

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

`q` quits, `v` switches between the blueprint and the one-action view, `a` switches to pure ASCII, `c` clears the canvas. Without a TTY it prints one line per event instead.

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

## Troubleshooting

- **The agent says "it only appears once the plugin is installed".** You have the skill without the plugin, or an old copy of the skill. Update it (`npx skills update`, or `git pull` in your clone): the current skill installs the plugin itself and tells you to type `/reload-plugins` then `/motiondev`.
- **Nothing shows in the chat.** Send a message or type `/motiondev`: both place the window at any width (Claude Code draws a window opened on its own, at session start, only on a wide terminal). If you closed it, it stays closed until `/motiondev`. If the command does not exist, the plugin is not enabled in this session: `/plugin` lists it, and `/reload-plugins` loads a plugin installed after the session started.
- **You asked the agent to "show" the canvas and got a folded tool result.** That is Bash output, which the chat collapses. The skill tells the agent to open the window or to paste `motiondev snapshot` in its own reply instead; make sure the skill is the one from this plugin (`/motiondev:motiondev`).
- **The terminal watcher sees no events in the desktop app.** The hooks run `node`; a Node installed through nvm or Volta is not on the PATH a GUI app inherits. `node --version` in the app's built-in terminal tells; a symlink in `/usr/local/bin` fixes it. The window in the chat does not depend on Node.
- **Everything is gray.** `NO_COLOR` is set, or the terminal has no 256-color support; the art still reads.

## Ask the agent to narrate

The hooks see every file and command, so the blueprint follows the agent with no effort from it. For richer names ("add the users table", "review the diff"), invoke the skill: say "motiondev" or "show me what you're building" and the agent emits one event per unit of work with `node scripts/emit.mjs <scene> <object> <name>`. Where the window cannot show (VS Code, a cloud session), the agent pastes `motiondev snapshot` in its reply at each milestone: a compact frame in a code block, visible without unfolding anything. The scenes and objects are in [skills/motiondev/references/taxonomy.md](skills/motiondev/references/taxonomy.md).

## What you see

On the blueprint, every scene has a place: `frontend` is a box (components, pages, styles, hooks, assets), `backend` is a box (the api and auth scenes), `database` is a box (tables, migrations, seeds, indexes, queries), `code` is a box for other files, and the rest are strips: `tests` (the last run with its counts and a pass bar, then the tests written), `git` (commits, branches, pushes, PRs) and `also` (deps, infra, config, build, docs, agents). The prompt is the task line on top, where the caret waits while the agent thinks. A run in progress spins; a failure is a red `✗` that the next success replaces. Reads and shell commands never move anything: they only pass through the ticker.

In the one-action view, each scene has its own pictogram:

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

Every object built in the session goes on a shelf under the pictogram, one glyph each; a failed one shows as a red `✗` until it is retried.

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

One pure classifier turns a tool call into `{ scene, object, name }` from the file path, the file's text (`CREATE TABLE users`, `router.get('/users')`, `export default function Button`) or the command (`npm test`, `git commit -m`, `prisma migrate dev --name`). One pure reducer folds the events into the state of the build: what was made (failures included, as ghosts), the last outcome of every run, where the agent is. One pure blueprint lays that state out (`lib/blueprint.mjs`), drawn as text in the terminal and as vectors in the desktop app (`lib/svg.mjs`); one pure pictogram library holds the one-action art. Every surface reads the same events, so they always agree. The design doc is [docs/superpowers/specs/2026-10-30-motiondev-design.md](docs/superpowers/specs/2026-10-30-motiondev-design.md).

## Configuration

| what | how |
|---|---|
| turn the hooks off | `MOTIONDEV=0` in the environment |
| move the event file | `MOTIONDEV_HOME=/path` (folder) or `MOTIONDEV_FILE=/path/events.jsonl` |
| size cap before rotation | `MOTIONDEV_MAX_BYTES` (default 5 MB; the previous file stays as `events.1.jsonl`) |
| keep the window from opening by itself | plugin setting `pane` (`/plugin` → motiondev → configure); `/motiondev` still opens it |
| hide the band for good | plugin setting `band`, or `Hide` / `/motiondev band off` for one session |
| open the pictogram by default | plugin setting `details` |
| the one-action view instead of the blueprint | `v` in the watcher, `--view action`, `/motiondev view action` in the chat |
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
