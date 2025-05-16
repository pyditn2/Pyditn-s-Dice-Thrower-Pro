import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

export class BaseDice {
  constructor() {
    this.diceNumbers = []
    this.activeColliders = new Set()
    this.appearance = {
      color: '#ff0000',
      opacity: 1,
      shininess: 30
    }
  }

  setAppearance(appearance) {
    this.appearance = { ...this.appearance, ...appearance }
    return this
  }

  createNumberTexture(number) {
    // Create high-res canvas for better anti-aliasing
    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    
    // Enable image smoothing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size)
    
    // Create background circle with soft edge
    ctx.beginPath()
    ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fill()

    // Set text properties with larger initial size
    const fontSize = Math.floor(size * 0.7)
    ctx.font = `bold ${fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Apply very slight blur for anti-aliasing
    ctx.filter = 'blur(2px)'
    
    // Create engraved effect with adjusted offsets for higher resolution
    // Shadow (creates depth illusion)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillText(number.toString(), size/2 + 16, size/2 + 16)
    
    // Dark base (simulates engraved area)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.fillText(number.toString(), size/2, size/2)
    
    // Remove blur for sharper main number
    ctx.filter = 'blur(1px)'
    
    // Highlight on top edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(number.toString(), size/2 - 8, size/2 - 8)
    
    // Main number
    ctx.fillStyle = 'rgba(220, 220, 220, 0.95)'
    ctx.fillText(number.toString(), size/2 - 4, size/2 - 4)

    const texture = new THREE.CanvasTexture(canvas)
    
    // Use anisotropic filtering if available
    texture.anisotropy = 16
    
    // Use mipmapping
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
    
    return texture
  }

createFaceLabel(number, center, normal) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshPhongMaterial({
        map: this.createNumberTexture(number),
        transparent: true,
        side: THREE.DoubleSide,
        shininess: 0,
        emissive: new THREE.Color(0x333333),
        emissiveIntensity: 0.2,
        alphaTest: 0.01  // Helps with edge quality
      })
    )
    
    label.castShadow = true
    
    // Slight offset to prevent z-fighting
    const offset = 0.001
    label.position.copy(center.clone().multiplyScalar(1.01 + offset))
    
    return label
  }

  createBaseMesh(geometry) {
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(this.appearance.color),
      opacity: 1,
      transparent: 0,
      shininess: this.appearance.shininess,
      shadowSide: THREE.BackSide
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true  // Moved from material to mesh property
    
    // Store the initial appearance for reference
    mesh.userData.appearance = { ...this.appearance }
    
    return mesh
  }

  updateAppearance(mesh, appearance) {
    if (!mesh || !mesh.material) return

    // Update stored appearance
    mesh.userData.appearance = {
      ...mesh.userData.appearance,
      ...appearance
    }

    // Update material properties
    if (appearance.color !== undefined) {
      mesh.material.color = new THREE.Color(appearance.color)
    }
    
    if (appearance.opacity !== undefined) {
      mesh.material.opacity = appearance.opacity
      mesh.material.transparent = appearance.opacity < 1
    }
    
    if (appearance.shininess !== undefined) {
      mesh.material.shininess = appearance.shininess
    }

    mesh.material.needsUpdate = true
  }

  createRigidBody(world, position, vertices) {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    rigidBodyDesc.setTranslation(position.x, position.y, position.z)
    rigidBodyDesc.angularDamping = 0.5
    rigidBodyDesc.linearDamping = 0.5
    
    const rigidBody = world.createRigidBody(rigidBodyDesc)
    
    const colliderDesc = RAPIER.ColliderDesc.convexHull(vertices)
    if (colliderDesc) {
      colliderDesc
        .setRestitution(0.3)
        .setFriction(0.8)
        .setDensity(2.0)
      const collider = world.createCollider(colliderDesc, rigidBody)
      this.activeColliders.add(collider)
      
      const wireframeMesh = this.createColliderWireframe(vertices)
      if (wireframeMesh) {
        rigidBody.userData = { wireframeMesh }
      }
    }

    return rigidBody
  }

  createColliderWireframe(vertices) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    
    // Create a wireframe geometry instead of using the wireframe property
    const wireframeGeometry = new THREE.WireframeGeometry(geometry)
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    })

    const wireframe = new THREE.LineSegments(wireframeGeometry, material)
    wireframe.visible = false
    return wireframe
  }

  getUpFacingNumber(dice) {
    if (!this.diceNumbers.length) return null
    
    const upVector = new THREE.Vector3(0, 1, 0)
    let maxDot = -1
    let result = null
    
    this.diceNumbers.forEach(({ normal, number }) => {
      const worldNormal = normal.clone()
      worldNormal.applyQuaternion(dice.quaternion)
      
      const dot = worldNormal.dot(upVector)
      if (dot > maxDot) {
        maxDot = dot
        result = number
      }
    })
    
    return result
  }

  cleanup(world, rigidBody) {
    this.activeColliders.forEach(collider => {
      if (collider.parent() === rigidBody) {
        world.removeCollider(collider)
        this.activeColliders.delete(collider)
      }
    })

    if (rigidBody) {
      world.removeRigidBody(rigidBody)
    }

    if (rigidBody.userData?.wireframeMesh) {
      const wireframe = rigidBody.userData.wireframeMesh
      if (wireframe.parent) {
        wireframe.parent.remove(wireframe)
      }
    }
  }
}