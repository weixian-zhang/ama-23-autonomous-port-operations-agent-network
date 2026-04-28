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
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* ── Hamburger Button ── */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid cyan',
          boxShadow: '0 0 8px rgba(0,255,255,0.4)',
          borderRadius: 6,
          color: 'cyan',
          fontSize: 22,
          width: 38,
          height: 38,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >
        ☰
      </button>

      {/* ── Sidebar ── */}
      <div
        style={{
          width: sidebarOpen ? 220 : 0,
          minWidth: sidebarOpen ? 220 : 0,
          height: '100%',
          background: 'rgba(0,0,0,0.95)',
          borderRight: sidebarOpen ? '1px solid cyan' : 'none',
          boxShadow: sidebarOpen ? '2px 0 16px rgba(0,255,255,0.25)' : 'none',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            padding: '14px 16px 10px 56px',
            borderBottom: '1px solid rgba(0,255,255,0.2)',
          }}
        >
          <img src="/logo-icon.png" alt="logo" style={{ height: 28 }} />
        </div>

        {/* Menu items */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {menuItems.map((item) => (
            <div
              key={item}
              style={{
                padding: '10px 20px',
                color: 'cyan',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: 0.5,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                borderLeft: '3px solid transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0,255,255,0.08)'
                e.currentTarget.style.borderLeftColor = 'cyan'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderLeftColor = 'transparent'
              }}
            >
              {item}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Main Panels ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100%' }}>
        {/* Panel 1 – MetaRealm (80%) */}
        <div
          style={{
            width: '80%',
            position: 'relative',
            border: '1px solid cyan',
            boxShadow: '0 0 10px rgba(0,255,255,0.3), inset 0 0 10px rgba(0,255,255,0.05)',
            borderRadius: 6,
            margin: 8,
            overflow: 'hidden',
          }}
        >
          <MetaRealm
            onVesselClick={(vesselGlb, berthId) => setVesselInfo({ vesselGlb, berthId })}
            vesselLateHandleRef={vesselLateRef}
          />
        </div>

        {/* Panel 2 – Chat (20%) */}
        <div
          style={{
            width: '20%',
            margin: '8px 8px 8px 0',
            overflow: 'hidden',
          }}
        >
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
