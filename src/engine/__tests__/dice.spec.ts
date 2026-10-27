import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { DIE_SIDES } from '@/domain/dice'
import { dieModel, readTopFace } from '../dice'
import { dieTypeFor } from '../types'

const UP = new THREE.Vector3(0, 1, 0)

describe.each(DIE_SIDES.map((sides) => [sides, dieTypeFor(sides)] as const))(
  'W%i model',
  (sides, type) => {
    const model = dieModel(type)

    it('has every value from 1 to the number of sides exactly once', () => {
      expect(model.faces.map((f) => f.value).sort((a, b) => a - b)).toEqual(
        Array.from({ length: sides }, (_, i) => i + 1),
      )
    })

    it('reads each value when that face is turned to the top, lying flat', () => {
      for (const face of model.faces) {
        const rotation = new THREE.Quaternion().setFromUnitVectors(
          face.direction.clone().normalize(),
          UP,
        )
        const top = readTopFace(type, rotation)
        expect(top.value).toBe(face.value)
        expect(top.flatness).toBeCloseTo(1, 5)
      }
    })

    it('labels every value', () => {
      const labelled = new Set(model.labels.map((l) => l.value))
      expect(labelled.size).toBe(sides)
    })
  },
)

// W4 is read by corner and W20 keeps the old app's layout, so only these pair up opposite faces.
it.each([6, 8, 10, 12] as const)(
  'W%i puts values adding up to sides + 1 on opposite faces',
  (sides) => {
    const { faces } = dieModel(dieTypeFor(sides))
    for (const face of faces) {
      const opposite = faces.find((f) => f.direction.dot(face.direction) < -0.999)
      expect(opposite?.value).toBe(sides + 1 - face.value)
    }
  },
)

it('labels each W4 corner with its own value on all three adjacent faces', () => {
  const { faces, labels } = dieModel('d4')
  for (const corner of faces) {
    const near = labels.filter((l) => l.position.clone().normalize().dot(corner.direction) > 0.5)
    expect(near).toHaveLength(3)
    expect(near.every((l) => l.value === corner.value)).toBe(true)
  }
})

it('keeps the old W6 and W20 numbering', () => {
  expect(readTopFace('d6', new THREE.Quaternion()).value).toBe(6)
  expect(
    dieModel('d20')
      .faces.slice(0, 5)
      .map((f) => f.value),
  ).toEqual([20, 8, 14, 2, 16])
})
