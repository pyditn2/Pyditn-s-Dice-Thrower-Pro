import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'

export class DiceManager {
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
    
    label.castShadow = true  // Add shadow casting to labels
    label.position.copy(center.clone().multiplyScalar(1.01))
    
    const up = new THREE.Vector3(0, 1, 0)
    if (Math.abs(normal.y) > 0.9) {
      up.set(0, 0, -Math.sign(normal.y))
    }
    
    label.lookAt(center.clone().add(normal))
    label.up.copy(up)
    label.updateMatrix()
    
    return label
  }

  createDiceGeometry(type) {
    switch (type) {
      case 'd20':
        return new THREE.IcosahedronGeometry(1)
      case 'd6':
        return new THREE.BoxGeometry(1, 1, 1)
      case 'd12':
        return new THREE.DodecahedronGeometry(1)
      case 'd10':
        return this.createD10Geometry()
      case 'd8':
        return new THREE.OctahedronGeometry(1)
      case 'd4':
        return new THREE.TetrahedronGeometry(1)
      default:
        throw new Error('Unsupported dice type')
    }
  }

  createD10Geometry() {
    // Custom D10 geometry implementation here
    // This is a placeholder - we can implement the proper D10 geometry later
    return new THREE.ConeGeometry(1, 2, 10)
  }

  createDice(type, world) {
    const geometry = this.createDiceGeometry(type)
    const material = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      shininess: 30,
      shadowSide: THREE.BackSide,
      receiveShadow: true
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    const startY = 6
    mesh.position.set(0, startY, 0)
    
    this.diceNumbers = []
    
    const physicsVertices = Array.from(geometry.attributes.position.array)
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    rigidBodyDesc.setTranslation(0, startY, 0)
    rigidBodyDesc.angularDamping = 0.5
    rigidBodyDesc.linearDamping = 0.5
    
    const rigidBody = world.createRigidBody(rigidBodyDesc)
    
    const colliderDesc = RAPIER.ColliderDesc.convexHull(physicsVertices)
    if (colliderDesc) {
      colliderDesc
        .setRestitution(0.3)
        .setFriction(0.8)
        .setDensity(2.0)
      world.createCollider(colliderDesc, rigidBody)
    }
    
    // Add number layouts and labels based on dice type
    this.addNumbersToMesh(type, mesh, geometry)

    return { mesh, rigidBody }
  }

  addNumbersToMesh(type, mesh, geometry) {
    const layouts = {
      'd20': [
        20, 8, 14, 2, 16,
        10, 12, 4, 6, 18,
        19, 7, 13, 1, 15,
        11, 3, 17, 5, 9
      ],
      'd6': [1, 2, 3, 4, 5, 6],
      // Add layouts for other dice types
    }

    if (!layouts[type]) return

    const positions = geometry.attributes.position.array
    const faceNormals = []
    const faceCenters = []
    
    // Calculate face centers and normals
    for (let i = 0; i < positions.length; i += 9) {
      const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2])
      const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5])
      const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8])
      
      const normal = new THREE.Vector3()
      const center = new THREE.Vector3()
      
      normal.crossVectors(
        v2.clone().sub(v1),
        v3.clone().sub(v1)
      ).normalize()
      
      center.add(v1).add(v2).add(v3).divideScalar(3)
      
      faceNormals.push(normal.clone())
      faceCenters.push(center.clone())
    }
    
    // Add number labels to faces
    for (let i = 0; i < layouts[type].length; i++) {
      const label = this.createFaceLabel(
        layouts[type][i],
        faceCenters[i],
        faceNormals[i]
      )
      mesh.add(label)
      
      this.diceNumbers.push({
        number: layouts[type][i],
        normal: faceNormals[i]
      })
    }
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
}