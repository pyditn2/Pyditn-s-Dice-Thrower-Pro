import { ref } from 'vue'
import * as THREE from 'three'
import { SETTLE_THRESHOLD } from '../constants/diceTypes'
import { usePhysicsStore } from '../stores/physicsStore'
import { useAudioSystem } from './useAudioSystem'
import RAPIER from '@dimforge/rapier3d-compat'

export const usePhysicsSystem = () => {
  const physicsStore = usePhysicsStore()
  const audioSystem = useAudioSystem()
  const previousState = ref(new Map())
  const currentState = ref(new Map())
  const lastTime = ref(0)
  const accumulator = ref(0)
  let eventQueue = null
  
  const setupCollisionEvents = (world) => {
    // Create event queue for collision detection
    if (!eventQueue) {
      eventQueue = new RAPIER.EventQueue(true)
      console.log('Event queue created:', eventQueue)
    }
  }
  
  const handleCollisions = (world) => {
    if (!eventQueue) return
    
    // Process all collision events
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return // Skip collision end events
      
      // Get the actual colliders from the handles
      const collider1 = world.getCollider(handle1)
      const collider2 = world.getCollider(handle2)
      
      if (!collider1 || !collider2) return
      
      // Get the parent rigid bodies of the colliders
      const body1 = collider1.parent()
      const body2 = collider2.parent()
      
      if (!body1 || !body2) return
      
      // Calculate collision velocity
      const vel1 = body1.linvel()
      const vel2 = body2.linvel()
      
      const relativeVelocity = new THREE.Vector3(
        vel1.x - vel2.x,
        vel1.y - vel2.y,
        vel1.z - vel2.z
      )
      
      const speed = relativeVelocity.length()
      
      // Check if either body is the bowl (using custom user data)
      const isBowlCollision = 
        (body1.userData?.type === 'bowl') || 
        (body2.userData?.type === 'bowl')
      
      console.log('Collision detected:', {
        speed,
        isBowlCollision,
        body1Type: body1.userData?.type,
        body2Type: body2.userData?.type
      })
      
      // Only play sound if speed is above threshold
      if (speed > 0.1) {
        audioSystem.playCollisionSound(speed, isBowlCollision)
      }
    })
  }

  const updatePhysics = (world, deltaTime) => {
    if (!world) return 0
    
    const timeStep = physicsStore.currentTimeStep
    accumulator.value += deltaTime
    
    let stepCount = 0
    while (accumulator.value >= timeStep) {
      // Handle any pending collisions
      handleCollisions(world)
      
      // Step the physics world with the event queue
      world.step(eventQueue)
      
      accumulator.value -= timeStep
      stepCount++
      
      // Prevent too many steps in case of large deltaTime
      if (stepCount >= 3) break
    }
    
    return accumulator.value / timeStep
  }

  const isDiceSettled = (rigidBody) => {
    if (!rigidBody) return true
    
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

  // Rest of the methods remain the same...
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
        die.position.lerpVectors(
          new THREE.Vector3(previous.position.x, previous.position.y, previous.position.z),
          new THREE.Vector3(current.position.x, current.position.y, current.position.z),
          alpha
        )
        
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
    eventQueue = null
  }

  return {
    isDiceSettled,
    updatePhysics,
    storePhysicsState,
    updateCurrentState,
    interpolateVisualState,
    resetPhysicsState,
    setupCollisionEvents,
    lastTime,
  }
}