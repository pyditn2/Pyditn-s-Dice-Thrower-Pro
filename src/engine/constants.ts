/** Tuned values carried over from the old app, so the dice feel the same. */

export const PHYSICS = {
  gravity: -25,
  timestep: 1 / 120,
  /** Upper bound of physics steps per rendered frame (prevents a spiral of death). */
  maxStepsPerFrame: 12,
  /** Longest frame time fed into the simulation, in seconds. */
  maxFrameTime: 0.1,
} as const

export const DIE_BODY = {
  restitution: 0.3,
  friction: 0.8,
  density: 2.0,
  linearDamping: 0.5,
  angularDamping: 0.5,
} as const

export const SETTLE = {
  /** A die counts as resting when every linear and angular velocity component is below this. */
  velocityThreshold: 0.01,
  /** …for this long (simulated seconds). */
  holdTime: 0.1,
  /** Top face must point this much upwards (cosine), otherwise the die is leaning and gets nudged. */
  flatThreshold: 0.95,
  /** Simulated seconds before stuck dice are nudged, and before they are thrown again. */
  nudgeAfter: 12,
  rethrowAfter: 25,
  /** Dice below this height fell out of the bowl and are thrown again. */
  fallOutY: -5,
} as const

export const BOWL = {
  floorRadius: 10,
  topRadius: 11,
  wallHeight: 4,
  wallThickness: 0.5,
  floor: { restitution: 0.1, friction: 1.0 },
  wall: { restitution: 0.5, friction: 0.2, opacity: 0.8 },
  feltColor: '#0b5d1e',
} as const

export const THROW = {
  baseHeight: 8,
  heightJitter: 2,
  diceSpacing: 2.5,
  upwardVelocity: 8,
  velocityJitter: 2,
  maxAngularVelocity: 15,
} as const

export const TABLE_MODEL = {
  url: 'models/table.glb',
  position: [0, -35.8, 0],
  scale: 17,
  rotationY: -Math.PI / 2,
} as const

export const CAMERA = {
  fov: 45,
  near: 0.1,
  far: 4000,
  orbit: { radius: 18, height: 10, lerp: 0.02, minSpeed: 0.5, maxSpeed: 1.0 },
  follow: { radius: 8, height: 5, lerp: 0.05 },
  topDown: { height: 5, lerp: 0.1, holdSeconds: 5 },
} as const
