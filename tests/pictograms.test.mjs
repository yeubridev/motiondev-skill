import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../lib/events.mjs'
import { glyph, label, OBJECTS, sceneColor } from '../lib/pictograms.mjs'

const width = line => [...line].length
const isNarrow = line => [...line].every(ch => ch.codePointAt(0) < 0x2800 || /[⠀-⣿]/.test(ch))

test('every scene and object has a one-column glyph, unicode and ascii', () => {
  for (const scene of SCENES) {
    for (const ascii of [false, true]) {
      const g = glyph(scene, { ascii })
      assert.equal(width(g), 1, `${scene} glyph "${g}"`)
      if (ascii) assert.ok(/^[\x21-\x7e]$/.test(g))
    }
    for (const object of OBJECTS[scene] ?? []) {
      for (const ascii of [false, true]) {
        const g = glyph(object, { ascii })
        assert.equal(width(g), 1, `${object} glyph "${g}"`)
      }
    }
  }
  assert.equal(glyph('nonsense'), '·')
})

test('OBJECTS covers the taxonomy of the design', () => {
  assert.deepEqual(OBJECTS.database, ['table', 'migration', 'seed', 'index', 'query'])
  assert.ok(OBJECTS.api.includes('endpoint') && OBJECTS.frontend.includes('component') && OBJECTS.tests.includes('lint'))
})

test('labels read like a human wrote them and each scene has a color', () => {
  assert.equal(label('database'), 'backend · database')
  assert.equal(label('frontend'), 'frontend · ui')
  assert.equal(label('tests'), 'quality · tests')
  for (const scene of SCENES) assert.ok(typeof sceneColor(scene) === 'number', scene)
})
