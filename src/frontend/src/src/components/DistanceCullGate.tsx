import { useFrame } from '@react-three/fiber'
import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'

interface DistanceCullGateProps {
  /** World-space distance (in scene units) beyond which children are unmounted. */
  maxDistance: number
  /** Optional 5%-hysteresis multiplier; defaults to 0.05 (5%). */
  hysteresis?: number
  children: ReactNode
}

// We don't need to evaluate the cull distance every frame. The camera moves
// at WALK_SPEED (40 units/s); the smallest cull distance in the scene is
// ~280 units; the 5 % hysteresis band is therefore ~14 units, which the
// camera covers in ~0.35 s. Re-checking ~10× per second is more than fast
// enough to react before the band is crossed, while removing ~83 % of the
// per-frame `getWorldPosition` + `distanceTo` work across all gates.
const CHECK_EVERY_N_FRAMES = 6

// Module-scoped scratch vector. DistanceCullGate.useFrame callbacks run
// sequentially inside R3F's render loop (no concurrency), so a shared
// scratch is safe and saves one allocation per gate instance at mount.
const _scratchVec = new THREE.Vector3()

/**
 * Wraps children in a <group> whose contents are conditionally mounted based
 * on world-space distance from the active camera.
 *
 * Why: drei <Html> sign boards do per-frame CSS-transform work for every
 * mounted instance, even when they're a pixel on screen. With ~80+ signs in
 * the port scene, this is the dominant browser-side cost while moving the
 * camera. By unmounting the sign entirely when it's far from the viewer the
 * DOM node is removed and drei stops paying that per-frame cost.
 *
 * Re-renders only happen when the distance crosses the show/hide threshold
 * (5% hysteresis prevents flicker), and the cheap per-frame distance check
 * is throttled to 1-in-N frames with a per-instance phase offset so the work
 * is spread evenly across frames (no once-every-N-frames spike).
 */
export function DistanceCullGate({
  maxDistance,
  hysteresis = 0.05,
  children,
}: DistanceCullGateProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [visible, setVisible] = useState(true)
  const visibleRef = useRef(true)
  const showThresh = maxDistance * (1 - hysteresis)
  const hideThresh = maxDistance * (1 + hysteresis)

  // Per-instance phase: hash the React id into [0, N) so different gates
  // run on different frames. This avoids ~135 gates all running their
  // distance check on the same frame (which would spike the work into one
  // frame instead of spreading it).
  const id = useId()
  const phase = useMemo(() => {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
    return Math.abs(h) % CHECK_EVERY_N_FRAMES
  }, [id])
  const frameCount = useRef(0)

  useFrame((state) => {
    frameCount.current++
    if ((frameCount.current % CHECK_EVERY_N_FRAMES) !== phase) return

    const g = groupRef.current
    if (!g) return
    g.getWorldPosition(_scratchVec)
    const d = state.camera.position.distanceTo(_scratchVec)
    // Use asymmetric thresholds so we don't flap mount/unmount at the boundary.
    const want = visibleRef.current ? d < hideThresh : d < showThresh
    if (want !== visibleRef.current) {
      visibleRef.current = want
      setVisible(want)
    }
  })

  return <group ref={groupRef}>{visible ? children : null}</group>
}

