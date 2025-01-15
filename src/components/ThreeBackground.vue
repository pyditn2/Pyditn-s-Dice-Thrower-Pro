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
const rotationSpeed = 0.005/2 // Rotations per second

// Create d20 shape
function createHexagon() {
  const geometry = new THREE.IcosahedronGeometry(4)
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x258141,           // Antique gold base color
    metalness: 0.9,            // High metalness for strong specular
    roughness: 0.1,            // Low roughness for sharp reflections
    clearcoat: 1.0,            // Maximum clearcoat for extra shine
    clearcoatRoughness: 0.1,   // Sharp clearcoat reflections
    reflectivity: 1,           // Maximum reflectivity
    flatShading: false,        // Smooth shading
    envMapIntensity: 1.0       // Full environment map intensity
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
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x331127,           // Antique gold base color
    metalness: 0.9,            // High metalness for strong specular
    roughness: 0.1,            // Low roughness for sharp reflections
    clearcoat: 1.0,            // Maximum clearcoat for extra shine
    clearcoatRoughness: 0.1,   // Sharp clearcoat reflections
    reflectivity: 1,           // Maximum reflectivity
    flatShading: false,        // Smooth shading
    envMapIntensity: 1.0       // Full environment map intensity
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
  const radius = 120
  
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
  camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 0.1, 1000)
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
  renderer.physicallyCorrectLights = true // Enable physically correct lighting
  
  const canvas = renderer.domElement
  canvas.addEventListener('contextmenu', (e) => {
    e.stopPropagation()
  })
  
  containerRef.value.appendChild(canvas)
  
  // Setup camera
  camera.position.z = 600
  camera.position.y = -30
  
  // Setup lighting with much brighter intensities
  // Main spotlight with very high intensity
  const mainLight = new THREE.SpotLight(0xffffff, 8)
  mainLight.position.set(1, 1, 1).multiplyScalar(600)
  mainLight.angle = Math.PI / 2
  mainLight.penumbra = 0.1 // Sharper edge for more defined highlights
  mainLight.decay = 0.1 // Less decay for stronger light at distance
  mainLight.distance = 2000
  scene.add(mainLight)

  // Front spotlight with increased intensity
  const frontLight = new THREE.SpotLight(0xffffff, 5)
  frontLight.position.set(0, 0, 1).multiplyScalar(600)
  frontLight.angle = Math.PI / 2
  frontLight.penumbra = 0.1
  frontLight.decay = 0.1
  frontLight.distance = 2000
  scene.add(frontLight)

  // Right spotlight with increased intensity
  const rightLight = new THREE.SpotLight(0xffffff, 5)
  rightLight.position.set(1, 0, 0).multiplyScalar(600)
  rightLight.angle = Math.PI / 2
  rightLight.penumbra = 0.1
  rightLight.decay = 0.1
  rightLight.distance = 2000
  scene.add(rightLight)

  // Top spotlight
  const topLight = new THREE.SpotLight(0xffffff, 4)
  topLight.position.set(0, 1, 0).multiplyScalar(600)
  topLight.angle = Math.PI / 2
  topLight.penumbra = 0.1
  topLight.decay = 0.1
  topLight.distance = 2000
  scene.add(topLight)

  // Bottom spotlight
  const bottomLight = new THREE.SpotLight(0xffffff, 4)
  bottomLight.position.set(0, -1, 0).multiplyScalar(600)
  bottomLight.angle = Math.PI / 2
  bottomLight.penumbra = 0.1
  bottomLight.decay = 0.1
  bottomLight.distance = 2000
  scene.add(bottomLight)

  // Back spotlight
  const backLight = new THREE.SpotLight(0xffffff, 4)
  backLight.position.set(0, 0, -1).multiplyScalar(600)
  backLight.angle = Math.PI / 2
  backLight.penumbra = 0.1
  backLight.decay = 0.1
  backLight.distance = 2000
  scene.add(backLight)

  // Corner spotlights with increased intensity for better highlights
  const topCornerLight = new THREE.SpotLight(0xffffff, 3)
  topCornerLight.position.set(1, 1, -1).multiplyScalar(600)
  topCornerLight.angle = Math.PI / 2
  topCornerLight.penumbra = 0.1
  topCornerLight.decay = 0.1
  topCornerLight.distance = 2000
  scene.add(topCornerLight)

  const bottomCornerLight = new THREE.SpotLight(0xffffff, 3)
  bottomCornerLight.position.set(-1, -1, 1).multiplyScalar(600)
  bottomCornerLight.angle = Math.PI / 2
  bottomCornerLight.penumbra = 0.1
  bottomCornerLight.decay = 0.1
  bottomCornerLight.distance = 2000
  scene.add(bottomCornerLight)

  // Much brighter ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 6)
  scene.add(ambientLight)

  // Configure shadows with higher resolution
  const spotLights = [
    mainLight, frontLight, rightLight, topLight, 
    bottomLight, backLight, topCornerLight, bottomCornerLight
  ]

  spotLights.forEach(light => {
    light.castShadow = true
    light.shadow.mapSize.width = 1024 // Higher resolution shadows
    light.shadow.mapSize.height = 1024
    light.shadow.camera.near = 0.5
    light.shadow.camera.far = 2000
    light.shadow.bias = -0.0001 // Reduced shadow bias for sharper shadows
    light.shadow.radius = 1 // Slightly softer shadow edges
  })
  
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