import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, placeContainer, clearZoneContainers, type Vec3 } from '../data/portZoneData'
import { Vessel } from './Vessel'
import { Container } from './Container'
import type { ContainerHandle } from './Container'
import { useAgvOwnership } from '../context/AgvOwnershipContext'

// Same sub-cycle timing as UnloadAnimation
const UNLOAD_CYCLES = 20
const CYCLE_DURATION = 15.5

const C = {
  craneStart: 0,     craneEnd: 2.5,
  agvStart: 2.5,     agvEnd: 7.5,
  stackerStart: 7.5, stackerEnd: 12.5,
  retreatStart: 12.5, retreatEnd: 15.5,
}
const STAGGER = 0.4
const CRANE_LIFT_Y = 20
const VESSEL_ARRIVE_END = 0.01 // vessel starts already docked
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

/** Description of a borrowed AGV+stacker pair */
export interface BorrowedUnit {
  agvName: string
  stackerName: string
}

export interface VesselLateAnimationHandle {
  /** Borrow AGV+stacker pairs from other berths to participate in this animation */
  borrow_AGV_Stackers: (units: BorrowedUnit[]) => void
  /** Release all borrowed units back to their original animations */
  resetAnimation: () => void
}

interface VesselLateAnimationProps {
  berthId: number
  vesselScale?: number
  vesselSeed?: number
  containerSeed?: number
  onVesselClick?: (vesselGlb: string, berthId: number) => void
  handleRef?: React.MutableRefObject<VesselLateAnimationHandle | null>
}

export function VesselLateAnimation({
  berthId,
  vesselScale = 60,
  vesselSeed = 99,
  containerSeed = 500,
  onVesselClick,
  handleRef,
}: VesselLateAnimationProps) {
  const zone = PORT_ZONES.find((z) => z.id === berthId)!
  const totalCells = zone.yardGrid.rows * zone.yardGrid.cols
  const maxContainers = totalCells * zone.yardGrid.tiers

  const vesselLeaveStart = CYCLE_OFFSET + UNLOAD_CYCLES * CYCLE_DURATION
  const vesselLeaveEnd = vesselLeaveStart + 5
  const loopDuration = vesselLeaveEnd + 2

  const { scene: rootScene } = useThree()
  const { claim, release, saveOriginalPosition, getOriginalPosition } = useAgvOwnership()
  const containerRef = useRef<ContainerHandle>(null)

  const elapsed = useRef(1) // start past VESSEL_ARRIVE_END so vessel is docked from the start
  const placed = useRef<boolean[]>([false, false, false, false])
  const loopCount = useRef(0)
  const currentCycle = useRef(-1)

  const yardSlots = useRef<{ row: number; col: number; tier: number }[]>([])
  const yardTargetPositions = useRef<(Vec3 | null)[]>([null, null, null, null])
  const placedContainers = useRef<THREE.Group[]>([])
  const containerRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])

  // Borrowed AGVs/stackers — up to 4 lanes
  const borrowedUnits = useRef<BorrowedUnit[]>([])
  const agvRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])
  const stackerRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])

  // Whether animation is active (has borrowed units)
  const active = useRef(false)
  // Travel phase: borrowed units moving to berth 3 positions
  const travelProgress = useRef<number[]>([0, 0, 0, 0])
  const travelPhase = useRef<'idle' | 'arriving' | 'active' | 'returning'>('idle')
  const TRAVEL_SPEED = 0.075 // progress per second for arrival/return travel

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
    const containerId = `anim-container-late-${berthId}-${loopCount.current}-${currentCycle.current}-${i}`
    placeContainer(berthId, slot.row, slot.col, containerId)
    cRef.position.set(targetPos[0], targetPos[1] + 2, targetPos[2])
    cRef.quaternion.identity()
    cRef.rotation.set(0, YARD_ROTATION, 0)
    cRef.visible = true
    cRef.updateMatrixWorld(true)
    placedContainers.current.push(cRef)
    containerRefs.current[i] = null
  }

  const borrow_AGV_Stackers = useCallback((units: BorrowedUnit[]) => {
    const capped = units.slice(0, 4)

    // Save original positions and claim ownership
    for (const unit of capped) {
      const agv = rootScene.getObjectByName(unit.agvName)
      if (agv) {
        saveOriginalPosition(unit.agvName, [agv.position.x, agv.position.y, agv.position.z])
        claim(unit.agvName, 'vesselLate')
      }
      const stacker = rootScene.getObjectByName(unit.stackerName)
      if (stacker) {
        saveOriginalPosition(unit.stackerName, [stacker.position.x, stacker.position.y, stacker.position.z])
        claim(unit.stackerName, 'vesselLate')
      }
    }

    borrowedUnits.current = capped
    // Resolve refs
    for (let i = 0; i < 4; i++) {
      if (i < capped.length) {
        agvRefs.current[i] = rootScene.getObjectByName(capped[i].agvName) ?? null
        stackerRefs.current[i] = rootScene.getObjectByName(capped[i].stackerName) ?? null
      } else {
        agvRefs.current[i] = null
        stackerRefs.current[i] = null
      }
    }

    // Reset animation state
    elapsed.current = 0
    loopCount.current = 0
    currentCycle.current = -1
    travelProgress.current = [0, 0, 0, 0]
    travelPhase.current = 'arriving'
    active.current = true
  }, [rootScene, claim, saveOriginalPosition])

  const resetAnimation = useCallback(() => {
    if (!active.current) return
    travelPhase.current = 'returning'
  }, [])

  // Expose handle to parent
  useEffect(() => {
    if (handleRef) {
      handleRef.current = { borrow_AGV_Stackers: borrow_AGV_Stackers, resetAnimation }
    }
  }, [handleRef, borrow_AGV_Stackers, resetAnimation])

  useFrame((_, delta) => {
    if (!active.current) return

    const units = borrowedUnits.current
    if (units.length === 0) return

    // === Travel phase: arriving — lerp borrowed units from original position to berth 3 working positions ===
    if (travelPhase.current === 'arriving') {
      let allArrived = true
      for (let i = 0; i < units.length; i++) {
        travelProgress.current[i] = Math.min(travelProgress.current[i] + delta * TRAVEL_SPEED, 1)
        if (travelProgress.current[i] < 1) allArrived = false

        const agv = agvRefs.current[i]
        const stacker = stackerRefs.current[i]
        const cranePos = zone.cranes[i]?.position
        if (!cranePos) continue

        const agvOrigin = getOriginalPosition(units[i].agvName)
        const agvTarget: Vec3 = [zone.road[0], zone.road[1], cranePos[2]]
        if (agv && agvOrigin) {
          const pos = lerpTuple(agvOrigin, agvTarget, travelProgress.current[i])
          agv.position.set(pos[0], pos[1], pos[2])
        }

        const stackerOrigin = getOriginalPosition(units[i].stackerName)
        const stackerTarget: Vec3 = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]
        if (stacker && stackerOrigin) {
          const pos = lerpTuple(stackerOrigin, stackerTarget, travelProgress.current[i])
          stacker.position.set(pos[0], pos[1], pos[2])
        }
      }
      if (allArrived) {
        travelPhase.current = 'active'
        elapsed.current = 0
      }
      return
    }

    // === Travel phase: returning — lerp back to original positions, then release ===
    if (travelPhase.current === 'returning') {
      let allReturned = true
      for (let i = 0; i < units.length; i++) {
        travelProgress.current[i] = Math.min(travelProgress.current[i] + delta * TRAVEL_SPEED, 1)
        if (travelProgress.current[i] < 1) allReturned = false

        const agv = agvRefs.current[i]
        const stacker = stackerRefs.current[i]
        const cranePos = zone.cranes[i]?.position
        if (!cranePos) continue

        const agvOrigin = getOriginalPosition(units[i].agvName)
        const agvCurrent: Vec3 = [zone.road[0], zone.road[1], cranePos[2]]
        if (agv && agvOrigin) {
          const pos = lerpTuple(agvCurrent, agvOrigin, travelProgress.current[i])
          agv.position.set(pos[0], pos[1], pos[2])
        }

        const stackerOrigin = getOriginalPosition(units[i].stackerName)
        const stackerCurrent: Vec3 = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]
        if (stacker && stackerOrigin) {
          const pos = lerpTuple(stackerCurrent, stackerOrigin, travelProgress.current[i])
          stacker.position.set(pos[0], pos[1], pos[2])
        }
      }
      if (allReturned) {
        // Release ownership
        for (const unit of units) {
          release(unit.agvName, 'vesselLate')
          release(unit.stackerName, 'vesselLate')
        }
        borrowedUnits.current = []
        agvRefs.current = [null, null, null, null]
        stackerRefs.current = [null, null, null, null]
        travelPhase.current = 'idle'
        active.current = false

        // Clean up yard
        clearZoneContainers(berthId)
        for (const c of placedContainers.current) {
          c.removeFromParent()
        }
        placedContainers.current = []
      }
      return
    }

    // === Active phase: same unload animation as UnloadAnimation ===
    elapsed.current += delta
    const t = elapsed.current
    const laneCount = units.length

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
    for (let i = 0; i < laneCount; i++) {
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
    for (let i = 0; i < laneCount; i++) {
      const agv = agvRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!agv) continue
      const cranePos = zone.cranes[i].position
      const stagger = i * STAGGER
      const handover: THREE.Vector3Tuple = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]
      const roadPos: THREE.Vector3Tuple = [zone.road[0], zone.road[1], cranePos[2]]

      if (ct < C.agvStart) {
        if (ct >= C.craneStart) agv.position.set(roadPos[0], roadPos[1], roadPos[2])
      } else if (ct <= C.agvEnd) {
        const p = progress(ct, C.agvStart + stagger, C.agvEnd)
        const pos = lerpTuple(roadPos, handover, p)
        agv.position.set(pos[0], pos[1], pos[2])
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
          cRef.rotation.set(0, Math.PI / 2, 0)
        }
      } else if (ct <= C.stackerEnd) {
        // AGV retreat: handover → road during stacker carry phase
        const p = progress(ct, C.agvEnd + stagger, C.stackerEnd)
        const pos = lerpTuple(handover, roadPos, p)
        agv.position.set(pos[0], pos[1], pos[2])
      } else {
        agv.position.set(roadPos[0], roadPos[1], roadPos[2])
      }
    }

    // === Phase 4 & 5: Stackers carry to yard, then retreat ===
    for (let i = 0; i < laneCount; i++) {
      const stacker = stackerRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!stacker) continue
      const slot = yardSlots.current[i]
      const targetPos = yardTargetPositions.current[i]
      if (!slot || !targetPos) continue
      const stagger = i * STAGGER
      const cranePos = zone.cranes[i].position
      const handover: THREE.Vector3Tuple = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]

      if (ct < C.stackerStart) {
        if (ct >= C.agvStart) stacker.position.set(handover[0], handover[1], handover[2])
      } else if (ct <= C.stackerEnd) {
        const p = progress(ct, C.stackerStart + stagger, C.stackerEnd)
        const pos = lerpTuple(handover, targetPos, p)
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
        const pos = lerpTuple(targetPos, handover, p)
        stacker.position.set(pos[0], pos[1], pos[2])
      } else {
        if (!placed.current[i] && cRef) placeContainerInYard(i, cRef, targetPos, slot)
        stacker.position.set(handover[0], handover[1], handover[2])
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
        seaX={-55}
        scale={vesselScale}
        seed={vesselSeed}
        onVesselClick={onVesselClick}
        berthId={berthId}
      />
      <Container ref={containerRef} seed={containerSeed} />
    </group>
  )
}
