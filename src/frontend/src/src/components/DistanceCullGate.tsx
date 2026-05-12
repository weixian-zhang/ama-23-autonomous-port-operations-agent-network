import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'

interface DistanceCullGateProps {
  /** World-space distance (in scene units) beyond which children are unmounted. */
  maxDistance: number
  /** Optional 5%-hysteresis multiplier; defaults to 0.05 (5%). */
  hysteresis?: number
  children: ReactNode
}

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
 * (5% hysteresis prevents flicker), so the per-frame distance check itself
 * stays cheap (one vec3 distance + a comparison).
 */
export function DistanceCullGate({
  maxDistance,
  hysteresis = 0.05,
  children,
}: DistanceCullGateProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [visible, setVisible] = useState(true)
  const visibleRef = useRef(true)
  const tmpVec = useMemo(() => new THREE.Vector3(), [])
  const showThresh = maxDistance * (1 - hysteresis)
  const hideThresh = maxDistance * (1 + hysteresis)

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    g.getWorldPosition(tmpVec)
    const d = state.camera.position.distanceTo(tmpVec)
    // Use asymmetric thresholds so we don't flap mount/unmount at the boundary.
    const want = visibleRef.current ? d < hideThresh : d < showThresh
    if (want !== visibleRef.current) {
      visibleRef.current = want
      setVisible(want)
    }
  })

  return <group ref={groupRef}>{visible ? children : null}</group>
}
