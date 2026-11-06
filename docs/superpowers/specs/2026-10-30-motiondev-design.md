# motiondev: see what your coding agent is building, live

Date: 2026-10-30. Status: approved for v0.1 (built in the same session the request came in; the person asked for the skill first and the Mac app as a second step).

## Intent

A coding agent works for minutes at a time and the human only sees scrolling tool calls. motiondev turns that stream into small pictograms that form in front of the user: the agent moves to the backend, a database cylinder draws itself; it creates a `users` table, a little table with columns pops in under the cylinder; it writes an endpoint, a server box grows an arrow labelled `GET /users`; it runs the tests, a flask bubbles and the pass count ticks up.

The person should understand, at a glance and without reading, what the agent is doing right now and what it has built so far.

## Goals

- Works with zero effort from the agent: Claude Code hooks observe every tool call and classify it.
- Optional narration: a skill that lets the agent announce a unit of work ("creating the users table") when the file path alone would not say it.
- Three places to look, one event stream:
  1. the Claude Code chat itself, as a band above the prompt (a Claude Code mod);
  2. any terminal, as an animated Unicode/ASCII canvas (`motiondev watch`), including a second tmux pane;
  3. a macOS notch app (phase 2, design only in v0.1).
- Zero runtime dependencies. Node is already on every machine that runs Claude Code.
- Installable the way the community installs skills: `/plugin marketplace add` + `/plugin install`, `npx skills add`, or a clone.

## Non-goals

- Replaying or storing transcripts. Events carry a scene, an object and a name, never file contents.
- Being an observability product. No metrics, cost or tokens: ponytail's band does that already.
- Pixel art. Terminal pictograms are box-drawing characters so they render in every monospace terminal; remote surfaces (desktop app, editor, mobile) get vector drawings of the same scenes (`lib/svg.mjs`).

## Anti-goals

- Noise. A Read must never flip the main pictogram; only "major" events change the scene.
- Blocking the agent. Hooks are fire-and-forget, under 50 ms, and fail open.

## Approaches considered

1. **Hooks only, render in the terminal.** Simple, universal, but nothing shows inside the chat.
2. **A Claude Code mod only (band above the prompt).** Lives in the chat, but needs Claude Code 2.1.290+ in a terminal or the desktop app, and nothing for other terminals or a future Mac app.
3. **One event stream, several renderers (chosen).** Classic hooks write `~/.motiondev/events.jsonl`; the mod classifies the same tool calls with the same pure classifier and draws the band; the terminal watcher and the Mac app tail the file. One classifier, one pictogram library, three outputs. The cost is one more file on disk; the gain is that every surface agrees on what the agent is doing.

## The parts

```
Claude Code tool calls
   ├─ hooks/hooks.json ─► hooks/motiondev-hook.mjs ─► lib/classify.mjs ─► ~/.motiondev/events.jsonl
   │                                                                              ├─► bin/motiondev.mjs watch   (terminal canvas)
   │                                                                              ├─► bin/motiondev.mjs tail    (one line per event)
   │                                                                              └─► Mac notch app (phase 2)
   └─ hooks/band.json ─► hooks/band/register.tsx ─► lib/classify.mjs ─► band above the prompt
skills/motiondev/SKILL.md ─► scripts/emit.mjs ─► events.jsonl   (agent narration, optional)
```

### Event protocol

One JSON object per line, append-only, in `$MOTIONDEV_HOME/events.jsonl` (default `~/.motiondev`). Fields:

| field | values | meaning |
|---|---|---|
| `ts` | ms since epoch | when |
| `kind` | `session`, `turn`, `scene`, `object`, `run`, `note` | what sort of thing happened |
| `scene` | see taxonomy | the zone of the build |
| `object` | see taxonomy | the thing made or touched in that zone |
| `name` | string | its name (`users`, `GET /users`, `Button`) |
| `status` | `start`, `done`, `fail` | for runs and turns |
| `weight` | `major`, `minor` | only major events move the main pictogram |
| `source` | `hook`, `agent`, `demo` | who said so |
| `tool`, `file`, `detail`, `session` | strings | context for the ticker |

`kind: session, status: start` resets the canvas. Everything else accumulates: objects go on the shelf, the latest major event is the scene.

The reader's state (`lib/events.mjs`, `reduce`) keeps, besides the current scene, the ticker and the shelf:

- `shelf[].status`: `done` or `fail`. A failed object joins the shelf as a ghost, keyed like a success (`scene/object/name`), so the retry replaces it in place and the person sees the fix land where the failure was. A later edit never erases an informative detail (the columns of a table survive an `edit`).
- `runs`: the last run per `scene/object` (`{ name, status, detail, ts }`), so the flask keeps its counts, the build its outcome and the deploy its state after the agent has moved on.
- `task`: the prompt of the current turn, set by `turn start`.

### Taxonomy

| scene | objects | pictogram |
|---|---|---|
| database | table, migration, seed, index, query | cylinder |
| api | endpoint, route, model, service, middleware, schema, server, request | server box with arrows |
| frontend | component, page, style, hook, asset | browser window |
| tests | test, run | flask |
| git | commit, branch, push, pr | commit graph |
| deps | package | parcel |
| infra | container, pipeline, deploy | container stack |
| config | env, setting | settings panel |
| docs | page | page |
| auth | guard, token, login | lock |
| build | bundle | crate |
| agents | agent | robots |
| explore | read, search, fetch | magnifier (minor) |
| shell | command | prompt (minor) |
| think | task | lightbulb |
| code | file | braces |
| idle | | sleeping cursor |

### Classifier

A pure function `classify(call) → event | null`, where `call` is `{ event, tool, input, response }` as Claude Code's hook payload names them. Rules are ordered: tests before frontend (a `.test.tsx` is a test), auth before api, path rules before content rules, content rules add the name. Bash commands have their own table. Unknown edits fall back to `code/file`. Reads are `explore`, minor.

### Terminal watcher

`node bin/motiondev.mjs watch` tails the file and redraws at 8 fps. By default it draws the blueprint (below) over a ticker of the last events; `v` switches to the action view: the current scene's pictogram (animated frame sequence while a run is in progress, a reveal when the scene changes), a caption, a shelf of everything built this session with one glyph per object, and the ticker. `--ascii` swaps box-drawing for plain ASCII. When stdout is not a TTY it behaves like `tail`.

`node bin/motiondev.mjs demo` replays `demo/scenario.jsonl` so anyone can see it without an agent.

### The blueprint: the whole build, with the agent as the cursor

Added 2026-11-06. The action pictogram shows one thing at a time and the shelf lists names; neither shows the build. The blueprint does: a persistent drawing of everything the agent has made, growing at the pace of the hooks, with a caret where the agent is. Instead of sentences that sum up what the agent did, the person watches it try, fail and succeed in place.

```
✧ Build a users API with auth and a React list
┌─ ◫ frontend ───────────┐ ┌─ ⇄ backend ────────────┐ ┌─ ▤ database ───────────┐
│ ◫ UserList             │ │ ⇄ GET /users           │ │ ▦ users                │
│ ▭ /users               │ │ ⇄ POST /users          │ │ ▦ orders               │
│ ◐ globals              │ │ ◇ logger               │ │ ▥ add_users            │
│                        │ │ ◘ requireAuth          │ │                        │
│                        │ │ ◉ jw▌                  │ │                        │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
✓ tests  ✗ npm test  11 passed, 1 failed  ▓▓▓▓▓▓▓▓▓░  □ users API
● git  ● feat: users API  ↑ feat/users
⊞ also  ⊞ express, zod  ▣ Dockerfile  ▬ README
```

- **Zones** are boxes that fill with what is built, newest last: `frontend` (components, pages, styles, hooks, assets), `backend` (the api and auth scenes), `database` (tables, migrations, seeds, indexes, queries) and `code` (other files). A zone is drawn once it holds something or the agent is in it. Boxes share the width (one to four columns, at least 20 cells each, wrapping to a second row); items beyond the room are counted in the title (`frontend +4`) and the newest stay visible.
- **Strips** are single lines for what has no room to grow: `tests` (the last run with its counts and a pass bar, then the tests written), `git` (commits, branches, pushes, PRs) and `also` (deps, infra, config, build, docs, agents). A run in progress shows a spinner, a failed one a red cross.
- **The task line** at the top is the prompt of the turn; the caret sits there while the agent thinks, and `waiting for the agent` shows before the first prompt.
- **The cursor** is a caret (`▌`) after the item the agent is working on, blinking in the terminal. It moves with every major event: to the database when a table lands, to the flask while the tests run, to the git strip when it commits. A run in progress that has no object yet (a migration, a server, a query) is a transient line in its zone with the spinner.
- **Type-in**: an item that landed less than 600 ms ago is drawn letter by letter from its timestamp, so in a live terminal names type themselves in at the moment the hook wrote them.
- **Failures** stay in place: a failed object is a ghost line in red with `✗`, replaced when the retry succeeds; a failed run colors its strip red with its counts and goes green on the next pass.

Text in `lib/blueprint.mjs` (pure; lines of toned segments the renderer paints, exact width, bounded height, ASCII twin), vector in `lib/svg.mjs` (`blueprint`). The blueprint is the default view of the watcher, the demo, the snapshot and the window; the action pictogram remains as the `action` view (`v` in the watcher, `--view action`, `/motiondev view action`). The one-line band above the prompt is unchanged.

### Window and band (Claude Code mod)

The window is an engine pane (`$.ui.open`), opened at session start (placed there only on a wide terminal or once a client attaches) and again with each prompt the person enters, which counts as asked and is placed at any width, until the person closes it; `/motiondev` reopens it. It draws the blueprint (above) by default: `lib/svg.mjs` on remote surfaces, `lib/blueprint.mjs` on the terminal. In the `action` view it draws the action on the object inside its zone instead (the table card entering the database with its columns, the request leaving the server), `lib/svg.mjs` `illustrate` on remote surfaces and `lib/compose.mjs` on the terminal, chosen by a judged design panel over three SVG and two text styles.

### Band (Claude Code mod)

`hooks/band/register.tsx` hooks `tool.call`, `prompt.submit` and `turn.complete`, keeps `{ scene, object, name, shelf, last, details, hidden }` in `$.state`, and draws one row above the prompt: glyph, scene, object and name, then the shelf. A `Details` button expands the pictogram; `Hide` hides it for the session.

### Skill

`skills/motiondev/SKILL.md`: when the user wants to see the agent build, the agent narrates: before each unit of work it runs `node scripts/emit.mjs <scene> <object> <name>`, and `... done` after. One emit per unit of work, never per file: the hooks already see the files.

## Constraints

- No dependency, Node 18+.
- Hooks must exit 0 whatever happens.
- The band module runs with no Node and no DOM: it imports only `lib/classify.mjs` and `lib/pictograms.mjs`, which are pure.

## Left to the builder

- Exact pictogram art and frame timings.
- Which Bash commands count as which scene beyond the listed ones.

## Phase 2: macOS notch app

See `docs/mac-app.md`. Same event file, SwiftUI panel anchored under the notch, SF Symbols as pictograms.
