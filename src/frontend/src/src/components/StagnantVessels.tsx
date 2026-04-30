import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

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
    if (tooClose) continue

    placed.push({
      glb: VESSEL_GLBS[Math.floor(rand() * VESSEL_GLBS.length)],
      position: [x, 0, z],
      rotationY: rand() * Math.PI * 2,
      scale: 50 + rand() * 25, // mild size variation 50–75
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
    </group>
  )
}

interface StagnantVesselsProps {
  count?: number
  seed?: number
  bounds?: ScatterBounds
  minDistance?: number
}

const DEFAULT_BOUNDS: ScatterBounds = {
  xMin: -1700,
  xMax: -700,
  zMin: -900,
  zMax: 900,
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
}: StagnantVesselsProps) {
  const vessels = useMemo(
    () => generateStagnantVessels(count, seed, bounds, minDistance),
    [count, seed, bounds, minDistance],
  )

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
