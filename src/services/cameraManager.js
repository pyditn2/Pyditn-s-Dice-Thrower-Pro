import * as THREE from 'three'
import { markRaw } from 'vue'

export class CameraManager {
  constructor(scene, containerWidth, containerHeight) {
    this.containerWidth = containerWidth
    this.containerHeight = containerHeight
    
    this.cameras = []
    this.cameraStates = []
    this.lastDiePositions = []
    
    this.settleTime = null
    this.SETTLE_DISPLAY_DURATION = 5000
    this.hasCompletedTopdown = new Set()
    this.rotationSpeeds = []
    this.individualRotationAngles = []
    this.lastUpdateTime = Date.now()
  }

  ensureCameraCount(count) {
    // Add new cameras if needed
    while (this.cameras.length < count) {
      const camera = new THREE.PerspectiveCamera(45, this.containerWidth / this.containerHeight, 0.1, 2000)
      this.cameras.push(camera)
      this.cameraStates.push({
        mode: 'overview',
        settleTime: null
      })
      this.lastDiePositions.push(new THREE.Vector3(0, 0, 0))
      this.rotationSpeeds.push(Math.random() * 0.5 + 0.5)
      this.individualRotationAngles.push(0)
    }
  }

  reset() {
    this.hasCompletedTopdown.clear()
    this.individualRotationAngles = new Array(this.cameras.length).fill(0)
    this.lastDiePositions = new Array(this.cameras.length).fill(null)
    this.lastUpdateTime = Date.now()
    
    this.cameraStates.forEach(state => {
      state.mode = 'overview'
      state.settleTime = null
    })

    const defaultPositions = this.cameras.map((_, index) => {
      const angle = (index / this.cameras.length) * Math.PI * 2
      return new THREE.Vector3(
        8 * Math.cos(angle),
        8,
        8 * Math.sin(angle)
      )
    })

    this.cameras.forEach((camera, index) => {
      camera.position.copy(defaultPositions[index])
      camera.lookAt(new THREE.Vector3(0, 0, 0))
    })
  }

  setMode(mode, index = 0, force = false) {
    if (index < 0) index = 0
    if (index >= this.cameras.length) return  // Don't try to set mode for non-existent cameras
    
    if (!this.cameraStates[index]) {
      this.cameraStates[index] = {
        mode: 'overview',
        settleTime: null
      }
    }
    //ToDo: handle camera state differently, this is too brittle
    const state = this.cameraStates[index]
    
    if (this.hasCompletedTopdown.has(index) && mode === 'topdown') {
      return
    }

    if (mode === 'topdown' && state.mode !== 'topdown') {
      state.settleTime = Date.now()
    }

    if (state.mode === 'topdown' && state.settleTime) {
      if (Date.now() - state.settleTime > this.SETTLE_DISPLAY_DURATION) {
        state.mode = 'rotating'
        this.hasCompletedTopdown.add(index)
        return
      }
    }

    if (force || state.mode !== 'topdown') {
      state.mode = mode
    }
  }

  update(dice, settledDice, rotationAngle) {
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
            this.updateTopdownCamera(camera, die, index)
          }
          break
        case 'following':
          if (die) {
            this.updateFollowingCamera(camera, die, index)
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
    const radius = 18
    
    this.individualRotationAngles[index] += this.rotationSpeeds[index] * deltaTime
    const totalAngle = rotationAngle + this.individualRotationAngles[index]
    
    const diePosition = this.lastDiePositions[index] || new THREE.Vector3(0, 0, 0)
    const newPosition = new THREE.Vector3(
      diePosition.x + Math.cos(totalAngle) * radius,
      diePosition.y + 10,
      diePosition.z + Math.sin(totalAngle) * radius
    )
    
    camera.position.lerp(newPosition, 0.02)
    camera.lookAt(diePosition)
  }

  updateFollowingCamera(camera, die, index) {
    const diePosition = die.position.clone()
    const radius = 8
    
    const currentAngle = Math.atan2(
      camera.position.z - diePosition.z,
      camera.position.x - diePosition.x
    )
    
    const targetPosition = new THREE.Vector3(
      diePosition.x + radius * Math.cos(currentAngle),
      diePosition.y + 5,
      diePosition.z + radius * Math.sin(currentAngle)
    )
    
    this.lastDiePositions[index] = diePosition.clone()
    camera.position.lerp(targetPosition, 0.05)
    camera.lookAt(diePosition)
  }

  updateTopdownCamera(camera, die, index) {
    const diePosition = die.position.clone()
    this.lastDiePositions[index] = diePosition.clone()
    
    const desiredPosition = new THREE.Vector3(
      diePosition.x,
      diePosition.y + 5,
      diePosition.z
    )
    camera.position.lerp(desiredPosition, 0.1)
    
    const targetRotation = new THREE.Euler(-Math.PI/2, 0, 0)
    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetRotation)
    camera.quaternion.slerp(targetQuaternion, 0.1)
  }

  getCameras() {
    return this.cameras
  }
}