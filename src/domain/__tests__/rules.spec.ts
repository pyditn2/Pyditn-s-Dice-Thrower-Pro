import { describe, expect, it } from 'vitest'

import {
  attackCheck,
  attributeCheck,
  damage,
  outcomeLabel,
  qualityLevel,
  talentCheck,
  talentCrit,
} from '../rules'

/**
 * Reference implementation copied from the old app's DiceCheck.vue ("Würfelproben"), which the
 * group agreed to keep as the house rules. The new rules must match it exactly.
 */
const old = {
  calculateQS(remainingPoints: number) {
    if (remainingPoints >= 16) return 6
    if (remainingPoints >= 13) return 5
    if (remainingPoints >= 10) return 4
    if (remainingPoints >= 7) return 3
    if (remainingPoints >= 4) return 2
    return 1
  },
  checkCriticalRolls(rolls: number[]) {
    const ones = rolls.filter((r) => r === 1).length
    const twenties = rolls.filter((r) => r === 20).length
    if (ones >= 2) return { success: true, message: 'Spektakulärer Erfolg!' }
    if (twenties >= 2) return { success: false, message: 'Spektakulärer Patzer!' }
    if (ones === 1) return { success: true, message: 'Kritischer Erfolg!' }
    if (twenties === 1) return { success: false, message: 'Patzer!' }
    return null
  },
  talent(rolls: number[], attrs: number[], fw: number, modifier: number) {
    const crit = old.checkCriticalRolls(rolls)
    if (crit) {
      const remainingPoints = crit.success ? fw : -1
      return {
        success: crit.success,
        pointsNeeded: crit.success ? 0 : fw + 1,
        remainingPoints,
        qualityLevel: crit.success ? old.calculateQS(remainingPoints) : 0,
        label: crit.message,
      }
    }
    let pointsNeeded = 0
    attrs.forEach((a, i) => {
      const adjusted = a + modifier
      if (rolls[i]! > adjusted) pointsNeeded += rolls[i]! - adjusted
    })
    const remainingPoints = fw - pointsNeeded
    const success = pointsNeeded <= fw
    return {
      success,
      pointsNeeded,
      remainingPoints,
      qualityLevel: success ? old.calculateQS(remainingPoints) : 0,
      label: success ? 'Erfolg!' : 'Misserfolg!',
    }
  },
  single(roll: number, target: number, critSuccessLabel: string) {
    const success = roll === 1 || (roll <= target && roll !== 20)
    const remainingPoints = success ? target - roll : 0
    return {
      success,
      remainingPoints,
      qualityLevel: success ? old.calculateQS(remainingPoints) : 0,
      label:
        roll === 1
          ? critSuccessLabel
          : roll === 20
            ? 'Patzer!'
            : success
              ? 'Erfolg!'
              : 'Misserfolg!',
    }
  },
}

const D20 = Array.from({ length: 20 }, (_, i) => i + 1)

describe('qualityLevel', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [9, 3],
    [10, 4],
    [12, 4],
    [13, 5],
    [15, 5],
    [16, 6],
    [30, 6],
  ])('%i remaining points → QS %i', (points, qs) => {
    expect(qualityLevel(points)).toBe(qs)
  })
})

describe('talentCrit precedence', () => {
  it.each([
    [[1, 1, 20], 'spectacularSuccess'],
    [[1, 1, 1], 'spectacularSuccess'],
    [[1, 20, 20], 'spectacularFailure'],
    [[20, 20, 20], 'spectacularFailure'],
    [[1, 20, 5], 'criticalSuccess'],
    [[1, 5, 5], 'criticalSuccess'],
    [[20, 5, 5], 'fumble'],
    [[2, 19, 5], null],
  ])('%j → %s', (rolls, crit) => {
    expect(talentCrit(rolls)).toBe(crit)
  })
})

describe('talentCheck', () => {
  const attrs = (values: number[]) =>
    values.map((value, i) => ({ attribute: (['MU', 'IN', 'GE'] as const)[i]!, value }))

  it('spends talent points for each die above its target', () => {
    const r = talentCheck({
      talentValue: 6,
      modifier: 0,
      attributes: attrs([12, 12, 12]),
      rolls: [14, 10, 13],
    })
    expect(r.dice.map((d) => d.pointsNeeded)).toEqual([2, 0, 1])
    expect(r).toMatchObject({
      success: true,
      pointsNeeded: 3,
      remainingPoints: 3,
      qualityLevel: 1,
      crit: null,
    })
  })

  it('fails when more points are needed than the talent value', () => {
    const r = talentCheck({
      talentValue: 2,
      modifier: 0,
      attributes: attrs([10, 10, 10]),
      rolls: [13, 2, 2],
    })
    expect(r).toMatchObject({
      success: false,
      pointsNeeded: 3,
      remainingPoints: -1,
      qualityLevel: 0,
    })
  })

  it('a single 1 is an automatic success with QS from the full talent value', () => {
    const r = talentCheck({
      talentValue: 10,
      modifier: 0,
      attributes: attrs([8, 8, 8]),
      rolls: [1, 19, 19],
    })
    expect(r).toMatchObject({
      success: true,
      crit: 'criticalSuccess',
      pointsNeeded: 0,
      remainingPoints: 10,
      qualityLevel: 4,
    })
  })

  it('a single 20 is an automatic failure even with good other rolls', () => {
    const r = talentCheck({
      talentValue: 15,
      modifier: 0,
      attributes: attrs([18, 18, 18]),
      rolls: [20, 2, 2],
    })
    expect(r).toMatchObject({
      success: false,
      crit: 'fumble',
      pointsNeeded: 16,
      remainingPoints: -1,
      qualityLevel: 0,
    })
  })

  it('does not floor modified attributes', () => {
    const r = talentCheck({
      talentValue: 20,
      modifier: -14,
      attributes: attrs([12, 12, 12]),
      rolls: [5, 2, 2],
    })
    expect(r.dice[0]).toMatchObject({ target: -2, pointsNeeded: 7 })
  })

  it('rejects impossible rolls', () => {
    expect(() =>
      talentCheck({
        talentValue: 5,
        modifier: 0,
        attributes: attrs([10, 10, 10]),
        rolls: [0, 5, 5],
      }),
    ).toThrow(RangeError)
  })

  it('matches the old Würfelproben logic for every possible roll', () => {
    const scenarios = [
      { attrs: [8, 8, 8], fw: 0, modifier: 0 },
      { attrs: [12, 14, 13], fw: 7, modifier: 0 },
      { attrs: [14, 14, 16], fw: 12, modifier: 2 },
      { attrs: [15, 11, 13], fw: 18, modifier: -3 },
      { attrs: [9, 10, 8], fw: 4, modifier: -10 },
    ]
    let compared = 0
    for (const s of scenarios) {
      for (const a of D20)
        for (const b of D20)
          for (const c of D20) {
            const rolls = [a, b, c]
            const expected = old.talent(rolls, s.attrs, s.fw, s.modifier)
            const actual = talentCheck({
              talentValue: s.fw,
              modifier: s.modifier,
              attributes: attrs(s.attrs),
              rolls,
            })
            expect({
              success: actual.success,
              pointsNeeded: actual.pointsNeeded,
              remainingPoints: actual.remainingPoints,
              qualityLevel: actual.qualityLevel,
              label: outcomeLabel(actual, 'talent'),
            }).toEqual(expected)
            compared++
          }
    }
    expect(compared).toBe(scenarios.length * 8000)
  })
})

describe('attributeCheck', () => {
  it('adds the modifier to the attribute', () => {
    const r = attributeCheck({ attribute: 'KL', attributeValue: 12, modifier: 2, roll: 14 })
    expect(r).toMatchObject({
      target: 14,
      success: true,
      remainingPoints: 0,
      qualityLevel: 1,
      crit: null,
    })
  })

  it('matches the old logic for every roll, attribute and modifier', () => {
    for (const value of [8, 12, 16, 20]) {
      for (const modifier of [-12, -3, 0, 4]) {
        for (const roll of D20) {
          const r = attributeCheck({ attribute: 'MU', attributeValue: value, modifier, roll })
          expect({
            success: r.success,
            remainingPoints: r.remainingPoints,
            qualityLevel: r.qualityLevel,
            label: outcomeLabel(r, 'attribute'),
          }).toEqual(old.single(roll, value + modifier, 'Kritischer Erfolg!'))
        }
      }
    }
  })
})

describe('attackCheck and damage', () => {
  it('uses AT + AT bonus + temporary bonus as the target', () => {
    const r = attackCheck({ baseAttack: 13, tempBonus: 2, roll: 15 })
    expect(r).toMatchObject({ target: 15, success: true })
    expect(outcomeLabel(attackCheck({ baseAttack: 13, tempBonus: 0, roll: 1 }), 'attack')).toBe(
      'Kritischer Treffer!',
    )
  })

  it('matches the old logic for every roll', () => {
    for (const roll of D20) {
      const r = attackCheck({ baseAttack: 12, tempBonus: -2, roll })
      expect({
        success: r.success,
        remainingPoints: r.remainingPoints,
        qualityLevel: r.qualityLevel,
        label: outcomeLabel(r, 'attack'),
      }).toEqual(old.single(roll, 10, 'Kritischer Treffer!'))
    }
  })

  it('sums W6, weapon modifier and temporary bonus', () => {
    expect(damage([3, 5], 4, 1)).toEqual({ rolls: [3, 5], modifier: 4, tempBonus: 1, total: 13 })
  })
})
