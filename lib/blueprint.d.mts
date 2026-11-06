import type { Canvas } from './events.mjs'
// A run of text and how to paint it: a scene name for its color, and any of `dim`, `bold`, `fail`, space-separated.
export type Segment = { text: string; tone: string }
export type Blueprint = { lines: Segment[][]; width: number; height: number }
export type BlueprintOptions = { width?: number; height?: number; tick?: number; now?: number; ascii?: boolean; reveal?: boolean }
export function blueprint(state: Canvas, options?: BlueprintOptions): Blueprint
export function plain(line: Segment[]): string
export type Entry = { scene: string; object: string; key: string; ts: number; name: string; detail: string; status: string; running: boolean; failed: boolean; isRun: boolean; verdict: boolean; target: boolean; keep: boolean }
export type Model = { task: { text: string; target: boolean; running: boolean } | null; zones: { id: string; lead: string; items: Entry[] }[]; strips: { id: string; lead: string; entries: Entry[] }[] }
export function model(state: Canvas): Model
export function typed(name: string, ts: number, options?: { now?: number; reveal?: boolean }): { text: string; typing: boolean }
export function counts(detail: string): { passed: number; failed: number } | null
export const TYPE_MS: number
