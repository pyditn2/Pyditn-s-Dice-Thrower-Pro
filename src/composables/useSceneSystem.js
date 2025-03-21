import { ref, markRaw } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Add this to the top-level variables
const tableModel = ref(null)
const diceWireframes = ref([])
const skybox = ref(null)

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
  
    // Increase shadow map size for better quality
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    
    // Adjust camera bounds
    mainLight.shadow.camera.near = 0.1  // Decreased from 0.5
    mainLight.shadow.camera.far = 50
    mainLight.shadow.camera.left = -10
    mainLight.shadow.camera.right = 10
    mainLight.shadow.camera.top = 10
    mainLight.shadow.camera.bottom = -10
    
    // Fine-tune shadow parameters
    mainLight.shadow.bias = -0.0001    // Reduced from -0.001
    mainLight.shadow.normalBias = 0.0   // Reduced from 0.02
    mainLight.shadow.radius = 1         // Slightly reduced from 1.5
    
    return mainLight
  }

  const setColorBackground = (color = 0x120024) => {
    if (scene.value) {
      // Deep purple color (can be changed to any hex color)
      scene.value.background = new THREE.Color(color);
      console.log('Set solid color background:', new THREE.Color(color));
    }
  }

  const createStarryNightSky = () => {
    console.log('Creating simple starry night sky');
    
    // Clean up existing skybox if present
    if (skybox.value) {
      if (skybox.value.parent) {
        skybox.value.parent.remove(skybox.value);
      }
      cleanupSkybox();
    }
  
    // Create a larger sphere for the sky (increased from 50 to 200)
    const skyGeometry = new THREE.SphereGeometry(1900, 32, 32);
    
    // Create a simple texture-based starry sky
    const canvas = document.createElement('canvas');
    canvas.width = 1024;  // Increased resolution
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Fill with much darker gradient that borders on black
    ctx.fillStyle = '#010102';  // Almost black with just a hint of blue/purple
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Add more dense, brighter stars
    ctx.fillStyle = 'white';
    
    // Add small stars
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = 0.3 + Math.random() * 0.2; 
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 0.3);
      ctx.fill();
    }
    
    // Add a few brighter stars
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = 0.5 + Math.random() * 0.3;
      
      // Create a glow effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Bright center
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;  // Improves texture quality
    
    // Create material and mesh
    const skyMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    });
    
    // Create the mesh
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    
    // Position the sky at the origin
    sky.position.set(0, 0, 0);
    
    // Make sure we're not being reactive
    skybox.value = markRaw(sky);
    scene.value.add(sky);
    
    console.log('Added darker, larger starry night sky to scene');
    
    return sky;
  }
  
  // Function to update the sky animation during your animation loop
  const updateSkyAnimation = (time) => {
    if (skybox.value && 
        skybox.value.material && 
        skybox.value.material.uniforms && 
        skybox.value.material.uniforms.time) {
      
      // Update the time uniform (using modulo to prevent precision issues)
      skybox.value.material.uniforms.time.value = (time * 0.0001) % 1000;
    }
  }
  
  // Function to clean up skybox resources
  const cleanupSkybox = () => {
    if (skybox.value) {
      // Clean up any associated resources
      if (skybox.value.material) {
        if (Array.isArray(skybox.value.material)) {
          skybox.value.material.forEach(material => {
            if (material.map) material.map.dispose();
            material.dispose();
          });
        } else {
          if (skybox.value.material.map) skybox.value.material.map.dispose();
          skybox.value.material.dispose();
        }
      }
      
      if (skybox.value.geometry) {
        skybox.value.geometry.dispose();
      }
      
      if (skybox.value.parent) {
        skybox.value.parent.remove(skybox.value);
      }
      
      skybox.value = null;
    }
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

  const loadTableModel = async () => {
    // If table is already loaded, just return it
    if (tableModel.value) {
      console.log('Table already loaded, reusing existing model')
      return tableModel.value
    }

    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader()
      
      // Let's try multiple potential file paths
      const potentialPaths = [
        './src/assets/models/Table PDTP1.glb', // This is the actual path shown in the file structure
        '/src/assets/models/Table PDTP1.glb',
        'src/assets/models/Table PDTP1.glb',
        './assets/models/Table PDTP1.glb',
        '/assets/models/Table PDTP1.glb',
        './Table PDTP1.glb',
        '/Table PDTP1.glb',
        'Table PDTP1.glb'
      ]
      
      // Try loading from each path
      function tryNextPath(pathIndex) {
        if (pathIndex >= potentialPaths.length) {
          // If we've tried all paths, reject with a clear error
          reject(new Error('Could not find the table model at any of the attempted paths. Please check file location and name.'))
          return
        }
        
        const currentPath = potentialPaths[pathIndex]
        console.log('Attempting to load table model from:', currentPath)
        
        loader.load(
          currentPath,
          // Called when the resource is loaded
          (gltf) => {
            const loadedTable = gltf.scene
            
            // Mark the model as raw to prevent Vue reactivity issues
            markRaw(loadedTable)
            
            // Add user data for identification
            loadedTable.userData.isTable = true
            
            // Position the table underneath the dice bowl
            loadedTable.position.set(0, -35.8, 0)
            
            // Adjust the scale to make the table properly sized
            loadedTable.scale.set(17, 17, 17)

            loadedTable.rotation.y = -(Math.PI / 2)
            
            // Apply shadows
            loadedTable.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
                
                // Ensure materials are properly configured for shadows
                if (child.material) {
                  child.material.shadowSide = THREE.FrontSide;
                }
              }
            })
            
            // Add the model to the scene
            scene.value.add(loadedTable)
            
            // Store in our reactive reference
            tableModel.value = loadedTable
            
            // Log the loaded model for debugging
            console.log('Table model loaded successfully')
            
            resolve(loadedTable)
          },
          // Called while loading is progressing
          (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded')
          },
          // Called when loading has errors
          (error) => {
            console.error(`Error loading from ${potentialPaths[pathIndex]}:`, error)
            // Try the next path
            tryNextPath(pathIndex + 1)
          }
        )
      }
      
      // Try the next path
      tryNextPath(0)
    })
  }

  const initScene = async () => {
    console.log('Scene initialization started');
    
    // If scene already exists, clean it up first
    if (scene.value) {
      console.log('Scene already exists, cleaning up before re-initialization');
      
      // Just clear children instead of full cleanup to avoid recursion
      while (scene.value.children.length > 0) {
        const child = scene.value.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        scene.value.remove(child);
      }
    }
    
    // Mark the scene as raw to prevent Vue from making it reactive
    scene.value = markRaw(new THREE.Scene());
    console.log('New scene created');
    
    // Create the starry night sky
    createStarryNightSky();
    console.log('Starry night sky created');
    
    // Add lights (also marked raw)
    console.log('Adding lights');
    scene.value.add(markRaw(setupMainLight()));
    scene.value.add(markRaw(new THREE.AmbientLight(0x404040)));
    
    // Add a subtle purple point light for ambiance
    const purpleLight = new THREE.PointLight(0x9370DB, 0.5, 100);
    purpleLight.position.set(0, 20, 0);
    scene.value.add(markRaw(purpleLight));
    console.log('Lights added');
  
    // Create physics world
    console.log('Setting up physics world');
    world.value = markRaw(new RAPIER.World({ x: 0, y: GRAVITY, z: 0 }));
    world.value.timestep = 1/120;
  
    // Create ground
    console.log('Creating hexagonal ground');
    createHexagonalGround();
    
    // Load the table model
    console.log('Loading table model');
    try {
      await loadTableModel();
      console.log('Table model loaded and added to scene');
    } catch (error) {
      console.error('Failed to load table model:', error);
    }
    
    // Log the final scene content
    console.log('Final scene children count:', scene.value.children.length);
    
    console.log('Scene initialization completed');
  }

  const cleanupScene = () => {
    // Check if scene exists before proceeding
    if (!scene.value) {
      console.warn('Attempted to clean up scene before it was initialized');
      return;
    }
    
    // Clean up the skybox
    cleanupSkybox();
    
    // Dispose of dice wireframes
    diceWireframes.value.forEach(wireframe => {
      if (wireframe.geometry) wireframe.geometry.dispose();
      if (wireframe.material) wireframe.material.dispose();
      if (wireframe.parent) wireframe.parent.remove(wireframe);
    });
    diceWireframes.value = [];
  
    // Temporarily remove table from scene without disposing it
    if (tableModel.value && tableModel.value.parent === scene.value) {
      scene.value.remove(tableModel.value);
    }
  
    // Properly dispose of all scene objects
    scene.value.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      }
      
      // Don't remove table - we're preserving it
      if (object.userData && object.userData.isTable && object !== tableModel.value) {
        scene.value.remove(object);
      }
    });
  
    // Clear scene
    while (scene.value.children.length > 0) {
      scene.value.remove(scene.value.children[0]);
    }
  
    // Recreate basic scene elements
    scene.value.add(setupMainLight());
    scene.value.add(new THREE.AmbientLight(0x404040));
    
    // Re-create the starry night sky
    createStarryNightSky();
    
    createHexagonalGround();
    
    // Re-add the table if it exists
    if (tableModel.value) {
      scene.value.add(tableModel.value);
    }
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

  // Return the necessary methods
  return {
    scene,
    world,
    showWireframes: ref(false),
    initScene,
    cleanupScene,
    toggleWireframes,
    addDiceWireframe,
    loadTableModel,
    createStarryNightSky,
    cleanupSkybox,
    updateSkyAnimation,
    setColorBackground 
  }
}