export type Composition = { frames: string[][]; width: number; height: number }
export type Spec = { scene?: string; object?: string; name?: string; detail?: string; status?: string; running?: boolean }
export function compose(spec?: Spec, options?: { ascii?: boolean; maxWidth?: number }): Composition
export function clean(s: unknown, options?: { ascii?: boolean }): string
export function fit(s: string, width: number): string
export function toAscii(s: string): string
export function lint(result: Composition): string[]
export const ASCII_MAP: Record<string, string>
export const GLYPH: Record<string, string>
