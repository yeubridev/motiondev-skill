import type { EventFields } from './events.mjs'
export type Call = {
  event?: string
  hook_event_name?: string
  tool?: string
  tool_name?: string
  input?: Record<string, unknown>
  tool_input?: Record<string, unknown>
  response?: unknown
  tool_response?: unknown
  prompt?: string
  text?: string
  cwd?: string
  session_id?: string
  source?: string
}
export type Rule = { scene: string; object: string; name: string; detail?: string }
export type CommandRule = Rule & { run: boolean; weight?: 'minor' }
export function classify(call: Call): EventFields | null
export function classifyPath(file: string, text?: string): Rule | null
export function classifyCommand(command: string): CommandRule | null
export function routeFromFile(file: string): string | null
export function relative(file: string, cwd?: string): string
export function narrate(argv: string[]): EventFields | null
