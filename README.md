# motiondev

**See what your coding agent is building, live.** Small pictograms form as the agent works: it moves to the backend and a database cylinder draws itself; it creates a `users` table and a little table card pops in; it writes an endpoint and the server box grows an arrow labelled `GET /users`; it runs the tests and a flask bubbles until the count comes back green.

Three places to look, one event stream:

- **In the Claude Code chat**, as a permanent window (a docked pane) with vector drawings in the desktop app and box-drawing art in the terminal, plus a one-line band above the prompt.
- **In any terminal**, as an animated canvas (`motiondev watch`), for a second tmux pane or a spare window.
- **Under the Mac notch** (phase 2, [design ready](docs/mac-app.md)).

```
◉ motiondev  shop-api                                          turn 1 · 20:01:16

  ╭──────────╮     ┌─ ▤ table ─────────┐   backend · database
 ╭╯          ╰╮    │ users             │   ✓ created table · done
 │╰──────────╯│    ├───────────────────┤   users
 │ ┌────────┐ │ ◀──│ id                │   id, email, password_hash
 │ │ users  │ │    │ email             │   prisma/schema.prisma
 │ └────────┘ │    │ password_hash     │
 ╰╮          ╭╯    └───────────────────┘
  ╰──────────╯

built  ▦ users  ⇄ GET /users  ◫ UserList

20:01:14 ✧ prompt: Build a users API with auth and a React list
20:01:16 ▦ Write prisma/schema.prisma → table users (id, email, password_hash)
```

In the terminal the table card slides into the cylinder over three frames; in the desktop app the same scene is a vector drawing, animated while the action runs.

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

The window draws the action as it happens, as a vector drawing in the desktop app, the editor and mobile, and as box-drawing art in the terminal: the `users` table card dropping into the database with its columns written on it, the `GET /users` request leaving the server for a client, the `<UserList/>` block landing in the browser window, the flask bubbling until the counts come back green or red, the new commit lighting up on the branch. Under the drawing: what is being made, the shelf of everything built, and the last events. It stays open and follows every tool call. `ctrl+x tab` focuses it, `/motiondev close` closes it (it then stays closed until `/motiondev`), `/motiondev status` prints the same as text.

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

## Troubleshooting

- **The agent says "it only appears once the plugin is installed".** You have the skill without the plugin, or an old copy of the skill. Update it (`npx skills update`, or `git pull` in your clone): the current skill installs the plugin itself and tells you to type `/reload-plugins` then `/motiondev`.
- **Nothing shows in the chat.** Send a message or type `/motiondev`: both place the window at any width (Claude Code draws a window opened on its own, at session start, only on a wide terminal). If you closed it, it stays closed until `/motiondev`. If the command does not exist, the plugin is not enabled in this session: `/plugin` lists it, and `/reload-plugins` loads a plugin installed after the session started.
- **You asked the agent to "show" the canvas and got a folded tool result.** That is Bash output, which the chat collapses. The skill tells the agent to open the window or to paste `motiondev snapshot` in its own reply instead; make sure the skill is the one from this plugin (`/motiondev:motiondev`).
- **The terminal watcher sees no events in the desktop app.** The hooks run `node`; a Node installed through nvm or Volta is not on the PATH a GUI app inherits. `node --version` in the app's built-in terminal tells; a symlink in `/usr/local/bin` fixes it. The window in the chat does not depend on Node.
- **Everything is gray.** `NO_COLOR` is set, or the terminal has no 256-color support; the art still reads.

## Ask the agent to narrate

The hooks see every file and command, so the pictograms follow the agent with no effort from it. For richer captions ("add the users table", "review the diff"), invoke the skill: say "motiondev" or "show me what you're building" and the agent emits one event per unit of work with `node scripts/emit.mjs <scene> <object> <name>`. Where the window cannot show (VS Code, a cloud session), the agent pastes `motiondev snapshot` in its reply at each milestone: a compact frame in a code block, visible without unfolding anything. The scenes and objects are in [skills/motiondev/references/taxonomy.md](skills/motiondev/references/taxonomy.md).

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
| keep the window from opening by itself | plugin setting `pane` (`/plugin` → motiondev → configure); `/motiondev` still opens it |
| hide the band for good | plugin setting `band`, or `Hide` / `/motiondev band off` for one session |
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
