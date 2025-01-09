import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

export class BaseDice {
  constructor() {
    this.diceNumbers = []
  }

  createNumberTexture(number) {
    const canvas = document.createElement('canvas')
    const size = 128
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    
    ctx.clearRect(0, 0, size, size)
    
    ctx.beginPath()
    ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.fill()
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 90px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(number.toString(), size/2, size/2)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.center.set(0.5, 0.5)
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
        emissiveIntensity: 0.2
      })
    )
    
    label.castShadow = true
    label.position.copy(center.clone().multiplyScalar(1.01))
    return label
  }

  createBaseMesh(geometry) {
    const material = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      shininess: 30,
      shadowSide: THREE.BackSide,
      receiveShadow: true
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    return mesh
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
      world.createCollider(colliderDesc, rigidBody)
    }

    return rigidBody
  }

  getUpFacingNumber(dice) {
    console.log("Checking dice numbers:", this.diceNumbers); // Debug log
    if (!this.diceNumbers.length) {
      console.log("No dice numbers found!");
      return null;
    }
    
    const upVector = new THREE.Vector3(0, 1, 0)
    let maxDot = -1
    let result = null
    
    this.diceNumbers.forEach(({ normal, number }) => {
      const worldNormal = normal.clone()
      worldNormal.applyQuaternion(dice.quaternion)
      
      const dot = worldNormal.dot(upVector)
      console.log(`Number ${number} has dot product: ${dot}`); // Debug log
      if (dot > maxDot) {
        maxDot = dot
        result = number
      }
    })
    
    console.log("Selected number:", result, "with dot product:", maxDot); // Debug log
    return result
  }
}
