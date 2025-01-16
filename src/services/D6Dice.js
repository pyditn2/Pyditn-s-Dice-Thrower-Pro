import * as THREE from 'three'
import { BaseDice } from './BaseDice'

export class D6Dice extends BaseDice {
  constructor() {
    super()
    this.layout = [6, 5, 4, 3, 2, 1]  // top, right, front, back, left, bottom
    this.normals = [
      new THREE.Vector3(0, 1, 0),    // top
      new THREE.Vector3(1, 0, 0),    // right
      new THREE.Vector3(0, 0, 1),    // front
      new THREE.Vector3(0, 0, -1),   // back
      new THREE.Vector3(-1, 0, 0),   // left
      new THREE.Vector3(0, -1, 0)    // bottom
    ]
    this.centers = [
      new THREE.Vector3(0, 0.5, 0),    // top
      new THREE.Vector3(0.5, 0, 0),    // right
      new THREE.Vector3(0, 0, 0.5),    // front
      new THREE.Vector3(0, 0, -0.5),   // back
      new THREE.Vector3(-0.5, 0, 0),   // left
      new THREE.Vector3(0, -0.5, 0)    // bottom
    ]
  }

  createFaceLabel(number, center, normal) {
    const label = super.createFaceLabel(number, center, normal)
    
    label.scale.set(1.2, 1.2, 1.2)
    
    const up = new THREE.Vector3(0, 1, 0)
    if (Math.abs(normal.y) > 0.9) {
      up.set(0, 0, -Math.sign(normal.y))
    }
    
    label.lookAt(center.clone().add(normal))
    label.up.copy(up)
    
    if (normal.y === 0) {  // Side faces
      label.rotateZ(-Math.PI/2 * Math.sign(normal.x))
      if (Math.abs(normal.z) > 0) {
        label.rotateZ(Math.PI * (normal.z > 0 ? 1 : 0))
      }
    }
    
    label.updateMatrix()
    return label
  }

  createDice(world, appearance = null) {
    if (appearance) {
      this.setAppearance(appearance)
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const mesh = this.createBaseMesh(geometry)
    const startY = 6
    mesh.position.set(0, startY, 0)
    
    const physicsVertices = Array.from(geometry.attributes.position.array)
    const rigidBody = this.createRigidBody(world, { x: 0, y: startY, z: 0 }, physicsVertices)
    
    this.addNumbersToMesh(mesh)
    
    return { mesh, rigidBody }
  }

  addNumbersToMesh(mesh) {
    this.diceNumbers = []
    
    this.layout.forEach((number, i) => {
      const label = this.createFaceLabel(
        number,
        this.centers[i],
        this.normals[i]
      )
      
      mesh.add(label)
      
      this.diceNumbers.push({
        number: number,
        normal: this.normals[i].clone()
      })
    })
  }

  // Method to update appearance after creation
  updateDiceAppearance(mesh, appearance) {
    if (!mesh) return
    
    // Update the base mesh appearance
    this.updateAppearance(mesh, appearance)
    
    // Update labels if needed
    mesh.children.forEach(label => {
      if (label.isMesh && label.material) {
        // You might want to update label appearance properties here
        // For now, we'll keep labels with their default appearance
      }
    })
  }
}