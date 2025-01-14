import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

const diceWireframes = ref([])

const GRAVITY = -25

export const useSceneSystem = () => {
  const scene = ref(null)
  const world = ref(null)
  const wireframeHelpers = ref([])
  const showWireframes = ref(false)

  const setupMainLight = () => {
    const mainLight = new THREE.DirectionalLight(0xffffff, 1)
    mainLight.position.set(5, 10, 5)
    mainLight.castShadow = true

    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 50
    mainLight.shadow.camera.left = -10
    mainLight.shadow.camera.right = 10
    mainLight.shadow.camera.top = 10
    mainLight.shadow.camera.bottom = -10
    
    mainLight.shadow.bias = -0.001    
    mainLight.shadow.normalBias = 0.02   
    mainLight.shadow.radius = 1.5      
    
    return mainLight
  }

  const createFeltMaterial = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = 256
    canvas.height = 256

    ctx.fillStyle = '#0B5D1E'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 15 - 7.5
      data[i] = Math.max(0, Math.min(255, data[i] + noise))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
    }

    ctx.putImageData(imageData, 0, 0)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 2)

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.DoubleSide
    })
  }

  const createHexagonalGround = () => {
    const radius = 10        
    const topRadius = 11     
    const height = 4         
    const wallThickness = 0.5
    
    wireframeHelpers.value = []
    const feltMaterial = createFeltMaterial()
    
    // Create vertices
    const baseVertices = []
    const topVertices = []
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      baseVertices.push([
        radius * Math.cos(angle),
        radius * Math.sin(angle)
      ])
      topVertices.push([
        topRadius * Math.cos(angle),
        topRadius * Math.sin(angle)
      ])
    }

    // Create ground trimesh
    const vertices = []
    const indices = []
    
    vertices.push(0, 0, 0)
    
    for (let i = 0; i < 6; i++) {
      vertices.push(baseVertices[i][0], 0, baseVertices[i][1])
    }
    
    for (let i = 0; i < 6; i++) {
      indices.push(
        0,
        i + 1,
        ((i + 1) % 6) + 1
      )
    }

    // Create physics bodies
    const groundColliderDesc = RAPIER.ColliderDesc.trimesh(
      new Float32Array(vertices),
      new Uint32Array(indices)
    )
    
    groundColliderDesc
      .setRestitution(0.1)
      .setFriction(1.0)

    const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
    const groundRigidBody = world.value.createRigidBody(groundRigidBodyDesc)
    world.value.createCollider(groundColliderDesc, groundRigidBody)

    // Create visual meshes
    const groundShape = new THREE.Shape()
    groundShape.moveTo(baseVertices[0][0], baseVertices[0][1])
    for (let i = 1; i < 6; i++) {
      groundShape.lineTo(baseVertices[i][0], baseVertices[i][1])
    }
    groundShape.lineTo(baseVertices[0][0], baseVertices[0][1])

    const groundGeometry = new THREE.ShapeGeometry(groundShape)
    const groundMesh = new THREE.Mesh(groundGeometry, feltMaterial)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.position.y = -0.001
    groundMesh.receiveShadow = true
    scene.value.add(groundMesh)

    // Add wireframe helpers and walls
    createWireframeHelpers(vertices, indices)
    createWalls(baseVertices, topVertices, height, wallThickness, feltMaterial, groundRigidBody)
  }

  const createWireframeHelpers = (vertices, indices) => {
    const helperGeometry = new THREE.BufferGeometry()
    helperGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    helperGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
    
    const helperMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      side: THREE.DoubleSide
    })
    const groundHelper = new THREE.Mesh(helperGeometry, helperMaterial)
    groundHelper.visible = showWireframes.value
    scene.value.add(groundHelper)
    wireframeHelpers.value.push(groundHelper)
  }

  const addDiceWireframe = (colliderDesc, mesh) => {
    // Extract vertices and indices from the collider description
    const vertices = colliderDesc.shape.vertices
    const indices = colliderDesc.shape.indices
  
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff, // Cyan color to distinguish from ground/walls
      linewidth: 1
    })
  
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      wireframeMaterial
    )
    
    // Link the wireframe to the mesh
    wireframe.matrixAutoUpdate = false
    mesh.add(wireframe)
    
    wireframe.visible = showWireframes.value
    diceWireframes.value.push(wireframe)
    
    return wireframe
  }

  const createWalls = (baseVertices, topVertices, height, wallThickness, feltMaterial, groundRigidBody) => {
    for (let i = 0; i < 6; i++) {
      const nextI = (i + 1) % 6
      
      const baseStart = baseVertices[i]
      const baseEnd = baseVertices[nextI]
      const topStart = topVertices[i]
      const topEnd = topVertices[nextI]
      
      createWallSegment(
        baseStart, baseEnd, topStart, topEnd,
        height, wallThickness, feltMaterial, groundRigidBody
      )
    }
  }

  const createWallSegment = (baseStart, baseEnd, topStart, topEnd, height, wallThickness, feltMaterial, groundRigidBody) => {
    // Create wall geometry
    const wallVertices = new Float32Array([
      baseStart[0], 0, baseStart[1],
      baseEnd[0], 0, baseEnd[1],
      topStart[0], height, topStart[1],
      topEnd[0], height, topEnd[1]
    ])
    
    const indices = new Uint16Array([0, 1, 2, 1, 3, 2])
    
    const wallGeometry = new THREE.BufferGeometry()
    wallGeometry.setAttribute('position', new THREE.BufferAttribute(wallVertices, 3))
    wallGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
    wallGeometry.computeVertexNormals()
    
    const wallMaterial = feltMaterial.clone()
    wallMaterial.transparent = true
    wallMaterial.opacity = 0.8
    
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
    wallMesh.receiveShadow = true
    wallMesh.castShadow = true
    scene.value.add(wallMesh)
    
    // Create wall collider
    const wallColliderPoints = new Float32Array([
      baseStart[0], 0, baseStart[1],
      baseEnd[0], 0, baseEnd[1],
      topStart[0], height, topStart[1],
      topEnd[0], height, topEnd[1],
      baseStart[0], 0, baseStart[1] + wallThickness,
      baseEnd[0], 0, baseEnd[1] + wallThickness,
      topStart[0], height, topStart[1] + wallThickness,
      topEnd[0], height, topEnd[1] + wallThickness
    ])
    
    const wallColliderDesc = RAPIER.ColliderDesc.convexHull(wallColliderPoints)
    wallColliderDesc
      .setRestitution(0.5)
      .setFriction(0.2)
    
    world.value.createCollider(wallColliderDesc, groundRigidBody)

    // Add wireframe helper
    const wallHelperGeometry = new THREE.BufferGeometry()
    wallHelperGeometry.setAttribute('position', new THREE.BufferAttribute(wallColliderPoints, 3))
    
    const wireframeIndices = new Uint16Array([
      0, 1, 1, 3, 3, 2, 2, 0,
      4, 5, 5, 7, 7, 6, 6, 4,
      0, 4, 1, 5, 2, 6, 3, 7
    ])
    
    wallHelperGeometry.setIndex(new THREE.BufferAttribute(wireframeIndices, 1))
    
    const wallHelper = new THREE.LineSegments(
      wallHelperGeometry,
      new THREE.LineBasicMaterial({ color: 0x00ff00 })
    )
    wallHelper.visible = showWireframes.value
    scene.value.add(wallHelper)
    wireframeHelpers.value.push(wallHelper)
  }

  const initScene = async () => {
    // Mark the scene as raw to prevent Vue from making it reactive
    scene.value = markRaw(new THREE.Scene())
    
    // Add lights (also marked raw)
    scene.value.add(markRaw(setupMainLight()))
    scene.value.add(markRaw(new THREE.AmbientLight(0x404040)))

    world.value = markRaw(new RAPIER.World({ x: 0, y: GRAVITY, z: 0 }))
    world.value.timestep = 1/120

    createHexagonalGround()
  }

  const cleanupScene = () => {
    // Clear dice wireframes first
    diceWireframes.value.forEach(wireframe => {
      if (wireframe.parent) {
        wireframe.parent.remove(wireframe)
      }
    })
    diceWireframes.value = []
  
    while (scene.value.children.length > 0) {
      scene.value.remove(scene.value.children[0])
    }
  
    scene.value.add(setupMainLight())
    scene.value.add(new THREE.AmbientLight(0x404040))
    createHexagonalGround()
  }
  
  const toggleWireframes = (diceManagerInstance) => {
    showWireframes.value = !showWireframes.value
    
    // Toggle scene wireframes
    wireframeHelpers.value.forEach(helper => {
      helper.visible = showWireframes.value
    })
    
    // Toggle dice wireframes if diceManager instance was provided
    if (diceManagerInstance) {
      diceManagerInstance.toggleWireframes(showWireframes.value)
    }
  }

  return {
    scene,
    world,
    showWireframes: ref(false),
    initScene,
    cleanupScene,
    toggleWireframes,
    addDiceWireframe
  }
}