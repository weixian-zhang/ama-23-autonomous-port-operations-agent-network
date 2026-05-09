/**
 * Tiny global input-lock used to coordinate keyboard navigation between
 * overlapping 3D scenes (e.g. MetaRealm's first-person WSAD camera vs. a
 * modal scene that wants its own WSAD controller).
 *
 * Anyone owning the foreground (typically a modal) calls `acquireInputLock()`
 * and is returned a release function. While the lock count is > 0, background
 * consumers (MetaRealm) should treat WSAD as not pressed.
 */

let lockCount = 0
const listeners = new Set<() => void>()

function notify() {
  for (const l of listeners) l()
}

export function acquireInputLock(): () => void {
  lockCount++
  notify()
  let released = false
  return () => {
    if (released) return
    released = true
    lockCount = Math.max(0, lockCount - 1)
    notify()
  }
}

export function isInputLocked(): boolean {
  return lockCount > 0
}

export function subscribeInputLock(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
