<script setup lang="ts">
import { ref } from 'vue'

import { THROW_LIMITS } from '@/persistence/schema'
import { useSettingsStore } from '@/stores/settings'

const { settings } = useSettingsStore()

const DIAL = { size: 96, radius: 36 }
const center = DIAL.size / 2
const dial = ref<SVGSVGElement | null>(null)

function marker() {
  const a = (settings.throw.angle * Math.PI) / 180
  return { x: center + DIAL.radius * Math.cos(a), y: center + DIAL.radius * Math.sin(a) }
}

function setAngleFromPointer(event: PointerEvent) {
  const rect = dial.value!.getBoundingClientRect()
  const dx = event.clientX - rect.left - rect.width / 2
  const dy = event.clientY - rect.top - rect.height / 2
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI
  settings.throw.angle = Math.round((degrees + 360) % 360)
}

function onPointerDown(event: PointerEvent) {
  dial.value!.setPointerCapture(event.pointerId)
  setAngleFromPointer(event)
}

function onPointerMove(event: PointerEvent) {
  if (dial.value!.hasPointerCapture(event.pointerId)) setAngleFromPointer(event)
}

function onDialKey(event: KeyboardEvent) {
  const step = event.shiftKey ? 15 : 5
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    settings.throw.angle = (settings.throw.angle + step) % 360
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    settings.throw.angle = (settings.throw.angle - step + 360) % 360
  } else {
    return
  }
  event.preventDefault()
}
</script>

<template>
  <div class="throw-settings">
    <div class="control">
      <span class="caption">Winkel</span>
      <svg
        ref="dial"
        :width="DIAL.size"
        :height="DIAL.size"
        role="slider"
        tabindex="0"
        aria-label="Wurfwinkel"
        aria-valuemin="0"
        aria-valuemax="359"
        :aria-valuenow="Math.round(settings.throw.angle)"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @keydown="onDialKey"
      >
        <circle :cx="center" :cy="center" :r="DIAL.radius" class="ring" />
        <line :x1="center" :y1="center" :x2="marker().x" :y2="marker().y" class="hand" />
        <circle :cx="marker().x" :cy="marker().y" r="6" class="knob" />
      </svg>
      <span class="value">{{ Math.round(settings.throw.angle) }}°</span>
    </div>

    <label class="control">
      <span class="caption">Abstand</span>
      <input
        v-model.number="settings.throw.distance"
        type="range"
        :min="THROW_LIMITS.distance.min"
        :max="THROW_LIMITS.distance.max"
        step="0.5"
      />
      <span class="value">{{ settings.throw.distance.toFixed(1) }}</span>
    </label>

    <label class="control">
      <span class="caption">Stärke</span>
      <input
        v-model.number="settings.throw.strength"
        type="range"
        :min="THROW_LIMITS.strength.min"
        :max="THROW_LIMITS.strength.max"
        step="0.5"
      />
      <span class="value">{{ settings.throw.strength.toFixed(1) }}</span>
    </label>
  </div>
</template>

<style scoped>
.throw-settings {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: center;
}

.control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.caption,
.value {
  color: var(--muted);
  font-size: 0.8rem;
}

svg {
  cursor: grab;
  touch-action: none;
  border-radius: 50%;
}

.ring {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.5;
}

.hand {
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
}

.knob {
  fill: var(--accent);
}

input[type='range'] {
  width: 100%;
  accent-color: var(--accent);
  padding: 0;
  border: none;
  background: none;
}
</style>
