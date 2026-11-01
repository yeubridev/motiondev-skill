# motiondev (mod)

See what your coding agent builds, and learn what it is while it happens. A pane beside the chat tells the build as a story: your app is a restaurant, and Claude, the chef, builds it room by room.

- **The plan of the restaurant.** The front of house is what visitors use: the front door (access), the dining room (interface), the kitchen with its pass (server and API), the pantry (data). Behind the scenes: tasting (tests), the recipe book (versions), the suppliers (dependencies), the safe (settings). Claude walks from room to room; what it builds appears in its room with your own names (`users`, `/users`, `MemberList`). The plan Claude wrote hangs as order tickets on a rail.
- **Live.** One sentence on what Claude does and what it is for, with the details of your project. When the request ends: what your app can do now, and a guided tour of one request through what was built.
- **Understand.** The notion behind what was just built: the restaurant picture, the real term, what it is in your project, and where the picture stops being true. At pauses, a question about your own project, then one about the notion. Only right answers earn XP; a notion is mastered after two.
- **Your path.** Nine notions, a kitchen rank earned by notions mastered, a streak that forgives one missed day, and a review of the least known notion. A new session opens on a recall of last time.

Four levels: **Beginner** (the restaurant, no jargon), **Learner** (real terms, the picture in brackets), **Advanced** (the same plan with technical labels), **Dev** (plus the raw timeline).

Watching and learning cost no token: the words, lessons and quizzes are local. Only "Go further" asks the model, one question over the session's own transcript (served from the prompt cache, outside the agent's context), and the pane shows what it cost. Animations play once, within a few seconds; `motion off` draws everything still.

## Commands

`/motiondev-v2` opens the pane. `/motiondev-v2 level beginner|intermediate|advanced|dev`, `learn on|off`, `lang fr|en`, `motion on|off`, `reset` (asks the two questions again), `close`.

## Tests

`node --test tests/lib.node.mjs` for the words, the plan, the story, the lessons and the drawings; `claude plugin test .` for the pane.
