import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, placeContainer, clearZoneContainers, type Vec3 } from '../data/portZoneData'
import { Vessel } from './Vessel'
import { Container } from './Container'
import type { ContainerHandle } from './Container'

const ZONE = PORT_ZONES.find((z) => z.id === 5)!

// Sub-cycle timing — 20 unload cycles per animation loop
const UNLOAD_CYCLES = 20
const CYCLE_DURATION = 15.5  // seconds per unload sub-cycle

// Relative timings within each sub-cycle
const C = {
  craneStart: 0,     craneEnd: 2.5,
  agvStart: 2.5,     agvEnd: 7.5,
  stackerStart: 7.5, stackerEnd: 12.5,
  retreatStart: 12.5, retreatEnd: 15.5,
}
const STAGGER = 0.4

const VESSEL_ARRIVE_END = 7
const CYCLE_OFFSET = VESSEL_ARRIVE_END  // unloading starts after vessel is fully docked
const VESSEL_LEAVE_START = CYCLE_OFFSET + UNLOAD_CYCLES * CYCLE_DURATION
const VESSEL_LEAVE_END = VESSEL_LEAVE_START + 5
const LOOP_DURATION = VESSEL_LEAVE_END + 2

const CRANE_LIFT_Y = 20
const TOTAL_CELLS = ZONE.yardGrid.rows * ZONE.yardGrid.cols
const MAX_CONTAINERS = TOTAL_CELLS * ZONE.yardGrid.tiers

const AGV_NAMES = [0, 1, 2, 3].map((i) => `agv-berth-5-${i}`)
const STACKER_NAMES = [0, 1, 2, 3].map((i) => `stacker-yard-5-${i}`)

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
  const { scene: rootScene } = useThree()
  const containerRef = useRef<ContainerHandle>(null)

  const elapsed = useRef(0)
  const placed = useRef<boolean[]>([false, false, false, false])
  const loopCount = useRef(0)
  const currentCycle = useRef(-1)

  const yardSlots = useRef<{ row: number; col: number; tier: number }[]>([])
  const yardTargetPositions = useRef<(Vec3 | null)[]>([null, null, null, null])
  const placedContainers = useRef<THREE.Group[]>([])
  const containerRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])

  const agvRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])
  const stackerRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])

  function resolveSlots(cycleIndex: number) {
    const slots = getSlotsForLoop(cycleIndex)
    yardSlots.current = slots
    yardTargetPositions.current = slots.map((s) =>
      getYardCellPosition(ZONE.yardGrid, s.row, s.col, s.tier)
    )
  }

  function spawnContainers() {
    if (!containerRef.current) return
    containerRef.current.removeContainers(containerRefs.current)
    const groups = containerRef.current.spawnContainers()
    for (let i = 0; i < 4; i++) {
      containerRefs.current[i] = groups[i] ?? null
    }
  }

  // Consistent yard rotation for all placed containers
  const YARD_ROTATION = Math.PI / 2

  function placeContainerInYard(i: number, cRef: THREE.Group, targetPos: Vec3, slot: { row: number; col: number }) {
    placed.current[i] = true
    const containerId = `anim-container-5-${loopCount.current}-${currentCycle.current}-${i}`
    placeContainer(5, slot.row, slot.col, containerId)
    cRef.position.set(targetPos[0], targetPos[1] + 2, targetPos[2])
    // Reset all rotations then apply consistent yard orientation
    cRef.quaternion.identity()
    cRef.rotation.set(0, YARD_ROTATION, 0)
    cRef.visible = true
    cRef.updateMatrixWorld(true)
    placedContainers.current.push(cRef)
    containerRefs.current[i] = null
  }

  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      const agv = rootScene.getObjectByName(AGV_NAMES[i])
      if (agv) agvRefs.current[i] = agv
      const stacker = rootScene.getObjectByName(STACKER_NAMES[i])
      if (stacker) stackerRefs.current[i] = stacker
    }
  }, [rootScene])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current

    if (t >= LOOP_DURATION) {
      elapsed.current = 0
      loopCount.current += 1
      currentCycle.current = -1

      if (loopCount.current * UNLOAD_CYCLES * 4 >= MAX_CONTAINERS) {
        loopCount.current = 0
        clearZoneContainers(5)
        for (const c of placedContainers.current) {
          c.removeFromParent()
        }
        placedContainers.current = []
      }
      return
    }

    const cycleIdx = Math.floor((t - CYCLE_OFFSET) / CYCLE_DURATION)
    const ct = (t - CYCLE_OFFSET) - cycleIdx * CYCLE_DURATION

    if (cycleIdx < 0 || cycleIdx >= UNLOAD_CYCLES) return

    if (cycleIdx !== currentCycle.current) {
      currentCycle.current = cycleIdx
      const absoluteCycle = loopCount.current * UNLOAD_CYCLES + cycleIdx
      resolveSlots(absoluteCycle)
      spawnContainers()
      placed.current = [false, false, false, false]
    }

    // === Phase 2: Cranes unload containers ===
    for (let i = 0; i < 4; i++) {
      const ref = containerRefs.current[i]
      if (!ref) continue
      const cranePos = ZONE.cranes[i].position
      const stagger = i * STAGGER

      if (ct < C.craneStart + stagger) {
        ref.visible = false
      } else if (ct <= C.craneEnd) {
        ref.visible = true
        const p = progress(ct, C.craneStart + stagger, C.craneEnd)
        const startPos: THREE.Vector3Tuple = [cranePos[0], CRANE_LIFT_Y, cranePos[2]]
        const endPos: THREE.Vector3Tuple = [ZONE.road[0], ZONE.road[1] + 2, cranePos[2]]
        const pos = lerpTuple(startPos, endPos, p)
        ref.position.set(pos[0], pos[1], pos[2])
        ref.rotation.set(0, (Math.PI / 2) * p, 0)
      }
    }

    // === Phase 3: AGVs carry containers ===
    for (let i = 0; i < 4; i++) {
      const agv = agvRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!agv) continue
      const cranePos = ZONE.cranes[i].position
      const stagger = i * STAGGER

      if (ct < C.agvStart) {
        if (ct >= C.craneStart) agv.position.set(ZONE.road[0], ZONE.road[1], cranePos[2])
      } else if (ct <= C.agvEnd) {
        const p = progress(ct, C.agvStart + stagger, C.agvEnd)
        const pos = lerpTuple([ZONE.road[0], ZONE.road[1], cranePos[2]], ZONE.yardHandover, p)
        agv.position.set(pos[0], pos[1], pos[2])
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
          cRef.rotation.set(0, Math.PI / 2, 0)
        }
      }
    }

    // === Phase 4 & 5: Stackers carry to yard, then retreat ===
    for (let i = 0; i < 4; i++) {
      const stacker = stackerRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!stacker) continue
      const slot = yardSlots.current[i]
      const targetPos = yardTargetPositions.current[i]
      if (!slot || !targetPos) continue
      const stagger = i * STAGGER

      if (ct < C.stackerStart) {
        if (ct >= C.agvStart) stacker.position.set(ZONE.yardHandover[0], ZONE.yardHandover[1], ZONE.yardHandover[2])
      } else if (ct <= C.stackerEnd) {
        const p = progress(ct, C.stackerStart + stagger, C.stackerEnd)
        const pos = lerpTuple(ZONE.yardHandover, targetPos, p)
        stacker.position.set(pos[0], pos[1], pos[2])
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
          cRef.rotation.set(0, Math.PI / 2, 0)
        }
        if (p >= 1 && !placed.current[i] && cRef) {
          placeContainerInYard(i, cRef, targetPos, slot)
        }
      } else if (ct <= C.retreatEnd) {
        if (!placed.current[i] && cRef) placeContainerInYard(i, cRef, targetPos, slot)
        const p = progress(ct, C.retreatStart + stagger, C.retreatEnd)
        const pos = lerpTuple(targetPos, ZONE.yardHandover, p)
        stacker.position.set(pos[0], pos[1], pos[2])
      } else {
        if (!placed.current[i] && cRef) placeContainerInYard(i, cRef, targetPos, slot)
        stacker.position.set(ZONE.yardHandover[0], ZONE.yardHandover[1], ZONE.yardHandover[2])
      }
    }
  })

  return (
    <group>
      <Vessel
        zone={ZONE}
        elapsedRef={elapsed}
        arriveEnd={VESSEL_ARRIVE_END}
        leaveStart={VESSEL_LEAVE_START}
        leaveEnd={VESSEL_LEAVE_END}
        scale={60}
        seed={42}
      />
      <Container ref={containerRef} seed={100} />
    </group>
  )
}
