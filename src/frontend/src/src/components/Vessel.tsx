import { useRef, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { PortZone } from '../data/portZoneData'

// Seeded random — deterministic across renders
function seeded(seed: number) {
  let h = seed | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 0x100000000
}

const VESSEL_GLBS = ['/blender-asset/vessel-1.glb', '/blender-asset/vessel-2.glb', '/blender-asset/vessel-3.glb']

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

interface VesselProps {
  zone: PortZone
  elapsedRef: MutableRefObject<number>
  arriveEnd: number
  leaveStart: number
  leaveEnd: number
  scale?: number
  seaX?: number
  dockX?: number
  seed?: number
}

export function Vessel({
  zone,
  elapsedRef,
  arriveEnd,
  leaveStart,
  leaveEnd,
  scale = 60,
  seaX = -200,
  dockX = -55,
  seed = 42,
}: VesselProps) {
  const vesselPick = useMemo(
    () => VESSEL_GLBS[Math.floor(seeded(seed) * VESSEL_GLBS.length)],
    [seed],
  )
  const vesselGltf = useGLTF(vesselPick)
  const vesselScene = useMemo(() => vesselGltf.scene.clone(true), [vesselGltf])

  const groupRef = useRef<THREE.Group>(null)

  const seaPos: THREE.Vector3Tuple = useMemo(() => [seaX, 0, zone.quay[2]], [seaX, zone.quay])
  const dockPos: THREE.Vector3Tuple = useMemo(() => [dockX, 0, zone.quay[2]], [dockX, zone.quay])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const t = elapsedRef.current

    if (t <= arriveEnd) {
      g.visible = true
      const p = progress(t, 0, arriveEnd)
      const pos = lerpTuple(seaPos, dockPos, p)
      g.position.set(pos[0], pos[1], pos[2])
      g.rotation.y = (Math.PI / 2) * (1 - p)
    } else if (t < leaveStart) {
      // Docked — hold at dock position
      g.visible = true
      g.position.set(dockPos[0], dockPos[1], dockPos[2])
      g.rotation.y = 0
    } else if (t >= leaveStart) {
      g.visible = true
      const p = progress(t, leaveStart, leaveEnd)
      const pos = lerpTuple(dockPos, seaPos, p)
      g.position.set(pos[0], pos[1], pos[2])
      g.rotation.y = (Math.PI / 2) * p
      if (p >= 1) g.visible = false
    }
  })

  return (
    <group ref={groupRef} position={[seaPos[0], seaPos[1], seaPos[2]]}>
      <primitive object={vesselScene} scale={scale} />
    </group>
  )
}
