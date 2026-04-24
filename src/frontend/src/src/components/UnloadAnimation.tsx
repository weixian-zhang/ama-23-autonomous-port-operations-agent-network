import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, placeContainer, clearZoneContainers, type Vec3 } from '../data/portZoneData'
import { Vessel } from './Vessel'
import { Container } from './Container'
import type { ContainerHandle } from './Container'

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
const CRANE_LIFT_Y = 20
const VESSEL_ARRIVE_END = 7
const CYCLE_OFFSET = VESSEL_ARRIVE_END
const YARD_ROTATION = Math.PI / 2

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

function getSlotsForLoop(rows: number, cols: number, tiers: number, loop: number) {
  const totalCells = rows * cols
  const baseIdx = (loop * 4) % totalCells
  const tierOffset = Math.floor((loop * 4) / totalCells)
  return [0, 1, 2, 3].map((i) => {
    const cellIdx = (baseIdx + i) % totalCells
    const col = Math.floor(cellIdx / rows)
    const row = cellIdx % rows
    const tier = tierOffset
    return tier < tiers ? { row, col, tier } : { row: 0, col: 0, tier: 0 }
  })
}

interface UnloadAnimationProps {
  berthId: number
  vesselScale?: number
  vesselSeed?: number
  containerSeed?: number
}

export function UnloadAnimation({
  berthId,
  vesselScale = 60,
  vesselSeed = 42,
  containerSeed = 100,
}: UnloadAnimationProps) {
  const zone = PORT_ZONES.find((z) => z.id === berthId)!
  const totalCells = zone.yardGrid.rows * zone.yardGrid.cols
  const maxContainers = totalCells * zone.yardGrid.tiers

  const vesselLeaveStart = CYCLE_OFFSET + UNLOAD_CYCLES * CYCLE_DURATION
  const vesselLeaveEnd = vesselLeaveStart + 5
  const loopDuration = vesselLeaveEnd + 2

  const agvNames = [0, 1, 2, 3].map((i) => `agv-berth-${berthId}-${i}`)
  const stackerNames = [0, 1, 2, 3].map((i) => `stacker-yard-${berthId}-${i}`)

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
    const slots = getSlotsForLoop(zone.yardGrid.rows, zone.yardGrid.cols, zone.yardGrid.tiers, cycleIndex)
    yardSlots.current = slots
    yardTargetPositions.current = slots.map((s) =>
      getYardCellPosition(zone.yardGrid, s.row, s.col, s.tier)
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

  function placeContainerInYard(i: number, cRef: THREE.Group, targetPos: Vec3, slot: { row: number; col: number }) {
    placed.current[i] = true
    const containerId = `anim-container-${berthId}-${loopCount.current}-${currentCycle.current}-${i}`
    placeContainer(berthId, slot.row, slot.col, containerId)
    cRef.position.set(targetPos[0], targetPos[1] + 2, targetPos[2])
    cRef.quaternion.identity()
    cRef.rotation.set(0, YARD_ROTATION, 0)
    cRef.visible = true
    cRef.updateMatrixWorld(true)
    placedContainers.current.push(cRef)
    containerRefs.current[i] = null
  }

  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      const agv = rootScene.getObjectByName(agvNames[i])
      if (agv) agvRefs.current[i] = agv
      const stacker = rootScene.getObjectByName(stackerNames[i])
      if (stacker) stackerRefs.current[i] = stacker
    }
  }, [rootScene])

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current

    if (t >= loopDuration) {
      elapsed.current = 0
      loopCount.current += 1
      currentCycle.current = -1

      if (loopCount.current * UNLOAD_CYCLES * 4 >= maxContainers) {
        loopCount.current = 0
        clearZoneContainers(berthId)
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
      const cranePos = zone.cranes[i].position
      const stagger = i * STAGGER

      if (ct < C.craneStart + stagger) {
        ref.visible = false
      } else if (ct <= C.craneEnd) {
        ref.visible = true
        const p = progress(ct, C.craneStart + stagger, C.craneEnd)
        const startPos: THREE.Vector3Tuple = [cranePos[0], CRANE_LIFT_Y, cranePos[2]]
        const endPos: THREE.Vector3Tuple = [zone.road[0], zone.road[1] + 2, cranePos[2]]
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
      const cranePos = zone.cranes[i].position
      const stagger = i * STAGGER

      if (ct < C.agvStart) {
        if (ct >= C.craneStart) agv.position.set(zone.road[0], zone.road[1], cranePos[2])
      } else if (ct <= C.agvEnd) {
        const p = progress(ct, C.agvStart + stagger, C.agvEnd)
        const pos = lerpTuple([zone.road[0], zone.road[1], cranePos[2]], zone.yardHandover, p)
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
        if (ct >= C.agvStart) stacker.position.set(zone.yardHandover[0], zone.yardHandover[1], zone.yardHandover[2])
      } else if (ct <= C.stackerEnd) {
        const p = progress(ct, C.stackerStart + stagger, C.stackerEnd)
        const pos = lerpTuple(zone.yardHandover, targetPos, p)
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
        const pos = lerpTuple(targetPos, zone.yardHandover, p)
        stacker.position.set(pos[0], pos[1], pos[2])
      } else {
        if (!placed.current[i] && cRef) placeContainerInYard(i, cRef, targetPos, slot)
        stacker.position.set(zone.yardHandover[0], zone.yardHandover[1], zone.yardHandover[2])
      }
    }
  })

  return (
    <group>
      <Vessel
        zone={zone}
        elapsedRef={elapsed}
        arriveEnd={VESSEL_ARRIVE_END}
        leaveStart={vesselLeaveStart}
        leaveEnd={vesselLeaveEnd}
        scale={vesselScale}
        seed={vesselSeed}
      />
      <Container ref={containerRef} seed={containerSeed} />
    </group>
  )
}
