import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition, clearZoneContainers, type Vec3 } from '../data/portZoneData'
import { Vessel } from './Vessel'
import { Container } from './Container'
import type { ContainerHandle } from './Container'

const INITIAL_CONTAINERS = 50
const YARD_ROTATION = Math.PI / 2
const CRANE_LIFT_Y = 20
const STAGGER = 0.4
const VESSEL_ARRIVE_END = 0.01 // vessel starts already docked

// Reversed sub-cycle: stacker → AGV → crane (yard to vessel)
const CYCLE_DURATION = 15.5
const C = {
  stackerStart: 0,   stackerEnd: 5,
  agvStart: 5,       agvEnd: 10,
  craneStart: 10,    craneEnd: 12.5,
  retreatStart: 12.5, retreatEnd: 15.5,
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

interface LoadAnimationProps {
  berthId: number
  vesselScale?: number
  vesselSeed?: number
  containerSeed?: number
}

export function LoadAnimation({
  berthId,
  vesselScale = 60,
  vesselSeed = 42,
  containerSeed = 300,
}: LoadAnimationProps) {
  const zone = PORT_ZONES.find((z) => z.id === berthId)!
  const { rows, cols } = zone.yardGrid
  const totalCycles = Math.ceil(INITIAL_CONTAINERS / 4)
  const loadingEndTime = totalCycles * CYCLE_DURATION // ~201.5s
  const vesselLeaveStart = loadingEndTime + 2
  const vesselLeaveEnd = vesselLeaveStart + 5

  const agvNames = [0, 1, 2, 3].map((i) => `agv-berth-${berthId}-${i}`)
  const stackerNames = [0, 1, 2, 3].map((i) => `stacker-yard-${berthId}-${i}`)

  const { scene: rootScene } = useThree()
  const containerRef = useRef<ContainerHandle>(null)

  const elapsed = useRef(0)
  const currentCycle = useRef(-1)
  const picked = useRef<boolean[]>([false, false, false, false])

  // Yard containers placed at init — groups in the scene
  const yardContainers = useRef<THREE.Group[]>([])
  // Animated containers for each sub-cycle (4 at a time)
  const containerRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  // Positions of containers being picked this cycle
  const pickPositions = useRef<(Vec3 | null)[]>([null, null, null, null])

  const agvRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])
  const stackerRefs = useRef<(THREE.Object3D | null)[]>([null, null, null, null])

  const animGroupRef = useRef<THREE.Group>(null)

  // Pre-compute which yard slots the 50 containers occupy
  const yardSlots = useMemo(() => {
    const slots: { row: number; col: number; tier: number }[] = []
    for (let i = 0; i < INITIAL_CONTAINERS; i++) {
      const cellIdx = i % (rows * cols)
      const tier = Math.floor(i / (rows * cols))
      const row = cellIdx % rows
      const col = Math.floor(cellIdx / rows)
      slots.push({ row, col, tier })
    }
    return slots
  }, [rows, cols])

  function spawnYardContainers() {
    if (!containerRef.current || !animGroupRef.current) return
    // Clear existing
    for (const c of yardContainers.current) c.removeFromParent()
    yardContainers.current = []

    for (let i = 0; i < INITIAL_CONTAINERS; i++) {
      const groups = containerRef.current.spawnContainers()
      const g = groups[0]
      if (!g) continue
      const slot = yardSlots[i]
      const pos = getYardCellPosition(zone.yardGrid, slot.row, slot.col, slot.tier)
      g.position.set(pos[0], pos[1] + 2, pos[2])
      g.quaternion.identity()
      g.rotation.set(0, YARD_ROTATION, 0)
      g.visible = true
      g.updateMatrixWorld(true)
      yardContainers.current.push(g)
    }
  }

  function getPickSlots(cycleIdx: number): { slotIndex: number; pos: Vec3 }[] {
    const results: { slotIndex: number; pos: Vec3 }[] = []
    for (let i = 0; i < 4; i++) {
      const idx = INITIAL_CONTAINERS - 1 - (cycleIdx * 4 + i)
      if (idx < 0) continue
      const slot = yardSlots[idx]
      const pos = getYardCellPosition(zone.yardGrid, slot.row, slot.col, slot.tier)
      results.push({ slotIndex: idx, pos })
    }
    return results
  }

  useEffect(() => {
    for (let i = 0; i < 4; i++) {
      const agv = rootScene.getObjectByName(agvNames[i])
      if (agv) agvRefs.current[i] = agv
      const stacker = rootScene.getObjectByName(stackerNames[i])
      if (stacker) stackerRefs.current[i] = stacker
    }
  }, [rootScene])

  // Track if initial spawn done
  const initialized = useRef(false)

  useFrame((_, delta) => {
    elapsed.current += delta
    const t = elapsed.current

    // First frame: spawn yard containers
    if (!initialized.current) {
      initialized.current = true
      spawnYardContainers()
    }

    // Loop reset — after vessel has sailed away, respawn everything
    if (t >= vesselLeaveEnd + 2) {
      elapsed.current = 0
      currentCycle.current = -1
      clearZoneContainers(berthId)
      spawnYardContainers()
      return
    }

    const cycleIdx = Math.floor(t / CYCLE_DURATION)
    const ct = t - cycleIdx * CYCLE_DURATION

    if (cycleIdx >= totalCycles) return

    // New sub-cycle — pick 4 containers from yard
    if (cycleIdx !== currentCycle.current) {
      currentCycle.current = cycleIdx
      picked.current = [false, false, false, false]

      const picks = getPickSlots(cycleIdx)
      for (let i = 0; i < 4; i++) {
        if (i < picks.length) {
          pickPositions.current[i] = picks[i].pos
          // Remove the yard container visually
          const yardGroup = yardContainers.current[picks[i].slotIndex]
          if (yardGroup) yardGroup.visible = false
          // Spawn an animated container
          if (containerRef.current) {
            const old = containerRefs.current[i]
            if (old) old.removeFromParent()
            const groups = containerRef.current.spawnContainers()
            const g = groups[0]
            if (g) {
              g.position.set(picks[i].pos[0], picks[i].pos[1] + 2, picks[i].pos[2])
              g.rotation.set(0, YARD_ROTATION, 0)
              g.visible = true
              containerRefs.current[i] = g
            }
          }
        } else {
          pickPositions.current[i] = null
          containerRefs.current[i] = null
        }
      }
    }

    // === Phase 1: Stackers carry containers from yard → yardHandover ===
    for (let i = 0; i < 4; i++) {
      const stacker = stackerRefs.current[i]
      const cRef = containerRefs.current[i]
      const pickPos = pickPositions.current[i]
      if (!stacker || !pickPos) continue
      const stagger = i * STAGGER
      const cranePos = zone.cranes[i].position
      const handover: THREE.Vector3Tuple = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]

      if (ct < C.stackerStart + stagger) {
        // Stacker at yard position
        stacker.position.set(pickPos[0], pickPos[1], pickPos[2])
      } else if (ct <= C.stackerEnd) {
        const p = progress(ct, C.stackerStart + stagger, C.stackerEnd)
        const pos = lerpTuple(pickPos, handover, p)
        stacker.position.set(pos[0], pos[1], pos[2])
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
          cRef.rotation.set(0, YARD_ROTATION, 0)
        }
      }
    }

    // === Phase 2: AGVs carry containers from yardHandover → road (under crane) ===
    for (let i = 0; i < 4; i++) {
      const agv = agvRefs.current[i]
      const cRef = containerRefs.current[i]
      if (!agv || !pickPositions.current[i]) continue
      const cranePos = zone.cranes[i].position
      const stagger = i * STAGGER
      const handover: THREE.Vector3Tuple = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]

      if (ct < C.agvStart) {
        if (ct >= C.stackerStart) {
          agv.position.set(handover[0], handover[1], handover[2])
          agv.rotation.set(0, 0, 0)
        }
      } else if (ct <= C.agvEnd) {
        const p = progress(ct, C.agvStart + stagger, C.agvEnd)
        const endPos: THREE.Vector3Tuple = [zone.road[0], zone.road[1], cranePos[2]]
        const pos = lerpTuple(handover, endPos, p)
        agv.position.set(pos[0], pos[1], pos[2])
        agv.rotation.set(0, 0, 0)
        if (cRef) {
          cRef.position.set(pos[0], pos[1] + 2, pos[2])
          cRef.rotation.set(0, YARD_ROTATION, 0)
        }
      }
    }

    // === Phase 3: Cranes lift containers from road → over vessel → drop onto vessel deck ===
    for (let i = 0; i < 4; i++) {
      const cRef = containerRefs.current[i]
      if (!cRef || !pickPositions.current[i]) continue
      const cranePos = zone.cranes[i].position
      const stagger = i * STAGGER

      if (ct >= C.craneStart + stagger && ct <= C.craneEnd) {
        const fullP = progress(ct, C.craneStart + stagger, C.craneEnd)

        if (fullP < 0.5) {
          // First half: lift from road to crane height
          const p = fullP / 0.5
          const startPos: THREE.Vector3Tuple = [zone.road[0], zone.road[1] + 2, cranePos[2]]
          const endPos: THREE.Vector3Tuple = [cranePos[0], CRANE_LIFT_Y, cranePos[2]]
          const pos = lerpTuple(startPos, endPos, p)
          cRef.position.set(pos[0], pos[1], pos[2])
          cRef.rotation.set(0, YARD_ROTATION * (1 - p), 0)
        } else {
          // Second half: drop from crane height down into vessel
          const p = (fullP - 0.5) / 0.5
          const startPos: THREE.Vector3Tuple = [cranePos[0], CRANE_LIFT_Y, cranePos[2]]
          const endPos: THREE.Vector3Tuple = [-55, 3, cranePos[2]]
          const pos = lerpTuple(startPos, endPos, p)
          cRef.position.set(pos[0], pos[1], pos[2])
          cRef.rotation.set(0, 0, 0)

          // Hide container immediately after dropping into vessel
          if (p >= 0.95) {
            cRef.visible = false
          }
        }
      }
    }

    // === Phase 4: AGVs retreat from road → handover, Stackers retreat from handover → yard ===
    for (let i = 0; i < 4; i++) {
      const stacker = stackerRefs.current[i]
      const agv = agvRefs.current[i]
      const pickPos = pickPositions.current[i]
      if (!pickPos) continue
      const cranePos = zone.cranes[i].position
      const handover: THREE.Vector3Tuple = [zone.yardHandover[0], zone.yardHandover[1], cranePos[2]]
      const stagger = i * STAGGER

      if (ct > C.retreatStart && ct <= C.retreatEnd) {
        const p = progress(ct, C.retreatStart + stagger, C.retreatEnd)

        // AGV: road → handover, rotated 180° (facing handover direction) then settle to 90°
        if (agv) {
          const roadPos: THREE.Vector3Tuple = [zone.road[0], zone.road[1], cranePos[2]]
          const pos = lerpTuple(roadPos, handover, p)
          agv.position.set(pos[0], pos[1], pos[2])
          if (p < 0.8) {
            // Traveling: face toward handover (+X direction = 180° / Math.PI)
            agv.rotation.set(0, Math.PI, 0)
          } else {
            // Settling: rotate from 180° back to 90° for container pickup
            const settleP = (p - 0.8) / 0.2
            agv.rotation.set(0, Math.PI - (Math.PI / 2) * settleP, 0)
          }
        }

        // Stacker: handover → back toward yard (its pick position as proxy)
        if (stacker) {
          const pos = lerpTuple(handover, pickPos, p)
          stacker.position.set(pos[0], pos[1], pos[2])
        }
      } else if (ct > C.retreatEnd) {
        // Hold at end positions
        if (agv) {
          agv.position.set(handover[0], handover[1], handover[2])
          agv.rotation.set(0, Math.PI / 2, 0)
        }
        if (stacker) {
          stacker.position.set(pickPos[0], pickPos[1], pickPos[2])
        }
      }
    }
  })

  return (
    <group ref={animGroupRef}>
      <Vessel
        zone={zone}
        elapsedRef={elapsed}
        arriveEnd={VESSEL_ARRIVE_END}
        leaveStart={vesselLeaveStart}
        leaveEnd={vesselLeaveEnd}
        scale={vesselScale}
        seed={vesselSeed}
      />
      <Container ref={containerRef} craneCount={1} seed={containerSeed} />
    </group>
  )
}
