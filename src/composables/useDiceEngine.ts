import { onScopeDispose, readonly, ref, shallowRef, watch } from 'vue'

import { getDiceEngine, type DiceEngine, type DieSpec } from '@/engine'
import { useSettingsStore } from '@/stores/settings'

const engine = shallowRef<DiceEngine | null>(null)
const loadError = ref<string | null>(null)
const rolling = ref(false)
const viewCount = ref(1)
let started = false

/** Creates the engine once and keeps it in sync with the settings. Call from App.vue. */
export function startDiceEngine(): void {
  if (started) return
  started = true
  const settings = useSettingsStore()
  getDiceEngine().then(
    (instance) => {
      engine.value = instance
      instance.subscribe((state) => {
        rolling.value = state.rolling
        viewCount.value = state.viewCount
      })
      watch(
        () => settings.settings,
        (s) => {
          instance.setSpeed(s.simSpeed)
          instance.setThrow(s.throw)
          instance.setMuted(s.muted)
        },
        { deep: true, immediate: true },
      )
    },
    (error: unknown) => {
      console.error('Dice engine failed to start', error)
      loadError.value = 'Die 3D-Würfel konnten nicht gestartet werden (WebGL nicht verfügbar?).'
    },
  )
}

export function useDiceEngine() {
  async function roll(dice: DieSpec[]): Promise<number[]> {
    const instance = engine.value ?? (await getDiceEngine())
    return instance.roll(dice)
  }

  return {
    engine: readonly(engine),
    loadError: readonly(loadError),
    rolling: readonly(rolling),
    viewCount: readonly(viewCount),
    roll,
    resetCameras: () => engine.value?.resetCameras(),
  }
}

/** Attaches view canvases to the engine for the lifetime of the calling component. */
export function useEngineViews(canvases: () => HTMLCanvasElement[]) {
  const stop = watch([engine, canvases], ([instance, list]) => instance?.attachViews(list), {
    immediate: true,
    flush: 'post',
  })
  onScopeDispose(() => {
    stop()
    engine.value?.attachViews([])
  })
}
