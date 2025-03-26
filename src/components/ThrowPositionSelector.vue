<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useDiceRollerStore } from '../stores/diceRollerStore'

const props = defineProps({
  width: {
    type: Number,
    default: 240
  },
  height: {
    type: Number,
    default: 60
  }
})

const diceRollerStore = useDiceRollerStore()
const canvas = ref(null)
const isDragging = ref(false)
const isAdjustingRadius = ref(false)
const isAdjustingVelocity = ref(false)

// Computed property to get the current angle in radians
const angleRad = computed(() => {
  return diceRollerStore.throwConfig.angle * (Math.PI / 180)
})

// Draw the compact selector
const drawSelector = () => {
  if (!canvas.value) return
  
  const ctx = canvas.value.getContext('2d')
  const width = canvas.value.width
  const height = canvas.value.height
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height)
  
  // Draw background
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)
  
  const centerY = height / 2
  const angleControlX = width / 5  // Position for angle control (20% from left)
  const radiusControlX = width / 2 // Position for radius control (center)
  const velocityControlX = width * 4/5 // Position for velocity control (80% from left)
  
  // Draw dividers
  ctx.beginPath()
  ctx.moveTo(width/3, 10)
  ctx.lineTo(width/3, height-10)
  ctx.moveTo(width*2/3, 10)
  ctx.lineTo(width*2/3, height-10)
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.stroke()
  
  // Draw section labels
  ctx.fillStyle = '#666'
  ctx.font = '10px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Winkel', width/6, 15)
  ctx.fillText('Abstand', width/2, 15)
  ctx.fillText('Stärke', width*5/6, 15)
  
  // Draw angle control (compact semi-circle with arrow)
  const angleRadius = height / 3
  
  // Draw semi-circle
  ctx.beginPath()
  ctx.arc(angleControlX, centerY, angleRadius, 0, Math.PI * 2)
  ctx.strokeStyle = '#42b983'
  ctx.lineWidth = 1
  ctx.stroke()
  
  // Calculate marker position on the circle
  const markerX = angleControlX + angleRadius * Math.cos(angleRad.value)
  const markerY = centerY + angleRadius * Math.sin(angleRad.value)
  
  // Draw arrow from center to marker
  ctx.beginPath()
  ctx.moveTo(angleControlX, centerY)
  ctx.lineTo(markerX, markerY)
  ctx.strokeStyle = '#42b983'
  ctx.lineWidth = 2
  ctx.stroke()
  
  // Draw marker
  ctx.beginPath()
  ctx.arc(markerX, markerY, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#42b983'
  ctx.fill()
  
  // Draw radius control (horizontal slider)
  const radiusMin = radiusControlX - width/8
  const radiusMax = radiusControlX + width/8
  const radiusTrackY = centerY
  
  // Convert radius value (5-15) to position
  const radiusPercent = (diceRollerStore.throwConfig.radius - 5) / 10
  const radiusHandleX = radiusMin + (radiusMax - radiusMin) * radiusPercent
  
  // Draw track
  ctx.beginPath()
  ctx.moveTo(radiusMin, radiusTrackY)
  ctx.lineTo(radiusMax, radiusTrackY)
  ctx.strokeStyle = '#42b983'
  ctx.lineWidth = 2
  ctx.stroke()
  
  // Draw handle
  ctx.beginPath()
  ctx.arc(radiusHandleX, radiusTrackY, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#42b983'
  ctx.fill()
  
  // Draw velocity control (horizontal slider)
  const velocityMin = velocityControlX - width/8
  const velocityMax = velocityControlX + width/8
  const velocityTrackY = centerY
  
  // Convert velocity value (5-30) to position
  const velocityPercent = (diceRollerStore.throwConfig.velocityMagnitude - 5) / 25
  const velocityHandleX = velocityMin + (velocityMax - velocityMin) * velocityPercent
  
  // Draw track with gradient
  const gradient = ctx.createLinearGradient(velocityMin, velocityTrackY, velocityMax, velocityTrackY)
  gradient.addColorStop(0, 'rgba(66, 185, 131, 0.3)')
  gradient.addColorStop(1, 'rgba(66, 185, 131, 1)')
  
  ctx.beginPath()
  ctx.moveTo(velocityMin, velocityTrackY)
  ctx.lineTo(velocityMax, velocityTrackY)
  ctx.strokeStyle = gradient
  ctx.lineWidth = 2
  ctx.stroke()
  
  // Draw handle
  ctx.beginPath()
  ctx.arc(velocityHandleX, velocityTrackY, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#42b983'
  ctx.fill()
}

// Mouse event handlers
const onMouseDown = (event) => {
  if (!canvas.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const width = canvas.value.width
  
  // Determine which section was clicked
  if (x < width/3) {
    // Angle control
    isDragging.value = true
    updateAngle(event)
  } else if (x < width*2/3) {
    // Radius control
    isAdjustingRadius.value = true
    updateRadius(event)
  } else {
    // Velocity control
    isAdjustingVelocity.value = true
    updateVelocity(event)
  }
}

const updateAngle = (event) => {
  if (!canvas.value || !isDragging.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const width = canvas.value.width
  const height = canvas.value.height
  
  const angleControlX = width / 5
  const centerY = height / 2
  
  // Calculate angle from center to mouse position
  let angle = Math.atan2(y - centerY, x - angleControlX) * (180 / Math.PI)
  
  // Normalize angle to 0-360
  if (angle < 0) {
    angle += 360
  }
  
  // Update store
  diceRollerStore.throwConfig.angle = angle
}

const updateRadius = (event) => {
  if (!canvas.value || !isAdjustingRadius.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const width = canvas.value.width
  
  const radiusMin = width/2 - width/8
  const radiusMax = width/2 + width/8
  
  // Clamp x position
  const clampedX = Math.max(radiusMin, Math.min(radiusMax, x))
  
  // Convert to radius value (5-15)
  const radiusPercent = (clampedX - radiusMin) / (radiusMax - radiusMin)
  const radius = 5 + (radiusPercent * 10)
  
  // Update store
  diceRollerStore.throwConfig.radius = radius
}

const updateVelocity = (event) => {
  if (!canvas.value || !isAdjustingVelocity.value) return
  
  const rect = canvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const width = canvas.value.width
  
  const velocityMin = width*4/5 - width/8
  const velocityMax = width*4/5 + width/8
  
  // Clamp x position
  const clampedX = Math.max(velocityMin, Math.min(velocityMax, x))
  
  // Convert to velocity value (5-30)
  const velocityPercent = (clampedX - velocityMin) / (velocityMax - velocityMin)
  const velocity = 5 + (velocityPercent * 25)
  
  // Update store
  diceRollerStore.throwConfig.velocityMagnitude = velocity
}

const onMouseMove = (event) => {
  if (isDragging.value) {
    updateAngle(event)
  } else if (isAdjustingRadius.value) {
    updateRadius(event)
  } else if (isAdjustingVelocity.value) {
    updateVelocity(event)
  }
}

const onMouseUp = () => {
  isDragging.value = false
  isAdjustingRadius.value = false
  isAdjustingVelocity.value = false
}

// Initialize drawing
onMounted(() => {
  if (canvas.value) {
    canvas.value.width = props.width
    canvas.value.height = props.height
    drawSelector()
    
    // Add global event listeners
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }
})

// Cleanup event listeners
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

// Watch for changes to redraw
watch(
  [
    () => diceRollerStore.throwConfig.angle,
    () => diceRollerStore.throwConfig.radius,
    () => diceRollerStore.throwConfig.velocityMagnitude
  ],
  () => drawSelector()
)
</script>

<template>
  <div class="throw-position-selector">
    <canvas 
      ref="canvas" 
      @mousedown="onMouseDown"
      class="selector-canvas"
    ></canvas>
  </div>
</template>

<style scoped>
.throw-position-selector {
  background: #1a1a1a;
  border-radius: 8px;
  padding: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.selector-canvas {
  cursor: pointer;
  border-radius: 4px;
}
</style>