<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useSettingsStore } from '@/stores/settings'
import type { BackgroundMessage } from './background.worker'

const { settings } = useSettingsStore()
const container = ref<HTMLElement | null>(null)
let worker: Worker | null = null
let resizeTimer = 0

function post(message: BackgroundMessage, transfer: Transferable[] = []) {
  worker?.postMessage(message, transfer)
}

/** Decorative, so rendered at CSS pixel resolution to keep the GPU free for the dice. */
function size() {
  return { width: window.innerWidth, height: window.innerHeight }
}

function colors() {
  return { icosahedron: settings.background.icosahedronColor, cube: settings.background.cubeColor }
}

function start() {
  if (worker || !container.value) return
  const canvas = document.createElement('canvas')
  if (!('transferControlToOffscreen' in canvas)) return
  container.value.appendChild(canvas)
  const offscreen = canvas.transferControlToOffscreen()
  worker = new Worker(new URL('./background.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<{ type: string; message?: string }>) => {
    if (event.data.type === 'error') console.error('Background:', event.data.message)
  }
  worker.onerror = (event) => console.error('Background worker failed:', event.message)
  post({ type: 'init', canvas: offscreen, ...size(), colors: colors() }, [offscreen])
  post({ type: 'animate', value: true })
}

function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => post({ type: 'resize', ...size() }), 150)
}

watch(
  () => settings.background.animated,
  (animated) => {
    if (animated) start()
    post({ type: 'animate', value: animated })
  },
)
watch(colors, (value) => post({ type: 'colors', colors: value }))

onMounted(() => {
  if (settings.background.animated) start()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  worker?.terminate()
  worker = null
})
</script>

<template>
  <div class="background" :class="{ animated: settings.background.animated }">
    <div v-show="settings.background.animated" ref="container" class="canvas-host" />
  </div>
</template>

<style scoped>
.background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--bg);
  transition: background-color 0.5s ease;
}

.background.animated {
  background: var(--bg-animated);
}

.canvas-host,
.canvas-host :deep(canvas) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
