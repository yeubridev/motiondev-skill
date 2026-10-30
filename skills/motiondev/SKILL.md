---
name: motiondev
description: Use when the user wants to see what the agent is building as it happens (pictograms, a live window, "show me what you're doing", "motiondev", watch the build), or asks why the motiondev window, band or watcher shows nothing. Installs the motiondev plugin when it is missing and narrates the units of work the hooks cannot infer.
---

# motiondev

motiondev draws what you build while you build it, in a window inside the chat: a database cylinder when you touch the schema, a table card with the table's columns, a server box with the `GET /users` arrow, a bubbling flask with the test counts. The window, the band above the prompt and the hooks that feed them live in the motiondev **plugin**. This skill alone draws nothing: step 1 makes sure the plugin is there.

## 1. Make sure the plugin is installed, then hand the person the window

Run, with this skill's base directory:

```bash
node <skill base directory>/scripts/ensure.mjs
```

It checks `claude plugin list`, installs or enables the plugin when needed, and prints the next step. Relay that step to the person in one line, then carry on with their task without waiting:

- **"Ready: type /motiondev"**: the plugin was already there. Tell them to type `/motiondev` to open the window.
- **"Done. Now type /reload-plugins, then /motiondev"**: it was just installed. Tell them to type `/reload-plugins` and then `/motiondev`. Until they reload, the hooks are not running yet: emit every unit of work (step 2), not only the ones a path hides. The window replays those emits when it opens, then follows every tool call by itself.
- **Exit 2 (could not install)**: give them the two `/plugin` prompts it printed, and until they install, show the canvas yourself: at each milestone run `npx -y github:yeubridev/motiondev-skill snapshot` and paste its output in a fenced code block **inside your reply**. A tool result is folded in the chat and nobody sees it; your reply is always visible.

The person types slash commands; you cannot type them for them. Never print the canvas with Bash and call it shown.

## 2. Narrate each unit of work

The hooks see every file you write and every command you run, so the window follows you without help. Add one emit when the thing has a name its file does not carry:

```bash
node <skill base directory>/scripts/emit.mjs <scene> <object> <name> [--detail "<what it holds>"] [--status start|done|fail]
```

One emit per thing the person would name (`users table`, `GET /users`, `checkout page`): two endpoints in one file are two emits, three files for one component are one. The detail is what the thing holds: the columns of a table, the fields an endpoint returns, the props of a component, the counts of a test run. Typical moments:

- starting a part of the plan: `think task "add the users table"`
- a name the path hides: `database table users --detail "id, email, password_hash"`
- something long: `agents agent "review the diff" --status start`, then the same with `--status done` or `--status fail --detail "2 failed"`

Scenes and objects are in [references/taxonomy.md](references/taxonomy.md). An unknown scene fails and prints the list: pick the closest.

## 3. Finish

Last emit of the task: `think task "<what was done>" --status done`. The window then shows the shelf of everything built.

Done when you have told the person how to open the window (or, without the plugin, shown a snapshot in your reply) and every unit of work had one emit named the way they would name it.
