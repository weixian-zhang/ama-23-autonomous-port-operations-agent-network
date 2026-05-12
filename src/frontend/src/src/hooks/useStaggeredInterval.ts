import { useEffect, useRef } from 'react'

/**
 * Like `setInterval`, but with a random per-instance initial delay so that
 * many components mounting at the same time don't all fire on the same
 * event-loop tick.
 *
 * Why this exists: in the port scene we have ~52 sign-board components
 * (cranes / AGVs / stackers) plus ~20 berth/yard signs that each set up
 * a periodic state update on mount. They all mount during the same
 * Suspense resolve, so a plain `setInterval(cb, 4000)` ends up phase-locked:
 * every 4 seconds the browser fires ~52 state updates back-to-back,
 * causing 52 React re-renders + 52 drei `<Html>` DOM transforms in a
 * single frame — a guaranteed periodic hitch.
 *
 * Adding a random initial delay in [0, periodMs) spreads the work evenly
 * across the period, so the worst-case frame only sees a couple of
 * concurrent updates instead of all of them.
 *
 * The callback is held in a ref so consumers don't need to memoize it
 * (typical sign-board callbacks close over `setData` only and would
 * otherwise force a fresh interval on every render).
 */
export function useStaggeredInterval(callback: () => void, periodMs: number) {
  const cbRef = useRef(callback)
  // Always keep the latest callback without resetting the timer.
  useEffect(() => {
    cbRef.current = callback
  }, [callback])

  useEffect(() => {
    const initialDelay = Math.random() * periodMs
    let intervalId: ReturnType<typeof setInterval> | null = null
    const timeoutId = setTimeout(() => {
      // Fire once immediately at the staggered offset, then every periodMs.
      cbRef.current()
      intervalId = setInterval(() => cbRef.current(), periodMs)
    }, initialDelay)

    return () => {
      clearTimeout(timeoutId)
      if (intervalId !== null) clearInterval(intervalId)
    }
  }, [periodMs])
}
