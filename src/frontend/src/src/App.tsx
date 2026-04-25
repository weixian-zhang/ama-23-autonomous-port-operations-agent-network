import { useState, useRef } from 'react'
import { MetaRealm } from './components/MetaRealm'
import { VesselInspectModal } from './components/VesselInspectModal'
import type { VesselInspectInfo } from './components/VesselInspectModal'
import type { VesselLateAnimationHandle } from './components/VesselLateAnimation'

function App() {
  const [vesselInfo, setVesselInfo] = useState<VesselInspectInfo | null>(null)
  const vesselLateRef = useRef<VesselLateAnimationHandle | null>(null)

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
    <div style={{ width: '100vw', height: '100vh' }}>
      <MetaRealm
        onVesselClick={(vesselGlb, berthId) => setVesselInfo({ vesselGlb, berthId })}
        vesselLateHandleRef={vesselLateRef}
      />
      <VesselInspectModal
        open={!!vesselInfo}
        info={vesselInfo}
        onClose={() => setVesselInfo(null)}
      />
    </div>
  )
}

export default App
