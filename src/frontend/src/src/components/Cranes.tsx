import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'
import { CraneSignBoard } from './CraneSignBoard'
import { DistanceCullGate } from './DistanceCullGate'

const CRANE_SCALE = 52.8
// Cranes are tall and clustered along the quay; their floating sign boards
// are unreadable past ~350 m anyway, so unmount them past that to remove
// the per-frame drei <Html> DOM transform cost.
const CRANE_SIGN_CULL_DISTANCE = 350

export function Cranes() {
  const { scene } = useGLTF('/blender-asset/crane.glb')
  const craneRefs = useRef<Map<string, THREE.Group>>(new Map())

  // Memoize per-instance clones so a parent re-render doesn't re-clone the
  // entire scene graph for every crane each time. Each clone is bound to a
  // stable crane name; the GLB itself is shared via drei's useGLTF cache.
  const craneInstances = useMemo(() => {
    const list: { name: string; position: [number, number, number]; clone: THREE.Object3D }[] = []
    for (const zone of PORT_ZONES) {
      for (const crane of zone.cranes) {
        list.push({ name: crane.name, position: crane.position, clone: scene.clone(true) })
      }
    }
    return list
  }, [scene])

  return (
    <group>
      {craneInstances.map(({ name, position, clone }) => (
        <group
          key={name}
          ref={(el) => {
            if (el) craneRefs.current.set(name, el)
            else craneRefs.current.delete(name)
          }}
          position={position}
          rotation={[0, 0, 0]}
          name={name}
        >
          <primitive object={clone} scale={CRANE_SCALE} />
          <DistanceCullGate maxDistance={CRANE_SIGN_CULL_DISTANCE}>
            <CraneSignBoard craneName={name} />
          </DistanceCullGate>
        </group>
      ))}
    </group>
  )
}
