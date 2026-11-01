export type Level = 'beginner' | 'intermediate' | 'advanced' | 'dev'
export type Locale = 'fr' | 'en'
export type Moment = { scene?: string; object?: string; name?: string; detail?: string; status?: string; file?: string; tool?: string }
export type Explained = { title: string; subtitle: string; chips: string[]; mono: boolean }
export type Row = { time: string; tool: string; target: string; outcome: string; isFail: boolean }
export const LEVELS: readonly Level[]
export function localeOf(lang: string | undefined): Locale
export function ui(locale: Locale): import('./phrases.mjs').UiWords
export function chipsOf(detail: string | undefined): string[]
export function explain(c: Moment, options?: { level?: Level; locale?: Locale }): Explained
export function timeline<T extends { tool?: string; status?: string; name?: string }>(ticker: T[]): T[]
export function row(ev: { ts: number; tool?: string; kind?: string; file?: string; name?: string; detail?: string; status?: string }): Row
