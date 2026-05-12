/**
 * Module-level shared state for the camera "look mode" (right-mouse-drag).
 *
 * R3F runs pointer raycasts against every interactive mesh on every
 * mousemove inside the canvas. Components like YardContainerTooltips have
 * many invisible hit-box meshes; while the user is panning the camera with
 * right-mouse-drag they cannot meaningfully hover anything anyway, so we
 * use this flag to short-circuit those raycasts to a no-op.
 *
 * Module state (instead of React context) keeps reads in tight raycast
 * functions allocation- and subscription-free.
 */

let lookActive = false
const subscribers = new Set<(active: boolean) => void>()

export function isLookActive(): boolean {
  return lookActive
}

export function setLookActive(v: boolean): void {
  if (v === lookActive) return
  lookActive = v
  for (const cb of subscribers) cb(v)
}

export function subscribeLookActive(cb: (active: boolean) => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}
