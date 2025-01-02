<script setup>
import { useCharacterStore } from '../stores/characterStore'
import { ref } from 'vue'

const characterStore = useCharacterStore()
const diceTypes = [
  { value: 4, label: 'W4' },
  { value: 6, label: 'W6' },
  { value: 8, label: 'W8' },
  { value: 10, label: 'W10' },
  { value: 12, label: 'W12' },
  { value: 20, label: 'W20' }
]

const updateWeaponField = (weaponId, field, value) => {
  // Convert to number for numeric fields
  if (['at', 'pa', 'atBonus', 'paBonus'].includes(field)) {
    value = parseInt(value) || 0
  }
  characterStore.updateWeapon(weaponId, field, value)
}

const updateTpField = (weaponId, field, value) => {
  const weapon = characterStore.activeCharacter?.weapons.find(w => w.id === weaponId)
  if (!weapon) return

  if (!weapon.tp) {
    weapon.tp = {
      diceCount: 1,
      diceType: 6,
      modifier: 0
    }
  }

  const numValue = parseInt(value) || 0
  characterStore.updateWeapon(weaponId, 'tp', {
    ...weapon.tp,
    [field]: numValue
  })
}

</script>

<template>
  <div class="section weapons-section">
    <div class="section-header">
      <h3>Waffen</h3>
      <button 
        class="add-weapon-btn"
        @click="characterStore.addWeapon()"
      >
        + Waffe hinzufügen
      </button>
    </div>

    <div class="weapons-grid">
      <div 
        v-for="weapon in characterStore.activeCharacter?.weapons" 
        :key="weapon.id" 
        class="weapon-item"
      >
        <div class="weapon-header">
          <input
            type="text"
            :value="weapon.name"
            @input="e => updateWeaponField(weapon.id, 'name', e.target.value)"
            placeholder="Waffenname"
            class="weapon-name-input"
          >
          <button 
            class="delete-weapon-btn"
            @click="characterStore.deleteWeapon(weapon.id)"
          >
            ×
          </button>
        </div>

        <div class="weapon-details">
          <div class="weapon-field">
            <label>Typ</label>
            <input
              type="text"
              :value="weapon.type"
              @input="e => updateWeaponField(weapon.id, 'type', e.target.value)"
              placeholder="Waffentyp"
            >
          </div>

          <div class="weapon-stats">
            <div class="stat-field">
              <label>AT</label>
              <input
                type="number"
                :value="weapon.at"
                @input="e => updateWeaponField(weapon.id, 'at', e.target.value)"
              >
            </div>

            <div class="stat-field">
              <label>PA</label>
              <input
                type="number"
                :value="weapon.pa"
                @input="e => updateWeaponField(weapon.id, 'pa', e.target.value)"
              >
            </div>

            <div class="stat-field">
              <label>AT Bonus</label>
              <input
                type="number"
                :value="weapon.atBonus"
                @input="e => updateWeaponField(weapon.id, 'atBonus', e.target.value)"
              >
            </div>

            <div class="stat-field">
              <label>PA Bonus</label>
              <input
                type="number"
                :value="weapon.paBonus"
                @input="e => updateWeaponField(weapon.id, 'paBonus', e.target.value)"
              >
            </div>
          </div>

          <div class="tp-section">
            <div class="tp-header">
              <label>Trefferpunkte</label>
            </div>
            
            <div class="tp-inputs">
              <div class="tp-field">
                <input
                  type="number"
                  :value="weapon.tp?.diceCount || 1"
                  @input="e => updateTpField(weapon.id, 'diceCount', e.target.value)"
                  min="1"
                  class="dice-input"
                >
                <span class="dice-type">W6</span>
                <span>+</span>
                <input
                  type="number"
                  :value="weapon.tp?.modifier || 0"
                  @input="e => updateTpField(weapon.id, 'modifier', e.target.value)"
                  class="modifier-input"
                >
              </div>
            </div>

          </div>

          <div class="weapon-field">
            <label>Notizen</label>
            <textarea
              :value="weapon.notes"
              @input="e => updateWeaponField(weapon.id, 'notes', e.target.value)"
              placeholder="Zusätzliche Informationen"
              rows="2"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.weapons-section {
  margin-top: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.add-weapon-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.add-weapon-btn:hover {
  background: #3aa876;
}

.weapons-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.weapon-item {
  background: #333;
  border-radius: 4px;
  padding: 1rem;
}

.weapon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.weapon-name-input {
  flex-grow: 1;
  margin-right: 0.5rem;
}

.delete-weapon-btn {
  background: #ff4444;
  color: white;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
}

.delete-weapon-btn:hover {
  background: #ff2222;
}

.weapon-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.weapon-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.weapon-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.stat-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

label {
  color: #999;
  font-size: 0.9rem;
}

input, textarea {
  background: #444;
  border: 1px solid #555;
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  width: 100%;
}

input[type="number"] {
  text-align: center;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #42b983;
}

textarea {
  resize: vertical;
  min-height: 60px;
}

@media (max-width: 768px) {
  .weapons-grid {
    grid-template-columns: 1fr;
  }
}

.tp-section {
  background: #2a2a2a;
  padding: 0.75rem;
  border-radius: 4px;
}

.tp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.roll-button {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.roll-button:hover {
  background: #3aa876;
}

.tp-inputs {
  margin-bottom: 0.5rem;
}

.tp-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dice-input {
  width: 3rem !important;
  text-align: center;
  padding: 0.25rem !important;
}

.modifier-input {
  width: 3rem !important;
  text-align: center;
  padding: 0.25rem !important;
}

.tp-result {
  background: #333;
  padding: 0.5rem;
  border-radius: 4px;
  animation: fadeIn 0.3s ease-out;
}

.result-details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.total {
  font-size: 1.2rem;
  font-weight: bold;
  color: #42b983;
}

.rolls {
  color: #999;
  font-size: 0.9rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Update your existing media query */
@media (max-width: 768px) {
  .weapons-grid {
    grid-template-columns: 1fr;
  }
  
  .tp-field {
    flex-wrap: wrap;
  }
}

.dice-type {
  color: white;
  padding: 0.25rem 0.5rem;
  background: #444;
  border-radius: 4px;
  min-width: 3rem;
  text-align: center;
}
</style>