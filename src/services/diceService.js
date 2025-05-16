export class DiceService {
    static calculateQS(remainingPoints) {
        // For every 3 remaining points above 16, add another QS level
        if (remainingPoints >= 16) {
            return 6 + Math.floor((remainingPoints - 16) / 3);
        }
        if (remainingPoints >= 13) return 5;
        if (remainingPoints >= 10) return 4;
        if (remainingPoints >= 7) return 3;
        if (remainingPoints >= 4) return 2;
        return 1;
    }

    static async performAttributeCheck(attributeName, modification = 0, diceComponent) {
        const results = await diceComponent.rollDice('d20', 1)
        const roll = results[0]

        const characterStore = useCharacterStore()
        const attributeValue = characterStore.stats.attributes[attributeName]
        const target = attributeValue - modification
        const success = roll <= target
        
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

        // Roll three separate dice
        const roll1 = await diceComponent.rollDice('d20', 1)
        const roll2 = await diceComponent.rollDice('d20', 1)
        const roll3 = await diceComponent.rollDice('d20', 1)

        const rolls = [roll1[0], roll2[0], roll3[0]]

        const rollDetails = talent.attributes.map((attr, index) => ({
            attribute: attr,
            value: characterStore.stats.attributes[attr] - modification,
            roll: rolls[index]
        }))

        // Check for critical rolls
        const ones = rolls.filter(r => r === 1).length
        const twenties = rolls.filter(r => r === 20).length
        
        let criticalResult = null
        if (ones >= 2) criticalResult = 'Spektakulärer Erfolg!'
        else if (twenties >= 2) criticalResult = 'Spektakulärer Patzer!'
        else if (ones === 1) criticalResult = 'Kritischer Erfolg!'
        else if (twenties === 1) criticalResult = 'Patzer!'

        // If it's a critical success or contains a 1, automatic success
        if (criticalResult && (ones > 0)) {
            const result = {
                type: 'talent',
                talent: talentName,
                rolls: rollDetails,
                success: true,
                pointsNeeded: 0,
                remainingPoints: talent.value,
                qualityLevel: this.calculateQS(talent.value + 1),
                critical: criticalResult,
                modification
            }
            diceStore.addRollToHistory(result)
            return result
        }

        // If it's a critical failure or contains a 20, automatic failure
        if (criticalResult && (twenties > 0)) {
            const result = {
                type: 'talent',
                talent: talentName,
                rolls: rollDetails,
                success: false,
                pointsNeeded: talent.value + 1,
                remainingPoints: -1,
                qualityLevel: 0,
                critical: criticalResult,
                modification
            }
            diceStore.addRollToHistory(result)
            return result
        }

        // Normal check calculation
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
            critical: null,
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