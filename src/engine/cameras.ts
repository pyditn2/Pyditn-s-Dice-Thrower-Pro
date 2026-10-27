import * as THREE from 'three'

import { CAMERA } from './constants'

type Mode = 'orbit' | 'follow' | 'topDown'

/** Frame-rate independent version of the old per-frame lerp factors (tuned at 60 fps). */
function smoothing(perFrame: number, dt: number): number {
  return 1 - Math.pow(1 - perFrame, dt * 60)
}

const DOWN = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))

/**
 * One camera per die: follows it while rolling, looks straight down at the result for a few
 * seconds once it rests, then slowly orbits around it.
 */
export class DieCamera {
  readonly camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)
  private mode: Mode = 'orbit'
  private topDownSince = 0
  private orbitAngle: number
  private readonly orbitSpeed: number
  private readonly focus = new THREE.Vector3()
  private readonly target = new THREE.Vector3()

  constructor(index: number, count: number) {
    this.orbitAngle = (index / Math.max(1, count)) * Math.PI * 2
    this.orbitSpeed =
      CAMERA.orbit.minSpeed + Math.random() * (CAMERA.orbit.maxSpeed - CAMERA.orbit.minSpeed)
    this.camera.position.set(
      Math.cos(this.orbitAngle) * CAMERA.orbit.radius,
      CAMERA.orbit.height,
      Math.sin(this.orbitAngle) * CAMERA.orbit.radius,
    )
    this.camera.lookAt(this.focus)
  }

  /** Back to orbiting the bowl centre (camera reset button). */
  reset(): void {
    this.mode = 'orbit'
    this.focus.set(0, 0, 0)
  }

  follow(): void {
    this.mode = 'follow'
  }

  /** Called every frame once the die rests; switches to top-down once, then to orbit. */
  settled(now: number): void {
    if (this.mode === 'follow') {
      this.mode = 'topDown'
      this.topDownSince = now
    } else if (
      this.mode === 'topDown' &&
      now - this.topDownSince > CAMERA.topDown.holdSeconds * 1000
    ) {
      this.mode = 'orbit'
    }
  }

  update(dt: number, die: THREE.Object3D | undefined): void {
    const cam = this.camera
    if (die && this.mode !== 'orbit') this.focus.copy(die.position)

    switch (this.mode) {
      case 'orbit': {
        this.orbitAngle += this.orbitSpeed * dt
        this.target.set(
          this.focus.x + Math.cos(this.orbitAngle) * CAMERA.orbit.radius,
          this.focus.y + CAMERA.orbit.height,
          this.focus.z + Math.sin(this.orbitAngle) * CAMERA.orbit.radius,
        )
        cam.position.lerp(this.target, smoothing(CAMERA.orbit.lerp, dt))
        cam.lookAt(this.focus)
        break
      }
      case 'follow': {
        const angle = Math.atan2(cam.position.z - this.focus.z, cam.position.x - this.focus.x)
        this.target.set(
          this.focus.x + Math.cos(angle) * CAMERA.follow.radius,
          this.focus.y + CAMERA.follow.height,
          this.focus.z + Math.sin(angle) * CAMERA.follow.radius,
        )
        cam.position.lerp(this.target, smoothing(CAMERA.follow.lerp, dt))
        cam.lookAt(this.focus)
        break
      }
      case 'topDown': {
        this.target.set(this.focus.x, this.focus.y + CAMERA.topDown.height, this.focus.z)
        const t = smoothing(CAMERA.topDown.lerp, dt)
        cam.position.lerp(this.target, t)
        cam.quaternion.slerp(DOWN, t)
        break
      }
    }
  }
}
