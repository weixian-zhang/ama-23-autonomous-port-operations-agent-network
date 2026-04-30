import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import berthUnloadStats from '../data/berth-unload-stats.json'

function pickRandom() {
  return berthUnloadStats[Math.floor(Math.random() * berthUnloadStats.length)]
}

export function BerthUnloadSignBoard({ position, disableTimer }: { position: [number, number, number]; disableTimer?: boolean }) {
  const [data, setData] = useState(pickRandom)
  const containersRef = useRef(data.totalContainersUnloaded)

  useEffect(() => {
    const d = pickRandom()
    setData(d)
    containersRef.current = d.totalContainersUnloaded
  }, [])

  const originalRef = useRef(data.totalContainersUnloaded)

  useEffect(() => {
    if (disableTimer) return
    const interval = setInterval(() => {
      containersRef.current = containersRef.current - 4
      if (containersRef.current <= 0) {
        containersRef.current = originalRef.current
      }
      setData((prev) => ({ ...prev, totalContainersUnloaded: containersRef.current }))
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
            border: '2px solid #ff9100',
            borderRadius: 12,
            padding: '18px 28px',
            color: '#fff3e0',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 320,
            boxShadow: '0 0 24px rgba(255,145,0,0.3), inset 0 0 12px rgba(255,145,0,0.05)',
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 900, color: '#ff9100', marginBottom: 10, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', textShadow: '0 0 12px rgba(255,145,0,0.6)' }}>
            UNLOADING
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9100', marginBottom: 8, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 18, color: '#ffcc80', marginBottom: 10 }}>
            {data.berthAssigned} &middot; {data.vesselType}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 16, color: '#ffab40' }}>Arrival</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.arrivalTime}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#ffab40' }}>Unloading</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.startUnloading} – {data.endUnloading}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#ffab40' }}>Duration</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.unloadingDurationHours}h</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 14px',
              background: 'rgba(255,145,0,0.08)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 17, color: '#ffab40' }}>Containers Remaining</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#ff9100' }}>
              {data.totalContainersUnloaded}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}
