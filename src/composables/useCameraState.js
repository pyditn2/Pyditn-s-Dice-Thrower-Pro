import { ref } from 'vue'
import * as THREE from 'three'
import { CameraManager } from '../services/cameraManager'

export const useCameraState = (containerRefs) => {
  const cameras = ref([])
  const renderers = ref([])
  const cameraManager = ref(null)
  const showExtraViews = ref(false)
  
  const initializeCameras = () => {
    cameras.value = [
      new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000),
      new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000),
      new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000)
    ]
    
    // Set initial camera positions
    cameras.value[0].position.set(0, 8, 12)    // Main view
    cameras.value[1].position.set(-8, 8, 8)    // Left view
    cameras.value[2].position.set(8, 8, 8)     // Right view
    
    cameras.value.forEach(camera => camera.lookAt(0, 0, 0))
  }

  const initializeRenderers = () => {
    renderers.value = [
      new THREE.WebGLRenderer({ antialias: true }),
      new THREE.WebGLRenderer({ antialias: true }),
      new THREE.WebGLRenderer({ antialias: true })
    ]
    
    renderers.value.forEach(renderer => {
      renderer.setSize(300, 300)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.shadowMap.autoUpdate = true
      renderer.shadowMap.needsUpdate = true
    })

    attachRenderers()
  }

  const attachRenderers = () => {
    const { containerRef1, containerRef2, containerRef3 } = containerRefs
    
    if (containerRef1.value) {
      containerRef1.value.innerHTML = ''
      containerRef1.value.appendChild(renderers.value[0].domElement)
    }
    if (containerRef2.value) {
      containerRef2.value.innerHTML = ''
      containerRef2.value.appendChild(renderers.value[1].domElement)
    }
    if (containerRef3.value) {
      containerRef3.value.innerHTML = ''
      containerRef3.value.appendChild(renderers.value[2].domElement)
    }
  }

  const initializeCameraManager = (scene) => {
    cameraManager.value = new CameraManager(scene, 300, 300)
  }

  const resetCamera = () => {
    const defaultPositions = [
      new THREE.Vector3(0, 8, 12),    // Main view
      new THREE.Vector3(-8, 8, 8),    // Left view
      new THREE.Vector3(8, 8, 8)      // Right view
    ]
    
    cameras.value.forEach((camera, index) => {
      camera.position.copy(defaultPositions[index])
      camera.lookAt(0, 0, 0)
    })

    if (cameraManager.value) {
      cameraManager.value.reset()
      for (let i = 0; i < 3; i++) {
        cameraManager.value.setMode('overview', i)
      }
    }
  }

  const updateViewMode = (showExtra) => {
    showExtraViews.value = showExtra
    if (showExtra) {
      setTimeout(attachRenderers, 0)
    }
  }

  return {
    cameras,
    renderers,
    cameraManager,
    showExtraViews,
    initializeCameras,
    initializeRenderers,
    initializeCameraManager,
    resetCamera,
    updateViewMode
  }
}