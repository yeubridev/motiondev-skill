import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SCENES } from '../lib/events.mjs'
import { pictogram, glyph, objectCard, label, OBJECTS, sceneColor } from '../lib/pictograms.mjs'

const width = line => [...line].length
const isNarrow = line => [...line].every(ch => ch.codePointAt(0) < 0x2800 || /[⠀-⣿]/.test(ch))

for (const scene of SCENES) {
  test(`${scene}: every frame has the same box, no wide characters`, () => {
    for (const ascii of [false, true]) {
      const p = pictogram(scene, { ascii })
      assert.ok(p.frames.length >= 1, 'at least one frame')
      for (const frame of p.frames) {
        assert.equal(frame.length, p.height, 'same height on every frame')
        for (const line of frame) {
          assert.equal(width(line), p.width, `${scene} line "${line}" is ${width(line)} wide, box is ${p.width}`)
          assert.ok(isNarrow(line), `wide character in ${scene}: ${line}`)
          if (ascii) assert.ok(/^[\x20-\x7e]*$/.test(line), `non-ascii in ascii frame: ${line}`)
        }
      }
      assert.ok(p.height >= 4 && p.height <= 8, 'between 4 and 8 rows')
      assert.ok(p.width >= 10 && p.width <= 26, 'between 10 and 26 columns')
    }
  })
}

test('scenes that animate have more than one frame', () => {
  for (const scene of ['database', 'tests', 'api', 'think', 'agents', 'build', 'idle', 'explore']) {
    assert.ok(pictogram(scene).frames.length >= 2, scene)
  }
})

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

test('an object card draws the object with its name in a few rows of equal width', () => {
  for (const [object, name] of [['table', 'users'], ['endpoint', 'GET /users'], ['component', 'Button'], ['commit', 'feat: add users'], ['package', 'express, zod'], ['test', 'Button'], ['migration', '0003_add_orders'], ['container', 'Dockerfile'], ['file', 'slug.ts'], ['task', 'Add a users table with email']]) {
    for (const ascii of [false, true]) {
      const card = objectCard(object, name, { ascii, maxWidth: 24 })
      assert.ok(card.length >= 2 && card.length <= 5, `${object}: ${card.length} rows`)
      const w = width(card[0])
      assert.ok(w <= 24, `${object} card too wide: ${w}`)
      for (const line of card) assert.equal(width(line), w, `${object} ragged card: "${line}"`)
      assert.ok(card.some(l => l.includes(name.slice(0, 8))), `${object} card lacks its name: ${card.join('|')}`)
      if (ascii) for (const line of card) assert.ok(/^[\x20-\x7e]*$/.test(line))
    }
  }
})

test('a long name is cut to fit the card', () => {
  const card = objectCard('table', 'a_very_long_table_name_that_goes_on_and_on', { maxWidth: 20 })
  for (const line of card) assert.ok(width(line) <= 20, line)
})

test('labels read like a human wrote them and each scene has a color', () => {
  assert.equal(label('database'), 'backend · database')
  assert.equal(label('frontend'), 'frontend · ui')
  assert.equal(label('tests'), 'quality · tests')
  for (const scene of SCENES) assert.ok(typeof sceneColor(scene) === 'number', scene)
})
