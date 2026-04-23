import { useGLTF } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { BERTHS } from '../data/berthData'

const CRANE_SCALE = 30.5
const CRANE_BERTH_IDS = [1, 2, 3, 4, 5]
const CRANES_PER_BERTH = 4
const CRANE_SPACING = 20

export function Cranes() {
  const { scene } = useGLTF('/blender-asset/crane.glb')
  const craneRefs = useRef<Map<string, THREE.Group>>(new Map())

  return (
    <group>
      {CRANE_BERTH_IDS.map((id) => {
        const berth = BERTHS.find((b) => b.id === id)!
        const offset = ((CRANES_PER_BERTH - 1) * CRANE_SPACING) / 2
        return Array.from({ length: CRANES_PER_BERTH }, (_, i) => {
          const clone = scene.clone(true)
          const z = berth.quay[2] - offset + i * CRANE_SPACING
          const name = `crane-berth-${id}-${i}`
          return (
            <group
              key={name}
              ref={(el) => {
                if (el) craneRefs.current.set(name, el)
                else craneRefs.current.delete(name)
              }}
              position={[berth.quay[0], berth.quay[1], z]}
              rotation={[0, 0, 0]}
              name={name}
            >
              <primitive object={clone} scale={CRANE_SCALE} />
            </group>
          )
        })
      })}
    </group>
  )
}
