import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import berthLoadStats from '../data/berth-load-stats.json'

function pickRandom() {
  return berthLoadStats[Math.floor(Math.random() * berthLoadStats.length)]
}

export function BerthSignBoard({ position }: { position: [number, number, number] }) {
  const [data, setData] = useState(pickRandom)
  const containersRef = useRef(data.totalContainersLoaded)

  // Pick new random vessel on mount
  useEffect(() => {
    const d = pickRandom()
    setData(d)
    containersRef.current = d.totalContainersLoaded
  }, [])

  // Decrement totalContainersLoaded by 4 every 5 seconds, reset to original on 0
  const originalRef = useRef(data.totalContainersLoaded)

  useEffect(() => {
    const interval = setInterval(() => {
      containersRef.current = containersRef.current - 4
      if (containersRef.current <= 0) {
        containersRef.current = originalRef.current
      }
      setData((prev) => ({ ...prev, totalContainersLoaded: containersRef.current }))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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
            border: '2px solid #00e5ff',
            borderRadius: 12,
            padding: '18px 28px',
            color: '#e0f7fa',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 320,
            boxShadow: '0 0 24px rgba(0,229,255,0.3), inset 0 0 12px rgba(0,229,255,0.05)',
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 900, color: '#00e5ff', marginBottom: 10, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center', textShadow: '0 0 12px rgba(0,229,255,0.6)' }}>
            LOADING
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00e5ff', marginBottom: 8, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 18, color: '#80cbc4', marginBottom: 10 }}>
            {data.berthAssigned} &middot; {data.vesselType}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 16, color: '#4dd0e1' }}>Arrival</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.arrivalTime}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#4dd0e1' }}>Loading</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.startLoading} – {data.endLoading}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#4dd0e1' }}>Duration</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.loadingDurationHours}h</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 14px',
              background: 'rgba(0,229,255,0.08)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 17, color: '#4dd0e1' }}>Containers Remaining</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#00e5ff' }}>
              {data.totalContainersLoaded}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}
