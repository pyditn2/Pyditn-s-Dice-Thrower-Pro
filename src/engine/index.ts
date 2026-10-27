import type { DiceEngine } from './DiceEngine'

export type { DiceEngine } from './DiceEngine'
export { EngineBusyError, dieTypeFor, type DieSpec, type DieType, type EngineState } from './types'

let engine: Promise<DiceEngine> | null = null

/**
 * The app shares one engine, so the scene and table survive switching tabs. It is loaded on demand
 * (three.js and the physics engine are most of the download), so the UI shows up right away.
 */
export function getDiceEngine(): Promise<DiceEngine> {
  engine ??= import('./DiceEngine').then(({ DiceEngine }) =>
    DiceEngine.create(import.meta.env.BASE_URL),
  )
  return engine
}
