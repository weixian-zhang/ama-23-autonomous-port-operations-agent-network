import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import vesselSignalData from '../data/vessel-signal.json'
import { type VesselSignalRecord } from './VesselSignBoard'
import { StagnantVesselSignBoard } from './StagnantVesselSignBoard'
import { DistanceCullGate } from './DistanceCullGate'

// Beyond this world-space distance, the floating ANCHORED sign for a stagnant
// vessel is unmounted entirely. distanceFactor=160 already shrinks them to a
// near-unreadable size at this range, so users lose nothing perceptually but
// drei stops doing per-frame DOM-transform work for ~50+ off-screen signs.
const STAGNANT_SIGN_CULL_DISTANCE = 750

const VESSEL_GLBS = [
  '/blender-asset/vessel-1.glb',
  '/blender-asset/vessel-2.glb',
  '/blender-asset/vessel-3.glb',
]

// Deterministic PRNG (mulberry32) — same seed always yields the same scatter
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 61), t | 7)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface StagnantVesselSpec {
  glb: string
  position: [number, number, number]
  rotationY: number
  scale: number
  signal: VesselSignalRecord
}

interface ScatterBounds {
  xMin: number
  xMax: number
  zMin: number
  zMax: number
}

function generateStagnantVessels(
  count: number,
  seed: number,
  bounds: ScatterBounds,
  minDistance: number,
  seaY: number,
  existing: StagnantVesselSpec[] = [],
): StagnantVesselSpec[] {
  const rand = mulberry32(seed)
  const placed: StagnantVesselSpec[] = []
  const minDistSq = minDistance * minDistance
  const maxAttempts = 5000
  let attempts = 0

  while (placed.length < count && attempts < maxAttempts) {
    attempts++
    const x = bounds.xMin + rand() * (bounds.xMax - bounds.xMin)
    const z = bounds.zMin + rand() * (bounds.zMax - bounds.zMin)

    let tooClose = false
    for (const p of placed) {
      const dx = p.position[0] - x
      const dz = p.position[2] - z
      if (dx * dx + dz * dz < minDistSq) {
        tooClose = true
        break
      }
    }
    if (!tooClose) {
      for (const p of existing) {
        const dx = p.position[0] - x
        const dz = p.position[2] - z
        if (dx * dx + dz * dz < minDistSq) {
          tooClose = true
          break
        }
      }
    }
    if (tooClose) continue

    placed.push({
      glb: VESSEL_GLBS[Math.floor(rand() * VESSEL_GLBS.length)],
      position: [x, seaY, z],
      rotationY: rand() * Math.PI * 2,
      // Match docking vessel scale (60) with only mild variation so hulls
      // stay seated on the waterline instead of being lifted into the air.
      scale: 56 + rand() * 8, // 56–64
      signal: vesselSignalData[Math.floor(rand() * vesselSignalData.length)],
    })
  }

  return placed
}

function StagnantVessel({ spec }: { spec: StagnantVesselSpec }) {
  const gltf = useGLTF(spec.glb)
  const scene = useMemo(() => gltf.scene.clone(true), [gltf])

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]}>
      <primitive object={scene as THREE.Object3D} scale={spec.scale} />
      {/* Counter-rotate the sign board so it always reads the same orientation as docked vessels */}
      <group rotation={[0, -spec.rotationY, 0]}>
        <DistanceCullGate maxDistance={STAGNANT_SIGN_CULL_DISTANCE}>
          <StagnantVesselSignBoard data={spec.signal} />
        </DistanceCullGate>
      </group>
    </group>
  )
}

interface StagnantVesselsProps {
  count?: number
  seed?: number
  bounds?: ScatterBounds
  minDistance?: number
  /** Y position of the sea surface — keep at 0 to match docking vessels */
  seaY?: number
}

const DEFAULT_BOUNDS: ScatterBounds = {
  xMin: -1100,
  xMax: -600,
  zMin: -800,
  zMax: 800,
}

/**
 * Renders a fleet of idle (stagnant) vessels scattered out at sea.
 * Positions are deterministic and enforce a minimum distance between
 * vessels so they never cluster on top of each other.
 */
export function StagnantVessels({
  count = 15,
  seed = 1337,
  bounds = DEFAULT_BOUNDS,
  minDistance = 220,
  seaY = 0,
}: StagnantVesselsProps) {
  const vessels = useMemo(
    () => generateStagnantVessels(count, seed, bounds, minDistance, seaY),
    [count, seed, bounds, minDistance, seaY],
  )

  return (
    <>
      {vessels.map((spec, i) => (
        <StagnantVessel key={i} spec={spec} />
      ))}
    </>
  )
}

export interface StagnantVesselBandSpec {
  count: number
  seed: number
  bounds: ScatterBounds
  minDistance: number
}

interface StagnantVesselBandsProps {
  bands: StagnantVesselBandSpec[]
  /** Minimum distance enforced between vessels of *different* bands. */
  globalMinDistance?: number
  seaY?: number
}

/**
 * Renders multiple bands of stagnant vessels with cross-band collision
 * avoidance, so vessels from different bands cannot cluster together.
 */
export function StagnantVesselBands({
  bands,
  globalMinDistance = 240,
  seaY = 0,
}: StagnantVesselBandsProps) {
  const vessels = useMemo(() => {
    const all: StagnantVesselSpec[] = []
    for (const band of bands) {
      // Use the stricter of the band's own minDistance and the global one
      // so that cross-band spacing is always enforced.
      const effectiveMin = Math.max(band.minDistance, globalMinDistance)
      const placed = generateStagnantVessels(
        band.count,
        band.seed,
        band.bounds,
        effectiveMin,
        seaY,
        all,
      )
      all.push(...placed)
    }
    return all
  }, [bands, globalMinDistance, seaY])

  return (
    <>
      {vessels.map((spec, i) => (
        <StagnantVessel key={i} spec={spec} />
      ))}
    </>
  )
}

// Preload GLBs so they're ready when the scene mounts
VESSEL_GLBS.forEach((url) => {
  useGLTF.preload(url)
})
