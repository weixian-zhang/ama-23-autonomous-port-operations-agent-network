import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'
import { OperatorNPC } from './OperatorNPC'

const YARD_5 = PORT_ZONES.find((z) => z.id === 5)!
const YARD_1 = PORT_ZONES.find((z) => z.id === 1)!

const ROUTE_X = 70
const ROUTE_Y = 0.75
const ROUTE_Z_START = YARD_5.yard[2]  // -480
const ROUTE_Z_END = YARD_1.yard[2]    // 480
const ROUTE_LENGTH = ROUTE_Z_END - ROUTE_Z_START // 960

const WALK_SPEED = 8

function seeded(seed: number) {
  let h = seed | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 0x100000000
}

interface NPCInstance {
  seed: number
  xOffset: number
  timeOffset: number
  speed: number
}

function WalkingNPC({ instance }: { instance: NPCInstance }) {
  const groupRef = useRef<THREE.Group>(null)
  const elapsed = useRef(instance.timeOffset)

  useFrame((_, delta) => {
    elapsed.current += delta
    const g = groupRef.current
    if (!g) return

    const totalDist = elapsed.current * instance.speed
    const routePos = totalDist % (ROUTE_LENGTH * 2)

    let z: number
    let facingZ: number
    if (routePos < ROUTE_LENGTH) {
      z = ROUTE_Z_START + routePos
      facingZ = 1
    } else {
      z = ROUTE_Z_END - (routePos - ROUTE_LENGTH)
      facingZ = -1
    }

    g.position.set(ROUTE_X + instance.xOffset, ROUTE_Y, z)
    g.rotation.set(0, facingZ > 0 ? 0 : Math.PI, 0)
  })

  return (
    <group ref={groupRef}>
      <OperatorNPC seed={instance.seed} animation="walk" />
    </group>
  )
}

interface OperatorNPCYard5To1Props {
  count?: number
  seed?: number
}

export function OperatorNPCYard_5_1_Route_Animation({
  count = 5,
  seed = 500,
}: OperatorNPCYard5To1Props) {
  const instances = useMemo(() => {
    const arr: NPCInstance[] = []
    for (let i = 0; i < count; i++) {
      const s = seed + i * 10
      arr.push({
        seed: s,
        xOffset: (seeded(s + 1) - 0.5) * 20,
        timeOffset: seeded(s + 2) * 60,
        speed: WALK_SPEED + (seeded(s + 3) - 0.5) * 4,
      })
    }
    return arr
  }, [count, seed])

  return (
    <group>
      {instances.map((inst, i) => (
        <WalkingNPC key={i} instance={inst} />
      ))}
    </group>
  )
}
