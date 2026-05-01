import { Html } from '@react-three/drei'
import { useState, useEffect } from 'react'
import vesselSignalData from '../data/vessel-signal.json'
import type { VesselSignalRecord } from './VesselSignBoard'

function pickRandom(): VesselSignalRecord {
  return vesselSignalData[Math.floor(Math.random() * vesselSignalData.length)]
}

interface StagnantVesselSignBoardProps {
  /** When provided, uses this record instead of picking randomly. */
  data?: VesselSignalRecord
}

/**
 * Digital sign board for vessels that are stationary (anchored) at sea.
 *
 * Visually distinct from the docking-vessel `VesselSignBoard`:
 *  - Amber/anchored theme instead of purple "berthed" theme
 *  - Header reads "ANCHORED" instead of "VESSEL"
 *  - Every size value (font, padding, gap, minWidth, borderRadius) is
 *    scaled up by 30 % relative to the docking sign board.
 */
export function StagnantVesselSignBoard({
  data: dataProp,
}: StagnantVesselSignBoardProps = {}) {
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
            border: '1px solid #ffb74d',
            borderRadius: 12,
            padding: '10px 16px',
            color: '#fff3e0',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 250,
            boxShadow: '0 0 16px rgba(255,183,77,0.35)',
          }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 900,
              color: '#ffb74d',
              marginBottom: 4,
              letterSpacing: 4,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            ANCHORED
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffb74d', marginBottom: 2, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 11, color: '#ffe0b2', marginBottom: 4, fontStyle: 'italic' }}>
            {data.vesselType}
          </div>
          <div style={{ fontSize: 11, color: '#ffe0b2', marginBottom: 6 }}>
            {data.captainName}
          </div>
          <div style={{ fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: '#ffe0b2' }}>From:&nbsp;</span>
            <span style={{ color: '#fff3e0', fontWeight: 600 }}>{data.originPort}, {data.originCountry}</span>
          </div>
          <div style={{ fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#ffe0b2' }}>To:&nbsp;</span>
            <span style={{ color: '#fff3e0', fontWeight: 600 }}>{data.destinationPort}, {data.destinationCountry}</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#ffe0b2' }}>Loaded</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{data.containersLoaded}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#ffe0b2' }}>Unloaded</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{data.containersUnloaded}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#ffe0b2' }}>Stay</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{data.portStayHours}h</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}
