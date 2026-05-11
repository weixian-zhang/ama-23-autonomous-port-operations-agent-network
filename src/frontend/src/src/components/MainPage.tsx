import { useState, useRef, useEffect } from 'react'
import { MetaRealm } from './MetaRealm'
import { VesselInspectModal } from './VesselInspectModal'
import type { VesselInspectInfo } from './VesselInspectModal'
import type { VesselLateAnimationHandle } from './VesselLateAnimation'
import { Chat } from './Chat'
import { socketClient } from '../SocketClient'

export function MainPage() {
  const [vesselInfo, setVesselInfo] = useState<VesselInspectInfo | null>(null)
  const vesselLateRef = useRef<VesselLateAnimationHandle | null>(null)
  const [metaFullscreen, setMetaFullscreen] = useState(false)

  const menuItems = [
    'Berth Planning',
    'Yard Allocation',
    'Gate Management',
    'Cargo Tracking',
    'Billing',
    'Reporting and Analytics',
  ]

  // Expose console-callable triggers AFTER mount so they can never be invoked
  // before VesselLateAnimation has wired its imperative handle. The console.warn
  // makes it obvious if the user calls the function before the 3D scene
  // (mounted inside <Suspense>) has finished loading.
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>

    w.trigger_late_vessel_animation = (units?: { agvName: string; stackerName: string }[]) => {
      const defaultUnits = [
        { agvName: 'agv-berth-5-0', stackerName: 'stacker-yard-5-0' },
        { agvName: 'agv-berth-2-0', stackerName: 'stacker-yard-2-0' },
      ]
      const handle = vesselLateRef.current
      if (!handle) {
        console.warn(
          '[trigger_late_vessel_animation] VesselLateAnimation handle not ready yet. ' +
            'The 3D scene is still loading inside <Suspense>; wait for the canvas to render and try again.',
        )
        return
      }
      console.info('[trigger_late_vessel_animation] borrowing units:', units ?? defaultUnits)
      handle.borrow_AGV_Stackers(units ?? defaultUnits)
    }

    w.reset_late_vessel_animation = () => {
      const handle = vesselLateRef.current
      if (!handle) {
        console.warn('[reset_late_vessel_animation] VesselLateAnimation handle not ready.')
        return
      }
      console.info('[reset_late_vessel_animation] resetting')
      handle.resetAnimation()
    }

    return () => {
      delete w.trigger_late_vessel_animation
      delete w.reset_late_vessel_animation
    }
  }, [])

  // Subscribe to the vessel-late dispatch event at the MainPage level so the
  // listener is alive for the entire app lifetime — NOT scoped to <Chat />,
  // which is unmounted when MetaRealm goes fullscreen and would otherwise
  // silently drop the WS message coming back from the Teams approval.
  useEffect(() => {
    socketClient.connect()
    const unsubAuctionDispatch = socketClient.on('fleetmarket-vessel-late', (msg) => {
      console.info('[MainPage] received fleetmarket-vessel-late', msg)
      const auctionResult = msg['auction-result'] as
        | Array<{ agvName: string; stackerName: string }>
        | undefined
      if (!auctionResult) {
        console.warn('[MainPage] fleetmarket-vessel-late missing "auction-result" field; ignoring')
        return
      }
      const trigger = (window as unknown as Record<string, unknown>).trigger_late_vessel_animation as
        | ((u: Array<{ agvName: string; stackerName: string }>) => void)
        | undefined
      if (typeof trigger !== 'function') {
        console.warn(
          '[MainPage] fleetmarket-vessel-late received but window.trigger_late_vessel_animation is not ready yet — the 3D scene may still be loading',
        )
        return
      }
      trigger(auctionResult)
    })
    return () => {
      unsubAuctionDispatch()
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-black">
      {/* ── Slim Top Bar ── */}
      <header className="flex h-9 w-full flex-shrink-0 items-center border-b border-cyan-400 bg-black/95 px-3 shadow-[0_2px_8px_rgba(0,255,255,0.25)]">
        {/* Logo + brand */}
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="logo" className="h-5" />
          <span className="text-[13px] font-semibold tracking-wide text-cyan-400">
            Salacia Hive
          </span>
        </div>

        {/* Menu items */}
        <nav className="ml-6 flex items-center">
          {menuItems.map((item) => (
            <div
              key={item}
              className="cursor-pointer whitespace-nowrap border-b-2 border-transparent px-3 py-1.5 text-[12px] font-medium tracking-wide text-cyan-400 transition-[background,border-color] duration-150 hover:border-b-cyan-400 hover:bg-cyan-400/[0.08]"
            >
              {item}
            </div>
          ))}
        </nav>
      </header>

      {/* ── Main Panels ── */}
      <div className="flex h-full flex-1 overflow-hidden">
        {/* Panel 1 – MetaRealm (80% or fullscreen) */}
        <div
          className={
            metaFullscreen
              ? 'fixed inset-0 z-[300] overflow-hidden border border-cyan-400 bg-black shadow-[0_0_8px_cyan,inset_0_0_8px_rgba(0,255,255,0.1)]'
              : 'relative m-2 w-4/5 overflow-hidden rounded-md border border-cyan-400 shadow-[0_0_8px_cyan,inset_0_0_8px_rgba(0,255,255,0.1)]'
          }
          style={{ zIndex: metaFullscreen ? 300 : 0, isolation: 'isolate' }}
        >
          {/* Expand / Minimize toggle */}
          <button
            onClick={() => setMetaFullscreen((v) => !v)}
            title={metaFullscreen ? 'Minimize' : 'Expand'}
            className="absolute top-2 left-2 z-[310] flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-cyan-400 bg-black/70 text-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.4)] transition-colors hover:bg-cyan-400/20"
          >
            {metaFullscreen ? (
              // Minimize icon (inward arrows)
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2v5h5" />
                <path d="M14 2 9 7" />
                <path d="M7 14V9H2" />
                <path d="m2 14 5-5" />
              </svg>
            ) : (
              // Expand icon (outward arrows)
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2h5v5" />
                <path d="M14 2 9 7" />
                <path d="M7 14H2V9" />
                <path d="m2 14 5-5" />
              </svg>
            )}
          </button>

          <MetaRealm
            onVesselClick={(vesselGlb, berthId) => setVesselInfo({ vesselGlb, berthId })}
            vesselLateHandleRef={vesselLateRef}
          />
        </div>

        {/* Panel 2 – Chat (20%) */}
        {!metaFullscreen && (
          <div className="mt-2 mr-2 mb-2 w-1/5 overflow-hidden">
            <Chat />
          </div>
        )}
      </div>

      <VesselInspectModal
        open={!!vesselInfo}
        info={vesselInfo}
        onClose={() => setVesselInfo(null)}
      />
    </div>
  )
}
