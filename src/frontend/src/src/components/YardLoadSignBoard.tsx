import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import yardLoadStats from '../data/yard-load-stats.json'

function pickRandom() {
  return yardLoadStats[Math.floor(Math.random() * yardLoadStats.length)]
}

export function YardLoadSignBoard({ position }: { position: [number, number, number] }) {
  const [data, setData] = useState(pickRandom)
  const preparedRef = useRef(data.containersPrepared)

  const originalPreparedRef = useRef(data.containersPrepared)

  useEffect(() => {
    const d = pickRandom()
    setData(d)
    preparedRef.current = d.containersPrepared
    originalPreparedRef.current = d.containersPrepared
  }, [])

  // Decrement containersPrepared by 4 every 5 seconds, reset to original on 0
  useEffect(() => {
    const interval = setInterval(() => {
      preparedRef.current = preparedRef.current - 4
      if (preparedRef.current <= 0) {
        preparedRef.current = originalPreparedRef.current
      }
      setData((prev) => ({
        ...prev,
        containersPrepared: preparedRef.current,
      }))
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
            border: '2px solid #76ff03',
            borderRadius: 12,
            padding: '18px 28px',
            color: '#f1f8e9',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 320,
            boxShadow: '0 0 24px rgba(118,255,3,0.3), inset 0 0 12px rgba(118,255,3,0.05)',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: '#76ff03', marginBottom: 8, letterSpacing: 1 }}>
            {data.vesselName}
          </div>
          <div style={{ fontSize: 18, color: '#aed581', marginBottom: 10 }}>
            Utilization: {data.yardUtilizationPercent}%
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Loaded</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.containersLoadedToVessel}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Waiting</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.containersWaitingInYard}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Reefer</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.reeferContainersStaged}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Handling</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.averageYardHandlingTimeMinutes}m</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              padding: '8px 14px',
              background: 'rgba(118,255,3,0.08)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 17, color: '#c5e1a5' }}>Containers Staged</span>
            <span style={{ fontSize: 34, fontWeight: 800, color: '#76ff03' }}>
              {data.containersPrepared}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}
