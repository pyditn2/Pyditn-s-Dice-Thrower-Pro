import { useCharacterStore } from '../stores/characterStore'
import { useDiceStore } from '../stores/diceStore'

export class DiceService {
    static calculateQS(remainingPoints) {
        if (remainingPoints >= 16) return 6
        if (remainingPoints >= 13) return 5
        if (remainingPoints >= 10) return 4
        if (remainingPoints >= 7) return 3
        if (remainingPoints >= 4) return 2
        return 1
    }

    static async performAttributeCheck(attributeName, modification = 0, diceComponent) {
        const results = await diceComponent.rollDice('d20', 1)
        const roll = results[0]

        const characterStore = useCharacterStore()
        const attributeValue = characterStore.stats.attributes[attributeName]
        const target = attributeValue - modification
        const success = roll <= target
        
        // Calculate QS for attribute checks (remaining points = difference between target and roll)
        const remainingPoints = success ? target - roll : 0
        const qualityLevel = success ? this.calculateQS(remainingPoints) : 0

        const result = {
            type: 'attribute',
            attribute: attributeName,
            roll,
            target,
            success,
            remainingPoints,
            qualityLevel,
            criticalSuccess: roll === 1,
            criticalFailure: roll === 20,
            modification
        }
        
        const diceStore = useDiceStore()
        diceStore.addRollToHistory(result)
        
        return result
    }

    static async performTalentCheck(talentName, modification = 0, diceComponent) {
        const characterStore = useCharacterStore()
        const talent = this.findTalent(characterStore.talents, talentName)
        if (!talent) return null

        // Start the rolls
        diceRoller1.value.startRoll()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        diceRoller2.value.startRoll()
        await new Promise(resolve => setTimeout(resolve, 100))
        
        diceRoller3.value.startRoll()

        const [roll1, roll2, roll3] = await Promise.all([
            diceRoller1.value.waitForSettling(),
            diceRoller2.value.waitForSettling(),
            diceRoller3.value.waitForSettling()
        ])

        const rolls = [roll1[0], roll2[0], roll3[0]]
        
        const rollDetails = talent.attributes.map((attr, index) => ({
            attribute: attr,
            value: characterStore.stats.attributes[attr] - modification,
            roll: rolls[index]
        }))

        let pointsNeeded = 0
        rollDetails.forEach(roll => {
            if (roll.roll > roll.value) {
                pointsNeeded += roll.roll - roll.value
            }
        })

        const remainingPoints = Math.max(0, talent.value - pointsNeeded)
        const success = remainingPoints >= 0
        const qualityLevel = success ? this.calculateQS(remainingPoints) : 0

        const result = {
            type: 'talent',
            talent: talentName,
            rolls: rollDetails,
            success,
            pointsNeeded,
            remainingPoints,
            qualityLevel,
            modification
        }

        const diceStore = useDiceStore()
        diceStore.addRollToHistory(result)
        
        return result
    }

    static findTalent(talents, talentName) {
        for (const category in talents) {
            const talent = talents[category].find(t => t.name === talentName)
            if (talent) return talent
        }
        return null
    }
}