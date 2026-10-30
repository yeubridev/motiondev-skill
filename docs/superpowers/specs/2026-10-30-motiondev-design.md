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

`node bin/motiondev.mjs watch` tails the file and redraws at 8 fps: the current scene's pictogram (animated frame sequence while a run is in progress, a reveal when the scene changes), a caption, a shelf of everything built this session with one glyph per object, and a ticker of the last events. `--ascii` swaps box-drawing for plain ASCII. When stdout is not a TTY it behaves like `tail`.

`node bin/motiondev.mjs demo` replays `demo/scenario.jsonl` so anyone can see it without an agent.

### Window and band (Claude Code mod)

The window is an engine pane (`$.ui.open`), opened at session start (placed there only on a wide terminal or once a client attaches) and again with each prompt the person enters, which counts as asked and is placed at any width, until the person closes it; `/motiondev` reopens it. It draws `lib/svg.mjs` on remote surfaces and `lib/compose.mjs` on the terminal: the action on the object inside its zone (the table card entering the database with its columns, the request leaving the server), chosen by a judged design panel over three SVG and two text styles.

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
