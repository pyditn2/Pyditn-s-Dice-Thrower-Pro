// src/stores/diceAppearanceStore.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { CHECK_TYPES } from '../constants/diceTypes'

export const useDiceAppearanceStore = defineStore('diceAppearance', () => {
  // Define default appearances with room for future properties
  const defaultAppearances = {
    d20: {
      [CHECK_TYPES.ATTRIBUTE]: {
        MU: { color: '#ff0000', opacity: 1, shininess: 30 },
        KL: { color: '#00ff00', opacity: 1, shininess: 30 },
        IN: { color: '#0000ff', opacity: 1, shininess: 30 },
        CH: { color: '#ffff00', opacity: 1, shininess: 30 },
        FF: { color: '#ff00ff', opacity: 1, shininess: 30 },
        GE: { color: '#00ffff', opacity: 1, shininess: 30 },
        KO: { color: '#ff8800', opacity: 1, shininess: 30 },
        KK: { color: '#88ff00', opacity: 1, shininess: 30 }
      },
      [CHECK_TYPES.TALENT]: {
        default: { color: '#ff0000', opacity: 1, shininess: 30 }
      },
      [CHECK_TYPES.COMBAT]: {
        default: { color: '#ff0000', opacity: 1, shininess: 30 }
      }
    },
    d6: {
      damage: { color: '#ff0000', opacity: 1, shininess: 30 },
      critical: { color: '#8800ff', opacity: 1, shininess: 30 },
      extra: { color: '#00ff88', opacity: 1, shininess: 30 }
    }
  }

  // Helper functions for loading from storage
  function loadFromStorage(key, defaultValue) {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : defaultValue
  }

  // Initialize state
  const appearances = ref(loadFromStorage('diceAppearances', defaultAppearances))
  const preferences = ref(loadFromStorage('diceAppearancePrefs', {
    useTalentColors: true  // false = use attribute colors, true = use talent color
  }))

  // Watch for changes and save to localStorage
  watch(appearances, (newAppearances) => {
    localStorage.setItem('diceAppearances', JSON.stringify(newAppearances))
  }, { deep: true })

  watch(preferences, (newPrefs) => {
    localStorage.setItem('diceAppearancePrefs', JSON.stringify(newPrefs))
  }, { deep: true })

  // Reset appearances to default
  function resetAppearances() {
    appearances.value = JSON.parse(JSON.stringify(defaultAppearances))
  }

  // Toggle talent color preference
  function toggleTalentColors() {
    preferences.value.useTalentColors = !preferences.value.useTalentColors
  }

  // Get appearance for D20
  function getD20Appearance(checkType, attribute = null) {
    if (checkType === CHECK_TYPES.TALENT && !preferences.value.useTalentColors && attribute) {
      // Use attribute colors for talent rolls when preference is set
      return appearances.value.d20[CHECK_TYPES.ATTRIBUTE][attribute] || 
             defaultAppearances.d20[CHECK_TYPES.ATTRIBUTE][attribute]
    }
    
    if (checkType === CHECK_TYPES.ATTRIBUTE && attribute) {
      return appearances.value.d20[checkType][attribute] || 
             defaultAppearances.d20[checkType][attribute]
    }

    return appearances.value.d20[checkType].default || 
           defaultAppearances.d20[checkType].default
  }

  // Get appearance for D6
  function getD6Appearance(type) {
    return appearances.value.d6[type] || defaultAppearances.d6[type]
  }

  // Update specific dice appearance
  function updateD20Appearance(checkType, attribute, properties) {
    if (checkType === CHECK_TYPES.ATTRIBUTE && attribute) {
      appearances.value.d20[checkType][attribute] = {
        ...appearances.value.d20[checkType][attribute],
        ...properties
      }
    } else {
      appearances.value.d20[checkType].default = {
        ...appearances.value.d20[checkType].default,
        ...properties
      }
    }
  }

  // Update D6 appearance
  function updateD6Appearance(type, properties) {
    appearances.value.d6[type] = {
      ...appearances.value.d6[type],
      ...properties
    }
  }

  return {
    appearances,
    preferences,
    getD20Appearance,
    getD6Appearance,
    updateD20Appearance,
    updateD6Appearance,
    resetAppearances,
    toggleTalentColors
  }
})