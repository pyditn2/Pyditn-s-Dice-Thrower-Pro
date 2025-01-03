import { ref } from 'vue'
import * as THREE from 'three'
import { SETTLE_THRESHOLD } from '../constants/diceTypes'

export const usePhysicsSystem = () => {
  const previousState = ref(new Map())
  const currentState = ref(new Map())
  const lastTime = ref(0)
  const accumulator = ref(0)
  
  const FIXED_TIME_STEP = 1/120
  const MAX_SUBSTEPS = 3

  const isDiceSettled = (rigidBody) => {
    const vel = rigidBody.linvel()
    const angVel = rigidBody.angvel()
    
    const settled = Math.abs(vel.x) < SETTLE_THRESHOLD && 
                   Math.abs(vel.y) < SETTLE_THRESHOLD && 
                   Math.abs(vel.z) < SETTLE_THRESHOLD &&
                   Math.abs(angVel.x) < SETTLE_THRESHOLD &&
                   Math.abs(angVel.y) < SETTLE_THRESHOLD &&
                   Math.abs(angVel.z) < SETTLE_THRESHOLD



    return settled
}

  const updatePhysics = (world, deltaTime) => {
    accumulator.value += deltaTime
    while (accumulator.value >= FIXED_TIME_STEP) {
      world.step()
      accumulator.value -= FIXED_TIME_STEP
    }
    return accumulator.value / FIXED_TIME_STEP
  }

  const storePhysicsState = (rigidBodies) => {
    rigidBodies.forEach((rb, index) => {
      if (rb) {
        previousState.value.set(index, {
          position: rb.translation(),
          rotation: rb.rotation()
        })
      }
    })
  }

  const updateCurrentState = (rigidBodies) => {
    rigidBodies.forEach((rb, index) => {
      if (rb) {
        currentState.value.set(index, {
          position: rb.translation(),
          rotation: rb.rotation()
        })
      }
    })
  }

  const interpolateVisualState = (dice, alpha) => {
    dice.forEach((die, index) => {
      const previous = previousState.value.get(index)
      const current = currentState.value.get(index)
      
      if (previous && current && die) {
        // Interpolate position
        die.position.lerpVectors(
          new THREE.Vector3(previous.position.x, previous.position.y, previous.position.z),
          new THREE.Vector3(current.position.x, current.position.y, current.position.z),
          alpha
        )
        
        // Interpolate rotation
        const prevQuat = new THREE.Quaternion(
          previous.rotation.x, previous.rotation.y, 
          previous.rotation.z, previous.rotation.w
        )
        const currQuat = new THREE.Quaternion(
          current.rotation.x, current.rotation.y, 
          current.rotation.z, current.rotation.w
        )
        die.quaternion.slerpQuaternions(prevQuat, currQuat, alpha)
      }
    })
  }

  const resetPhysicsState = () => {
    previousState.value.clear()
    currentState.value.clear()
    lastTime.value = 0
    accumulator.value = 0
  }

  return {
    isDiceSettled,
    updatePhysics,
    storePhysicsState,
    updateCurrentState,
    interpolateVisualState,
    resetPhysicsState,
    lastTime,
  }
}