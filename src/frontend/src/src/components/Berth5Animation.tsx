import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, placeContainer } from '../data/portZoneData'

const ZONE = PORT_ZONES.find((z) => z.id === 5)!

const VESSEL_SCALE = 40
const CONTAINER_SCALE = 8
const AGV_SCALE = 10
const STACKER_SCALE = 10

// Phase timing (seconds)
const P = {
  vesselStart: 0,   vesselEnd: 10,
  craneStart: 10,   craneEnd: 25,
  agvStart: 25,     agvEnd: 40,
  stackerStart: 40, stackerEnd: 50,
  retreatStart: 50, retreatEnd: 58,
}

// Seeded random — deterministic across renders
function seeded(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

const CONTAINER_GLBS = [
  '/blender-asset/container-blue-1.glb',
  '/blender-asset/container-red-1.glb',
  '/blender-asset/container-yellow-1.glb',
]

// Pre-pick random choices with stable seed
const VESSEL_PICK = seeded(42) > 0.5 ? '/blender-asset/vessel-1.glb' : '/blender-asset/vessel-2.glb'
const CONTAINER_PICKS = ZONE.cranes.map((_, i) => CONTAINER_GLBS[Math.floor(seeded(100 + i) * 3)])
const YARD_SLOTS = ZONE.cranes.map((_, i) => ({ row: i % ZONE.yardGrid.rows, col: i }))

// Sea origin — vessel sails from far negative X toward the quay wall
const VESSEL_SEA: THREE.Vector3Tuple = [-200, 0, ZONE.quay[2]]
const VESSEL_DOCK: THREE.Vector3Tuple = [-55, 0, ZONE.quay[2]]

// Crane lifts container from vessel deck height down to road level
const CRANE_LIFT_Y = 20

function progress(t: number, start: number, end: number): number {
  return Math.min(Math.max((t - start) / (end - start), 0), 1)
}

function lerpTuple(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, t: number): THREE.Vector3Tuple {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

export function Berth5Animation() {
  // Preload all GLBs
  const vesselGltf = useGLTF(VESSEL_PICK)
  const containerGltfs = [
    useGLTF('/blender-asset/container-blue-1.glb'),
    useGLTF('/blender-asset/container-red-1.glb'),
    useGLTF('/blender-asset/container-yellow-1.glb'),
  ]
  const agvGltf = useGLTF('/blender-asset/agv.glb')
  const stackerGltf = useGLTF('/blender-asset/stacker.glb')

  const elapsed = useRef(0)
  const placed = useRef<boolean[]>([false, false, false, false])

  const vesselRef = useRef<THREE.Group>(null)
  const containerRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  const agvRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  const stackerAnimRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])

  // Clone scenes once
  const clones = useMemo(() => {
    const vessel = vesselGltf.scene.clone(true)
    const containers = CONTAINER_PICKS.map((path) => {
      const idx = CONTAINER_GLBS.indexOf(path)
      return containerGltfs[idx].scene.clone(true)
    })
    const agvs = ZONE.cranes.map(() => agvGltf.scene.clone(true))
    const stackers = ZONE.cranes.map(() => stackerGltf.scene.clone(true))
    return { vessel, containers, agvs, stackers }
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current

    // === Phase 1: Vessel sails from sea to dock ===
    if (vesselRef.current) {
      const p = progress(t, P.vesselStart, P.vesselEnd)
      const pos = lerpTuple(VESSEL_SEA, VESSEL_DOCK, p)
      vesselRef.current.position.set(pos[0], pos[1], pos[2])
    }

    // === Phase 2: Cranes unload containers (vessel deck → road level) ===
    // Each crane staggers by 1s
    for (let i = 0; i < 4; i++) {
      const ref = containerRefs.current[i]
      if (!ref) continue

      const cranePos = ZONE.cranes[i].position
      const stagger = i * 1

      if (t < P.craneStart + stagger) {
        // Hidden above vessel until crane phase starts for this crane
        ref.visible = false
      } else if (t <= P.craneEnd) {
        ref.visible = true
        const p = progress(t, P.craneStart + stagger, P.craneEnd)
        // Lift from vessel (at crane X, high Y) → down to road position
        const startPos: THREE.Vector3Tuple = [cranePos[0], CRANE_LIFT_Y, cranePos[2]]
        const endPos: THREE.Vector3Tuple = [ZONE.road[0], ZONE.road[1] + 2, cranePos[2]]
        const pos = lerpTuple(startPos, endPos, p)
        ref.position.set(pos[0], pos[1], pos[2])
      }
    }

    // === Phase 3: AGVs carry containers from road → yardHandover ===
    for (let i = 0; i < 4; i++) {
      const agvRef = agvRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!agvRef) continue

      const cranePos = ZONE.cranes[i].position
      const stagger = i * 1

      if (t < P.agvStart) {
        // AGV waits at road under its crane
        agvRef.position.set(ZONE.road[0], ZONE.road[1], cranePos[2])
        agvRef.visible = t >= P.craneStart // show when cranes start
      } else if (t <= P.agvEnd) {
        agvRef.visible = true
        const p = progress(t, P.agvStart + stagger, P.agvEnd)
        // Drive from road at crane's Z → yardHandover
        const startPos: THREE.Vector3Tuple = [ZONE.road[0], ZONE.road[1], cranePos[2]]
        const endPos: THREE.Vector3Tuple = ZONE.yardHandover
        const pos = lerpTuple(startPos, endPos, p)
        agvRef.position.set(pos[0], pos[1], pos[2])

        // Container follows AGV (offset up slightly)
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
        }
      }
    }

    // === Phase 4: Stackers carry from yardHandover → yard grid ===
    for (let i = 0; i < 4; i++) {
      const sRef = stackerAnimRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!sRef) continue

      const slot = YARD_SLOTS[i]
      const targetPos = getYardCellPosition(ZONE.yardGrid, slot.row, slot.col, 0)
      const stagger = i * 1

      if (t < P.stackerStart) {
        // Stacker waits at yardHandover
        sRef.position.set(ZONE.yardHandover[0], ZONE.yardHandover[1], ZONE.yardHandover[2])
        sRef.visible = t >= P.agvStart
      } else if (t <= P.stackerEnd) {
        sRef.visible = true
        const p = progress(t, P.stackerStart + stagger, P.stackerEnd)
        const startPos: THREE.Vector3Tuple = ZONE.yardHandover
        const pos = lerpTuple(startPos, targetPos, p)
        sRef.position.set(pos[0], pos[1], pos[2])

        // Container follows stacker
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
        }

        // Register placement when done
        if (p >= 1 && !placed.current[i]) {
          placed.current[i] = true
          placeContainer(5, slot.row, slot.col, `anim-container-5-${i}`)
        }
      } else if (t <= P.retreatEnd) {
        // === Phase 5: Stacker drops container and retreats to yardHandover ===
        const p = progress(t, P.retreatStart + stagger, P.retreatEnd)
        const pos = lerpTuple(targetPos, ZONE.yardHandover, p)
        sRef.position.set(pos[0], pos[1], pos[2])

        // Container stays at yard grid cell
        if (cRef) {
          cRef.position.set(targetPos[0], targetPos[1] + 2, targetPos[2])
        }
      } else {
        // After animation, stacker at yardHandover, container at yard
        sRef.position.set(ZONE.yardHandover[0], ZONE.yardHandover[1], ZONE.yardHandover[2])
        if (cRef) {
          cRef.position.set(targetPos[0], targetPos[1] + 2, targetPos[2])
        }
      }
    }
  })

  return (
    <group>
      {/* Vessel */}
      <group ref={vesselRef} position={[VESSEL_SEA[0], VESSEL_SEA[1], VESSEL_SEA[2]]}>
        <primitive object={clones.vessel} scale={VESSEL_SCALE} />
      </group>

      {/* 4 Containers */}
      {clones.containers.map((containerScene, i) => (
        <group
          key={`anim-container-${i}`}
          ref={(el) => { containerRefs.current[i] = el }}
          visible={false}
        >
          <primitive object={containerScene} scale={CONTAINER_SCALE} />
        </group>
      ))}

      {/* 4 AGVs for transport */}
      {clones.agvs.map((agvScene, i) => (
        <group
          key={`anim-agv-${i}`}
          ref={(el) => { agvRefs.current[i] = el }}
          visible={false}
        >
          <primitive object={agvScene} scale={AGV_SCALE} />
        </group>
      ))}

      {/* 4 Stackers for yard delivery */}
      {clones.stackers.map((stackerScene, i) => (
        <group
          key={`anim-stacker-${i}`}
          ref={(el) => { stackerAnimRefs.current[i] = el }}
          visible={false}
        >
          <primitive object={stackerScene} scale={STACKER_SCALE} />
        </group>
      ))}
    </group>
  )
}
