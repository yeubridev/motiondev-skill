export type Question = { q: string; a: [string, string, string]; why: string }
export type Notion = { title: string; room: string; short: string; image: string; what: string; here: string[]; hereFail?: string; limit: string; ask?: Question; quiz: Question[] }
export type Progress = { xp: number; streak: { last: string; days: number }; concepts: Record<string, { seen: number; correct: number }> }
export const CONCEPTS: readonly string[]
export const LESSONS: Record<'fr' | 'en', Record<string, Notion>>
export function conceptOf(scene: string): string | null
export function lesson(id: string, locale?: 'fr' | 'en'): Notion | null
export function quiz(id: string, locale: 'fr' | 'en', n?: number, name?: string): { q: string; answers: string[]; right: number; why: string; best: string } | null
export function here(l: Notion, ctx?: { name?: string; detail?: string; status?: string }): string
export function stands(id: string, item: { scene: string; object?: string } | null | undefined): boolean
export function streakDays(progress: Progress, now: number): number
export function weakest(progress: Progress): string | null
export function rank(progress: Progress, locale?: 'fr' | 'en'): { title: string; done: number; next: string; need: number; ratio: number }
export function initialProgress(): Progress
export function mastery(progress: Progress, id: string): number
export function seen(progress: Progress, id: string): Progress
export function answered(progress: Progress, id: string, isRight: boolean, now: number): Progress
