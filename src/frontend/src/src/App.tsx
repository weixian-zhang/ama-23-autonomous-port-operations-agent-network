import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'

function PortTerrain() {
  const { scene } = useGLTF('/blender-asset/terrain-port.glb')
  return <primitive object={scene} />
}

function Agv() {
  const { scene } = useGLTF('/blender-asset/agv.glb')
  const { scene: rootScene } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const scale = 10

  useEffect(() => {
    if (!groupRef.current) return

    // Cast a ray downward from above the QuayRoad (x=-25, z=0) to find road surface
    const raycaster = new THREE.Raycaster()
    const origin = new THREE.Vector3(-25, 100, 0)
    const direction = new THREE.Vector3(0, -1, 0)
    raycaster.set(origin, direction)

    // Only collect road meshes — exclude floating labels, berth signs, etc.
    const roadMeshes: THREE.Mesh[] = []
    rootScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.name.toLowerCase()
        const parentName = child.parent?.name?.toLowerCase() ?? ''
        if (name.includes('road') || parentName.includes('road')) {
          roadMeshes.push(child)
        }
      }
    })

    const intersects = raycaster.intersectObjects(roadMeshes, false)
    if (intersects.length > 0) {
      const hitY = intersects[0].point.y
      groupRef.current.position.set(-25, hitY, 0)
    } else {
      // Fallback: place directly on QuayRoad surface (y=0.76)
      groupRef.current.position.set(-25, 0.76, 0)
    }
  }, [rootScene, scale])

  return (
    <group ref={groupRef} position={[-25, 0, 0]}>
      <primitive object={scene} scale={scale} />
    </group>
  )
}

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} />
        <Suspense fallback={null}>
          <PortTerrain />
          <Agv />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
