import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'
import { StackerSignBoard } from './StackerSignBoard'
import { DistanceCullGate } from './DistanceCullGate'

const STACKER_SCALE = 20.7636
const STACKERS_PER_YARD = 4
const YARD_Z_HALF_RANGE = 100
const YARD_X_MIN = 30
const YARD_X_MAX = 120
const STACKER_Y = 0.75
// Beyond this distance the stacker telemetry sign board is unmounted.
const STACKER_SIGN_CULL_DISTANCE = 320

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function Stackers() {
  const { scene } = useGLTF('/blender-asset/stacker.glb')
  const stackerRefs = useRef<Map<string, THREE.Group>>(new Map())

  const stackerPositions = useMemo(() => {
    const positions: { name: string; position: [number, number, number] }[] = []
    PORT_ZONES.filter((zone) => zone.id !== 3).forEach((zone) => {
      for (let i = 0; i < STACKERS_PER_YARD; i++) {
        const seed = zone.id * 200 + i
        const x = YARD_X_MIN + seededRandom(seed) * (YARD_X_MAX - YARD_X_MIN)
        const z = zone.yard[2] - YARD_Z_HALF_RANGE + seededRandom(seed + 1) * YARD_Z_HALF_RANGE * 2
        positions.push({
          name: `stacker-yard-${zone.id}-${i}`,
          position: [x, STACKER_Y, z],
        })
      }
    })
    return positions
  }, [])

  // Memoize per-instance scene clones so a parent re-render doesn't re-clone
  // the entire stacker GLB for each instance.
  const stackerInstances = useMemo(
    () =>
      stackerPositions.map((p) => ({
        ...p,
        clone: scene.clone(true),
      })),
    [stackerPositions, scene],
  )

  return (
    <group>
      {stackerInstances.map(({ name, position, clone }) => (
        <group
          key={name}
          ref={(el) => {
            if (el) stackerRefs.current.set(name, el)
            else stackerRefs.current.delete(name)
          }}
          position={position}
          name={name}
        >
          <primitive object={clone} scale={STACKER_SCALE} />
          <DistanceCullGate maxDistance={STACKER_SIGN_CULL_DISTANCE}>
            <StackerSignBoard stackerName={name} />
          </DistanceCullGate>
        </group>
      ))}
    </group>
  )
}
