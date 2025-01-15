<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import * as THREE from 'three'
import { useBackgroundStore } from '../stores/backgroundStore'

const backgroundStore = useBackgroundStore()
const containerRef = ref(null)

const backgroundClass = computed(() => {
  return backgroundStore.currentBackground === 'animiert' ? 'grey-background' : ''
})

// Three.js variables
let scene, camera, renderer, clock, shapes = [], circleGroup
let isAnimating = false
const rotationSpeed = 0.005 // Rotations per second

// Create d20 shape
function createHexagon() {
  const geometry = new THREE.IcosahedronGeometry(4)
  const material = new THREE.MeshPhongMaterial({
    color: 0x996515,           // Antique gold base color
    specular: 0xffd700,        // Gold-colored specular highlights
    shininess: 200,            // Increased shininess for more reflectivity
    reflectivity: 1,           // Maximum reflectivity
    flatShading: false         // Smooth shading
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  
  // Add random rotation speeds as custom properties
  mesh.userData.rotationSpeed = {
    x: (Math.random() - 0.5) * 0.001,
    y: (Math.random() - 0.5) * 0.001,
    z: (Math.random() - 0.5) * 0.001
  }
  
  return mesh
}

// Create square shape
function createSquare() {
  const geometry = new THREE.BoxGeometry(6, 6, 6)
  const material = new THREE.MeshPhongMaterial({
    color: 0x996515,           // Antique gold base color
    specular: 0xffd700,        // Gold-colored specular highlights
    shininess: 200,            // Increased shininess for more reflectivity
    reflectivity: 1,           // Maximum reflectivity
    flatShading: false         // Smooth shading
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  
  // Add random rotation speeds as custom properties
  mesh.userData.rotationSpeed = {
    x: (Math.random() - 0.5) * 0.001,
    y: (Math.random() - 0.5) * 0.001,
    z: (Math.random() - 0.5) * 0.001
  }
  
  return mesh
}

// Create shapes arranged in a circle
function createShapes() {
  const numShapes = 40
  const radius = 180
  
  for (let i = 0; i < numShapes; i++) {
    const isHexagon = i % 2 === 0
    const shape = isHexagon ? createHexagon() : createSquare()
    
    // Position shape in a circle
    const angle = (i / numShapes) * Math.PI * 2
    shape.position.x = Math.cos(angle) * radius
    shape.position.y = Math.sin(angle) * radius
    
    shapes.push(shape)
    circleGroup.add(shape)
  }
}

// Initialize Three.js scene
function initScene() {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000)
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance" 
  })
  clock = new THREE.Clock()
  
  // Setup renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(window.devicePixelRatio)
  
  const canvas = renderer.domElement
  canvas.addEventListener('contextmenu', (e) => {
    e.stopPropagation()
  })
  
  containerRef.value.appendChild(canvas)
  
  // Setup camera
  camera.position.z = 600
  camera.position.y = 150
  
  // Setup lighting
  // Main directional lights from different angles
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
  mainLight.position.set(1, 1, 1)
  scene.add(mainLight)

  const frontLight = new THREE.DirectionalLight(0xffffff, 1.2)
  frontLight.position.set(0, 0, 1)
  scene.add(frontLight)

  const rightLight = new THREE.DirectionalLight(0xffffff, 1.2)
  rightLight.position.set(1, 0, 0)
  scene.add(rightLight)

  // Add lights for better coverage
  const topLight = new THREE.DirectionalLight(0xffffff, 1.0)
  topLight.position.set(0, 1, 0)
  scene.add(topLight)

  const bottomLight = new THREE.DirectionalLight(0xffffff, 0.8)
  bottomLight.position.set(0, -1, 0)
  scene.add(bottomLight)

  const backLight = new THREE.DirectionalLight(0xffffff, 0.8)
  backLight.position.set(0, 0, -1)
  scene.add(backLight)

  // Corner lights for extra highlights
  const topCornerLight = new THREE.DirectionalLight(0xffffff, 0.6)
  topCornerLight.position.set(1, 1, -1)
  scene.add(topCornerLight)

  const bottomCornerLight = new THREE.DirectionalLight(0xffffff, 0.6)
  bottomCornerLight.position.set(-1, -1, 1)
  scene.add(bottomCornerLight)

  // Increased ambient light for better base illumination
  const ambientLight = new THREE.AmbientLight(0x404040, 0.8)
  scene.add(ambientLight)
  
  // Create group for shapes
  circleGroup = new THREE.Group()
  circleGroup.position.y = 60
  scene.add(circleGroup)
  
  createShapes()
}

// Animation loop
function animate() {
  if (!isAnimating) return
  
  requestAnimationFrame(animate)
  
  const delta = clock.getDelta()
  circleGroup.rotation.z += rotationSpeed * delta * Math.PI * 2
  
  // Update each shape's individual rotation
  shapes.forEach((shape) => {
    shape.rotation.x += shape.userData.rotationSpeed.x
    shape.rotation.y += shape.userData.rotationSpeed.y
    shape.rotation.z += shape.userData.rotationSpeed.z
  })
  
  renderer.render(scene, camera)
}

// Handle window resize
function onWindowResize() {
  const width = window.innerWidth
  const height = window.innerHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  
  renderer.setSize(width, height)
}

// Cleanup function
function cleanup() {
  isAnimating = false
  window.removeEventListener('resize', onWindowResize)
  
  // Dispose of geometries and materials
  shapes.forEach((shape) => {
    shape.geometry.dispose()
    shape.material.dispose()
  })
  
  // Remove renderer
  if (renderer) {
    renderer.dispose()
    if (containerRef.value) {
      containerRef.value.removeChild(renderer.domElement)
    }
  }
}

// Watch for background changes
watch(
  () => backgroundStore.currentBackground,
  (newValue) => {
    isAnimating = newValue === 'animiert'
    if (isAnimating) {
      animate()
    }
  },
  { immediate: true }
)

// Component lifecycle hooks
onMounted(() => {
  if (containerRef.value) {
    initScene()
    window.addEventListener('resize', onWindowResize)
    animate()
  }
})

onBeforeUnmount(() => {
  cleanup()
})
</script>

<template>
  <div 
    class="background" 
    :class="backgroundClass"
  >
    <div 
      ref="containerRef" 
      class="three-background"
      :class="{ 'hidden': backgroundStore.currentBackground !== 'animiert' }"
      @contextmenu="$event.stopPropagation()"
    >
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
  visibility: hidden;
}
</style>