import * as THREE from 'three'

export class CameraManager {
  constructor(scene, containerWidth, containerHeight) {
    this.cameras = []
    this.cameraStates = []
    this.settleTime = null
    this.SETTLE_DISPLAY_DURATION = 5000
    this.NUMBER_OF_CAMERAS = 3
    this.hasCompletedTopdown = new Set()
    this.rotationSpeeds = new Array(this.NUMBER_OF_CAMERAS).fill(0).map(() => Math.random() * 0.5 + 0.5) // 0.5 to 1.0 radians per second
    this.individualRotationAngles = new Array(this.NUMBER_OF_CAMERAS).fill(0)
    this.lastDiePositions = new Array(this.NUMBER_OF_CAMERAS).fill(null)
    this.lastUpdateTime = Date.now()
    this.setupCameras(containerWidth, containerHeight)
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
    
    // Update rotation angle based on time
    this.individualRotationAngles[index] += this.rotationSpeeds[index] * deltaTime
    const totalAngle = rotationAngle + this.individualRotationAngles[index]
    
    const diePosition = this.lastDiePositions[index] || new THREE.Vector3(0, 0, 0)
    
    const x = diePosition.x + Math.cos(totalAngle) * radius
    const z = diePosition.z + Math.sin(totalAngle) * radius
    const y = diePosition.y + 5
    
    camera.position.lerp(new THREE.Vector3(x, y, z), 0.02)
    camera.lookAt(diePosition)
  }

  resetCameras() {
    this.cameras.forEach((camera, index) => {
      const defaultPositions = [
        new THREE.Vector3(0, 8, 12),    // Main view
        new THREE.Vector3(-8, 8, 8),    // Left view
        new THREE.Vector3(8, 8, 8)      // Right view
      ];
      camera.position.copy(defaultPositions[index]);
      camera.lookAt(0, 0, 0);
    });
  }

  updateFollowingCamera(camera, die) {
    const diePosition = die.position
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
    
    camera.position.lerp(targetPosition, 0.1)
    camera.lookAt(diePosition)
  }

  updateTopdownCamera(camera, die) {
    const diePosition = die.position
    const index = this.cameras.indexOf(camera)
    
    // Store die position for later use in rotating mode
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