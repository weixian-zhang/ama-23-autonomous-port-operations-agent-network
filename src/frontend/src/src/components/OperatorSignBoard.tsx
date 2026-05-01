import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'
import operatorNomadSign from '../data/operator-nomad-sign.json'

export interface OperatorNomadRecord {
  role: string
  shiftStart: string
  shiftEnd: string
  gpsLocation: { lat: number; lon: number }
  safetyHazardReport: string
  equipmentChecklist: string
}

const RECORDS = operatorNomadSign as OperatorNomadRecord[]

function pickRandom(): OperatorNomadRecord {
  return RECORDS[Math.floor(Math.random() * RECORDS.length)]
}

interface OperatorSignBoardProps {
  /** Local-space y position above the NPC's head. */
  yOffset?: number
  /** Optional NPC id rendered as a sub-title. */
  operatorId?: string
}

/**
 * Tiny "Salacia Hive" digital sign board floating above an NPC operator.
 * Pulls a random record from operator-nomad-sign.json so each NPC shows
 * a different role / shift / hazard / checklist note.
 */
export function OperatorSignBoard({ yOffset = 14, operatorId }: OperatorSignBoardProps) {
  const [data, setData] = useState<OperatorNomadRecord>(pickRandom)

  // Re-pick once on mount so dev StrictMode double-mount doesn't matter
  // (still deterministic-ish — just locks in a record per instance).
  useEffect(() => {
    setData(pickRandom())
  }, [])

  return (
    <group position={[0, yOffset, 0]}>
      <Html center distanceFactor={70} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: 'transparent',
            border: '1px solid #800000',
            borderRadius: 8,
            padding: '5px 8px',
            color: '#e0f7fa',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 150,
            maxWidth: 200,
            boxShadow: '0 0 10px rgba(128,0,0,0.4)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: '#80deea',
              marginBottom: 2,
              letterSpacing: 2,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            Salacia Nomad
          </div>
          {operatorId && (
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: '#00e5ff',
                marginBottom: 4,
                letterSpacing: 1,
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {operatorId}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Role</div>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'capitalize' }}>{data.role}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Shift</div>
              <div style={{ fontSize: 9, fontWeight: 600 }}>
                {data.shiftStart}–{data.shiftEnd}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 3 }}>
            <div style={{ fontSize: 7, color: '#80deea' }}>GPS</div>
            <div style={{ fontSize: 9, fontWeight: 600 }}>
              {data.gpsLocation.lat.toFixed(4)}, {data.gpsLocation.lon.toFixed(4)}
            </div>
          </div>
          <div style={{ marginBottom: 3 }}>
            <div style={{ fontSize: 7, color: '#ffab40' }}>Safety</div>
            <div style={{ fontSize: 8, fontWeight: 500, lineHeight: 1.25 }}>
              {data.safetyHazardReport}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 7, color: '#76ff03' }}>Equipment</div>
            <div style={{ fontSize: 8, fontWeight: 500, lineHeight: 1.25 }}>
              {data.equipmentChecklist}
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}
