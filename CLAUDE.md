# motiondev

Live pictograms of what a coding agent is building. Read `docs/superpowers/specs/2026-10-30-motiondev-design.md` before changing the design; it is the source of truth for the event protocol and the taxonomy.

## Layout

- `lib/`: pure ES modules, no I/O, no Node globals (the Claude Code band imports them in a sandbox with no Node). `classify.mjs` turns a tool call into an event; `pictograms.mjs` holds the art; `render.mjs` composes a frame; `events.mjs` holds the protocol and the state reducer.
- `hooks/`: `motiondev-hook.mjs` is the Claude Code command hook (stdin JSON in, one JSONL line out); `band/register.tsx` is the Claude Code mod that draws above the prompt.
- `bin/motiondev.mjs`: the CLI (`watch`, `tail`, `emit`, `demo`, `status`, `clear`).
- `skills/motiondev/`: the skill the agent reads, and `scripts/emit.mjs` it runs.
- `tests/`: `npm test` (bare `node --test`). The band's own tests run with `claude plugin test .`.

## Commands

```bash
npm test                      # node --test
claude plugin validate .      # manifest + hooks + mod
claude plugin test .          # band tests
node bin/motiondev.mjs demo   # see it
```

## Rules for agents working here

Think before coding: state assumptions, surface tradeoffs, ask when two readings differ. Simplicity first: the minimum code that solves the problem, no speculative options. Surgical changes: touch only what the task needs, match the style around it. Goal-driven: every change starts with a failing test in `tests/` and ends with `npm test` green and the output pasted in the report. No dependencies. No em-dashes in prose. Every event the classifier learns gets a row in `tests/classify.test.mjs` and, if it is a new scene, a pictogram with the same width on every frame.
