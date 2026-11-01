import type { Built, Event } from './events.mjs'
export type Step = { title: string; status: 'todo' | 'active' | 'done'; id?: string }
export type Story = { prompt: string; steps: Step[]; since: number; ended: boolean }
export type Checks = { status: string; passed?: number; failed: number; detail: string }
export type Stop = { room: string; from: string; concept: string | null; title: string; text: string }
export function initialStory(): Story
export function withPrompt(story: Story, text: string, now?: number): Story
export function withPlan(story: Story, tool: string, input: unknown, result?: { task?: { id?: string } }): Story
export function isPlanTool(tool: string): boolean
export function progress(steps: Step[]): { index: number; total: number; done: number } | null
export function chapter(scene: string, options?: { ended?: boolean; locale?: 'fr' | 'en' }): string
export function checksOf(ticker: Event[]): Checks | null
export function tour(shelf: Built[], options?: { level?: string; locale?: 'fr' | 'en'; checks?: Checks | null }): Stop[]
export function recap(shelf: Built[], since: number, locale?: 'fr' | 'en'): { title: string; lines: string[]; more: number; empty: string }
