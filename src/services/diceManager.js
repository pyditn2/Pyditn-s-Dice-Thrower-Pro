import { D6Dice } from './D6Dice'
import { D20Dice } from './D20Dice'

export class DiceManager {
  constructor() {
    // Create single instances of each die type
    this.diceInstances = {
      'd6': new D6Dice(),
      'd20': new D20Dice()
    }
    
    // Keep track of created dice and their types
    this.activeDice = new Map()
  }

  createDice(type, world) {
    const diceCreator = this.diceInstances[type]
    if (!diceCreator) {
      throw new Error(`Unsupported dice type: ${type}`)
    }
    
    const { mesh, rigidBody } = diceCreator.createDice(world)
    
    // Store the die instance for later reference
    this.activeDice.set(mesh.uuid, diceCreator)
    
    return { mesh, rigidBody }
  }

  getUpFacingNumber(dice) {
    // Get the specific die instance that created this die
    const diceCreator = this.activeDice.get(dice.uuid)
    if (!diceCreator) {
      console.warn('No dice creator found for die:', dice)
      return null
    }
    
    // Use that instance's getUpFacingNumber implementation
    return diceCreator.getUpFacingNumber(dice)
  }
  
  // Clean up method to remove references when dice are destroyed
  removeDice(dice) {
    this.activeDice.delete(dice.uuid)
  }
}