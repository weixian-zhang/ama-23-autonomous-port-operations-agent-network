import { useGLTF } from '@react-three/drei'
import { BERTHS } from '../data/berthData'

const CRANE_SCALE = 30.5
const CRANE_BERTH_IDS = [1, 2, 3, 4, 5]
const CRANES_PER_BERTH = 4
const CRANE_SPACING = 20

export function Cranes() {
  const { scene } = useGLTF('/blender-asset/crane.glb')

  return (
    <group>
      {CRANE_BERTH_IDS.map((id) => {
        const berth = BERTHS.find((b) => b.id === id)!
        const offset = ((CRANES_PER_BERTH - 1) * CRANE_SPACING) / 2
        return Array.from({ length: CRANES_PER_BERTH }, (_, i) => {
          const clone = scene.clone(true)
          const z = berth.quay[2] - offset + i * CRANE_SPACING
          return (
            <group
              key={`${id}-${i}`}
              position={[berth.quay[0], berth.quay[1], z]}
              rotation={[0, 0, 0]}
              name={`crane-berth-${id}-${i}`}
            >
              <primitive object={clone} scale={CRANE_SCALE} />
            </group>
          )
        })
      })}
    </group>
  )
}
