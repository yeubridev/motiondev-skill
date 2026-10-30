export const OBJECTS: Record<string, string[]>
export function label(scene: string): string
export function verb(object: string, scene?: string, status?: string): string
export function sceneColor(scene: string): number
export function sceneHex(scene: string): string
export function glyph(key: string, options?: { ascii?: boolean }): string
export function toAscii(s: string): string
export function fit(s: string, width: number): string
