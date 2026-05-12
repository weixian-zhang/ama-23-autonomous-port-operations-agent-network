import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'
import { AgvSignBoard } from './AgvSignBoard'
import { DistanceCullGate } from './DistanceCullGate'

const AGV_SCALE = 20.7636
const AGVS_PER_BERTH = 4
const BERTH_Z_HALF_RANGE = 100
const AGV_X_MIN = -25
const AGV_X_MAX = 50
const AGV_Y = 0.76
// Beyond this distance the AGV telemetry sign board is unmounted.
const AGV_SIGN_CULL_DISTANCE = 320

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

  // Memoize per-instance clones so the AGV GLB isn't re-cloned for every
  // instance whenever any parent in the tree re-renders.
  const agvInstances = useMemo(
    () =>
      agvPositions.map((p) => ({
        ...p,
        clone: scene.clone(true),
      })),
    [agvPositions, scene],
  )

  return (
    <group>
      {agvInstances.map(({ name, position, clone }) => (
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
          <DistanceCullGate maxDistance={AGV_SIGN_CULL_DISTANCE}>
            <AgvSignBoard agvName={name} />
          </DistanceCullGate>
        </group>
      ))}
    </group>
  )
}
