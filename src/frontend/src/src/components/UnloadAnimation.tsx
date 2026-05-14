import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, placeContainer, clearZoneContainers, type Vec3 } from '../data/portZoneData'
import { Vessel } from './Vessel'
import { Container } from './Container'
import type { ContainerHandle } from './Container'
import { useAgvOwnership } from '../context/AgvOwnershipContext'

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

// Module-scoped scratch tuple. lerpTuple writes into this and returns it,
// avoiding a fresh 3-element array on every call. Safe because every call
// site consumes the result before the next lerpTuple call (within the same
// useFrame), and React's render loop runs each useFrame body sequentially.
const _lerpScratch: THREE.Vector3Tuple = [0, 0, 0]
function lerpTuple(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, t: number): THREE.Vector3Tuple {
  _lerpScratch[0] = a[0] + (b[0] - a[0]) * t
  _lerpScratch[1] = a[1] + (b[1] - a[1]) * t
  _lerpScratch[2] = a[2] + (b[2] - a[2]) * t
  return _lerpScratch
}

// Additional module scratch tuples for the per-frame intermediate positions
// (handover, lift start/end, road start) that previously allocated a fresh
// 3-element array on every loop iteration. Each is a single shared instance
// that the useFrame body fills in and consumes immediately, so there is no
// aliasing risk.
const _handoverScratch: THREE.Vector3Tuple = [0, 0, 0]
const _startScratch: THREE.Vector3Tuple = [0, 0, 0]
const _endScratch: THREE.Vector3Tuple = [0, 0, 0]

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
  onVesselClick?: (vesselGlb: string, berthId: number) => void
}

export function UnloadAnimation({
  berthId,
  vesselScale = 60,
  vesselSeed = 42,
  containerSeed = 100,
  onVesselClick,
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
  const { getOwner } = useAgvOwnership()
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
        _startScratch[0] = cranePos[0]; _startScratch[1] = CRANE_LIFT_Y; _startScratch[2] = cranePos[2]
        _endScratch[0] = zone.road[0]; _endScratch[1] = zone.road[1] + 2; _endScratch[2] = cranePos[2]
        const pos = lerpTuple(_startScratch, _endScratch, p)
        ref.position.set(pos[0], pos[1], pos[2])
        ref.rotation.set(0, (Math.PI / 2) * p, 0)
      }
    }

    // === Phase 3: AGVs carry containers ===
    for (let i = 0; i < 4; i++) {
      const agv = agvRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!agv) continue
      const agvOwner = getOwner(agvNames[i])
      if (agvOwner !== null && agvOwner !== 'unload') continue
      const cranePos = zone.cranes[i].position
      const stagger = i * STAGGER
      _handoverScratch[0] = zone.yardHandover[0]
      _handoverScratch[1] = zone.yardHandover[1]
      _handoverScratch[2] = cranePos[2]

      if (ct < C.agvStart) {
        if (ct >= C.craneStart) agv.position.set(zone.road[0], zone.road[1], cranePos[2])
      } else if (ct <= C.agvEnd) {
        const p = progress(ct, C.agvStart + stagger, C.agvEnd)
        _startScratch[0] = zone.road[0]; _startScratch[1] = zone.road[1]; _startScratch[2] = cranePos[2]
        const pos = lerpTuple(_startScratch, _handoverScratch, p)
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
      const stackerOwner = getOwner(stackerNames[i])
      if (stackerOwner !== null && stackerOwner !== 'unload') continue
      const slot = yardSlots.current[i]
      const targetPos = yardTargetPositions.current[i]
      if (!slot || !targetPos) continue
      const stagger = i * STAGGER
      const cranePos = zone.cranes[i].position
      _handoverScratch[0] = zone.yardHandover[0]
      _handoverScratch[1] = zone.yardHandover[1]
      _handoverScratch[2] = cranePos[2]

      if (ct < C.stackerStart) {
        if (ct >= C.agvStart) stacker.position.set(_handoverScratch[0], _handoverScratch[1], _handoverScratch[2])
      } else if (ct <= C.stackerEnd) {
        const p = progress(ct, C.stackerStart + stagger, C.stackerEnd)
        const pos = lerpTuple(_handoverScratch, targetPos, p)
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
        const pos = lerpTuple(targetPos, _handoverScratch, p)
        stacker.position.set(pos[0], pos[1], pos[2])
      } else {
        if (!placed.current[i] && cRef) placeContainerInYard(i, cRef, targetPos, slot)
        stacker.position.set(_handoverScratch[0], _handoverScratch[1], _handoverScratch[2])
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
        onVesselClick={onVesselClick}
        berthId={berthId}
      />
      <Container ref={containerRef} seed={containerSeed} />
    </group>
  )
}
