import * as THREE from 'three'

export class CameraManager {
  constructor(scene, containerWidth, containerHeight) {
    this.cameras = []
    this.cameraStates = []  // Individual state for each camera
    this.settleTime = null
    this.SETTLE_DISPLAY_DURATION = 5000
    this.NUMBER_OF_CAMERAS = 3  // Define fixed number of cameras
    this.setupCameras(containerWidth, containerHeight)
  }

  setupCameras(width, height) {
    // Create fixed number of cameras
    this.cameras = Array(this.NUMBER_OF_CAMERAS).fill(null).map(() => 
      new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    )

    // Initialize state for each camera
    this.cameraStates = Array(this.NUMBER_OF_CAMERAS).fill(null).map(() => ({
      mode: 'overview',
      settleTime: null
    }))

    this.resetCameras()
  }

  setMode(mode, index, force = false) {
    // Safety check for index
    if (index < 0 || index >= this.NUMBER_OF_CAMERAS) {
      console.warn(`Invalid camera index: ${index}`)
      return
    }

    const state = this.cameraStates[index]
    if (!state) {
      console.warn(`No state found for camera ${index}`)
      return
    }
    
    if (mode === 'topdown' && state.mode !== 'topdown') {
      state.settleTime = Date.now()
    }
    
    if (force) {
      state.mode = mode
      state.settleTime = null
      return
    }

    // Handle mode transitions for individual camera
    if (state.mode === 'topdown') {
      if (Date.now() - state.settleTime > this.SETTLE_DISPLAY_DURATION) {
        state.mode = 'rotating'
        state.settleTime = null
      }
    } else {
      state.mode = mode
    }
  }

  update(dice, settledDice, rotationAngle) {
    this.cameras.forEach((camera, index) => {
      if (!this.cameraStates[index]) {
        console.warn(`No state found for camera ${index}`)
        return
      }
  
      const state = this.cameraStates[index]
      
      // Check for transition from topdown to rotating
      if (state.mode === 'topdown' && state.settleTime) {
        if (Date.now() - state.settleTime > this.SETTLE_DISPLAY_DURATION) {
          this.setMode('rotating', index, true)
        }
      }
  
      // Get corresponding die or use first die for single die rolls
      const die = dice[index] || (index === 0 ? dice[0] : null)
      
      switch (state.mode) {
        case 'rotating':
        case 'overview':
          this.updateRotatingCamera(camera, index, rotationAngle)
          break
          
        case 'following':
          if (die) {
            this.updateFollowingCamera(camera, die)
          } else {
            this.updateRotatingCamera(camera, index, rotationAngle)
          }
          break
          
        case 'topdown':
          if (die) {
            this.updateTopdownCamera(camera, die)
          }
          break
      }
    })
  }

  updateRotatingCamera(camera, index, rotationAngle) {
    const radius = 12
    const angle = (2 * Math.PI * index) / this.cameras.length + rotationAngle
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const y = 8
    
    camera.position.lerp(new THREE.Vector3(x, y, z), 0.02)
    camera.lookAt(0, 0, 0)
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