import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import type { AttributeId } from '@/domain/attributes'
import { defaultDiceColors, type Settings } from '@/persistence/schema'
import { saveSettings } from '@/persistence/storage'
import { getInitialState } from './persisted'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(getInitialState().settings)

  watch(settings, (value) => saveSettings(value), { deep: true })

  function attributeColor(attribute: AttributeId): string {
    return settings.value.diceColors.attribute[attribute]
  }

  /** Colour of a talent-check die rolled for the given attribute. */
  function talentDieColor(attribute: AttributeId): string {
    return settings.value.talentDiceInAttributeColors
      ? attributeColor(attribute)
      : settings.value.diceColors.talent
  }

  function resetDiceColors() {
    settings.value.diceColors = defaultDiceColors()
  }

  return { settings, attributeColor, talentDieColor, resetDiceColors }
})
