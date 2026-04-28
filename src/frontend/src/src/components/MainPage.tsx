import { useState, useRef } from 'react'
import { MetaRealm } from './MetaRealm'
import { VesselInspectModal } from './VesselInspectModal'
import type { VesselInspectInfo } from './VesselInspectModal'
import type { VesselLateAnimationHandle } from './VesselLateAnimation'
import { Chat } from './Chat'

export function MainPage() {
  const [vesselInfo, setVesselInfo] = useState<VesselInspectInfo | null>(null)
  const vesselLateRef = useRef<VesselLateAnimationHandle | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const menuItems = [
    'Berth Planning',
    'Yacht Allocation',
    'Gate Management',
    'Cargo Tracking',
    'Billing',
    'Reporting and Analytics',
  ]

  // Expose to window for manual function calling
  ;(window as any).trigger_late_vessel_animation = (units?: { agvName: string; stackerName: string }[]) => {
    const defaultUnits = [
      { agvName: 'agv-berth-5-0', stackerName: 'stacker-yard-5-0' },
      { agvName: 'agv-berth-2-0', stackerName: 'stacker-yard-2-0' },
    ]
    vesselLateRef.current?.borrow_AGV_Stackers(units ?? defaultUnits)
  }
  ;(window as any).reset_late_vessel_animation = () => {
    vesselLateRef.current?.resetAnimation()
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black">
      {/* ── Hamburger Button ── */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="absolute top-3 left-3 z-[200] flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-md border border-cyan-400 bg-black/70 text-[22px] leading-none text-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.4)]"
      >
        ☰
      </button>

      {/* ── Sidebar ── */}
      <div
        className={`flex h-full flex-col overflow-hidden transition-all duration-[250ms] ease-in-out ${
          sidebarOpen
            ? 'w-[220px] min-w-[220px] border-r border-cyan-400 shadow-[2px_0_16px_rgba(0,255,255,0.25)]'
            : 'w-0 min-w-0'
        } bg-black/95`}
      >
        {/* Logo area */}
        <div className="border-b border-cyan-400/20 pt-3.5 pr-4 pb-2.5 pl-14">
          <img src="/logo-icon.png" alt="logo" className="h-7" />
        </div>

        {/* Menu items */}
        <nav className="flex-1 py-2">
          {menuItems.map((item) => (
            <div
              key={item}
              className="cursor-pointer whitespace-nowrap border-l-[3px] border-transparent px-5 py-2.5 text-[13px] font-medium tracking-wide text-cyan-400 transition-[background,border-color] duration-150 hover:border-l-cyan-400 hover:bg-cyan-400/[0.08]"
            >
              {item}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Main Panels ── */}
      <div className="flex h-full flex-1 overflow-hidden">
        {/* Panel 1 – MetaRealm (80%) */}
        <div className="relative m-2 w-4/5 overflow-hidden rounded-md border border-cyan-400 shadow-[0_0_8px_cyan,inset_0_0_8px_rgba(0,255,255,0.1)]">
          <MetaRealm
            onVesselClick={(vesselGlb, berthId) => setVesselInfo({ vesselGlb, berthId })}
            vesselLateHandleRef={vesselLateRef}
          />
        </div>

        {/* Panel 2 – Chat (20%) */}
        <div className="mt-2 mr-2 mb-2 w-1/5 overflow-hidden">
          <Chat />
        </div>
      </div>

      <VesselInspectModal
        open={!!vesselInfo}
        info={vesselInfo}
        onClose={() => setVesselInfo(null)}
      />
    </div>
  )
}
