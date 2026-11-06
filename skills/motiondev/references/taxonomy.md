# Scenes and objects

A scene is the zone of the build the agent is in; an object is the thing it makes there. Hooks fill both from paths and commands; `emit` lets the agent say them outright.

| scene | objects | glyph | pictogram | hooks see it when |
|---|---|---|---|---|
| database | table, migration, seed, index, query | ▤ | cylinder | `.sql`, `.prisma`, `migrations/`, `db/`, ORM models, `prisma migrate`, `alembic`, `psql` |
| api | endpoint, route, model, service, middleware, schema, server, request | ⇄ | server box with arrows | `routes/`, `api/`, `controllers/`, route decorators, Next.js `route.ts`, `curl`, `npm run dev` |
| frontend | component, page, style, hook, asset | ◫ | browser window | `components/`, `pages/`, `app/**/page.tsx`, `.tsx`/`.vue`/`.svelte`, `.css`, `hooks/use*` |
| tests | test, run, lint | ✓ | flask | `*.test.*`, `tests/`, `npm test`, `pytest`, `go test`, `eslint`, `ruff`, `tsc --noEmit` |
| git | commit, branch, push, pr | ● | commit graph | `git commit`, `git checkout -b`, `git push`, `gh pr create` |
| deps | package | ⊞ | parcel | `package.json`, `requirements.txt`, `npm install`, `pip install`, `cargo add` |
| infra | container, pipeline, deploy | ▣ | container stack | `Dockerfile`, `docker compose`, `.github/workflows/`, `*.tf`, `kubectl`, `fly deploy` |
| config | env, setting | ◎ | settings panel | `.env*`, `*.config.*`, `tsconfig.json`, `pyproject.toml`, `settings.py` |
| docs | page | ▬ | page | `*.md`, `docs/` |
| auth | guard, token, login | ◉ | padlock | paths with `auth`, `login`, `jwt`, `session`, `permission`, `guard` |
| build | bundle | ⊠ | conveyor | `vite.config.*`, `Makefile`, `npm run build`, `cargo build`, `tsc` |
| agents | agent | ◒ | robots | the Agent / Task tool |
| explore | read, search, fetch | ∗ | magnifier (minor) | Read, Grep, Glob, WebFetch, `ls`, `cat`, `rg`, `git status` |
| shell | command | $ | prompt (minor) | any other command |
| think | task | ✧ | lightbulb | a new prompt, plan mode, `emit think task` |
| code | file | ▫ | braces | any other source file |
| idle | | ◌ | sleeping cursor | session start, nothing yet |

Minor scenes (explore, shell) feed the ticker and never move the main pictogram.

## Status

`--status start` opens a run (the pictogram animates), `done` closes it, `fail` closes it in red. An object with a status of `fail` joins the shelf as a ghost (a red `✗` in its place on the blueprint) until an emit with the same scene, object and name succeeds; that retry takes the ghost's place.
