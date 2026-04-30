import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import yardUnloadStats from '../data/yard-unload-stats.json'

function pickRandom() {
  return yardUnloadStats[Math.floor(Math.random() * yardUnloadStats.length)]
}

export function YardUnloadSignBoard({ position, disableTimer, zeroContainers }: { position: [number, number, number]; disableTimer?: boolean; zeroContainers?: boolean }) {
  const [data, setData] = useState(pickRandom)
  const receivedRef = useRef(data.containersReceived)

  const originalReceivedRef = useRef(data.containersReceived)

  useEffect(() => {
    const d = pickRandom()
    setData(zeroContainers ? { ...d, containersReceived: 0 } : d)
    receivedRef.current = zeroContainers ? 0 : d.containersReceived
    originalReceivedRef.current = d.containersReceived
  }, [zeroContainers])

  // Decrement containersReceived by 4 every 5 seconds, reset to original on 0
  useEffect(() => {
    if (disableTimer) return
    const interval = setInterval(() => {
      receivedRef.current = receivedRef.current - 4
      if (receivedRef.current <= 0) {
        receivedRef.current = originalReceivedRef.current
      }
      setData((prev) => ({
        ...prev,
        containersReceived: receivedRef.current,
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [disableTimer])

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={200}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'transparent',
            border: '2px solid #ea80fc',
            borderRadius: 12,
            padding: '18px 28px',
            color: '#f3e5f5',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 320,
            boxShadow: '0 0 24px rgba(234,128,252,0.3), inset 0 0 12px rgba(234,128,252,0.05)',
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 900, color: '#ea80fc', marginBottom: 10, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', textShadow: '0 0 12px rgba(234,128,252,0.6)' }}>
            UNLOADING
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ea80fc', marginBottom: 8, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 18, color: '#ce93d8', marginBottom: 10 }}>
            Yard Utilization: {data.yardUtilizationPercent}%
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 16, color: '#e1bee7' }}>Stacked</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.containersStacked}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#e1bee7' }}>Inspection</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.containersAwaitingInspection}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#e1bee7' }}>Reefer</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.reeferContainersPlugged}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#e1bee7' }}>Handling</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.averageYardHandlingTimeMinutes}m</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 14px',
              background: 'rgba(234,128,252,0.08)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 17, color: '#e1bee7' }}>Containers Received</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#ea80fc' }}>
              {data.containersReceived}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}
