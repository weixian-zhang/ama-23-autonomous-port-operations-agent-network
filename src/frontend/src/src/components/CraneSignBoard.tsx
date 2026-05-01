import { Html } from '@react-three/drei'
import { useState, useEffect } from 'react'
import craneSignalData from '../data/crane-signal.data.json'

type CraneSignal = (typeof craneSignalData)[number]

function pickByName(name: string): CraneSignal {
  const match = craneSignalData.find((d) => d.craneName === name)
  return match ?? craneSignalData[Math.floor(Math.random() * craneSignalData.length)]
}

export function CraneSignBoard({ craneName }: { craneName: string }) {
  const [data, setData] = useState<CraneSignal>(() => pickByName(craneName))

  useEffect(() => {
    setData(pickByName(craneName))
  }, [craneName])

  // Randomize live telemetry every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        hoistMotorTempC: Math.round(35 + Math.random() * 40),
        trolleyPositionM: Math.round(Math.random() * 45 * 10) / 10,
        hoistHeightM: Math.round((20 + Math.random() * 25) * 10) / 10,
        windSpeedMps: Math.round((3 + Math.random() * 8) * 10) / 10,
        powerLoadKw: Math.round(50 + Math.random() * 1250),
      }))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const tempColor =
    data.hoistMotorTempC < 55 ? '#76ff03' : data.hoistMotorTempC < 70 ? '#ffea00' : '#ff1744'

  const windColor =
    data.windSpeedMps < 6 ? '#76ff03' : data.windSpeedMps < 9 ? '#ffea00' : '#ff1744'

  const statusColor = data.status === 'Loading' ? '#00e5ff' : '#ffab40'

  return (
    // Position on the back side of the crane (port/yard side, +x) at mid-height
    <group position={[12, 22, 0]}>
      <Html
        center
        distanceFactor={108}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10, 22, 40, 0.55)',
            border: `1px solid ${statusColor}`,
            borderRadius: 4,
            padding: '3px 5px',
            color: '#e0f7fa',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 70,
            boxShadow: `0 0 5px ${statusColor}55`,
          }}
        >
          <div
            style={{
              fontSize: 6,
              fontWeight: 900,
              color: statusColor,
              marginBottom: 1,
              letterSpacing: 1,
              textTransform: 'uppercase',
              textAlign: 'center',
              textShadow: `0 0 4px ${statusColor}99`,
            }}
          >
            {data.status}
          </div>
          <div
            style={{
              fontSize: 5,
              fontWeight: 700,
              color: statusColor,
              marginBottom: 2,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {craneName}
          </div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Temp</div>
              <div style={{ fontSize: 6, fontWeight: 600, color: tempColor }}>
                {data.hoistMotorTempC}°C
              </div>
            </div>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Wind</div>
              <div style={{ fontSize: 6, fontWeight: 600, color: windColor }}>
                {data.windSpeedMps} m/s
              </div>
            </div>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Power</div>
              <div style={{ fontSize: 6, fontWeight: 600 }}>{data.powerLoadKw} kW</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Trolley</div>
              <div style={{ fontSize: 6, fontWeight: 600 }}>{data.trolleyPositionM} m</div>
            </div>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Hoist</div>
              <div style={{ fontSize: 6, fontWeight: 600 }}>{data.hoistHeightM} m</div>
            </div>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Spreader</div>
              <div
                style={{
                  fontSize: 6,
                  fontWeight: 600,
                  color: data.spreaderLockStatus === 'Locked' ? '#76ff03' : '#ffab40',
                }}
              >
                {data.spreaderLockStatus}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Anti-Sway</div>
              <div
                style={{
                  fontSize: 6,
                  fontWeight: 600,
                  color: data.antiSwayActive ? '#76ff03' : '#9e9e9e',
                }}
              >
                {data.antiSwayActive ? 'ON' : 'OFF'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 4, color: '#80deea' }}>Maint</div>
              <div style={{ fontSize: 6, fontWeight: 600 }}>{data.lastMaintenanceHours}h</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}
