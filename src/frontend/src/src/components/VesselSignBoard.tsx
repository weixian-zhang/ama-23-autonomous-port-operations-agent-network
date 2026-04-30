import { Html } from '@react-three/drei'
import { useState, useEffect } from 'react'
import vesselSignalData from '../data/vessel-signal.json'

function pickRandom() {
  return vesselSignalData[Math.floor(Math.random() * vesselSignalData.length)]
}

export function VesselSignBoard() {
  const [data, setData] = useState(pickRandom)

  useEffect(() => {
    setData(pickRandom())
  }, [])

  return (
    <group position={[0, 4, 0]}>
      <Html
        center
        distanceFactor={120}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'transparent',
            border: '1px solid #b388ff',
            borderRadius: 8,
            padding: '6px 10px',
            color: '#ede7f6',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 160,
            boxShadow: '0 0 10px rgba(179,136,255,0.3)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: '#b388ff', marginBottom: 2, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}>
            VESSEL
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#b388ff', marginBottom: 4, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 7, color: '#ce93d8', marginBottom: 4 }}>
            {data.captainName} &middot; {data.voyageNumber}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
            <div>
              <div style={{ fontSize: 7, color: '#ce93d8' }}>Loaded</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.containersLoaded}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ce93d8' }}>Unloaded</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.containersUnloaded}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ce93d8' }}>Stay</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.portStayHours}h</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div style={{ fontSize: 7, color: '#ce93d8' }}>Arr Draft</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.arrivalDraftMeters}m</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ce93d8' }}>Dep Draft</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.departureDraftMeters}m</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ce93d8' }}>Berth %</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.berthUtilizationPercent}%</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}
