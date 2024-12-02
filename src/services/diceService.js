// Service to coordinate between dice rolling and stores
export class DiceService {
    static async performAttributeCheck(attributeName, modification = 0, diceComponent) {
      // Wait for the visual dice roll
      const roll = await diceComponent.rollD20()
      
      const result = this.calculateAttributeResult(attributeName, roll, modification)
      
      // Let the store handle recording the result
      const diceStore = useDiceStore()
      diceStore.addRollToHistory(result)
      
      return result
    }
  
    static async performTalentCheck(talentName, modification = 0, diceComponent) {
      const characterStore = useCharacterStore()
      const talent = characterStore.getTalentByName(talentName)
      if (!talent) return null
  
      // Roll three dice visually and wait for results
      const rollResults = await Promise.all([
        diceComponent.rollD20(),
        diceComponent.rollD20(),
        diceComponent.rollD20()
      ])
  
      const result = this.calculateTalentResult(talentName, rollResults, modification)
      
      const diceStore = useDiceStore()
      diceStore.addRollToHistory(result)
      
      return result
    }
  
    static calculateAttributeResult(attributeName, roll, modification) {
      const characterStore = useCharacterStore()
      const attributeValue = characterStore.getAttributeValue(attributeName)
      const target = attributeValue - modification
      
      return {
        type: 'attribute',
        attribute: attributeName,
        roll,
        target,
        success: roll <= target,
        criticalSuccess: roll === 1,
        criticalFailure: roll === 20,
        modification
      }
    }
  
    static calculateTalentResult(talentName, rolls, modification) {
      const characterStore = useCharacterStore()
      const talent = characterStore.getTalentByName(talentName)
      
      const rollDetails = talent.attributes.map((attr, index) => ({
        attribute: attr,
        value: characterStore.getAttributeValue(attr),
        roll: rolls[index]
      }))
  
      const remainingPoints = talent.value
      let pointsNeeded = 0
      let success = true
  
      rollDetails.forEach(roll => {
        if (roll.roll > roll.value) {
          pointsNeeded += roll.roll - roll.value
          if (pointsNeeded > remainingPoints) {
            success = false
          }
        }
      })
  
      return {
        type: 'talent',
        talent: talentName,
        rolls: rollDetails,
        success,
        pointsNeeded,
        remainingPoints: remainingPoints - pointsNeeded,
        modification
      }
    }
  }