---
name: motiondev
description: Use when the user wants to see what the agent is building as it happens (pictograms, "show me what you're doing", "motiondev", watch the build live), or asks how to open the motiondev watcher, band or status line. Adds the narration the hooks cannot infer so the live pictograms follow the plan, not only the files.
---

# motiondev

motiondev draws what you build as you build it: a database cylinder when you touch the schema, a table card for the table you add, a server box with an arrow for an endpoint, a flask for the tests. Its hooks already see every file you write and every command you run. This skill adds the one thing hooks cannot see: the unit of work you are starting, in the user's words.

## 1. Point the user at the canvas

Once, at the start, one line each, then carry on without waiting:

- In Claude Code (terminal or desktop app, 2.1.290 or later): the band is above the prompt while the plugin is enabled. `More` opens the pictogram, `Hide` hides it for the session.
- In any terminal, from the plugin folder (`cat ~/.motiondev/plugin-root` prints it): `node <plugin folder>/bin/motiondev.mjs watch`. Without the plugin: `npx github:yeubridev/motiondev-skill watch`.
- In a status line: `node <plugin folder>/bin/motiondev.mjs status` prints one line such as `▤ database · table "users" · 4 built`.

## 2. Narrate each unit of work

Before a unit of work whose file paths would not say what it is, run the emit script by its absolute path (this skill's base directory plus `scripts/emit.mjs`, so no `cd` is needed):

```bash
node <skill base directory>/scripts/emit.mjs <scene> <object> <name> [--detail "<what it holds>"]
```

After a unit that ran something, close it: `--status done` or `--status fail`, with `--detail "12 passed"` when there is a count.

One emit per thing the user would name (`users table`, `GET /users`, `checkout page`): two endpoints in one file are two emits, three files for one component are one. The hooks already report every file and command, so an emit per file is noise. Emit when:

- you start a part of the plan: `think task "add the users table"`
- the thing has a name its file does not carry: `database table users --detail "email, password_hash"`
- you delegate, deploy, or start something long: `agents agent "review the diff" --status start`, then `--status done`

Scenes and their objects are in [references/taxonomy.md](references/taxonomy.md). An unknown scene makes the command fail and print the list: pick the closest one.

Narrate only when this skill is active (the user asked to watch). Otherwise the hooks are enough and the extra commands cost the user time.

## 3. Finish

The last emit of a task is `think task "<what was done>" --status done`. The canvas then shows the shelf of everything built.

Done when the user knows where to look and every unit of work in the plan had one emit with the name they would use for it.
