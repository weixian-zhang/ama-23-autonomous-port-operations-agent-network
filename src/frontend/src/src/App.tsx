import { useState } from 'react'
import { MetaRealm } from './components/MetaRealm'
import { VesselInspectModal } from './components/VesselInspectModal'
import type { VesselInspectInfo } from './components/VesselInspectModal'

function App() {
  const [vesselInfo, setVesselInfo] = useState<VesselInspectInfo | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/* Crosshair */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 12, height: 12,
        border: '2px solid rgba(255,255,255,0.7)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 10,
      }} />
      <MetaRealm
        onVesselClick={(vesselGlb, berthId) => setVesselInfo({ vesselGlb, berthId })}
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
