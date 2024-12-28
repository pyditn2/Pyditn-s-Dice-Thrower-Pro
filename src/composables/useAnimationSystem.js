import { ref } from 'vue'

export const useAnimationSystem = () => {
  const animationFrameId = ref(null)
  const rotationAngle = ref(0)
  const ROTATION_SPEED = 0.003
  const isRotating = ref(true)

  const startAnimation = (animateCallback) => {
    const animate = (time) => {
      // Store the ID returned by requestAnimationFrame
      const id = requestAnimationFrame(animate)
      animationFrameId.value = id
      animateCallback(time)
    }
    animate(0)
  }
  
  const stopAnimation = () => {
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
      animationFrameId.value = null
    }
  }

  const updateRotation = (deltaTime) => {
    if (isRotating.value) {
      rotationAngle.value += ROTATION_SPEED * deltaTime
    }
  }

  return {
    animationFrameId,
    rotationAngle,
    isRotating,
    startAnimation,
    stopAnimation,
    updateRotation
  }
}