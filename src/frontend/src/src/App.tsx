import { useState } from 'react'
import { MetaRealm } from './components/MetaRealm'
import { VesselInspectModal } from './components/VesselInspectModal'
import type { VesselInspectInfo } from './components/VesselInspectModal'

function App() {
  const [vesselInfo, setVesselInfo] = useState<VesselInspectInfo | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
