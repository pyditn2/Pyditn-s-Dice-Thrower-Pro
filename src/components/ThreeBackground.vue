<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useBackgroundStore } from '../stores/backgroundStore'
import { storeToRefs } from 'pinia'

const backgroundStore = useBackgroundStore()
const { hexagonColor, squareColor } = storeToRefs(backgroundStore)
const containerRef = ref(null)
let worker = null;

const backgroundClass = computed(() => {
  return backgroundStore.currentBackground === 'animiert' ? 'grey-background' : ''
});

// Handle window resize
function onWindowResize() {
  if (!worker || !canvas) return;
  
  const dpr = window.devicePixelRatio || 1;
  const newWidth = Math.floor(window.innerWidth * dpr);
  const newHeight = Math.floor(window.innerHeight * dpr);

  // Update canvas dimensions
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.width = newWidth;
  canvas.height = newHeight;

  worker.postMessage({
    type: 'resize',
    width: newWidth,
    height: newHeight,
    dpr: dpr
  });
}

watch([hexagonColor, squareColor], ([newHex, newSquare]) => {
  worker?.postMessage({
    type: 'colors',
    hex: newHex,
    square: newSquare
  });
});

watch(
  () => backgroundStore.currentBackground,
  (newValue) => {
    const shouldAnimate = newValue === 'animiert';
    worker?.postMessage({
      type: 'animate',
      value: shouldAnimate
    });
  }
);

onMounted(async () => {
  try {
    const canvas = document.createElement('canvas');
    console.log('Main thread - Canvas created:', canvas);

    // Set dimensions with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    console.log('Main thread - Canvas dimensions set:', canvas.width, canvas.height);

    containerRef.value.appendChild(canvas);
    console.log('Main thread - Canvas appended to DOM');
    window.addEventListener('resize', onWindowResize); // Add this
    onWindowResize(); // Initial size set
    worker = new Worker(
      new URL('../workers/three.worker.js', import.meta.url),
      { type: 'module', name: 'ThreeJSWorker' }
    );
    console.log('Main thread - Worker created');

    worker.postMessage({
      type: 'colors',
      hex: hexagonColor.value,
      square: squareColor.value
    });

    worker.postMessage({
      type: 'animate',
      value: backgroundStore.currentBackground === 'animiert'
    });

    // Add this to handle initial animation state
    if (backgroundStore.currentBackground === 'animiert') {
      requestAnimationFrame(() => {
        worker.postMessage({ type: 'animate', value: true });
      });
    }

    worker.onerror = (error) => {
      console.error('Main thread - Worker error:', error);
    };

    const offscreen = canvas.transferControlToOffscreen();
    console.log('Main thread - OffscreenCanvas created:', offscreen);

    worker.postMessage({
      type: 'init',
      canvas: offscreen,
      width: canvas.width,
      height: canvas.height,
      dpr: dpr,
      hex: hexagonColor.value,
      square: squareColor.value,
      // Add device pixel ratio
      devicePixelRatio: window.devicePixelRatio
    }, [offscreen]);
    console.log('Main thread - Init message sent');

  } catch (error) {
    console.error('Main thread - Initialization failed:', error);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize);

});
</script>

<template>
  <div class="background" :class="backgroundClass">
    <div ref="containerRef" class="three-background"
      :class="{ 'hidden': backgroundStore.currentBackground !== 'animiert' }" @contextmenu="$event.stopPropagation()">
    </div>
  </div>
</template>

<style scoped>
.background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background: #000000;
  transition: background-color 0.5s ease;
}

.grey-background {
  background-color: #1a1a1a;
}

.three-background {
  width: 100%;
  height: 100%;
}

.hidden {
  display: none !important;
}
</style>