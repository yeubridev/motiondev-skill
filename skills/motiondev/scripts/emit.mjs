#!/usr/bin/env node
// Narrate one unit of work: node scripts/emit.mjs <scene> [object] [name...] [--status start|done|fail] [--detail text]
import { main } from '../../../bin/motiondev.mjs'
main(['emit', ...process.argv.slice(2)]).then(code => process.exit(code))
