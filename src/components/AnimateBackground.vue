<script setup>
import { computed } from 'vue'
import { useBackgroundStore } from '../stores/backgroundStore'

const backgroundStore = useBackgroundStore()

const backgroundClass = computed(() => {
  return `background ${backgroundStore.currentBackground}`
})
</script>

<template>
  <div :class="backgroundClass">
    <div v-if="backgroundStore.currentBackground === 'animiert'" class="shapes">
      <!-- Hexagons -->
      <div class="shapes-layer">
        <div class="shape hexagon shape1"></div>
        <div class="shape hexagon shape2"></div>
        <div class="shape hexagon shape3"></div>
      </div>
      
      <!-- Squares -->
      <div class="shapes-layer">
        <div class="shape square shape4"></div>
        <div class="shape square shape5"></div>
        <div class="shape square shape6"></div>
      </div>
      
      <!-- Triangles -->
      <div class="shapes-layer">
        <div class="shape triangle shape7"></div>
        <div class="shape triangle shape8"></div>
        <div class="shape triangle shape9"></div>
      </div>
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
  transition: all 0.5s ease;
}

.schwarz {
  background: #000;
}

.animiert {
  background: #000;
}

.shapes {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.shapes-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0.2;
}

.shape {
  position: absolute;
  background: #42b983;
}

/* Hexagons */
.hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

.shape1 {
  width: 20px;
  height: 20px;
  top: -20px;
  left: 10%;
  animation: moveTopRight 15s linear infinite;
}

.shape2 {
  width: 15px;
  height: 15px;
  top: 80%;
  left: 80%;
  animation: moveBottomLeft 12s linear infinite;
}

.shape3 {
  width: 18px;
  height: 18px;
  top: 40%;
  right: -20px;
  animation: moveLeft 14s linear infinite;
}

/* Squares */
.square {
  width: 15px;
  height: 15px;
}

.shape4 {
  top: 30%;
  left: -20px;
  animation: moveRight 20s linear infinite;
}

.shape5 {
  width: 12px;
  height: 12px;
  top: 60%;
  right: -20px;
  animation: moveLeft 17s linear infinite;
}

.shape6 {
  width: 10px;
  height: 10px;
  top: 20%;
  left: 30%;
  animation: moveBottomRight 16s linear infinite;
}

/* Triangles */
.triangle {
  background: transparent !important;
}

.shape7 {
  top: -20px;
  right: 20%;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 17.3px solid #42b983;
  animation: moveTopLeft 18s linear infinite;
}

.shape8 {
  bottom: -20px;
  left: 40%;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 20.8px solid #42b983;
  animation: moveBottomRight 14s linear infinite;
}

.shape9 {
  top: 70%;
  left: -20px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 13.9px solid #42b983;
  animation: moveRight 16s linear infinite;
}

@keyframes moveTopRight {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(120vw, 120vh) rotate(360deg);
  }
}

@keyframes moveBottomLeft {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(-120vw, -120vh) rotate(-360deg);
  }
}

@keyframes moveRight {
  from {
    transform: translateX(0) rotate(0deg);
  }
  to {
    transform: translateX(120vw) rotate(360deg);
  }
}

@keyframes moveLeft {
  from {
    transform: translateX(0) rotate(0deg);
  }
  to {
    transform: translateX(-120vw) rotate(-360deg);
  }
}

@keyframes moveTopLeft {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(-120vw, 120vh) rotate(-360deg);
  }
}

@keyframes moveBottomRight {
  from {
    transform: translate(0, 0) rotate(0deg);
  }
  to {
    transform: translate(120vw, -120vh) rotate(360deg);
  }
}
</style>