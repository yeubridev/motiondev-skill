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
export type Built = { key: string; scene: string; object: string; name: string; detail: string; ts: number }
export type Current = { scene: string; object: string; name: string; status: string; detail: string; file: string; ts: number }
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
export type EventFields = Partial<Omit<Event, 'ts'>> & { scene?: string; narrated?: boolean }
export const SCENES: readonly string[]
export const KINDS: readonly string[]
export function makeEvent(fields: EventFields, ts?: number): Event
export function parseLines(text: string): Event[]
export function initialState(): Canvas
export function reduce(state: Canvas, e: Event): Canvas
export function replay(events: Event[], state?: Canvas): Canvas
