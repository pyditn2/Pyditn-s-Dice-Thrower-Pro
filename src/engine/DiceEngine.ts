import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'

import type { ThrowSettings } from '@/persistence/schema'
import { CollisionAudio } from './audio'
import { DieCamera } from './cameras'
import { DIE_BODY, PHYSICS, SETTLE, THROW } from './constants'
import { createDieMesh, dieModel, disposeDieMesh, readTopFace } from './dice'
import { addLights, createBowl, createStarrySky, loadTable } from './scene'
import { EngineBusyError, type DieSpec, type DieType, type EngineState } from './types'

interface Pose {
  position: THREE.Vector3
  rotation: THREE.Quaternion
}

interface ActiveDie {
  spec: DieSpec
  mesh: THREE.Mesh
  body: RAPIER.RigidBody
  previous: Pose
  current: Pose
  /** Simulated seconds the die has been below the settle threshold. */
  restTime: number
}

interface PendingRoll {
  resolve: (values: number[]) => void
  elapsed: number
  nudged: boolean
}

const MAX_PIXEL_RATIO = 2

function pose(body: RAPIER.RigidBody, target?: Pose): Pose {
  const t = body.translation()
  const r = body.rotation()
  const p = target ?? { position: new THREE.Vector3(), rotation: new THREE.Quaternion() }
  p.position.set(t.x, t.y, t.z)
  p.rotation.set(r.x, r.y, r.z, r.w)
  return p
}

function isResting(body: RAPIER.RigidBody): boolean {
  if (body.isSleeping()) return true
  const v = body.linvel()
  const w = body.angvel()
  const limit = SETTLE.velocityThreshold
  return [v.x, v.y, v.z, w.x, w.y, w.z].every((c) => Math.abs(c) < limit)
}

export class DiceEngine {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly world: RAPIER.World
  private readonly events = new RAPIER.EventQueue(true)
  private readonly audio: CollisionAudio
  private dice: ActiveDie[] = []
  private cameras: DieCamera[] = [new DieCamera(0, 1)]
  private views: HTMLCanvasElement[] = []
  private readonly contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>()
  private readonly listeners = new Set<(state: EngineState) => void>()
  private pending: PendingRoll | null = null
  private accumulator = 0
  private lastFrame = 0
  private frameHandle = 0
  private speed = 1
  private throwSettings: ThrowSettings = { angle: 0, distance: 10, strength: 15 }

  /** Loads the physics engine (WASM) and builds the scene. */
  static async create(baseUrl: string): Promise<DiceEngine> {
    await RAPIER.init()
    return new DiceEngine(baseUrl)
  }

  private constructor(baseUrl: string) {
    // WebKitGTK (Linux desktop app) struggles with antialiasing and soft shadows.
    const isLinux = /linux/i.test(navigator.userAgent) && !/android/i.test(navigator.userAgent)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isLinux,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(1)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = isLinux ? THREE.BasicShadowMap : THREE.PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false

    this.world = new RAPIER.World({ x: 0, y: PHYSICS.gravity, z: 0 })
    this.world.timestep = PHYSICS.timestep
    this.audio = new CollisionAudio(baseUrl)

    this.scene.background = createStarrySky()
    addLights(this.scene)
    createBowl(this.scene, this.world)
    loadTable(this.scene, baseUrl)
  }

  // --- settings & state ----------------------------------------------------------------------------

  setSpeed(speed: number): void {
    this.speed = speed
  }

  setThrow(settings: ThrowSettings): void {
    this.throwSettings = { ...settings }
  }

  setMuted(muted: boolean): void {
    this.audio.muted = muted
  }

  get state(): EngineState {
    return { rolling: this.pending !== null, viewCount: Math.max(1, this.dice.length) }
  }

  subscribe(listener: (state: EngineState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    const state = this.state
    for (const listener of this.listeners) listener(state)
  }

  /** Canvases to show the dice in, one per die. Pass [] when the views go away. */
  attachViews(canvases: HTMLCanvasElement[]): void {
    this.views = canvases
    this.ensureLoop()
  }

  resetCameras(): void {
    for (const camera of this.cameras) camera.reset()
  }

  // --- rolling -------------------------------------------------------------------------------------

  /** Throws the dice and resolves with the values they show once they all rest. */
  roll(specs: DieSpec[]): Promise<number[]> {
    if (this.pending) return Promise.reject(new EngineBusyError())
    void this.audio.unlock()

    this.clearDice()
    while (this.cameras.length < specs.length) {
      this.cameras.push(new DieCamera(this.cameras.length, specs.length))
    }
    this.cameras.length = Math.max(1, specs.length)

    specs.forEach((spec, index) => {
      const mesh = createDieMesh(spec.type, spec.color)
      const body = this.createBody(spec.type)
      this.throwDie(body, index, specs.length)
      this.scene.add(mesh)
      const current = pose(body)
      this.dice.push({
        spec,
        mesh,
        body,
        current,
        previous: { position: current.position.clone(), rotation: current.rotation.clone() },
        restTime: 0,
      })
      this.cameras[index]!.follow()
    })

    const result = new Promise<number[]>((resolve) => {
      this.pending = { resolve, elapsed: 0, nudged: false }
    })
    this.emit()
    this.ensureLoop()
    return result
  }

  private createBody(type: DieType): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setLinearDamping(DIE_BODY.linearDamping)
        .setAngularDamping(DIE_BODY.angularDamping)
        .setCcdEnabled(true),
    )
    this.world.createCollider(
      RAPIER.ColliderDesc.convexHull(dieModel(type).hullPoints)!
        .setRestitution(DIE_BODY.restitution)
        .setFriction(DIE_BODY.friction)
        .setDensity(DIE_BODY.density)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    )
    return body
  }

  /** Places a die at the configured throw position and gives it its throw velocity. */
  private throwDie(body: RAPIER.RigidBody, index: number, count: number): void {
    const { angle, distance, strength } = this.throwSettings
    const a = (angle * Math.PI) / 180
    const spread = (index - (count - 1) / 2) * THROW.diceSpacing
    const position = {
      x: distance * Math.cos(a) + spread * Math.cos(a + Math.PI / 2),
      y: THROW.baseHeight + Math.random() * THROW.heightJitter,
      z: distance * Math.sin(a) + spread * Math.sin(a + Math.PI / 2),
    }
    const jitter = () => (Math.random() * 2 - 1) * THROW.velocityJitter
    const spin = () => (Math.random() * 2 - 1) * THROW.maxAngularVelocity
    body.setTranslation(position, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    body.setLinvel(
      {
        x: -strength * Math.cos(a) + jitter(),
        y: THROW.upwardVelocity,
        z: -strength * Math.sin(a) + jitter(),
      },
      true,
    )
    body.setAngvel({ x: spin(), y: spin(), z: spin() }, true)
  }

  private nudge(body: RAPIER.RigidBody): void {
    const mass = body.mass()
    const r = () => (Math.random() * 2 - 1) * mass
    body.applyImpulse({ x: r() * 0.5, y: mass * 3, z: r() * 0.5 }, true)
    body.applyTorqueImpulse({ x: r() * 0.3, y: r() * 0.3, z: r() * 0.3 }, true)
  }

  private clearDice(): void {
    for (const die of this.dice) {
      this.world.removeRigidBody(die.body)
      disposeDieMesh(die.mesh)
    }
    this.dice = []
  }

  // --- simulation ----------------------------------------------------------------------------------

  private step(): void {
    for (const die of this.dice) {
      die.previous.position.copy(die.current.position)
      die.previous.rotation.copy(die.current.rotation)
    }
    this.world.step(this.events)
    this.events.drainCollisionEvents((h1, h2, started) => {
      if (started) this.onCollision(h1, h2)
    })

    this.dice.forEach((die, index) => {
      pose(die.body, die.current)
      if (die.current.position.y < SETTLE.fallOutY) {
        this.throwDie(die.body, index, this.dice.length)
        pose(die.body, die.current)
        die.previous.position.copy(die.current.position)
        die.previous.rotation.copy(die.current.rotation)
      }
      die.restTime = isResting(die.body) ? die.restTime + PHYSICS.timestep : 0
    })

    if (this.pending) this.checkRoll(this.pending)
  }

  private onCollision(handle1: number, handle2: number): void {
    const b1 = this.world.getCollider(handle1)?.parent()
    const b2 = this.world.getCollider(handle2)?.parent()
    if (!b1 || !b2) return
    const v1 = b1.linvel()
    const v2 = b2.linvel()
    const speed = Math.hypot(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z)
    this.audio.collision(speed, b1.isFixed() || b2.isFixed())
  }

  private checkRoll(pending: PendingRoll): void {
    pending.elapsed += PHYSICS.timestep
    const resting = this.dice.map((d) => d.restTime >= SETTLE.holdTime)

    if (resting.every(Boolean)) {
      const faces = this.dice.map((d) => readTopFace(d.spec.type, d.current.rotation))
      const leaning = faces.map((f) => f.flatness < SETTLE.flatThreshold)
      if (!leaning.some(Boolean)) {
        this.pending = null
        pending.resolve(faces.map((f) => f.value))
        this.emit()
        return
      }
      this.dice.forEach((die, i) => {
        if (leaning[i]) {
          this.nudge(die.body)
          die.restTime = 0
        }
      })
    }

    if (pending.elapsed > SETTLE.rethrowAfter) {
      this.dice.forEach((die, i) => {
        if (!resting[i]) this.throwDie(die.body, i, this.dice.length)
      })
      pending.elapsed = 0
      pending.nudged = false
    } else if (pending.elapsed > SETTLE.nudgeAfter && !pending.nudged) {
      this.dice.forEach((die, i) => {
        if (!resting[i]) this.nudge(die.body)
      })
      pending.nudged = true
    }
  }

  // --- frame loop ----------------------------------------------------------------------------------

  private ensureLoop(): void {
    if (this.frameHandle || (!this.pending && this.views.length === 0)) return
    this.lastFrame = performance.now()
    this.frameHandle = requestAnimationFrame(this.frame)
  }

  private readonly frame = (time: number): void => {
    const dt = Math.min(Math.max(0, (time - this.lastFrame) / 1000), PHYSICS.maxFrameTime)
    this.lastFrame = time

    this.accumulator += dt * this.speed
    let steps = 0
    while (this.accumulator >= PHYSICS.timestep && steps < PHYSICS.maxStepsPerFrame) {
      this.step()
      this.accumulator -= PHYSICS.timestep
      steps++
    }
    if (steps === PHYSICS.maxStepsPerFrame) this.accumulator = 0

    const alpha = this.accumulator / PHYSICS.timestep
    for (const die of this.dice) {
      die.mesh.position.lerpVectors(die.previous.position, die.current.position, alpha)
      die.mesh.quaternion.slerpQuaternions(die.previous.rotation, die.current.rotation, alpha)
    }

    const now = performance.now()
    this.cameras.forEach((camera, i) => {
      const die = this.dice[i]
      if (die && die.restTime >= SETTLE.holdTime) camera.settled(now)
      camera.update(dt, die?.mesh)
    })

    this.render()

    if (this.pending || this.views.length > 0) {
      this.frameHandle = requestAnimationFrame(this.frame)
    } else {
      this.frameHandle = 0
    }
  }

  private render(): void {
    const first = this.views[0]
    if (!first) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
    const width = Math.max(1, Math.round(first.clientWidth * dpr))
    const height = Math.max(1, Math.round(first.clientHeight * dpr))
    const size = this.renderer.getSize(new THREE.Vector2())
    if (size.x !== width || size.y !== height) this.renderer.setSize(width, height, false)

    this.renderer.shadowMap.needsUpdate = true
    this.views.forEach((view, i) => {
      const camera = this.cameras[i]?.camera
      if (!camera) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      this.renderer.render(this.scene, camera)
      this.renderer.shadowMap.needsUpdate = false

      if (view.width !== width || view.height !== height) {
        view.width = width
        view.height = height
      }
      let ctx = this.contexts.get(view)
      if (!ctx) {
        ctx = view.getContext('2d')!
        this.contexts.set(view, ctx)
      }
      ctx.drawImage(this.renderer.domElement, 0, 0)
    })
  }
}
