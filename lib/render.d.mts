import type { Canvas, Event } from './events.mjs'
export type FrameOptions = { width?: number; height?: number; tick?: number; now?: number; color?: boolean; ascii?: boolean; utc?: boolean; reveal?: boolean }
export function frame(state: Canvas, options?: FrameOptions): string[]
export function oneLine(state: Canvas, options?: { ascii?: boolean }): string
export function tickerLine(e: Event, options?: { width?: number; ascii?: boolean; color?: boolean; utc?: boolean }): string
export function gist(e: Event, options?: { ascii?: boolean }): string
export function stripAnsi(s: string): string
export function visibleWidth(s: string): number
