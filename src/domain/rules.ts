/**
 * Check rules for PDTP. These are the group's house rules (the old app's "Würfelproben" behaviour),
 * not the official DSA5 rules. See docs/original-app-notes.md, "Rules for the rewrite".
 */
import type { AttributeId } from './attributes'

/** Natural-roll results that bypass the normal success calculation. */
export type Crit = 'spectacularSuccess' | 'spectacularFailure' | 'criticalSuccess' | 'fumble'

export function isCritSuccess(crit: Crit | null): boolean {
  return crit === 'criticalSuccess' || crit === 'spectacularSuccess'
}

/** Qualitätsstufe for the points left over after a successful check (capped at 6). */
export function qualityLevel(remainingPoints: number): number {
  if (remainingPoints >= 16) return 6
  if (remainingPoints >= 13) return 5
  if (remainingPoints >= 10) return 4
  if (remainingPoints >= 7) return 3
  if (remainingPoints >= 4) return 2
  return 1
}

function assertD20(roll: number): void {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
    throw new RangeError(`Not a W20 result: ${roll}`)
  }
}

// --- Single W20 against a target (Eigenschaftsprobe, Attacke) -----------------------------------

export interface SingleCheckResult {
  roll: number
  /** Value the roll has to meet, after modifiers. */
  target: number
  success: boolean
  crit: 'criticalSuccess' | 'fumble' | null
  /** Points left over (target − roll) on success, 0 on failure. */
  remainingPoints: number
  /** 0 on failure. */
  qualityLevel: number
}

/** A 1 always succeeds, a 20 always fails, otherwise roll ≤ target. */
export function singleCheck(roll: number, target: number): SingleCheckResult {
  assertD20(roll)
  const crit = roll === 1 ? 'criticalSuccess' : roll === 20 ? 'fumble' : null
  const success = roll === 1 || (roll !== 20 && roll <= target)
  const remainingPoints = success ? target - roll : 0
  return {
    roll,
    target,
    success,
    crit,
    remainingPoints,
    qualityLevel: success ? qualityLevel(remainingPoints) : 0,
  }
}

export interface AttributeCheckResult extends SingleCheckResult {
  kind: 'attribute'
  attribute: AttributeId
  attributeValue: number
  modifier: number
}

/** Eigenschaftsprobe. A positive modifier makes the check easier (Erleichterung). */
export function attributeCheck(input: {
  attribute: AttributeId
  attributeValue: number
  modifier: number
  roll: number
}): AttributeCheckResult {
  const { attribute, attributeValue, modifier, roll } = input
  return {
    kind: 'attribute',
    attribute,
    attributeValue,
    modifier,
    ...singleCheck(roll, attributeValue + modifier),
  }
}

// --- Talentprobe ---------------------------------------------------------------------------------

export interface TalentDieResult {
  attribute: AttributeId
  attributeValue: number
  /** Attribute value plus modifier. Not floored, so it can be 0 or negative. */
  target: number
  roll: number
  /** Talent points this die costs: max(0, roll − target). */
  pointsNeeded: number
}

export interface TalentCheckResult {
  kind: 'talent'
  talentValue: number
  modifier: number
  dice: TalentDieResult[]
  success: boolean
  crit: Crit | null
  /** Total talent points spent. On a crit: 0 for a success, FW + 1 for a failure. */
  pointsNeeded: number
  /** FW − points needed. On a crit: FW for a success, −1 for a failure. */
  remainingPoints: number
  /** 0 on failure. */
  qualityLevel: number
}

/** Crit precedence: two+ 1s, two+ 20s, one 1, one 20. */
export function talentCrit(rolls: readonly number[]): Crit | null {
  const ones = rolls.filter((r) => r === 1).length
  const twenties = rolls.filter((r) => r === 20).length
  if (ones >= 2) return 'spectacularSuccess'
  if (twenties >= 2) return 'spectacularFailure'
  if (ones === 1) return 'criticalSuccess'
  if (twenties === 1) return 'fumble'
  return null
}

export function talentCheck(input: {
  talentValue: number
  modifier: number
  attributes: readonly { attribute: AttributeId; value: number }[]
  rolls: readonly number[]
}): TalentCheckResult {
  const { talentValue, modifier, attributes, rolls } = input
  if (attributes.length !== 3 || rolls.length !== 3) {
    throw new RangeError('A talent check needs exactly three attributes and three rolls')
  }
  rolls.forEach(assertD20)

  const dice: TalentDieResult[] = attributes.map(({ attribute, value }, i) => {
    const roll = rolls[i]!
    const target = value + modifier
    return {
      attribute,
      attributeValue: value,
      target,
      roll,
      pointsNeeded: Math.max(0, roll - target),
    }
  })

  const crit = talentCrit(rolls)
  if (crit) {
    const success = isCritSuccess(crit)
    return {
      kind: 'talent',
      talentValue,
      modifier,
      dice,
      success,
      crit,
      pointsNeeded: success ? 0 : talentValue + 1,
      remainingPoints: success ? talentValue : -1,
      qualityLevel: success ? qualityLevel(talentValue) : 0,
    }
  }

  const pointsNeeded = dice.reduce((sum, d) => sum + d.pointsNeeded, 0)
  const success = pointsNeeded <= talentValue
  const remainingPoints = talentValue - pointsNeeded
  return {
    kind: 'talent',
    talentValue,
    modifier,
    dice,
    success,
    crit: null,
    pointsNeeded,
    remainingPoints,
    qualityLevel: success ? qualityLevel(remainingPoints) : 0,
  }
}

// --- Kampf ---------------------------------------------------------------------------------------

export interface AttackCheckResult extends SingleCheckResult {
  kind: 'attack'
  /** AT + AT bonus of the weapon. */
  baseAttack: number
  tempBonus: number
}

/** Attacke: target = AT + AT bonus + temporary bonus. */
export function attackCheck(input: {
  baseAttack: number
  tempBonus: number
  roll: number
}): AttackCheckResult {
  const { baseAttack, tempBonus, roll } = input
  return {
    kind: 'attack',
    baseAttack,
    tempBonus,
    ...singleCheck(roll, baseAttack + tempBonus),
  }
}

export interface DamageResult {
  rolls: number[]
  modifier: number
  tempBonus: number
  total: number
}

/** Trefferpunkte: sum of the W6 + weapon modifier + temporary bonus. */
export function damage(
  rolls: readonly number[],
  modifier: number,
  tempBonus: number,
): DamageResult {
  const total = rolls.reduce((sum, r) => sum + r, 0) + modifier + tempBonus
  return { rolls: [...rolls], modifier, tempBonus, total }
}

// --- Labels --------------------------------------------------------------------------------------

export function critLabel(crit: Crit, context: 'attribute' | 'talent' | 'attack'): string {
  switch (crit) {
    case 'spectacularSuccess':
      return 'Spektakulärer Erfolg!'
    case 'spectacularFailure':
      return 'Spektakulärer Patzer!'
    case 'criticalSuccess':
      return context === 'attack' ? 'Kritischer Treffer!' : 'Kritischer Erfolg!'
    case 'fumble':
      return 'Patzer!'
  }
}

export function outcomeLabel(
  result: { success: boolean; crit: Crit | null },
  context: 'attribute' | 'talent' | 'attack',
): string {
  if (result.crit) return critLabel(result.crit, context)
  return result.success ? 'Erfolg!' : 'Misserfolg!'
}
