# motiondev: research on visual teaching for a live side pane

Research date: 1 November 2026. Scope: how to teach non-developers ("vibecoders", French speakers) what the AI agent is building, inside a ~360 px pane limited to boxes, text, buttons, Markdown and inline SVG animated with SMIL (no JS, SVG not clickable), with zero extra tokens for the core loop.

Legend used throughout:

- **[S]** = sourced claim (URL given next to it).
- **[I]** = my inference or design proposal, not stated by a source.
- **[weak]** = source is a blog, vendor page, forum or secondary summary; treat as a lead, not evidence.

Method note: primary pages were fetched where possible. Several primary PDFs (Shute 2008, some ACM papers) could not be read as text; where only an abstract or secondary summary was available it is flagged. Duolingo's public design guidelines site (design.duolingo.com) now redirects to the blog, so its voice/tone pages are cited from search snippets only.

---

## 0. One-paragraph answer

The strongest, best-evidenced levers for a glanceable pane are: (1) anchor every explanation to the learner's own artifacts (their `users` table, their route names), (2) show one consistent picture of how a web app works (a "notional machine") and reuse it every time, (3) ask a quick prediction before explaining, (4) quiz with two well-built multiple-choice questions whose wrong answers are real misconceptions, with feedback that says why, (5) bring old notions back when they recur in the build (spacing), and (6) animate only cause and effect, once, briefly, ending on a complete still picture. Mascots, worlds, XP and streaks help motivation only if they carry meaning and never punish mistakes; decorative detail measurably hurts learning.

---

## 1. How the best learning apps structure a micro-lesson and its feedback

### 1.1 Duolingo

**Path design**

- [S] The 2022 home-screen redesign turned skills into a single linear path "grounded in spaced repetition", with lessons that "learn a mix of concepts" (new material interleaved with concepts due for review), grouped into units with a header and a per-unit guidebook of tips; "Practice is also forward progress"; Legendary now applies to a whole unit. https://blog.duolingo.com/new-duolingo-home-screen-design
- [S] At the end of a lesson you review the mistakes you made; personalised practice uses spaced repetition plus accuracy to choose what to review. https://blog.duolingo.com/spaced-repetition-for-learning
- [weak] A former employee notes online sentiment about the forced path was "vociferously negative" at launch. https://personal-website-c5k.pages.dev/duolingo

**The Duolingo Method (five principles)** [S] https://blog.duolingo.com/duolingo-teaching-method

1. Learn by doing: exercises start simple so you notice patterns, then harder applications.
2. Personalisation: a model adjusts order and difficulty to keep you "right at the edge of what you know".
3. Motivation: short lessons, points, streaks, friendly competition, aimed at a lasting habit.
4. Focus on what matters (standards-aligned content).
5. Delight: characters and humour to make content memorable; "optional hints and bite-sized explanations".

**Streak: what the data says** [S] https://blog.duolingo.com/improving-the-streak

- Learners on a 7+ day streak were 2.4x more likely to come back the next day.
- Decoupling the streak from the daily goal (one lesson keeps the streak alive) gave +3.3% Day-14 retention, +1% DAU, +10.5% learners on a streak (+19% for new learners), and increased learners on a 7+ day streak by over 40%.
- Learners with higher daily goals were *less* likely to be on a streak: "a goal can become a barrier to forming a habit". Lowering the barrier mattered more than volume.
- [weak] Streak Wager raised D7 retention by ~14% (Duolingo "making" blog, via search): https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- [weak] Retention team focuses on the 0-to-7-day experience (podcast summary): https://www.recall.it/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team

**Hearts to Energy (mistake handling)** [S] https://blog.duolingo.com/duolingo-energy/

- Duolingo itself says losing a heart per mistake "was not the most effective way to support learning"; beginners were "2X more likely to run out of hearts mid-lesson". Energy (2025) drains per exercise instead.
- [weak] Strong user backlash ("a perfect lesson still drains your energy"); petitions to restore hearts. https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/ , https://www.change.org/p/duolingo-hearts-not-energy

**Characters** [S] https://blog.duolingo.com/building-character/

- Cast built from Duo's basic geometric forms so they "reflect Duo's design language"; modern humans, not fantasy (vikings/aliens felt "far removed"); quirky; "relatable in their struggles and affections"; characters speak the sentences and each has its own animation for correct answers.
- [S] Fast Company: the creative lead compares it to a sitcom / Sesame Street; stories can be only ~100 words, "but if you know the characters and their relationships, there's really no need to explain quite as much." https://www.fastcompany.com/90664438/duolingo-wants-to-be-the-sesame-street-for-adults

**Voice and tone** [weak, snippets; pages now redirect]

- Voice stays constant (expressive, playful, embracing, worldly); tone adapts "to the audience's state of mind"; tone down exclamation points for heavy material. https://design.duolingo.com/writing/voice , https://design.duolingo.com/writing/tone
- Duo is "persistent and positive", "mostly stands still". https://design.duolingo.com/writing/duo

**Opt-in AI explanation ("Explain My Answer")** [S]

- After a wrong answer the learner taps a button; GPT-4 explains, the learner can ask more or return; Duolingo measured quality by "how deep the learner needs to go before returning to the lesson". https://openai.com/index/duolingo
- [I] This is the exact pattern for motiondev's opt-in "Aller plus loin": offered after a mistake or a "je ne comprends pas", success = learner returns to the build quickly.

**Notifications** [S] Duolingo optimises reminders with a "sleeping, recovering" bandit that models novelty effects (a new message lifts short-term clicks without being better long-term). https://research.duolingo.com/papers/yancey.kdd20.pdf
- [I] Mostly irrelevant here: the "notification" in motiondev is the agent finishing something. That is a better trigger than any push message.

**Effectiveness (company-affiliated)** [S, conflict of interest] Learners finishing beginning Spanish/French reached Intermediate Low reading / Novice High listening (Jiang et al. 2021). https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_language_read_listen_2021.pdf

**Criticisms**

- [S] IHC (Brazil) qualitative analysis: clear interfaces (bright pattern) but also excessive notifications and emotionally charged visuals (deceptive patterns), with concern for children. https://sol.sbc.org.br/index.php/ihc/article/view/37677
- [S, abstract] Portuguese qualitative study: some learners shift from learning to "merely maintaining their daily streak". https://run.unl.pt/handle/10362/171644
- [S] Broken streaks cause drop-off: across seven studies, showing an intact streak increases later engagement vs showing a broken one; effect is stronger when people blame themselves and *weaker when the streak can be repaired*. Silverman & Barasch, JCR 2023. https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions
- [weak] "Streak anxiety" parent guides: https://screenwiseapp.com/guides/managing-duolingo-streaks-when-gamification-becomes-stressful

### 1.2 Brilliant

[S] https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/ and https://brilliant.org/about/

- "Build one idea at a time"; each section "begins with the simplest useful case".
- "Often asks a question before presenting a procedure" (pretesting).
- "Starts with concrete diagrams, animations, computation", then connects to formal notation.
- Feedback arrives while reasoning is "still fresh", giving "a chance to revise rather than simply marking the attempt wrong".
- Spaced return to ideas across sessions; interleaved practice; scaffolds removed in practice sets.
- The AI tutor "asks instead of tells".
- Uses sound, haptics, streaks and leagues to sustain "many, many reps"; "We measure everything".
- [weak] "6x more effective" is Brilliant marketing, unverified. https://brilliant.org

### 1.3 Mimo

[S] https://mimo.org/press-kit — every exercise = a **140-character introduction** + a code snippet to interact with + immediate feedback after every interaction; lessons take **under a minute**.
- [I] 140 characters is a good hard budget for the caption under each SVG frame in a glanceable pane.

### 1.4 Sololearn

[weak] https://medium.com/sololearn/the-five-pillars-of-learning-interactive-lessons-and-teachers-9d57a927201c — bite-size chunks grouped into units, "many one-question quizzes", knowledge checks; learn → quiz → practice; a comment thread under every lesson. Reviewer criticism: undefined glossary terms trip beginners. https://careerkarma.com/blog/sololearn-app-review/

### 1.5 Grasshopper (Google, Area 120)

[S] Bite-size JavaScript puzzles with progressive difficulty; 1.6M downloads in under a year; shut down 15 June 2023 amid Area 120 cuts. https://en.wikipedia.org/wiki/Grasshopper_(mobile_app) , https://9to5google.com/2023/03/13/grasshopper-shut-down/

### 1.6 Swift Playgrounds

- [weak] A character (Byte) executes the learner's real Swift commands in a puzzle world; commands can be tapped instead of typed; a slow mode **highlights each line as Byte performs it**. Reviewers lost track of where Byte was inside loops and asked for an indicator. https://www.macworld.com/article/228397/meet-swift-playgrounds-the-learn-to-code-ipad-app-that-feels-like-a-puzzle-game.html
- [S] Apple curriculum guide (moveForward/collectGem progression): https://apple.com/uk/education/docs/everyone-can-code-curriculum-guide.pdf
- [I] Lesson for motiondev: the mascot should *be* the thing executing (the request, the data), and the caption should highlight which step it is on.

### 1.7 Khan Academy

[S] Mastery levels Attempted → Familiar → Proficient → Mastered; Proficient needs all questions right, Mastered needs a unit test or course challenge; a Mastered skill can drop two levels. KA's research lead: stopping at Familiar vs reaching Proficient "may capture the difference between shallow learning and deeper learning". https://support.khanacademy.org/hc/en-us/articles/5548760867853 , https://blog.khanacademy.org/?p=13201

### 1.8 Scrimba, Codecademy, Exercism

- [weak] Scrimba: interactive screencasts that record editor events, so learners can pause and edit the code in the "video". https://survivejs.com/blog/scrimba-interview/
- Codecademy: no primary design source found. Generic "tutorial hell / illusion of competence" critiques exist but are from vendor blogs [weak]. https://algocademy.com/blog/why-watching-tutorials-is-not-learning-the-cognitive-gap-between-seeing-and-doing
- [S] Exercism aims for "a high level of fluency at a low level of proficiency", with human mentoring. https://exercism.org/docs/using/product/fluency

### 1.9 An educator's playbook: Josh W. Comeau

[S] https://threadreaderapp.com/thread/1381611771841146883.html
- Alternate active and passive learning; vary formats to avoid "autopilot"; hook immediately; deliver a quick win early.
- Build on existing knowledge via analogy, **but clarify the differences or learners develop "subtle misconceptions"**.
- Separate concept from syntax; Parsons problems let learners "focus exclusively on the concept".
- Resurface older concepts (spaced repetition).

### 1.10 Gamification evidence

[S] Sailer & Homner 2020 meta-analysis: small positive effects on cognitive (g = .49), motivational (g = .36) and behavioural (g = .25) outcomes; cognitive effect robust in rigorous studies, motivational/behavioural less so; game fiction and social interaction moderate behavioural effects. https://link.springer.com/article/10.1007/s10648-019-09498-w

### 1.11 Learning while an AI builds (directly relevant)

- [S] Anthropic RCT (Jan 2026, 52 developers learning the Trio library): AI group 50% vs hand-coding 67% on the quiz (d = 0.738), biggest gap on debugging. Full delegation, progressive reliance, and AI-driven debugging averaged < 40%; **"generation-then-comprehension" (generate, then ask follow-up questions to understand) averaged 86%**; hybrid code+explanation 68%; conceptual inquiry 65%. "Cognitive effort—and even getting painfully stuck—is likely important for fostering mastery." https://www.anthropic.com/research/AI-assistance-coding-skills
- [S] Prather et al. ICER 2024 ("The Widening Gap"): struggling novices using GenAI "thought they performed better than they did" and finished with an illusion of competence; authors recommend scaffolded exposure and explicitly teaching metacognition. https://arxiv.org/abs/2405.17739
- [S] Sarkar & Drosos (PPIG 2025): vibe coding does not remove expertise, it redistributes it toward context management, rapid evaluation of generated code, and deciding when to intervene. https://arxiv.org/abs/2506.23253
- [I] motiondev is, in effect, a "generation-then-comprehension" machine: the agent generates, the pane prompts comprehension. That is the single best-evidenced framing for the product.

---

## 2. Masters of visual explanation

### 2.1 Bret Victor

[S] Learnable Programming http://worrydream.com/LearnableProgramming/
- "People understand what they can see."
- Read the vocabulary: make meaning transparent by **labelling in place**, not help menus.
- Follow the flow: make control flow visible over time.
- See the state: **"Show the data"**, show comparisons, eliminate hidden state.
- Create by abstracting: "start constant, then vary", "start with one, then make many".
- Identity and metaphor: connect the computer's world to the learner's body/experience (Logo's turtle).
- "Visualize data, not code. Dynamic behavior, not static structure."

[S] Up and Down the Ladder of Abstraction https://worrydream.com/LadderOfAbstraction/
- Start with the simplest concrete case; step up by abstracting over one variable; **stepping down is as important as stepping up**; insight lives in the transitions.

[S] Explorable Explanations (active reading) https://worrydream.com/ExplorableExplanations/

### 2.2 Nicky Case

[S] How I make an explorable explanation https://blog.ncase.me/how-i-make-an-explorable-explanation/
- Start with a question ("make them love your question"); start on the ground with a concrete experience; climb in small steps linked by **"BUT" and "THEREFORE", not "and then"**; end with an open question.

[S] Explorable Explanations (workshop notes) https://blog.ncase.me/explorable-explanations
- Use interactivity selectively: **text for very abstract concepts, graphs for broad relationships, animations for temporal change, interactives for processes/systems**.
- Teach mechanics in isolation, then combine.
- "Paradoxically, by withholding an explanation, the explorable explanation can be more effective" (gating), found by playtesting: readers skimmed and got lost.
- "Gamification is about changing behaviour. We're about changing knowledge."

[S] How to Remember Anything Forever-ish https://ncase.me/remember/
- Spaced repetition = testing + time; Leitner box; cards should be small (one idea), connected (pictures, personal details), meaningful; prediction before reveal; quizzes spaced inside the essay itself.

### 2.3 Bartosz Ciechanowski (observed pattern, no stated principles found)

[S, my description of the article] https://ciechanow.ski/mechanical-watch/
- Each section opens with a **flaw in the previous design** (e.g. a hand spinning far too fast) and introduces the part that fixes it.
- Figures are tightly scoped: unrelated parts are hidden so one mechanism is visible; whole assembly only at the end.
- Part names are **"color-coded for easy reference"** and colours stay consistent across figures.
- [I] The "problem → part that fixes it" structure maps perfectly to an agent build: "your screen can't remember anything → so Claude adds a database".

### 2.4 Julia Evans

[S] How to teach technical concepts with cartoons https://jvns.ca/teach-tech-with-cartoons/
- Personify components and let them talk to each other; show a scene; lists that don't claim to be exhaustive; diagrams with arrows and colour, **greying out less important parts**; paste real output; pick one key insight; "make it clear, not just fun"; ugly is fine.

[S] Git mental models https://jvns.ca/blog/2024/01/05/do-we-think-of-git-commits-as-diffs--snapshots--or-histories/
- Poll: 51% think of commits as diffs, 42% as snapshots. Explaining git's internal snapshot format "has not worked well" for learners; "wrong mental models are often extremely useful".

### 2.5 Maggie Appleton

[S] https://maggieappleton.com/programming-pictures/ and https://maggieappleton.com/drawinginvisibles1/
- Build on embodied metaphors: containers (inside/outside), trees/families (parent passes data down), up/down, centre/periphery, cloud above/desktop below.
- "Boxes and arrows work great"; visuals needn't be complex or beautiful.
- "Elaborate, poorly chosen metaphors can be more confusing than helpful."
- Choose a metaphor by what you want to highlight or hide; left-to-right time is a Western convention.

### 2.6 3Blue1Brown (Grant Sanderson)

- [S, secondary] Concrete before abstract; examples before general frameworks; put the key exercise at the start. https://www.theteenmagazine.com/rethinking-high-school-math-education-insights-from-3blue1brown , https://rosetta.to/u/3blue1brown/make-math-videos-summer-of-math-exposition-announcement
- [S] What great explanations share: "clarity, strong motivation, compelling choices of topic matter, and non-obvious insights". https://www.3blue1brown.com/blog/some1-results

### 2.7 Grokking books, Amelia Wattenberger

- Grokking Algorithms: illustrated, conversational; no stated rationale from the author found. https://www.manning.com/books/grokking-algorithms
- Amelia Wattenberger: no usable primary statement of principles found in this research pass (gap).

### 2.8 Principles extracted (cross-source)

| Principle | Sources |
|---|---|
| One idea per frame / per card | Brilliant; Nicky Case (cards); Mimo 140 chars |
| Concrete first, then name it, then generalise (concreteness fading) | Victor ladder; Brilliant; 3b1b; Fyfe et al. (below) |
| Label in place, not in a legend | Victor "read the vocabulary"; Mayer spatial contiguity (below) |
| Show the mechanism and the data, not the code | Victor; Evans (personified components) |
| Animate causality (time-based change) only | Case's medium map; Tversky et al. (below) |
| Problem → the part that fixes it | Ciechanowski; Case BUT/THEREFORE |
| Hide or grey what isn't the point | Ciechanowski; Evans; Mayer coherence |
| Consistent colour per concept across all frames | Ciechanowski colour-coding; Mayer signaling |
| Ask before telling | Brilliant pretesting; Case prediction; PRIMM |
| Progressive disclosure / gating | Case gating; Mayer segmenting |

---

## 3. Learning science that applies

### 3.1 Cognitive load theory and Mayer's multimedia principles

- [S] CLT review: Sweller, van Merriënboer & Paas 2019. https://core.ac.uk/download/237588613.pdf
- [S, secondary with Mayer 2017 effect sizes] https://cloud.wikis.utexas.edu/wiki/x/SQNqAw , Mayer 2020 summary https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf
  - Coherence (exclude extraneous material) d ≈ 0.70
  - Signaling (cues highlighting organisation) d ≈ 0.46
  - Segmenting (learner-paced chunks) d ≈ 0.70
  - Pre-training (know names/characteristics of key concepts first) d ≈ 0.46
  - Spatial contiguity (words next to the picture part) d ≈ 0.79
- [S] Personalization principle: conversational style ("you", "your") beats formal style, medians d ≈ 0.79–1.11 depending on review; strongest for beginners and short lessons, weaker if overdone. https://www.cambridge.org/core/books/multimedia-learning/personalization-voice-and-image-principles/97F9B31362E6491806A4718FECCADE3D
- Dual coding: words + pictures together, aligned in space and time, is the core of Mayer's multimedia principle (the 2020 summary above).

### 3.2 Worked examples, expertise reversal, fading

[S] Worked examples beat unguided problem solving for novices; guidance that helps novices can hurt experts (expertise reversal, Kalyuga et al. 2003); fade guidance as competence grows. https://www.teachermagazine.com/au_en/articles/cognitive-load-theory-teaching-strategies , https://link.springer.com/doi/10.1007/s11251-009-9107-8
- [I] The agent's own build is a live worked example. The pane narrates it; as a notion reaches "Maîtrisé", its narration should shrink to a one-line label (fading).

### 3.3 Retrieval practice, testing effect, spacing

- [S] Dunlosky et al. 2013 rated practice testing and distributed practice the only two "high utility" techniques of ten. https://digitalpromise.org/2015/02/07/five-learning-strategies-that-work/
- [S] Multiple-choice tests can trigger productive retrieval **when the wrong options are plausible**; they even improve later recall of the competitive alternatives (Little, Bjork, Bjork & Angello 2012). https://www.psychologicalscience.org/journals/psychological-science/0956797612443370/
- [S] Nicky Case summary of spacing (Leitner box, expanding intervals). https://ncase.me/remember/

### 3.4 Pretesting / prediction

- [S] Pan & Carpenter 2023 review: prequestions/pretests often improve learning even when the first answers are wrong, if the correct answer is studied afterwards. https://link.springer.com/10.1007/s10648-023-09814-5
- [S] St. Hilaire, Chan & Ahn 2024 meta-analysis: prequestion effect g = 0.54 for the questioned content, weaker for untested content (via search summary). https://sc-pan.github.io/pdf/PR_2023.pdf (Pan & Carpenter PDF)

### 3.5 Desirable difficulties

[S] Bjork & Bjork 2011: spacing, interleaving, testing and varied conditions slow apparent progress but improve retention; difficulty must be achievable. https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf

### 3.6 Concreteness fading

[S] Fyfe, McNeil, Son & Goldstone 2014: move from concrete → iconic → abstract representations; supports transfer. Later work calls it underspecified and questions its broad applicability. https://pc.cogs.indiana.edu/?p=885 , https://link.springer.com/article/10.1007/s10648-020-09581-7
- [I] Ideal three-step for each lesson: their real object (`users`, 3 rows) → generic icon (a table) → the word and the jargon ("base de données", "SQL").

### 3.7 Notional machines

- [S] Sorva 2013 (ACM TOCE): a notional machine is an idealised model of the computer for explaining program behaviour; learners can hold several contradictory models; recommends making the notional machine an **explicit learning goal**. https://dblp.org/rec/journals/jeric/Sorva13 , https://par.nsf.gov/servlets/purl/10404382
- [S] ITiCSE 2020 working group on notional machines (Fincher, Jeuring et al.). https://luce.si.usi.ch/publications/2020-06-01-notional-machines.html
- [I] motiondev's isometric world *is* a notional machine for web apps. It should be fixed and reused: device(s) ↔ network path ↔ server ↔ database, plus outside services and the git/deploy track. Islands must keep the same position and colour in every lesson so the learner builds one map.

### 3.8 PRIMM and Parsons problems

- [S] PRIMM (Predict, Run, Investigate, Modify, Make): 493 students aged 11–14 in 13 schools scored higher on post-test than control. https://qmro.qmul.ac.uk/xmlui/handle/123456789/57800 , quick reference https://static.teachcomputing.org/pedagogy/QR11-PRIMM.pdf
- [S] Parsons problems: similar learning gains to writing code in significantly less time (Ericson 2018); caveat, learners can order blocks without understanding why. https://hg.gatech.edu/node/603172
- [I] Without clickable SVG or drag, Parsons problems become "put these 3 steps in order" with buttons; feasible but lower priority than MCQ.

### 3.9 Novice misconceptions relevant to web apps

- [S] Non-technical people hold simpler internet models that omit layers, organisations and entities (Kang, Dabbish et al., SOUPS 2015). https://typeset.io/pdf/my-data-just-goes-everywhere-user-mental-models-of-the-gkf0kgqf8q.pdf
- [S] 340 high-school students: "simplistic, utilitarian rather than structural" mental models of the internet, with specific misconceptions (Papastergiou 2005). https://link.springer.com/content/pdf/10.1007/s10639-005-3431-7.pdf
- [weak] Practitioner list: "the frontend talks directly to the database", "client means browser only", "server means one physical machine". https://blog.boosteredu.in/web-architecture-fundamentals
- [S] Git's difficulty comes from its concepts (many file states; staging coupled to working copy), not its UI (Perez De Rosso & Jackson 2013). https://dspace.mit.edu/handle/1721.1/105233 , summary https://blog.acolyer.org/2016/10/24/whats-wrong-with-git-a-conceptual-design-analysis/
- [S] Students believe they test systematically but mostly don't; they test the happy path and avoid edge cases. https://research.ou.nl/en/publications/how-do-students-test-software-units-part-one-their-natural-attitu/ , https://arxiv.org/pdf/2510.00957
- [S] Secrets: >100,000 GitHub repos leaked secrets, thousands of new secrets per day; deleting the secret in a later commit does not help because it stays in history (Meli et al., NDSS 2019). https://www.ndss-symposium.org/ndss-paper/how-bad-can-it-git/
- [S] Client-side checks can be bypassed; repeat validation on the server (OWASP). https://wiki.owasp.org/index.php?oldid=206089&title=Input_Validation_Cheat_Sheet
- [I] Misconceptions to seed as MCQ distractors: "the data is stored in my screen/browser", "the API is a website", "hiding the button protects the page", "a green test means no bugs", "git saves automatically / is the same as GitHub", "deleting the key from the code makes it safe", "my local changes are live", "a .env file is encrypted".

### 3.10 Story, persona, mascots, decoration

- [S] Willingham, "The Privileged Status of Story": stories are "psychologically privileged" (interesting, easy to understand and remember); the four Cs: causality, conflict, complications, character. https://www.aft.org/node/7506
- [S] Interest-based context personalisation (same maths, story set in the student's interests) improved speed/accuracy and transfer, especially for low achievers (Walkington 2013). https://edsurge.com/news/2013-11-08-can-interest-based-personalization-deliver-better-learning-outcomes
- [S] Self-reference effect: encoding related to oneself is remembered better than semantic or other-referent encoding (Symons & Johnson 1997 meta-analysis). https://core.ac.uk/download/194456453.pdf
- [S] Pedagogical agents: small but significant learning effect (43 studies); on-screen-text agents beat narrating agents (Schroeder, Adesope & Gilbert 2013). https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/How-Effective-are-Pedagogical-Agents-for/99900601056901842
- [S] Seductive details (interesting but irrelevant content) hurt learning: g = −0.33, worse when learners can't control pacing and when details are frequent or share the core content's format (Sundararajan & Adesope 2020); Rey 2012 similar. https://news.wsu.edu/2020/03/19/seductive-details-inhibit-learning/
- [S] Papert's "body syntonic" learning: children "play Turtle" by walking the turtle's moves; the identification of learner and object. https://en.wikipedia.org/wiki/Mindstorms_(book) ; Victor's "identity and metaphor" (above).

### 3.11 Animation vs static pictures

- [S] Tversky, Morrison & Bétrancourt 2002: graphics must obey **congruence** (form matches the concept) and **apprehension** (can be accurately perceived); animations often fail because they are too fast or complex, and people conceive continuous events as **sequences of discrete steps**. https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf
- [S] Höffler & Leutner 2007 meta-analysis: animation beats static pictures, d = 0.37 overall, d = 0.40 for **representational** (vs decorational) animation; later meta-analyses find smaller effects (g ≈ 0.23); animations help most when the specifics of change must be learned. https://www.leibniz-ipn.de/en/research/publications/instructional-animation-versus-static-pictures-a-meta-analysis , https://link.springer.com/article/10.1007/s11251-021-09541-w
- [S] Algorithm-visualisation meta-study (24 experiments): mixed results; the dominant factor is **active learner engagement**, not the visuals. https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness

### 3.12 Interruptions (the learner is mid-task)

[S] Iqbal & Bailey: deferring notifications to task breakpoints reduces frustration and reaction time (OASIS); interruptions at fine breakpoints raise resumption lag; at coarse breakpoints they're close to no interruption. https://ideals.illinois.edu/items/83111 , https://interruptions.net/literature/Iqbal-CHI06-p741-iqbal.pdf , https://core.ac.uk/works/78990140

### 3.13 Feedback

- [S, secondary of tables] Shute 2008: focus feedback on the task, not the learner; avoid feedback that is too controlling or critical. https://journals.sagepub.com/doi/10.3102/0034654307313795 (free copy https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf)
- [S] Brilliant: explain why, let the learner revise. Duolingo: mistakes are normal; review mistakes at the end.

### 3.14 Ranking for a glanceable side pane [I, grounded in the sources above]

| Rank | Technique | Why it fits the pane |
|---|---|---|
| 1 | Self-reference / context personalisation (their names, their tables) | Free (data already in the event stream), strong evidence, makes every frame relevant |
| 2 | Consistent notional machine (one map, fixed islands, fixed colours) | Turns 9 notions into one model; reduces load over time |
| 3 | Retrieval practice with misconception-based MCQ + "why" feedback | Highest-utility technique; MCQ fits buttons |
| 4 | Pretesting / prediction ("À ton avis…?") before the reveal | One tap, works while the agent is still building |
| 5 | Spacing via recurrence in the build | Natural trigger: a notion reappears in their project |
| 6 | Coherence + spatial contiguity + signaling | Dictates the SVG style: few elements, labels in place, one highlight colour |
| 7 | Concreteness fading | Shapes each lesson's 3 steps |
| 8 | Representational animation of causality | Use for request/response, data writes, deploy; not decoration |
| 9 | Worked example + fading | The agent's build is the worked example; shrink narration as mastery grows |
| 10 | Breakpoint timing | Live caption always; lesson/quiz only at breakpoints |
| Low | Parsons, open-ended Make (PRIMM) | Need interaction the medium lacks; reserve for "Aller plus loin" |

---

## 4. Narrative and storytelling

- [S] Story structure that teaches: causality, conflict, complications, character (Willingham). https://www.aft.org/node/7506
- [S] Connect beats with BUT/THEREFORE (Nicky Case, borrowing a screenwriting rule). https://blog.ncase.me/how-i-make-an-explorable-explanation/
- [S] A recurring cast reduces how much each short story must explain (Duolingo, Fast Company). https://www.fastcompany.com/90664438/duolingo-wants-to-be-the-sesame-street-for-adults
- [S] Characters that execute the learner's work (Byte; Logo turtle) support identification. Victor, Papert (above).
- [S] "You" framing: personalization principle (Mayer). Self-reference effect.
- [S] Caution: story and character that aren't the mechanism are seductive details (g = −0.33).

### 4.1 Turning agent actions into a story [I]

Map agent events to story beats:

| Agent event (hook) | Story beat | Caption pattern (FR, ≤140 chars) |
|---|---|---|
| User prompt received | Setup / goal | "Ton objectif : que les gens puissent s'inscrire. Pour ça, il faudra 4 pièces." |
| Creates a UI file | Rising action | "Ton écran `SignupForm` existe. MAIS il oublie tout dès qu'on ferme la page…" |
| Creates a schema / migration | THEREFORE | "DONC Claude crée la table `users` : c'est là que l'inscription sera gardée." |
| Creates an API route | Connection | "Il faut un passage entre l'écran et la table : la route `POST /api/signup`." |
| Adds auth / middleware | Complication | "MAIS n'importe qui pourrait lire la liste. DONC on vérifie qui demande." |
| Test fails | Conflict | "Un test a sonné : `signup` refuse un email valide. Claude cherche pourquoi." |
| Test passes | Resolution of conflict | "Réparé. Le test veille maintenant sur l'inscription." |
| Commit | Checkpoint | "Point de sauvegarde : « add signup ». On pourra revenir ici." |
| Deploy | Climax / ship | "C'est en ligne. N'importe qui avec le lien peut s'inscrire." |
| Session end | Denouement + recap | "Aujourd'hui : écran, table, route, accès. 1 question sur hier ?" |

The mascot does one thing only: it is the moving request/data. It carries the envelope from the screen island to the server island and back. When it is not carrying meaning, it stands still (Duo "mostly stands still").

### 4.2 Recommended session story arc [I]

1. **Le plan (setup, 1 card):** translate the prompt into the islands that will appear, greyed. Ask one prediction question ("À ton avis, où sera gardé le mot de passe ?"). No right/wrong pressure, answer revealed later.
2. **La construction (rising action):** live captions, one per completed unit of work, BUT/THEREFORE chained; islands light up; the mascot runs the new path once.
3. **Le pépin (complication):** errors and failing tests are shown as the plot's conflict, never as the user's failure.
4. **L'épreuve (tests):** the test lights go red → green; reveal the setup question's answer here if relevant.
5. **La mise en ligne (ship):** the package travels to the public island; a second device lights up.
6. **Le récap (denouement, at the break):** "Ce que tu as construit" + the lesson for the most important new notion + 2 MCQ + 1 spaced question on an older notion.
7. **Next session cold open:** "La dernière fois…" one-line recap and one retrieval question before anything new.

---

## 5. Analogies for the 9 notions

### 5.1 How to use analogies (sourced)

- [S] Teaching-With-Analogies (Glynn): introduce target → recall analog → identify features → map similarities → **indicate where the analogy breaks down** → draw conclusions. https://www.csun.edu/~vceed002/books/sourcebook/chapters/10-analogies/teaching-analogies.html
- [S] Guzdial: Dijkstra warned against metaphors ("radical novelty"), but learning without connection to prior experience inhibits learning; teachers use many metaphors and all have limits; "Metaphors We Teach By" (Sanford et al., SIGCSE 2014) studied how teachers handle breakdowns. https://cacm.acm.org/blogcacm/dijkstra-was-wrong-about-radical-novelty-metaphors-in-cs-education , https://advocate.csteachers.org/2017/10/19/learning-computing-with-metaphors/
- [S] Comeau: clarify differences or learners form "subtle misconceptions". Appleton: poorly chosen metaphors confuse more than they help.
- [I] Patch pattern for every card: "C'est comme… / Sauf que…" (Like… / Except…). The "Sauf que" line is mandatory.

### 5.2 The table

| Notion | Recommended analogy (source) | Where it breaks | Patch | "Aha" SVG (≤360 px, SMIL) |
|---|---|---|---|---|
| **Interface** (front-end) | The shop front / dining room; the customer's side of the road. MDN: client = "your house", server = "a shop", internet = "the street" https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works ; dining room vs kitchen [weak] https://codeburst.io/front-end-v-back-end-explained-by-waiting-tables-at-a-restaurant-174000a4498d | The interface is not just decor: its code is copied to and runs on each visitor's device, so the visitor can change it. Hiding a button protects nothing (OWASP). | "Sauf que la vitrine est livrée chez chaque client, qui peut la gribouiller : la cuisine revérifie toujours." | One server island; three copies of the user's real screen name (`SignupForm`) fly out to three phones (animateMotion, staggered begin). Caption: "Ton écran tourne chez eux, pas chez toi." |
| **Database** | A table like a spreadsheet: rows = items, columns = attributes (CS50 SQL) https://cs50.harvard.edu/sql/2024/notes/0/ | Unlike a sheet: millions of rows, many writes per second, fast lookup (CS50's three reasons); it lives on the server, the browser never touches it directly; tables link to each other. | "Sauf qu'on n'y écrit jamais à la main : seul le serveur a la clé du classeur." | Their real `users` table, 3 rows; a new row slides in when "Léa s'inscrit"; the app box dims (closed) and the row stays. Caption: "Fermer l'app n'efface rien." |
| **API** | Plug socket: a standard interface to a complex system, you don't wire into the grid (MDN) https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Introduction ; the restaurant waiter + menu [weak, ubiquitous] | Waiter implies human interpretation; an API is strict: a malformed order is rejected; it answers with a status code; usage can be rate-limited; the service behind can change or go down. | "Un serveur qui n'accepte que le bon de commande exact, et revient toujours avec un ticket (200, 404…)." | The mascot carries an envelope `POST /api/signup` along a path from screen island to server island, then returns stamped `201 ✓`. Same path, two directions. |
| **Auth** (authentication / authorization) | Hotel: ID at the front desk = authentication; key card that opens only your room = authorization; the key card ≈ access token, it "says nothing about who you are" https://www.oauth.com/oauth2-servers/openid-connect/authorization-vs-authentication/ | Cards can be copied/stolen and expire; a card is only safe if *every door* checks it (server-side), not if the corridor is hidden in the UI. | "Chaque porte vérifie la carte elle-même. Cacher le couloir ne suffit pas." | Badge "Léa" glides to two doors: "Profil de Léa" turns green and opens; "Admin" flashes red and stays shut. |
| **Tests** | A smoke alarm / a robot that replays your app's key moves after every change; tests give confidence to change code (Fowler, self-testing code) https://martinfowler.com/testing | A green test only checks what it was told to check; "testing shows the presence, not the absence of bugs" (Dijkstra) https://www.cs.utexas.edu/~EWD/ewd02xx/EWD249.PDF ; novices test only the happy path. | "L'alarme ne protège que les pièces où on a mis un détecteur." | Row of 3 lights named after real tests; a code change ripples; one light turns red with an arrow to `signup`; fix → green. |
| **Git / versions** | Save points with a note, a timeline you can go back along; Pro Git: commits are snapshots ("takes a picture of what all your files look like") https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F | Most people think in diffs (51%) not snapshots (Evans); staging is confusing (De Rosso & Jackson); a save point is local until pushed; git ≠ GitHub. | "Chaque point garde la photo du projet ; on affiche ce qui a changé. Envoyer sur GitHub = une copie de l'album." | Horizontal timeline of dots with the user's real commit messages; a branch splits and merges back; a "time travel" ring rewinds to a dot. |
| **Dependencies** | Ready-made parts/ingredients from suppliers instead of making everything yourself [I, common] | Suppliers have suppliers (a tree, not a list); one tiny part can break everything (npm left-pad, 2016) https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm ; xkcd 2347 https://explainxkcd.com/2347/ ; versions change. | "La liste de courses note la marque et la version exactes (le lockfile), et chaque pièce a ses propres pièces." | Their app block on a stack of real package names (`next`, `react`, …) with a tiny block at the bottom; it wobbles and the whole stack sways. |
| **Config / env vars / secrets** | Twelve-Factor: config is "everything that is likely to vary between deploys", kept out of code; litmus test: could the code be open-sourced now "without compromising any credentials"? https://12factor.net/config | Env vars are not encryption; some frameworks deliberately copy public vars into browser code (Next.js `NEXT_PUBLIC_` is inlined into the JS sent to the browser) https://nextjs.org/docs/app/guides/environment-variables ; a secret once committed stays in git history (Meli et al.). | "Une clé publiée est brûlée : on la change, on ne l'efface pas." | Same code box; two `.env` cards slide in (local / production) and the app connects to two different databases; a key icon stays on the server side and never crosses to the browser. |
| **Deploy** | From your kitchen to the open restaurant; publishing a copy for everyone [I; sources weak] | Deploy is a copy of one version: local edits are not live until redeployed; production differs from your machine (env vars, deps: "works on my machine") https://jebel-quant.github.io/rhiza-education/slides/cicd-intro.html | "Le site en ligne est la photo d'un point de sauvegarde précis. Pour changer le site, on republie." | A package labelled with the commit hash travels from the laptop island (localhost) to a cloud island with a public URL; a friend's phone lights up on arrival. |

---

## 6. High-quality explanatory animation

### 6.1 Guidance

- [S] Apple HIG Motion: "Add motion purposefully… Don't add motion for the sake of adding motion"; "Make motion optional" (don't make it the only carrier of information); "Aim for brevity and precision"; avoid motion on frequent interactions; "Let people cancel motion"; avoid sustained oscillation (~0.2 Hz). https://developer.apple.com/design/human-interface-guidelines/motion
- [S] NN/g durations: ~100 ms for simple feedback, 200–300 ms for substantial changes, 100–400 ms typical, ≥500 ms feels like a drag; entering slightly longer than exiting; ease-out preferred; the more often seen, the subtler. https://www.nngroup.com/articles/animation-duration/
- [S] Material motion: informative, focused, expressive. https://material.io/design/motion , https://design.google/library/making-motion-meaningful
- [S] Willenskomer, UX in Motion Manifesto: motion supports usability through expectation, continuity, **narrative** (linking discrete moments into a sequence) and **relationship**; principles include easing, **offset & delay** (staggering reveals hierarchy before reading), parenting, transformation, **value change** (animated values signal live data). https://uxmag.com/articles/creating-usability-with-motion-the-ux-in-motion-manifesto
- [S] Disney's 12 principles mapped to UI (IxDF): anticipation, staging (only the important thing moves), follow-through/overlap (title follows image slightly later), slow in/out, arcs, timing that reflects meaning (upload speed reflects file size). https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design ; counterpoint that they solve a different problem: https://medium.com/ux-in-motion/ui-animation-principles-disney-is-dead-8bf6c66207f9
- [S] Val Head: functional roles of interface animation are feedback, orientation, directing attention, **showing causality**, and brand personality. https://www.rosenfeldmedia.com/books/designing-interface-animation/
- [S] Rachel Nabors: animation guides users through interactions by revealing relationships, structure, and **cause and effect**. https://abookapart.com/products/animation-at-work
- [S] Tversky et al.: animate as discrete, perceivable steps; congruence and apprehension (above).
- [S] WCAG 2.2.2 Pause, Stop, Hide: moving content that starts automatically, lasts **more than 5 seconds**, and is shown alongside other content needs a way to pause, stop or hide it. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- [S] `prefers-reduced-motion` CSS does not stop SMIL `<animate>`; options are JS (`pauseAnimations()`) or swapping in a static SVG. https://elijahmanor.com/prefers-reduced-motion , https://dev.to/grahamthedev/comment/1cmc6
- [S] SMIL easing: `calcMode="spline"` + `keyTimes` + `keySplines` (one fewer spline than key times) on `<animate>`, `<animateMotion>`, `<animateTransform>`. https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/keySplines

### 6.2 SMIL recipe for the pane [I, derived from the above]

1. **Static-first.** Draw the complete, labelled end state first. That frame alone must teach the idea (it is the reduced-motion version, the thumbnail, and what remains after the animation).
2. **Play once, ≤ 4 s total, `fill="freeze"`.** Avoid `repeatCount="indefinite"` for anything meaningful; the only allowed loop is a slow idle breathing on the mascot (or none). This stays under WCAG's 5 s threshold without needing a pause control.
3. **Discrete steps, staged with `begin` offsets** (e.g. request leaves at 0 s, arrives 0.6 s, server pulse 0.8 s, response leaves 1.2 s, arrives 1.8 s, label fades in 2.0 s). One thing moves at a time (staging).
4. **Ease-out for arrivals** (`keySplines="0 0 0.58 1"`), ease-in-out for travel along paths; never linear except progress bars.
5. **Motion encodes direction and causality:** requests travel one way along a visible path, responses come back on the same path, colour change = state change (value change), a pulse on arrival = "something happened here".
6. **Label in place**: text sits next to the moving object, not in a legend; use the user's real names.
7. **One accent colour per notion**, reused across all frames and the path (signaling).
8. **Replay lives outside the SVG**: a "Rejouer" button re-renders the SVG (only the host can do that, since there's no JS). A "Mouvement réduit" setting renders the frozen end state with no `<animate>` elements.
9. **No decoration:** confetti/bounces only on the XP moment, never inside an explanatory diagram (seductive details).

---

## 7. Synthesis for motiondev

### 7.1 Design rules ranked by expected learning value

1. Explain the user's own build, with their names (self-reference, Walkington, personalization principle, Victor "show the data").
2. One fixed notional machine (the islands map) reused in every lesson; same positions, same colours (Sorva; Ciechanowski colour-coding; Mayer signaling).
3. Prompt comprehension right after generation: one prediction question before the reveal, two MCQ after (Anthropic RCT generation-then-comprehension; pretesting g ≈ 0.54; Brilliant; PRIMM).
4. MCQ distractors = real misconceptions; feedback says why and lets them retry (Little & Bjork; Brilliant; Duolingo mistakes-as-normal; Shute).
5. Spacing through recurrence: when a notion reappears in their build, re-ask an old question (Dunlosky; Duolingo path; Nicky Case Leitner).
6. One idea per frame, ≤140-character caption, labels in place, everything else greyed (Brilliant; Mimo; Mayer coherence/contiguity; Evans).
7. Concrete → icon → word (concreteness fading; Victor ladder; 3b1b).
8. Animate only causality, in discrete steps, once, ≤4 s, frozen on a complete still (Tversky; Höffler & Leutner; Apple; WCAG 2.2.2).
9. Every analogy has a "Sauf que…" line (TWA; Comeau; Guzdial; Appleton).
10. Teach at breakpoints: live captions always, quizzes only when the agent pauses (Iqbal & Bailey; Apple "let people cancel motion").
11. Story captions chained with MAIS/DONC; failures framed as plot conflict (Willingham; Case).
12. The mascot carries the request/data or stands still; nothing decorative inside diagrams (Papert/Victor identity; seductive details g = −0.33; agents give small effects).
13. Progress = understanding, not activity: Familiar → Proficient → Mastered per notion (Khan Academy; Prather illusion of competence).
14. Fade narration as mastery grows (expertise reversal).
15. Warm, task-focused, short feedback copy; tone adapts to the moment; never guilt (Shute; Duolingo tone).

### 7.2 Retention mechanics

Copy:

1. **A forgiving streak decoupled from volume**: one understood notion keeps it; offer repair ("rattrapage") (Duolingo decoupling data; Silverman & Barasch repair moderator).
2. **The path with built-in review and mastery levels**: review counts as progress; per-notion mastery like Khan/Legendary (Duolingo path; Khan mastery).
3. **A small recurring cast with a job**: the mascot who carries requests, plus at most one or two "inhabitants" per island, so short captions can lean on known characters (Duolingo sitcom logic; Byte).
   Also copy: Duolingo's "Explain My Answer" shape for the opt-in model call.

Avoid:

1. **Punishing mistakes with scarcity** (hearts/energy): Duolingo's own data shows beginners run out mid-lesson; errors are how pretesting works.
2. **Guilt/loss-framed nudges and activity-inflated XP/leagues**: flagged as deceptive patterns (IHC study), streak anxiety, broken-streak drop-off, illusion of competence; "gamification changes behaviour, we change knowledge" (Case).

---

## 8. Gaps and caveats

- No primary design statements found for Codecademy, Amelia Wattenberger, Bartosz Ciechanowski (pattern described from his article), or the Grokking author's rationale.
- Duolingo design-guideline pages now redirect; voice/tone cited from snippets.
- Shute 2008 tables and several ACM papers were not readable as text; claims are limited to abstracts/secondary summaries and flagged.
- Deploy and interface analogies lack a top-tier teacher source; marked [I]/[weak].
- No study found on novices' misconceptions specifically about APIs or deployment; listed misconceptions there are [I].
- Effect sizes are from different populations (school maths, lab memory tasks); transfer to adult vibecoders mid-task is plausible but untested.

---

## 9. Source list (all URLs cited)

Duolingo and apps
- https://blog.duolingo.com/new-duolingo-home-screen-design
- https://blog.duolingo.com/spaced-repetition-for-learning
- https://blog.duolingo.com/duolingo-teaching-method
- https://blog.duolingo.com/improving-the-streak
- https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- https://www.recall.it/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team
- https://blog.duolingo.com/duolingo-energy/
- https://www.androidauthority.com/quitting-duolingo-energy-system-3599842/
- https://www.change.org/p/duolingo-hearts-not-energy
- https://blog.duolingo.com/building-character/
- https://www.fastcompany.com/90664438/duolingo-wants-to-be-the-sesame-street-for-adults
- https://design.duolingo.com/writing/voice
- https://design.duolingo.com/writing/tone
- https://design.duolingo.com/writing/duo
- https://openai.com/index/duolingo
- https://research.duolingo.com/papers/yancey.kdd20.pdf
- https://duolingo-papers.s3.amazonaws.com/reports/Duolingo_whitepaper_language_read_listen_2021.pdf
- https://personal-website-c5k.pages.dev/duolingo
- https://sol.sbc.org.br/index.php/ihc/article/view/37677
- https://run.unl.pt/handle/10362/171644
- https://screenwiseapp.com/guides/managing-duolingo-streaks-when-gamification-becomes-stressful
- https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions
- https://brilliant.org/resources/choosing-brilliant/how-brilliant-teaches-math/
- https://brilliant.org/about/
- https://brilliant.org
- https://mimo.org/press-kit
- https://medium.com/sololearn/the-five-pillars-of-learning-interactive-lessons-and-teachers-9d57a927201c
- https://careerkarma.com/blog/sololearn-app-review/
- https://en.wikipedia.org/wiki/Grasshopper_(mobile_app)
- https://9to5google.com/2023/03/13/grasshopper-shut-down/
- https://www.macworld.com/article/228397/meet-swift-playgrounds-the-learn-to-code-ipad-app-that-feels-like-a-puzzle-game.html
- https://apple.com/uk/education/docs/everyone-can-code-curriculum-guide.pdf
- https://support.khanacademy.org/hc/en-us/articles/5548760867853
- https://blog.khanacademy.org/?p=13201
- https://survivejs.com/blog/scrimba-interview/
- https://algocademy.com/blog/why-watching-tutorials-is-not-learning-the-cognitive-gap-between-seeing-and-doing
- https://exercism.org/docs/using/product/fluency
- https://threadreaderapp.com/thread/1381611771841146883.html
- https://link.springer.com/article/10.1007/s10648-019-09498-w
- https://www.anthropic.com/research/AI-assistance-coding-skills
- https://arxiv.org/abs/2405.17739
- https://arxiv.org/abs/2506.23253

Visual explanation
- http://worrydream.com/LearnableProgramming/
- https://worrydream.com/LadderOfAbstraction/
- https://worrydream.com/ExplorableExplanations/
- https://blog.ncase.me/how-i-make-an-explorable-explanation/
- https://blog.ncase.me/explorable-explanations
- https://ncase.me/remember/
- https://ciechanow.ski/mechanical-watch/
- https://jvns.ca/teach-tech-with-cartoons/
- https://jvns.ca/blog/2024/01/05/do-we-think-of-git-commits-as-diffs--snapshots--or-histories/
- https://maggieappleton.com/programming-pictures/
- https://maggieappleton.com/drawinginvisibles1/
- https://www.theteenmagazine.com/rethinking-high-school-math-education-insights-from-3blue1brown
- https://rosetta.to/u/3blue1brown/make-math-videos-summer-of-math-exposition-announcement
- https://www.3blue1brown.com/blog/some1-results
- https://www.manning.com/books/grokking-algorithms

Learning science
- https://core.ac.uk/download/237588613.pdf
- https://cloud.wikis.utexas.edu/wiki/x/SQNqAw
- https://ugc.futurelearn.com/uploads/files/7d/d6/7dd6188d-c343-4311-b064-ac98d2c95abc/Multimedia_Principles._R._E._Mayer__2020.pdf
- https://www.cambridge.org/core/books/multimedia-learning/personalization-voice-and-image-principles/97F9B31362E6491806A4718FECCADE3D
- https://www.teachermagazine.com/au_en/articles/cognitive-load-theory-teaching-strategies
- https://link.springer.com/doi/10.1007/s11251-009-9107-8
- https://digitalpromise.org/2015/02/07/five-learning-strategies-that-work/
- https://www.psychologicalscience.org/journals/psychological-science/0956797612443370/
- https://link.springer.com/10.1007/s10648-023-09814-5
- https://sc-pan.github.io/pdf/PR_2023.pdf
- https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/04/EBjork_RBjork_2011.pdf
- https://pc.cogs.indiana.edu/?p=885
- https://link.springer.com/article/10.1007/s10648-020-09581-7
- https://dblp.org/rec/journals/jeric/Sorva13
- https://par.nsf.gov/servlets/purl/10404382
- https://luce.si.usi.ch/publications/2020-06-01-notional-machines.html
- https://qmro.qmul.ac.uk/xmlui/handle/123456789/57800
- https://static.teachcomputing.org/pedagogy/QR11-PRIMM.pdf
- https://hg.gatech.edu/node/603172
- https://typeset.io/pdf/my-data-just-goes-everywhere-user-mental-models-of-the-gkf0kgqf8q.pdf
- https://link.springer.com/content/pdf/10.1007/s10639-005-3431-7.pdf
- https://blog.boosteredu.in/web-architecture-fundamentals
- https://dspace.mit.edu/handle/1721.1/105233
- https://blog.acolyer.org/2016/10/24/whats-wrong-with-git-a-conceptual-design-analysis/
- https://research.ou.nl/en/publications/how-do-students-test-software-units-part-one-their-natural-attitu/
- https://arxiv.org/pdf/2510.00957
- https://www.ndss-symposium.org/ndss-paper/how-bad-can-it-git/
- https://wiki.owasp.org/index.php?oldid=206089&title=Input_Validation_Cheat_Sheet
- https://www.aft.org/node/7506
- https://edsurge.com/news/2013-11-08-can-interest-based-personalization-deliver-better-learning-outcomes
- https://core.ac.uk/download/194456453.pdf
- https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/How-Effective-are-Pedagogical-Agents-for/99900601056901842
- https://news.wsu.edu/2020/03/19/seductive-details-inhibit-learning/
- https://en.wikipedia.org/wiki/Mindstorms_(book)
- https://hci.stanford.edu/courses/cs448b/papers/Tversky_AnimationFacilitate_IJHCS02.pdf
- https://www.leibniz-ipn.de/en/research/publications/instructional-animation-versus-static-pictures-a-meta-analysis
- https://link.springer.com/article/10.1007/s11251-021-09541-w
- https://www.academia.edu/15636659/A_Meta_Study_of_Algorithm_Visualization_Effectiveness
- https://ideals.illinois.edu/items/83111
- https://interruptions.net/literature/Iqbal-CHI06-p741-iqbal.pdf
- https://core.ac.uk/works/78990140
- https://journals.sagepub.com/doi/10.3102/0034654307313795
- https://myweb.fsu.edu/vshute/pdf/shute%202008_b.pdf

Analogies
- https://www.csun.edu/~vceed002/books/sourcebook/chapters/10-analogies/teaching-analogies.html
- https://cacm.acm.org/blogcacm/dijkstra-was-wrong-about-radical-novelty-metaphors-in-cs-education
- https://advocate.csteachers.org/2017/10/19/learning-computing-with-metaphors/
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works
- https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Introduction
- https://codeburst.io/front-end-v-back-end-explained-by-waiting-tables-at-a-restaurant-174000a4498d
- https://cs50.harvard.edu/sql/2024/notes/0/
- https://www.oauth.com/oauth2-servers/openid-connect/authorization-vs-authentication/
- https://martinfowler.com/testing
- https://www.cs.utexas.edu/~EWD/ewd02xx/EWD249.PDF
- https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F
- https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm
- https://explainxkcd.com/2347/
- https://12factor.net/config
- https://nextjs.org/docs/app/guides/environment-variables
- https://jebel-quant.github.io/rhiza-education/slides/cicd-intro.html

Animation
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://www.nngroup.com/articles/animation-duration/
- https://material.io/design/motion
- https://design.google/library/making-motion-meaningful
- https://uxmag.com/articles/creating-usability-with-motion-the-ux-in-motion-manifesto
- https://ixdf.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design
- https://medium.com/ux-in-motion/ui-animation-principles-disney-is-dead-8bf6c66207f9
- https://www.rosenfeldmedia.com/books/designing-interface-animation/
- https://abookapart.com/products/animation-at-work
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://elijahmanor.com/prefers-reduced-motion
- https://dev.to/grahamthedev/comment/1cmc6
- https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/keySplines
