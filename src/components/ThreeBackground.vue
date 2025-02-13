<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useBackgroundStore } from '../stores/backgroundStore'
import { storeToRefs } from 'pinia'

const backgroundStore = useBackgroundStore()
const { hexagonColor, squareColor } = storeToRefs(backgroundStore)
const containerRef = ref(null)
let worker = null;
let canvas = null;

const backgroundClass = computed(() => {
  return backgroundStore.currentBackground === 'animiert' ? 'grey-background' : ''
});

// Handle window resize
function onWindowResize() {
  if (!worker) return;
  
  // 1. Terminate existing worker
  worker.terminate();
  
  // 2. Create fresh canvas
  const dpr = window.devicePixelRatio || 1;
  const initialWidth = Math.floor(window.innerWidth * dpr);
  const initialHeight = Math.floor(window.innerHeight * dpr);
  
  canvas = document.createElement('canvas');
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.width = initialWidth;
  canvas.height = initialHeight;
  
  // Clear container and add new canvas
  if (containerRef.value) {
    containerRef.value.innerHTML = '';
    containerRef.value.appendChild(canvas);
  }
  
  // 3. Create new worker
  worker = new Worker(
    new URL('../workers/three.worker.js', import.meta.url),
    { type: 'module', name: 'ThreeJSWorker' }
  );

  worker.onerror = (error) => {
    console.error('Main thread - Worker error:', error);
  };
  
  // 4. Transfer canvas control
  const offscreen = canvas.transferControlToOffscreen();
  
  // 5. Send init message
  worker.postMessage({
    type: 'init',
    canvas: offscreen,
    width: initialWidth,
    height: initialHeight,
    dpr: dpr,
    hex: hexagonColor.value,
    square: squareColor.value,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight
  }, [offscreen]);
  
  // 6. Send colors
  worker.postMessage({
    type: 'colors',
    hex: hexagonColor.value,
    square: squareColor.value
  });

  // 7. Send animation state
  const shouldAnimate = backgroundStore.currentBackground === 'animiert';
  worker.postMessage({
    type: 'animate',
    value: shouldAnimate
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
    canvas = document.createElement('canvas');
    console.log('Main thread - Canvas created:', canvas);

    // Set dimensions with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const initialWidth = Math.floor(window.innerWidth * dpr);
    const initialHeight = Math.floor(window.innerHeight * dpr);
    
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    canvas.width = initialWidth;
    canvas.height = initialHeight;
    
    console.log('Main thread - Canvas dimensions set:', initialWidth, initialHeight);

    containerRef.value.appendChild(canvas);
    console.log('Main thread - Canvas appended to DOM');
    
    // Create worker first
    worker = new Worker(
      new URL('../workers/three.worker.js', import.meta.url),
      { type: 'module', name: 'ThreeJSWorker' }
    );
    console.log('Main thread - Worker created');

    // Add resize listener after worker is created
    window.addEventListener('resize', onWindowResize);

    // Transfer canvas control to worker
    const offscreen = canvas.transferControlToOffscreen();
    console.log('Main thread - OffscreenCanvas created:', offscreen);

    // Send init message with all initial settings
    worker.postMessage({
      type: 'init',
      canvas: offscreen,
      width: initialWidth,
      height: initialHeight,
      dpr: dpr,
      hex: hexagonColor.value,
      square: squareColor.value,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    }, [offscreen]);
    
    // Send initial color values
    worker.postMessage({
      type: 'colors',
      hex: hexagonColor.value,
      square: squareColor.value
    });

    // Set initial animation state
    const shouldAnimate = backgroundStore.currentBackground === 'animiert';
    worker.postMessage({
      type: 'animate',
      value: shouldAnimate
    });

    worker.onerror = (error) => {
      console.error('Main thread - Worker error:', error);
    };

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