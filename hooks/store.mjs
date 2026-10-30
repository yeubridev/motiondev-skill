// Where events live on disk, and how to append to and follow them. Node only.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseLines } from '../lib/events.mjs'

export const homeDir = () => process.env.MOTIONDEV_HOME || path.join(os.homedir(), '.motiondev')
export const eventsPath = () => process.env.MOTIONDEV_FILE || path.join(homeDir(), 'events.jsonl')
const maxBytes = () => Number(process.env.MOTIONDEV_MAX_BYTES) || 5_000_000

const ensureDir = file => fs.mkdirSync(path.dirname(file), { recursive: true })

// Keeps the file under the cap: the previous file stays as events.1.jsonl.
function rotate(file) {
  try {
    if (fs.statSync(file).size > maxBytes()) fs.renameSync(file, file.replace(/\.jsonl$/, '.1.jsonl'))
  } catch { /* no file yet */ }
}

export function append(event, file = eventsPath()) {
  ensureDir(file)
  rotate(file)
  fs.appendFileSync(file, JSON.stringify(event) + '\n')
}

export function readAll(file = eventsPath()) {
  try { return parseLines(fs.readFileSync(file, 'utf8')) } catch { return [] }
}

export function clear(file = eventsPath()) {
  ensureDir(file)
  fs.writeFileSync(file, '')
}

export function writePluginRoot(root) {
  if (!root) return
  const file = path.join(homeDir(), 'plugin-root')
  ensureDir(file)
  fs.writeFileSync(file, root + '\n')
}

export function readPluginRoot() {
  try { return fs.readFileSync(path.join(homeDir(), 'plugin-root'), 'utf8').trim() } catch { return '' }
}

// Follows a file: `initial()` is what is there now, `poll()` what was appended since (a truncated file starts over).
export function fileSource(file = eventsPath()) {
  let offset = 0
  let rest = ''
  const readFrom = () => {
    let size = 0
    try { size = fs.statSync(file).size } catch { return [] }
    if (size < offset) { offset = 0; rest = ''; return [{ reset: true }] }
    if (size === offset) return []
    const fd = fs.openSync(file, 'r')
    const buf = Buffer.alloc(size - offset)
    fs.readSync(fd, buf, 0, buf.length, offset)
    fs.closeSync(fd)
    offset = size
    const text = rest + buf.toString('utf8')
    const cutAt = text.lastIndexOf('\n')
    rest = cutAt < 0 ? text : text.slice(cutAt + 1)
    return parseLines(cutAt < 0 ? '' : text.slice(0, cutAt + 1))
  }
  return { initial: readFrom, poll: readFrom, drain: readFrom, isLive: true }
}
