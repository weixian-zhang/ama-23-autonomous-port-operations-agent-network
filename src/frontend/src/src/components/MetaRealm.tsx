import { Canvas } from '@react-three/fiber'
import { FirstPersonControls } from '@react-three/drei'
import { Suspense } from 'react'
import { PortTerrain } from './PortTerrain'
import { Agv } from './Agv'
import { BerthLabels } from './BerthLabels'

export function MetaRealm() {
  return (
    <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Suspense fallback={null}>
        <group>
          <PortTerrain />
          <Agv />
          <BerthLabels />
        </group>
      </Suspense>
      <FirstPersonControls movementSpeed={35} lookSpeed={0.08} />
    </Canvas>
  )
}
