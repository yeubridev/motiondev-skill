export type Illustrated = { scene?: string; object?: string; name?: string; detail?: string; status?: string; running?: boolean }
export function illustrate(state?: Illustrated, options?: { width?: number; height?: number }): string
