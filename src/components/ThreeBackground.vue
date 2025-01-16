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
    color: 0x258141,
    metalness: 0.9,            // Higher metalness for stronger specular
    roughness: 0.1,            // Lower roughness for sharper reflections
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,  // Much lower for sharper clearcoat reflections
    reflectivity: 1,
    flatShading: false,
    envMapIntensity: 1.0
  })
  
  const mesh = new THREE.Mesh(geometry, material)
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
    color: 0x331127,
    metalness: 0.9,            // Higher metalness for stronger specular
    roughness: 0.1,            // Lower roughness for sharper reflections
    clearcoat: 1.0,
    clearcoatRoughness: 0.01,  // Much lower for sharper clearcoat reflections
    reflectivity: 1,
    flatShading: false,
    envMapIntensity: 1.0
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.rotationSpeed = {
    x: (Math.random() - 0.5) * 0.001,
    y: (Math.random() - 0.5) * 0.001,
    z: (Math.random() - 0.5) * 0.001
  }
  
  return mesh
}

function createHighlightLight(position) {
  const light = new THREE.SpotLight(0xffffff, 150)
  light.position.set(400, 400, 200)  // Fixed position in top-right
  light.angle = Math.PI / 6           // 30 degrees
  light.penumbra = 0.1
  light.decay = 0.5
  light.distance = 1500
  
  // Create target object that will follow the shape
  const target = new THREE.Object3D()
  target.position.copy(position)
  scene.add(target)
  light.target = target
  
  // Don't cast shadows from these individual lights to save performance
  light.castShadow = false
  
  return { light, target }
}

// Modified createShapes function
function createShapes() {
  const numShapes = 40
  const radius = 120
  
  for (let i = 0; i < numShapes; i++) {
    const isHexagon = i % 2 === 0
    const shape = isHexagon ? createHexagon() : createSquare()
    
    // Position shape in a circle
    const angle = (i / numShapes) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    shape.position.set(x, y, 0)
    
    // Create dedicated spotlight for this shape
    const { light, target } = createHighlightLight(shape.position)
    scene.add(light)
    
    // Store the target reference with the shape for updates
    shape.userData.lightTarget = target
    
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
  renderer.physicallyCorrectLights = true
  
  const canvas = renderer.domElement
  canvas.addEventListener('contextmenu', (e) => {
    e.stopPropagation()
  })
  
  containerRef.value.appendChild(canvas)
  
  // Setup camera
  camera.position.z = 600
  camera.position.y = -30

  // Create a camera-following spot light for front-facing specular highlights
  const keyLight = new THREE.RectAreaLight(0xffffff, 40, 1000, 1000)
  keyLight.position.set(400, 400, 200)
  keyLight.lookAt(0, 60, 0)
  scene.add(keyLight)

  // Camera-following fill light
  const frontSpotLight = new THREE.SpotLight(0xffffff, 100)
  frontSpotLight.angle = Math.PI / 4
  frontSpotLight.penumbra = 0.2
  frontSpotLight.decay = 0.5
  frontSpotLight.distance = 1500
  scene.add(frontSpotLight)

  const frontTarget = new THREE.Object3D()
  scene.add(frontTarget)
  frontSpotLight.target = frontTarget

  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambientLight)

  function updateLights() {
    // Update camera-following light
    frontSpotLight.position.copy(camera.position)
    frontSpotLight.position.y += 50
    frontTarget.position.set(0, 60, 0)
    
    // Update individual spotlight targets
    shapes.forEach((shape) => {
      if (shape.userData.lightTarget) {
        // Convert shape's world position to the target position
        const worldPos = new THREE.Vector3()
        shape.getWorldPosition(worldPos)
        shape.userData.lightTarget.position.copy(worldPos)
      }
    })
  }

  // Modified animate function
  animate = function() {
    if (!isAnimating) return
    
    requestAnimationFrame(animate)
    updateLights()
    
    const delta = clock.getDelta()
    circleGroup.rotation.z += rotationSpeed * delta * Math.PI * 2
    
    shapes.forEach((shape) => {
      shape.rotation.x += shape.userData.rotationSpeed.x
      shape.rotation.y += shape.userData.rotationSpeed.y
      shape.rotation.z += shape.userData.rotationSpeed.z
    })
    
    renderer.render(scene, camera)
  }
  
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