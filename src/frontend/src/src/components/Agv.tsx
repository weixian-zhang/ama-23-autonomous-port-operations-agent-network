import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'

const AGV_SCALE = 10
const AGVS_PER_BERTH = 4
const BERTH_Z_HALF_RANGE = 100
const AGV_X_MIN = -25
const AGV_X_MAX = 50
const AGV_Y = 0.76

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function Agv() {
  const { scene } = useGLTF('/blender-asset/agv.glb')
  const agvRefs = useRef<Map<string, THREE.Group>>(new Map())

  const agvPositions = useMemo(() => {
    const positions: { name: string; position: [number, number, number] }[] = []
    PORT_ZONES.filter((zone) => zone.id !== 3).forEach((zone) => {
      for (let i = 0; i < AGVS_PER_BERTH; i++) {
        const seed = zone.id * 100 + i
        const x = AGV_X_MIN + seededRandom(seed) * (AGV_X_MAX - AGV_X_MIN)
        const z = zone.road[2] - BERTH_Z_HALF_RANGE + seededRandom(seed + 1) * BERTH_Z_HALF_RANGE * 2
        positions.push({
          name: `agv-berth-${zone.id}-${i}`,
          position: [x, AGV_Y, z],
        })
      }
    })
    return positions
  }, [])

  return (
    <group>
      {agvPositions.map(({ name, position }) => {
        const clone = scene.clone(true)
        return (
          <group
            key={name}
            ref={(el) => {
              if (el) agvRefs.current.set(name, el)
              else agvRefs.current.delete(name)
            }}
            position={position}
            name={name}
          >
            <primitive object={clone} scale={AGV_SCALE} />
          </group>
        )
      })}
    </group>
  )
}
