import type { Progress } from './lessons.mjs'
export function diagram(id: string, ctx?: { name?: string; detail?: string; status?: string; locale?: 'fr' | 'en'; motion?: boolean }): string
export function notions(progress: Progress, current: string, locale?: 'fr' | 'en', options?: { motion?: boolean }): string
