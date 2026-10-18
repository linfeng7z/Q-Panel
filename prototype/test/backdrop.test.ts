import test from 'node:test'
import assert from 'node:assert/strict'
import { backdropMaterial, backdropVariables, backdropImageStyle } from '../src/backdrop.ts'

test('material is linear through the middle and fully excludes the desktop at max', () => {
  let previous = backdropMaterial(0)
  for (let value = 1; value <= 80; value++) {
    const next = backdropMaterial(value)
    assert.ok(next.radius > previous.radius)
    assert.ok(next.tint > previous.tint)
    previous = next
  }
  assert.equal(backdropMaterial(20).radius, 16)
  assert.equal(backdropMaterial(40).radius, 32)
  assert.equal(backdropMaterial(60).radius, 48)
  assert.equal(backdropMaterial(80).radius, 64)
  assert.equal(backdropMaterial(80).tint, 1)
  assert.equal(backdropMaterial(80).percent, 100)
  assert.equal(backdropVariables(80)['--material-blur'], '16px')
  assert.equal(backdropMaterial(-10).strength, 0)
  assert.equal(backdropMaterial(120).strength, 80)
  assert.equal(backdropMaterial(NaN).strength, 56)
})

test('secondary display coordinates are relative to its origin, with overscan', () => {
  const style = backdropImageStyle({
    image: 'data:image/png;base64,test',
    screen: { x: -2560, y: -180, width: 2560, height: 1440 },
    window: { x: -1920, y: -147, width: 1280, height: 760 },
  })
  assert.equal(style.backgroundSize, '640px 360px')
  assert.equal(style.backgroundPosition, '-112px 39.75px')
})
