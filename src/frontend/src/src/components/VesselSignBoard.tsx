import { Html } from '@react-three/drei'
import { useState, useEffect } from 'react'
import vesselSignalData from '../data/vessel-signal.json'

export type VesselSignalRecord = (typeof vesselSignalData)[number]

function pickRandom(): VesselSignalRecord {
  return vesselSignalData[Math.floor(Math.random() * vesselSignalData.length)]
}

interface VesselSignBoardProps {
  /** When provided, uses this record instead of picking randomly. */
  data?: VesselSignalRecord
}

export function VesselSignBoard({ data: dataProp }: VesselSignBoardProps = {}) {
  const [data, setData] = useState<VesselSignalRecord>(() => dataProp ?? pickRandom())

  useEffect(() => {
    if (dataProp) {
      setData(dataProp)
    } else {
      setData(pickRandom())
    }
  }, [dataProp])

  return (
    <group position={[0, 4, 0]}>
      <Html
        center
        distanceFactor={160}
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
          <div style={{ fontSize: 9, fontWeight: 700, color: '#b388ff', marginBottom: 1, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 7, color: '#ce93d8', marginBottom: 3, fontStyle: 'italic' }}>
            {data.vesselType}
          </div>
          <div style={{ fontSize: 7, color: '#ce93d8', marginBottom: 4 }}>
            {data.captainName}
          </div>
          <div style={{ fontSize: 7, marginBottom: 2 }}>
            <span style={{ color: '#ce93d8' }}>From:&nbsp;</span>
            <span style={{ color: '#ede7f6', fontWeight: 600 }}>{data.originPort}, {data.originCountry}</span>
          </div>
          <div style={{ fontSize: 7, marginBottom: 4 }}>
            <span style={{ color: '#ce93d8' }}>To:&nbsp;</span>
            <span style={{ color: '#ede7f6', fontWeight: 600 }}>{data.destinationPort}, {data.destinationCountry}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
        </div>
      </Html>
    </group>
  )
}
