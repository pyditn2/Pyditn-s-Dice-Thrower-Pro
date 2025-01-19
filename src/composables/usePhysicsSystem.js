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
  let lastCollisionTime = 0
  const COLLISION_COOLDOWN = 100 // milliseconds

  const setupCollisionEvents = (world) => {
    console.log('Setting up collision events...')
    eventQueue = new RAPIER.EventQueue(true)
    // Call setup immediately
    setupPhysicsAndAudio()
  }

  const setupPhysicsAndAudio = async () => {
    console.log('Setting up physics and audio...')
    try {
      // Wait for audio initialization
      await audioSystem.initPromise
      console.log('Audio initialization complete')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }

  const handleCollisions = (world) => {
    if (!eventQueue || !world) return
    
    world.forEachCollider(collider => {
      if (!collider.parent()) return
      collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    })
    
    const currentTime = performance.now()
    
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (!started) return
      
      const collider1 = world.getCollider(handle1)
      const collider2 = world.getCollider(handle2)
      
      if (!collider1 || !collider2) return
      
      const body1 = collider1.parent()
      const body2 = collider2.parent()
      
      if (!body1 || !body2) return
      
      const vel1 = body1.linvel()
      const vel2 = body2.linvel()
      
      const relativeVelocity = new THREE.Vector3(
        vel1.x - vel2.x,
        vel1.y - vel2.y,
        vel1.z - vel2.z
      )
      
      const speed = relativeVelocity.length()
      const isBowlCollision = body1.isFixed() || body2.isFixed()
      
      // Skip if too soon after last collision
      if (currentTime - lastCollisionTime < COLLISION_COOLDOWN) {
        return
      }
      
      // Adjusted minimum speed threshold
      if (speed < 0.05) {
        return
      }
  
      // Log the speed for debugging
      console.log(`Collision speed: ${speed.toFixed(3)} (${isBowlCollision ? 'bowl' : 'dice'})`);
  
      // Apply a more aggressive scaling to the raw speed
      const scaledSpeed = Math.pow(speed, 1.5) / 2  // This will make quiet collisions much quieter
  
      // Update last collision time
      lastCollisionTime = currentTime
      
      audioSystem.playCollisionSound(scaledSpeed, isBowlCollision)
    })
  }

  const updatePhysics = (world, deltaTime) => {
    if (!world) return 0
    
    const timeStep = physicsStore.currentTimeStep
    accumulator.value += deltaTime
    
    let stepCount = 0
    while (accumulator.value >= timeStep) {
      world.step(eventQueue)
      handleCollisions(world)
      
      accumulator.value -= timeStep
      stepCount++
      
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