import { useGLTF } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'

const CRANE_SCALE = 40

export function Cranes() {
  const { scene } = useGLTF('/blender-asset/crane.glb')
  const craneRefs = useRef<Map<string, THREE.Group>>(new Map())

  return (
    <group>
      {PORT_ZONES.map((zone) =>
        zone.cranes.map((crane) => {
          const clone = scene.clone(true)
          return (
            <group
              key={crane.name}
              ref={(el) => {
                if (el) craneRefs.current.set(crane.name, el)
                else craneRefs.current.delete(crane.name)
              }}
              position={crane.position}
              rotation={[0, 0, 0]}
              name={crane.name}
            >
              <primitive object={clone} scale={CRANE_SCALE} />
            </group>
          )
        })
      )}
    </group>
  )
}
