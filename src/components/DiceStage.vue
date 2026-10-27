<script setup lang="ts">
import { shallowRef } from 'vue'

import { useDiceEngine, useEngineViews } from '@/composables/useDiceEngine'

const props = defineProps<{
  /** Caption under each view, e.g. "MU (14)". */
  labels?: string[]
}>()

const { engine, loadError, viewCount } = useDiceEngine()

const canvases = shallowRef<HTMLCanvasElement[]>([])
const slots: (HTMLCanvasElement | null)[] = []

function setCanvas(index: number, el: unknown) {
  slots[index] = el instanceof HTMLCanvasElement ? el : null
  queueMicrotask(syncCanvases)
}

function syncCanvases() {
  const list = slots.slice(0, viewCount.value).filter((c): c is HTMLCanvasElement => c !== null)
  const current = canvases.value
  if (list.length !== current.length || list.some((c, i) => c !== current[i])) canvases.value = list
}

useEngineViews(() => canvases.value)
</script>

<template>
  <div class="stage">
    <p v-if="loadError" class="error">{{ loadError }}</p>
    <div v-else class="views" :data-count="viewCount">
      <figure v-for="n in viewCount" :key="n" class="view">
        <canvas :ref="(el) => setCanvas(n - 1, el)" :class="{ loading: !engine }" />
        <figcaption v-if="props.labels?.[n - 1]">{{ props.labels[n - 1] }}</figcaption>
      </figure>
    </div>
  </div>
</template>

<style scoped>
.stage {
  width: 100%;
}

.views {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  /* At most three views per row. */
  max-width: calc(3 * 300px + 2 * 1rem);
  margin: 0 auto;
}

.view {
  margin: 0;
  flex: 0 1 300px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

canvas {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background: var(--surface-strong);
  display: block;
}

canvas.loading {
  animation: pulse 1.2s ease-in-out infinite alternate;
}

@keyframes pulse {
  to {
    opacity: 0.5;
  }
}

figcaption {
  color: var(--accent);
  text-shadow: 0 0 4px var(--accent);
  font-weight: bold;
  font-size: 0.9rem;
}

.error {
  color: var(--danger);
}

@media (max-width: 640px) {
  .views {
    gap: 0.5rem;
  }
  .views:not([data-count='1']) .view {
    flex-basis: calc(50% - 0.25rem);
  }
}
</style>
