<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { watch } from 'vue'
import { DiceManager } from '../services/diceManager.js'

const containerRef1 = ref(null)
const containerRef2 = ref(null)
const containerRef3 = ref(null)
const showExtraViews = ref(false)

const diceManager = new DiceManager()

const settledDice = ref(new Set())
const cameraTransitions = ref(new Map())

let scene, cameras = [], renderers = [], world
let dice = []
let rigidBodies = []
let animationFrameId = null
let diceNumbers = []

let rotationAngle = 0;
const ROTATION_SPEED = 0.003;
let lastSettleTime = null;
const SETTLE_DISPLAY_DURATION = 5000; // 5 seconds in milliseconds
const isRotating = ref(true);

watch(showExtraViews, (newValue) => {
  if (newValue) {
    // Small delay to ensure DOM is updated
    setTimeout(reinitRenderers, 0)
  }
})

const createGround = () => {
  // Base ground
  const groundGeometry = new THREE.PlaneGeometry(20, 20)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222,
    side: THREE.DoubleSide
  })
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial)
  groundMesh.rotation.x = Math.PI / 2
  groundMesh.position.y = 0
  scene.add(groundMesh)

  // Create walls
  const wallHeight = 4;
  const walls = [
    { pos: [10, wallHeight/2, 0], scale: [0.5, wallHeight, 20], rot: [0, 0, 0] },    // Right wall
    { pos: [-10, wallHeight/2, 0], scale: [0.5, wallHeight, 20], rot: [0, 0, 0] },   // Left wall
    { pos: [0, wallHeight/2, 10], scale: [20, wallHeight, 0.5], rot: [0, 0, 0] },    // Back wall
    { pos: [0, wallHeight/2, -10], scale: [20, wallHeight, 0.5], rot: [0, 0, 0] },   // Front wall
  ];

  walls.forEach(wall => {
    const wallGeometry = new THREE.BoxGeometry(1, 1, 1);
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    
    wallMesh.position.set(...wall.pos);
    wallMesh.scale.set(...wall.scale);
    wallMesh.rotation.set(...wall.rot);
    
    scene.add(wallMesh);
  });

  // Physics bodies
  const groundRigidBodyDesc = RAPIER.RigidBodyDesc.fixed();
  const groundRigidBody = world.createRigidBody(groundRigidBodyDesc);
  
  // Ground collider
  const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.5, 10.0);
  groundColliderDesc
    .setRestitution(0.8)   
    .setFriction(0.8);
  world.createCollider(groundColliderDesc, groundRigidBody);

  // Wall colliders
  const wallColliders = [
    { pos: [10, wallHeight/2, 0], half: [0.25, wallHeight/2, 10] },    // Right wall
    { pos: [-10, wallHeight/2, 0], half: [0.25, wallHeight/2, 10] },   // Left wall
    { pos: [0, wallHeight/2, 10], half: [10, wallHeight/2, 0.25] },    // Back wall
    { pos: [0, wallHeight/2, -10], half: [10, wallHeight/2, 0.25] },   // Front wall
  ];

  wallColliders.forEach(wall => {
  const wallColliderDesc = RAPIER.ColliderDesc.cuboid(...wall.half);
  wallColliderDesc.translation = new RAPIER.Vector3(...wall.pos);
  wallColliderDesc
    .setRestitution(1)
    .setFriction(0.2);
  world.createCollider(wallColliderDesc, groundRigidBody);
});
};



const initScene = () => {
  scene = new THREE.Scene()
  
  // Create cameras
  cameras = [
    new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000),
    new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000),
    new THREE.PerspectiveCamera(45, 300 / 300, 0.1, 1000)
  ]
  
  // Set initial camera positions
  cameras[0].position.set(0, 8, 12)    // Main view (center)
  cameras[1].position.set(-8, 8, 8)    // Left view
  cameras[2].position.set(8, 8, 8)     // Right view
  
  cameras.forEach(camera => camera.lookAt(0, 0, 0))
  
  // Create renderers
  renderers = [
    new THREE.WebGLRenderer({ antialias: false }),
    new THREE.WebGLRenderer({ antialias: false }),
    new THREE.WebGLRenderer({ antialias: false })
  ]
  
  // Attach first renderer (always visible)
  renderers.forEach(renderer => {
    renderer.setSize(300, 300)
    renderer.shadowMap.enabled = true
  })

  // Always attach all renderers to containers
  if (containerRef1.value) {
    containerRef1.value.innerHTML = ''
    containerRef1.value.appendChild(renderers[0].domElement)
  }
  if (containerRef2.value) {
    containerRef2.value.innerHTML = ''
    containerRef2.value.appendChild(renderers[1].domElement)
  }
  if (containerRef3.value) {
    containerRef3.value.innerHTML = ''
    containerRef3.value.appendChild(renderers[2].domElement)
  }
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  createGround();
}

const reinitRenderers = () => {
  if (showExtraViews.value) {
    renderers[1].setSize(300, 300)
    renderers[1].shadowMap.enabled = true
    if (containerRef2.value) {
      containerRef2.value.innerHTML = ''
      containerRef2.value.appendChild(renderers[1].domElement)
    }

    renderers[2].setSize(300, 300)
    renderers[2].shadowMap.enabled = true
    if (containerRef3.value) {
      containerRef3.value.innerHTML = ''
      containerRef3.value.appendChild(renderers[2].domElement)
    }
  }
}


const resetCamera = () => {
  cameras.forEach((camera, index) => {
    const defaultPositions = [
      new THREE.Vector3(0, 8, 12),    // Main view
      new THREE.Vector3(-8, 8, 8),    // Left view
      new THREE.Vector3(8, 8, 8)      // Right view
    ];
    camera.position.copy(defaultPositions[index]);
    camera.lookAt(0, 0, 0);
  });
};


const rollDice = async (type, count) => {
  isRotating.value = false;
  lastSettleTime = null;
  settledDice.value.clear();
  showExtraViews.value = count > 1
  // Make sure to properly clean up ALL previous dice
  while (scene.children.length > 0) {
    const object = scene.children[0];
    scene.remove(object);
  }
  
  // Re-add lights and ground after clearing
  const mainLight = new THREE.DirectionalLight(0xffffff, 1)
  mainLight.position.set(5, 5, 5)
  scene.add(mainLight)
  
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  // Recreate ground
  createGround()

  // Clear physics bodies
  rigidBodies.forEach(rb => {
    if (rb && world.getRigidBody(rb.handle)) {
      world.removeRigidBody(rb)
    }
  })
  
  dice = []
  rigidBodies = []

  // Create new dice
  for (let i = 0; i < count; i++) {
    const offset = {
      x: (i - (count-1)/2) * 2.5,
      y: 6 + Math.random() * 2,
      z: Math.random() - 0.5
    }
    resetCamera();

    const { mesh, rigidBody } = diceManager.createDice(type, world)
    
    mesh.position.set(offset.x, offset.y, offset.z)
    rigidBody.setTranslation({ x: offset.x, y: offset.y, z: offset.z })

    rigidBody.setLinvel(new RAPIER.Vector3(
      Math.random() * 12 - 2,  
      8,                     
      Math.random() * 6 - 3   
    ))

    rigidBody.setAngvel(new RAPIER.Vector3(
      Math.random() * 15 - 7.5, 
      Math.random() * 15 - 7.5,  
      Math.random() * 15 - 7.5   
    ))

    scene.add(mesh)
    dice.push(mesh)
    rigidBodies.push(rigidBody)
  }

  return new Promise((resolve) => {
    const checkSettled = setInterval(() => {
      const allSettled = rigidBodies.every(rb => {
        const vel = rb.linvel()
        const angVel = rb.angvel()
        return Math.abs(vel.x) < 0.01 && 
               Math.abs(vel.y) < 0.01 && 
               Math.abs(vel.z) < 0.01 &&
               Math.abs(angVel.x) < 0.01 &&
               Math.abs(angVel.y) < 0.01 &&
               Math.abs(angVel.z) < 0.01
      })
      
      if (allSettled) {
        clearInterval(checkSettled)
        const results = dice.map(d => diceManager.getUpFacingNumber(d))
        resolve(results)
      }
    }, 100)
  })
}


const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  world.step();

  // Update rotation angle
  rotationAngle += ROTATION_SPEED;
  
  // Check if we should return to rotating mode
  if (lastSettleTime && Date.now() - lastSettleTime > SETTLE_DISPLAY_DURATION) {
    isRotating.value = true;
    lastSettleTime = null;
  }
  
  rigidBodies.forEach((rigidBody, index) => {
    // If die is already settled, skip physics calculations
    if (settledDice.value.has(index)) {
      if (showExtraViews.value && index < cameras.length) {
        const camera = cameras[index];
        const dicePosition = dice[index].position;
        
        if (isRotating.value) {
          // Return to rotating around bowl
          const radius = 12;
          const offsetAngle = (2 * Math.PI * index) / cameras.length + rotationAngle;
          const x = Math.cos(offsetAngle) * radius;
          const z = Math.sin(offsetAngle) * radius;
          const y = 8;
          
          camera.position.lerp(new THREE.Vector3(x, y, z), 0.02);
          camera.lookAt(0, 0, 0);
        } else {
          // Top-down view of settled die
          const desiredCameraPosition = new THREE.Vector3(
            dicePosition.x,
            dicePosition.y + 5,
            dicePosition.z
          );
          camera.position.lerp(desiredCameraPosition, 0.1);
          
          // Handle rotation transition
          if (!cameraTransitions.value.has(index)) {
            cameraTransitions.value.set(index, {
              isTransitioning: true,
              startQuaternion: camera.quaternion.clone()
            });
          }
          
          const targetQuaternion = new THREE.Quaternion();
          targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
          camera.quaternion.slerp(targetQuaternion, 0.1);
        }
      }
      return;
    }

    const position = rigidBody.translation();
    const rotation = rigidBody.rotation();
    dice[index].position.set(position.x, position.y, position.z);
    dice[index].quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    if (position.y < -5) { 
      rigidBody.setTranslation({ 
        x: -8, 
        y: 8 + Math.random() * 2,
        z: (index - (dice.length-1)/2) * 2.5 
      });
      rigidBody.setLinvel(new RAPIER.Vector3(
        Math.random() * 12 - 2,
        8,
        Math.random() * 6 - 3
      ));
      rigidBody.setAngvel(new RAPIER.Vector3(
        Math.random() * 15 - 7.5,
        Math.random() * 15 - 7.5,
        Math.random() * 15 - 7.5
      ));
    }
    
    // Check if die has settled
    const velocity = rigidBody.linvel();
    const angularVelocity = rigidBody.angvel();
    const isSettled =
      Math.abs(velocity.x) < 0.01 &&
      Math.abs(velocity.y) < 0.01 &&
      Math.abs(velocity.z) < 0.01 &&
      Math.abs(angularVelocity.x) < 0.01 &&
      Math.abs(angularVelocity.y) < 0.01 &&
      Math.abs(angularVelocity.z) < 0.01;

    if (isSettled) {
      settledDice.value.add(index);
      rigidBody.setLinvel({ x: 0, y: 0, z: 0 });
      rigidBody.setAngvel({ x: 0, y: 0, z: 0 });
    }

    if (showExtraViews.value && index < cameras.length) {
      const camera = cameras[index];
      const dicePosition = dice[index].position;

      if (isSettled) {
        isRotating.value = false;
        lastSettleTime = Date.now();
        // Start transition to overhead view
        const desiredCameraPosition = new THREE.Vector3(
          dicePosition.x,
          dicePosition.y + 5,
          dicePosition.z
        );
        camera.position.lerp(desiredCameraPosition, 0.1);
        
        // Store current rotation when first settling
        if (!cameraTransitions.value.has(index)) {
          cameraTransitions.value.set(index, {
            isTransitioning: true,
            startQuaternion: camera.quaternion.clone()
          });
        }
        
        // Create target quaternion for top-down view
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
        
        // Smoothly interpolate rotation
        camera.quaternion.slerp(targetQuaternion, 0.1);
      } else {
        // Following behavior while rolling
        const radius = 8;
        const currentAngle = Math.atan2(
          camera.position.z - dicePosition.z,
          camera.position.x - dicePosition.x
        );
        camera.position.set(
          dicePosition.x + radius * Math.cos(currentAngle),
          dicePosition.y + 5,
          dicePosition.z + radius * Math.sin(currentAngle)
        );
        camera.lookAt(dicePosition);
      }
    }
  });
  if (dice.length === 0) {
    cameras.forEach((camera, index) => {
      const radius = 12;
      const offsetAngle = (2 * Math.PI * index) / cameras.length + rotationAngle;
      const x = Math.cos(offsetAngle) * radius;
      const z = Math.sin(offsetAngle) * radius;
      const y = 8;
      
      camera.position.lerp(new THREE.Vector3(x, y, z), 0.02);
      camera.lookAt(0, 0, 0);
    });
  }
  // Render each view
  renderers.forEach((renderer, index) => {
    if (index === 0 || (showExtraViews.value && index < dice.length)) {
      renderer.render(scene, cameras[index]);
    }
  });
};

onMounted(async () => {
  await RAPIER.init()
  initScene()
  animate()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

defineExpose({ 
  rollDice,
  resetCamera
})
</script>

<template>
  <div class="dice-views-container">
    <div class="dice-views">
      <div ref="containerRef1" class="dice-container"></div>
      <div v-show="showExtraViews" ref="containerRef2" class="dice-container"></div>
      <div v-show="showExtraViews" ref="containerRef3" class="dice-container"></div>
    </div>
  </div>
</template>

<style scoped>
.dice-views-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.dice-views {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  justify-content: center;
}

.dice-container {
  width: 300px;
  height: 300px;
  background-color: #1a1a1a;
  border-radius: 8px;
  overflow: hidden;
}

@media (max-width: 960px) {
  .dice-views {
    flex-direction: column;
  }
}
.dice-label {
  text-align: center;
  margin-top: 0.5rem;
  color: #42b983;
  font-weight: bold;
  font-size: 0.9rem;
}
</style>