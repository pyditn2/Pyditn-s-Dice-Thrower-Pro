/** Engine API types, kept apart from the engine so importing them doesn't load three.js/Rapier. */
import type { DieSides } from '@/domain/dice'

export type DieType = `d${DieSides}`

export function dieTypeFor(sides: DieSides): DieType {
  return `d${sides}`
}

export interface DieSpec {
  type: DieType
  color: string
}

export interface EngineState {
  rolling: boolean
  /** Number of views (one per die of the last roll, at least one). */
  viewCount: number
}

export class EngineBusyError extends Error {
  constructor() {
    super('A roll is already in progress')
  }
}
