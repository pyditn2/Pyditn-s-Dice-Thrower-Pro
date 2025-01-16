import * as THREE from 'three'
import { D6Dice } from './D6Dice'
import { D20Dice } from './D20Dice'

export class DiceManager {
  constructor() {
    this.diceInstances = {
      'd6': new D6Dice(),
      'd20': new D20Dice()
    }
    this.activeDice = new Map()
    this.wireframesVisible = false
  }

  createDice(type, world, appearance = null) {
    const diceCreator = this.diceInstances[type]
    if (!diceCreator) {
      throw new Error(`Unsupported dice type: ${type}`)
    }
    
    // Create new instance with appearance
    const newDice = type === 'd6' ? new D6Dice() : new D20Dice()
    if (appearance) {
      newDice.setAppearance(appearance)
    }
    
    const { mesh, rigidBody } = newDice.createDice(world)
    
    // Create and add wireframe to the mesh
    if (rigidBody.userData?.wireframeMesh) {
      mesh.add(rigidBody.userData.wireframeMesh)
    }

    rigidBody.userData.wireframeMesh.visible = this.wireframesVisible
    
    // Store complete dice info for cleanup
    this.activeDice.set(mesh.uuid, {
      creator: newDice,
      rigidBody: rigidBody,
      world: world,
      mesh: mesh,
      appearance: appearance
    })
    
    return { mesh, rigidBody }
  }

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

  removeDice(dice) {
    const diceInfo = this.activeDice.get(dice.uuid)
    if (diceInfo) {
      diceInfo.creator.cleanup(diceInfo.world, diceInfo.rigidBody)
      this.activeDice.delete(dice.uuid)
    }
  }

  cleanupAllDice() {
    for (const [uuid, diceInfo] of this.activeDice.entries()) {
      diceInfo.creator.cleanup(diceInfo.world, diceInfo.rigidBody)
    }
    this.activeDice.clear()
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