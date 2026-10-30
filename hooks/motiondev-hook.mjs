#!/usr/bin/env node
// Claude Code command hook: one JSON payload on stdin, one event line on disk. Always exits 0.
import fs from 'node:fs'
import { classify } from '../lib/classify.mjs'
import { makeEvent } from '../lib/events.mjs'
import { append, writePluginRoot } from './store.mjs'

try {
  if (process.env.MOTIONDEV !== '0') {
    let raw = ''
    try { raw = fs.readFileSync(0, 'utf8') } catch { raw = '' }
    const payload = JSON.parse(raw.replace(/^﻿/, '') || 'null')
    if (payload && typeof payload === 'object') {
      if (payload.hook_event_name === 'SessionStart') writePluginRoot(process.env.CLAUDE_PLUGIN_ROOT)
      const fields = classify({
        event: payload.hook_event_name,
        tool: payload.tool_name,
        input: payload.tool_input,
        response: payload.tool_response,
        prompt: payload.prompt,
        cwd: payload.cwd,
        session_id: payload.session_id,
        source: payload.source,
      })
      if (fields) append(makeEvent({ ...fields, session: payload.session_id, source: 'hook' }, Date.now()))
    }
  }
} catch { /* a hook never fails the agent */ }
process.exit(0)
