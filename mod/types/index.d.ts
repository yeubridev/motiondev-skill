// The mod's state contract. Self-contained: the engine reads it without resolving imports.
export type Level = 'beginner' | 'intermediate' | 'advanced' | 'dev'
export type Prefs = { level: Level | ''; locale: 'fr' | 'en'; learn: boolean; onboarded: boolean; motion: boolean }
export type Step = { title: string; status: 'todo' | 'active' | 'done'; id?: string }
export type Story = { prompt: string; steps: Step[]; since: number; ended: boolean }
export type Lesson = { status: 'idle' | 'loading' | 'ready' | 'error'; text: string; tokens: number; cached: number; turn: number; concept: string }
export type Progress = { xp: number; streak: { last: string; days: number }; concepts: Record<string, { seen: number; correct: number }> }
export type Quiz = { concept: string; step: 'idle' | 'asking' | 'answered'; n: number; pick: number; name: string }
export type Tour = { at: number }
export type Built = { key: string; scene: string; object: string; name: string; detail: string; ts: number }
export type Current = { scene: string; object: string; name: string; status: string; detail: string; file: string; ts: number }
export type Event = {
  ts: number
  kind: 'session' | 'turn' | 'scene' | 'object' | 'run' | 'note'
  scene: string
  weight: 'major' | 'minor'
  source: string
  object?: string
  name?: string
  status?: string
  tool?: string
  file?: string
  detail?: string
  session?: string
}
export type Canvas = {
  project: string
  session: string
  current: Current
  shelf: Built[]
  ticker: Event[]
  running: boolean
  turns: number
  changedAt: number
  seq: number
}

declare module 'claude-code' {
  interface PluginState {
    'motiondev-v2': {
      canvas: Shaped<Canvas>
      story: Shaped<Story>
      settings: Shaped<Prefs>
      lesson: Shaped<Lesson>
      progress: Shaped<Progress>
      quiz: Shaped<Quiz>
      tour: Shaped<Tour>
      isClosed: boolean
    }
  }
}
