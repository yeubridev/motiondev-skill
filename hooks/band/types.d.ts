// The band's state contract. Self-contained on purpose: the engine reads it without resolving imports.
// It mirrors Canvas in lib/events.d.mts; change both together and bump the atom's shape tag.
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
    motiondev: { canvas: Shaped<Canvas>; isHidden: boolean; isClosed: boolean; details: boolean }
  }
}
