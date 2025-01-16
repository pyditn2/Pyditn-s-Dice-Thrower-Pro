import * as THREE from 'three'
import { BaseDice } from './BaseDice'

export class D20Dice extends BaseDice {
  constructor() {
    super()
    this.layout = [
      20, 8, 14, 2, 16,
      10, 12, 4, 6, 18,
      19, 7, 13, 1, 15,
      11, 3, 17, 5, 9
    ]
  }

  createFaceLabel(number, center, normal) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.6), 
      new THREE.MeshPhongMaterial({
        map: this.createNumberTexture(number),
        transparent: true,
        side: THREE.DoubleSide,
        shininess: 0,
        emissive: new THREE.Color(0x333333),
        emissiveIntensity: 0.2
      })
    )
    
    label.castShadow = false

    // Position the label slightly above the face
    const offset = 0.01
    label.position.copy(center.clone().add(normal.clone().multiplyScalar(offset)))

    // Create a rotation matrix to align with the face
    const rotationMatrix = new THREE.Matrix4()
    const up = new THREE.Vector3(0, 1, 0)
    const right = new THREE.Vector3()
    right.crossVectors(up, normal).normalize()
    up.crossVectors(normal, right).normalize()

    rotationMatrix.makeBasis(right, up, normal)
    label.setRotationFromMatrix(rotationMatrix)

    return label
  }

  createDice(world) {
    const geometry = new THREE.IcosahedronGeometry(1)
    const mesh = this.createBaseMesh(geometry)
    const startY = 6
    mesh.position.set(0, startY, 0)
    
    const physicsVertices = Array.from(geometry.attributes.position.array)
    const rigidBody = this.createRigidBody(world, { x: 0, y: startY, z: 0 }, physicsVertices)
    
    this.addNumbersToMesh(mesh)
    
    return { mesh, rigidBody }
  }

  addNumbersToMesh(mesh) {
    //console.log("Adding numbers to D20"); // Debug log
    this.diceNumbers = [];
    
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;
    const faceNormals = [];
    const faceCenters = [];
    
    // Calculate face centers and normals
    for (let i = 0; i < positions.length; i += 9) {
      const v1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const v2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const v3 = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);
      
      const normal = new THREE.Vector3();
      const center = new THREE.Vector3();
      
      normal.crossVectors(
        v2.clone().sub(v1),
        v3.clone().sub(v1)
      ).normalize();
      
      center.add(v1).add(v2).add(v3).divideScalar(3);
      
      faceNormals.push(normal);
      faceCenters.push(center);
      
      //console.log(`Face ${i/9} center:`, center, "normal:", normal); // Debug log
    }
    
    this.layout.forEach((number, i) => {
      if (i < faceCenters.length) {
        const label = this.createFaceLabel(
          number,
          faceCenters[i],
          faceNormals[i]
        );
        
        mesh.add(label);
        
        this.diceNumbers.push({
          number: number,
          normal: faceNormals[i].clone() // Make sure to clone the normal
        });
        
        //console.log(`Added number ${number} with normal:`, faceNormals[i]); // Debug log
      }
    });
    
    //console.log("Final dice numbers:", this.diceNumbers); // Debug log
  }
}