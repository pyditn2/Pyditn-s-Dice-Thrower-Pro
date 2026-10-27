/** Die sizes the app can roll (W4 … W20). */
export const DIE_SIDES = [4, 6, 8, 10, 12, 20] as const

export type DieSides = (typeof DIE_SIDES)[number]

export function isDieSides(value: unknown): value is DieSides {
  return typeof value === 'number' && (DIE_SIDES as readonly number[]).includes(value)
}
