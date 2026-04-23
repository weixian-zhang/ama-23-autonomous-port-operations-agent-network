import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, placeContainer, clearZoneContainers, type Vec3 } from '../data/portZoneData'

const ZONE = PORT_ZONES.find((z) => z.id === 5)!

const VESSEL_SCALE = 40
const CONTAINER_SCALE = 8

// Phase timing (seconds) — 30s total, then loops
const LOOP_DURATION = 30
const P = {
  vesselStart: 0,    vesselEnd: 7,
  craneStart: 5,     craneEnd: 12,
  agvStart: 12,      agvEnd: 19,
  stackerStart: 19,  stackerEnd: 24,
  retreatStart: 24,  retreatEnd: 27,
  vesselLeaveStart: 27, vesselLeaveEnd: 32,
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

// Existing scene object names — 4 AGVs and 4 stackers from Berth/Yard 5
const AGV_NAMES = [0, 1, 2, 3].map((i) => `agv-berth-5-${i}`)
const STACKER_NAMES = [0, 1, 2, 3].map((i) => `stacker-yard-5-${i}`)

// Sea origin — vessel sails from far negative X toward the quay wall
const VESSEL_SEA: THREE.Vector3Tuple = [-200, 0, ZONE.quay[2]]
const VESSEL_DOCK: THREE.Vector3Tuple = [-55, 0, ZONE.quay[2]]

// Crane lifts container from vessel deck height down to road level
const CRANE_LIFT_Y = 20
const TOTAL_CELLS = ZONE.yardGrid.rows * ZONE.yardGrid.cols
const MAX_CONTAINERS = TOTAL_CELLS * ZONE.yardGrid.tiers

// Deterministic slot assignment: loop N gets cells offset by N*4
function getSlotsForLoop(loop: number): { row: number; col: number; tier: number }[] {
  const { rows, tiers } = ZONE.yardGrid
  const baseIdx = (loop * 4) % TOTAL_CELLS
  const tierOffset = Math.floor((loop * 4) / TOTAL_CELLS)
  return [0, 1, 2, 3].map((i) => {
    const cellIdx = (baseIdx + i) % TOTAL_CELLS
    const col = Math.floor(cellIdx / rows)
    const row = cellIdx % rows
    const tier = tierOffset
    return tier < tiers ? { row, col, tier } : { row: 0, col: 0, tier: 0 }
  })
}

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
  // Preload GLBs for vessel and containers only
  const vesselGltf = useGLTF(VESSEL_PICK)
  const containerGltfs = [
    useGLTF('/blender-asset/container-blue-1.glb'),
    useGLTF('/blender-asset/container-red-1.glb'),
    useGLTF('/blender-asset/container-yellow-1.glb'),
  ]

  const { scene: rootScene } = useThree()

  const elapsed = useRef(0)
  const placed = useRef<boolean[]>([false, false, false, false])
  const loopCount = useRef(0)

  // Dynamic yard slots resolved at each loop start
  const yardSlots = useRef<{ row: number; col: number; tier: number }[]>([])
  // Cached target positions resolved once per loop
  const yardTargetPositions = useRef<(Vec3 | null)[]>([null, null, null, null])

  function resolveSlots() {
    const slots = getSlotsForLoop(loopCount.current)
    yardSlots.current = slots
    yardTargetPositions.current = slots.map((s) =>
      getYardCellPosition(ZONE.yardGrid, s.row, s.col, s.tier)
    )
  }
  // Accumulated container groups that remain in the yard across loops
  const placedContainers = useRef<THREE.Group[]>([])
  const animGroupRef = useRef<THREE.Group>(null)

  const vesselRef = useRef<THREE.Group>(null)
  const containerRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])

  function spawnContainers() {
    if (!animGroupRef.current) return
    for (let i = 0; i < 4; i++) {
      const idx = CONTAINER_GLBS.indexOf(CONTAINER_PICKS[i])
      const clone = containerGltfs[idx].scene.clone(true)
      const group = new THREE.Group()
      group.add(clone)
      group.scale.setScalar(CONTAINER_SCALE)
      group.visible = false
      animGroupRef.current.add(group)
      containerRefs.current[i] = group
    }
  }

  // References to existing AGVs and stackers found in scene
  const agvRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])
  const stackerRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])
  // Store original positions to restore if needed
  const agvOriginalPos = useRef<THREE.Vector3Tuple[]>([])
  const stackerOriginalPos = useRef<THREE.Vector3Tuple[]>([])

  // Find existing AGVs and stackers by name once the scene is ready
  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      const agv = rootScene.getObjectByName(AGV_NAMES[i])
      if (agv) {
        agvRefs.current[i] = agv
        agvOriginalPos.current[i] = agv.position.toArray()
      }
      const stacker = rootScene.getObjectByName(STACKER_NAMES[i])
      if (stacker) {
        stackerRefs.current[i] = stacker
        stackerOriginalPos.current[i] = stacker.position.toArray()
      }
    }
  }, [rootScene])

  // Clone vessel and container scenes once
  const clones = useMemo(() => {
    const vessel = vesselGltf.scene.clone(true)
    const containers = CONTAINER_PICKS.map((path) => {
      const idx = CONTAINER_GLBS.indexOf(path)
      return containerGltfs[idx].scene.clone(true)
    })
    return { vessel, containers }
  }, [])

  useFrame((_, delta) => {
    elapsed.current += delta

    // Spawn containers on very first frame
    if (loopCount.current === 0 && elapsed.current === delta) {
      spawnContainers()
      resolveSlots()
    }

    // Loop every LOOP_DURATION seconds
    if (elapsed.current >= LOOP_DURATION) {
      elapsed.current = 0
      placed.current = [false, false, false, false]
      loopCount.current += 1

      // If all grid cells have been filled, clear and restart from cell 0
      if (loopCount.current * 4 >= MAX_CONTAINERS) {
        loopCount.current = 0
        clearZoneContainers(5)
        for (const c of placedContainers.current) {
          c.removeFromParent()
        }
        placedContainers.current = []
      }

      // Resolve next available slots for this loop's 4 containers
      resolveSlots()

      // Spawn fresh container meshes for the new loop
      spawnContainers()
    }

    const t = elapsed.current

    // === Phase 1: Vessel sails from sea to dock ===
    if (vesselRef.current) {
      if (t <= P.vesselEnd) {
        vesselRef.current.visible = true
        const p = progress(t, P.vesselStart, P.vesselEnd)
        const pos = lerpTuple(VESSEL_SEA, VESSEL_DOCK, p)
        vesselRef.current.position.set(pos[0], pos[1], pos[2])
      } else if (t >= P.vesselLeaveStart) {
        // === Phase 6: Vessel sails back to sea and disappears ===
        vesselRef.current.visible = true
        const p = progress(t, P.vesselLeaveStart, P.vesselLeaveEnd)
        const pos = lerpTuple(VESSEL_DOCK, VESSEL_SEA, p)
        vesselRef.current.position.set(pos[0], pos[1], pos[2])
        if (p >= 1) vesselRef.current.visible = false
      }
    }

    // === Phase 2: Cranes unload containers (vessel deck → road level) ===
    for (let i = 0; i < 4; i++) {
      const ref = containerRefs.current[i]
      if (!ref) continue

      const cranePos = ZONE.cranes[i].position
      const stagger = i * 1

      if (t < P.craneStart + stagger) {
        ref.visible = false
      } else if (t <= P.craneEnd) {
        ref.visible = true
        const p = progress(t, P.craneStart + stagger, P.craneEnd)
        const startPos: THREE.Vector3Tuple = [cranePos[0], CRANE_LIFT_Y, cranePos[2]]
        const endPos: THREE.Vector3Tuple = [ZONE.road[0], ZONE.road[1] + 2, cranePos[2]]
        const pos = lerpTuple(startPos, endPos, p)
        ref.position.set(pos[0], pos[1], pos[2])
      }
    }

    // === Phase 3: Existing AGVs carry containers from road → yardHandover ===
    for (let i = 0; i < 4; i++) {
      const agv = agvRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!agv) continue

      const cranePos = ZONE.cranes[i].position
      const stagger = i * 1

      if (t < P.agvStart) {
        // Move AGV to road under its crane before phase starts
        if (t >= P.craneStart) {
          agv.position.set(ZONE.road[0], ZONE.road[1], cranePos[2])
        }
      } else if (t <= P.agvEnd) {
        const p = progress(t, P.agvStart + stagger, P.agvEnd)
        const startPos: THREE.Vector3Tuple = [ZONE.road[0], ZONE.road[1], cranePos[2]]
        const endPos: THREE.Vector3Tuple = ZONE.yardHandover
        const pos = lerpTuple(startPos, endPos, p)
        agv.position.set(pos[0], pos[1], pos[2])

        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
        }
      }
    }

    // === Phase 4 & 5: Existing stackers carry from yardHandover → yard grid, then retreat ===
    for (let i = 0; i < 4; i++) {
      const stacker = stackerRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!stacker) continue

      const slot = yardSlots.current[i]
      const targetPos = yardTargetPositions.current[i]
      if (!slot || !targetPos) continue
      const stagger = i * 1

      if (t < P.stackerStart) {
        // Move stacker to yardHandover before phase starts
        if (t >= P.agvStart) {
          stacker.position.set(ZONE.yardHandover[0], ZONE.yardHandover[1], ZONE.yardHandover[2])
        }
      } else if (t <= P.stackerEnd) {
        const p = progress(t, P.stackerStart + stagger, P.stackerEnd)
        const pos = lerpTuple(ZONE.yardHandover, targetPos, p)
        stacker.position.set(pos[0], pos[1], pos[2])

        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
        }

        if (p >= 1 && !placed.current[i]) {
          placed.current[i] = true
          const containerId = `anim-container-5-${loopCount.current}-${i}`
          placeContainer(5, slot.row, slot.col, containerId)

          // Detach container from animation refs and leave it in the yard
          if (cRef) {
            cRef.position.set(targetPos[0], targetPos[1] + 2, targetPos[2])
            placedContainers.current.push(cRef)
            containerRefs.current[i] = null
          }
        }
      } else if (t <= P.retreatEnd) {
        // Phase 5: Stacker retreats to yardHandover (container already detached)
        const p = progress(t, P.retreatStart + stagger, P.retreatEnd)
        const pos = lerpTuple(targetPos, ZONE.yardHandover, p)
        stacker.position.set(pos[0], pos[1], pos[2])
      } else {
        stacker.position.set(ZONE.yardHandover[0], ZONE.yardHandover[1], ZONE.yardHandover[2])
      }
    }
  })

  return (
    <group ref={animGroupRef}>
      {/* Vessel */}
      <group ref={vesselRef} position={[VESSEL_SEA[0], VESSEL_SEA[1], VESSEL_SEA[2]]}>
        <primitive object={clones.vessel} scale={VESSEL_SCALE} />
      </group>
      {/* Containers are dynamically added/removed via spawnContainers() */}
    </group>
  )
}
