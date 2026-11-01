import type { Built } from './events.mjs'
import type { Step } from './story.mjs'
import type { Checks } from './story.mjs'
export type Tone = { fill: string; line: string }
export const ROOMS: Record<string, { x: number; y: number; w: number; h: number; front?: boolean }>
export const PICTO: Record<string, (c: Tone) => string>
export function tone(on: boolean, bad?: boolean): Tone
export function appear(inner: string, at?: number, from?: string, motion?: boolean): string
export function roomOf(scene: string): string
export function labels(level: string, locale: 'fr' | 'en'): Record<string, string>
export function spot(room: string): [number, number]
export function shown(item: { scene: string; object: string; name: string }): string
export function map(moment?: {
  scene?: string; object?: string; name?: string; status?: string; running?: boolean; motion?: boolean
  shelf?: Built[]; steps?: Step[]; prev?: string; level?: string; locale?: 'fr' | 'en'
  focus?: { room: string; from: string } | null; checks?: Checks | null
}): string
