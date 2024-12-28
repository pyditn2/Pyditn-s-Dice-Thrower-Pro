import * as THREE from 'three'
import { markRaw } from 'vue'

export class CameraManager {
  constructor(scene, containerWidth, containerHeight) {
    // Mark raw all THREE.js objects to prevent Vue reactivity
    this.cameras = Array(3).fill(null).map(() => 
      markRaw(new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 1000))
    )
    this.cameraStates = Array(3).fill(null).map(() => ({
      mode: 'overview',
      settleTime: null
    }))
    
    // Mark raw all Vector3 and other THREE.js objects
    this.lastDiePositions = Array(3).fill(null).map(() => 
      markRaw(new THREE.Vector3(0, 0, 0))
    )
    
    this.settleTime = null
    this.SETTLE_DISPLAY_DURATION = 5000
    this.NUMBER_OF_CAMERAS = 3
    this.hasCompletedTopdown = new Set()
    this.rotationSpeeds = new Array(3).fill(0).map(() => Math.random() * 0.5 + 0.5)
    this.individualRotationAngles = new Array(3).fill(0)
    this.lastUpdateTime = Date.now()

    this.resetCameras()
  }

  setupCameras(width, height) {
    // Create fixed number of cameras
    this.cameras = Array(this.NUMBER_OF_CAMERAS).fill(null).map(() => 
      new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    )

    // Initialize state for each camera with default values
    this.cameraStates = Array(this.NUMBER_OF_CAMERAS).fill(null).map(() => ({
      mode: 'overview',
      settleTime: null
    }))

    this.resetCameras()
  }

  reset() {
    this.hasCompletedTopdown.clear()
    this.individualRotationAngles = new Array(this.NUMBER_OF_CAMERAS).fill(0)
    this.lastDiePositions = new Array(this.NUMBER_OF_CAMERAS).fill(null)
    this.lastUpdateTime = Date.now()
    
    // Don't reset camera positions, only states
    this.cameraStates.forEach(state => {
      state.mode = 'overview'
      state.settleTime = null
    })
  }


  setMode(mode, index = 0, force = false) {
    if (index < 0) index = 0
    if (index >= this.NUMBER_OF_CAMERAS) index = this.NUMBER_OF_CAMERAS - 1

    if (!this.cameraStates[index]) {
      this.cameraStates[index] = {
        mode: 'overview',
        settleTime: null
      }
    }

    const state = this.cameraStates[index]
    
    // If die has already completed topdown view, keep it in rotating
    if (this.hasCompletedTopdown.has(index) && mode === 'topdown') {
      return
    }

    // Handle topdown mode entry
    if (mode === 'topdown' && state.mode !== 'topdown') {
      state.settleTime = Date.now()
    }

    // Check for topdown to rotating transition
    if (state.mode === 'topdown' && state.settleTime) {
      if (Date.now() - state.settleTime > this.SETTLE_DISPLAY_DURATION) {
        state.mode = 'rotating'
        this.hasCompletedTopdown.add(index)
        return
      }
    }

    // Set new mode if not in topdown or if forced
    if (force || state.mode !== 'topdown') {
      state.mode = mode
    }
  }

  update(dice, settledDice, rotationAngle) {
    // Calculate delta time in seconds
    const currentTime = Date.now()
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000
    this.lastUpdateTime = currentTime

    this.cameras.forEach((camera, index) => {
      if (!this.cameraStates[index]) return
      
      const state = this.cameraStates[index]
      const die = dice[index] || (index === 0 ? dice[0] : null)
      
      switch (state.mode) {
        case 'rotating':
          this.updateRotatingCamera(camera, index, rotationAngle, deltaTime)
          break
        case 'topdown':
          if (die) {
            this.updateTopdownCamera(camera, die)
          }
          break
        case 'following':
          if (die) {
            this.updateFollowingCamera(camera, die)
          } else {
            this.updateRotatingCamera(camera, index, rotationAngle, deltaTime)
          }
          break
        case 'overview':
          this.updateRotatingCamera(camera, index, rotationAngle, deltaTime)
          break
      }
    })
  }

  updateRotatingCamera(camera, index, rotationAngle, deltaTime) {
    const radius = 8
    
    this.individualRotationAngles[index] += this.rotationSpeeds[index] * deltaTime
    const totalAngle = rotationAngle + this.individualRotationAngles[index]
    
    // Create temporary vectors that won't be reactive
    const diePosition = this.lastDiePositions[index] || markRaw(new THREE.Vector3(0, 0, 0))
    const newPosition = markRaw(new THREE.Vector3(
      diePosition.x + Math.cos(totalAngle) * radius,
      diePosition.y + 5,
      diePosition.z + Math.sin(totalAngle) * radius
    ))
    
    camera.position.lerp(newPosition, 0.02)
    camera.lookAt(diePosition)
  }

  resetCameras() {
    const defaultPositions = [
      markRaw(new THREE.Vector3(0, 8, 12)),
      markRaw(new THREE.Vector3(-8, 8, 8)),
      markRaw(new THREE.Vector3(8, 8, 8))
    ]
    
    this.cameras.forEach((camera, index) => {
      camera.position.copy(defaultPositions[index])
      camera.lookAt(markRaw(new THREE.Vector3(0, 0, 0)))
    })
  }

  updateFollowingCamera(camera, die) {
    const diePosition = markRaw(die.position.clone())
    const radius = 8
    
    // Keep current angle to prevent sudden changes
    const currentAngle = Math.atan2(
      camera.position.z - diePosition.z,
      camera.position.x - diePosition.x
    )
    
    const targetPosition = markRaw(new THREE.Vector3(
      diePosition.x + radius * Math.cos(currentAngle),
      diePosition.y + 5,
      diePosition.z + radius * Math.sin(currentAngle)
    ))
    
    // Use slower lerp for smoother transitions
    camera.position.lerp(targetPosition, 0.05)
    camera.lookAt(diePosition)
  }

  updateTopdownCamera(camera, die) {
    const diePosition = markRaw(die.position.clone())
    const index = this.cameras.indexOf(camera)
    
    this.lastDiePositions[index] = diePosition.clone()
    
    const desiredPosition = markRaw(new THREE.Vector3(
      diePosition.x,
      diePosition.y + 5,
      diePosition.z
    ))
    camera.position.lerp(desiredPosition, 0.1)
    
    const targetRotation = markRaw(new THREE.Euler(-Math.PI/2, 0, 0))
    const targetQuaternion = markRaw(new THREE.Quaternion().setFromEuler(targetRotation))
    camera.quaternion.slerp(targetQuaternion, 0.1)
  }

  getCameras() {
    return this.cameras
  }
}