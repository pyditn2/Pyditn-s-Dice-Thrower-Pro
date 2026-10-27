export const ATTRIBUTE_IDS = ['MU', 'KL', 'IN', 'CH', 'FF', 'GE', 'KO', 'KK'] as const

export type AttributeId = (typeof ATTRIBUTE_IDS)[number]

export const ATTRIBUTE_NAMES: Record<AttributeId, string> = {
  MU: 'Mut',
  KL: 'Klugheit',
  IN: 'Intuition',
  CH: 'Charisma',
  FF: 'Fingerfertigkeit',
  GE: 'Gewandtheit',
  KO: 'Konstitution',
  KK: 'Körperkraft',
}

export const ATTRIBUTE_MIN = 8
export const ATTRIBUTE_MAX = 20
export const ATTRIBUTE_DEFAULT = 8

export function isAttributeId(value: unknown): value is AttributeId {
  return typeof value === 'string' && (ATTRIBUTE_IDS as readonly string[]).includes(value)
}

export function clampAttribute(value: number): number {
  return Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.trunc(value)))
}
