import * as THREE from 'three'
import { D6Dice } from './D6Dice'
import { D20Dice } from './D20Dice'

export class DiceManager {
  constructor() {
    // Pool of pre-created dice instances
    this.dicePool = {
      'd6': [],
      'd20': []
    }
    this.poolSize = 10  // Maximum number of pre-created dice per type
    this.activeDice = new Map()
    this.wireframesVisible = false
    
    // Initialize the pools immediately
    this.initializePools()
  }

  initializePools() {
    // Create dice instances up to poolSize
    for (let i = 0; i < this.poolSize; i++) {
      const d6 = new D6Dice()
      const d20 = new D20Dice()
      this.dicePool['d6'].push(d6)
      this.dicePool['d20'].push(d20)
    }
  }

  getDiceFromPool(type) {
    // Get an existing dice from pool or create new if pool is empty
    const pool = this.dicePool[type]
    if (pool.length > 0) {
      return pool.pop()
    }
    return type === 'd6' ? new D6Dice() : new D20Dice()
  }

  returnDiceToPool(dice, type) {
    // Return dice to pool if pool isn't full
    if (this.dicePool[type].length < this.poolSize) {
      // Reset dice to initial state if necessary
      dice.resetState?.() // Optional method to reset dice state
      this.dicePool[type].push(dice)
    }
  }

  createDice(type, world, appearance = null) {
    if (!['d6', 'd20'].includes(type)) {
      throw new Error(`Unsupported dice type: ${type}`)
    }
    
    // Get dice instance from pool instead of creating new
    const dice = this.getDiceFromPool(type)
    
    // Apply appearance if provided
    if (appearance) {
      dice.setAppearance(appearance)
    }
    
    // Create mesh and rigid body for this instance
    const { mesh, rigidBody } = dice.createDice(world)
    
    // Handle wireframe
    if (rigidBody.userData?.wireframeMesh) {
      mesh.add(rigidBody.userData.wireframeMesh)
      rigidBody.userData.wireframeMesh.visible = this.wireframesVisible
    }
    
    // Store dice info for cleanup
    this.activeDice.set(mesh.uuid, {
      creator: dice,
      rigidBody: rigidBody,
      world: world,
      mesh: mesh,
      appearance: appearance,
      type: type  // Store type for returning to correct pool
    })
    
    return { mesh, rigidBody }
  }

  removeDice(dice) {
    const diceInfo = this.activeDice.get(dice.uuid)
    if (diceInfo) {
      diceInfo.creator.cleanup(diceInfo.world, diceInfo.rigidBody)
      // Return the dice instance to the pool
      this.returnDiceToPool(diceInfo.creator, diceInfo.type)
      this.activeDice.delete(dice.uuid)
    }
  }

  cleanupAllDice() {
    for (const [uuid, diceInfo] of this.activeDice.entries()) {
      diceInfo.creator.cleanup(diceInfo.world, diceInfo.rigidBody)
      // Return all dice to their respective pools
      this.returnDiceToPool(diceInfo.creator, diceInfo.type)
    }
    this.activeDice.clear()
  }

  // Rest of your existing methods remain the same
  updateDiceAppearance(dice, appearance) {
    const diceInfo = this.activeDice.get(dice.uuid)
    if (diceInfo && diceInfo.creator) {
      diceInfo.creator.updateAppearance(diceInfo.mesh, appearance)
      diceInfo.appearance = appearance
    }
  }

  toggleWireframes(visible) {
    this.wireframesVisible = visible
    this.activeDice.forEach(({ mesh }) => {
      const wireframe = mesh.children.find(child => child instanceof THREE.LineSegments)
      if (wireframe) {
        wireframe.visible = visible
      }
    })
  }

  getUpFacingNumber(dice) {
    const diceInfo = this.activeDice.get(dice.uuid)
    if (!diceInfo) {
      console.warn('No dice info found for die:', dice)
      return null
    }
    return diceInfo.creator.getUpFacingNumber(dice)
  }
}