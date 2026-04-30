import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import yardLoadStats from '../data/yard-load-stats.json'

function pickRandom() {
  return yardLoadStats[Math.floor(Math.random() * yardLoadStats.length)]
}

export function YardLoadSignBoard({ position }: { position: [number, number, number] }) {
  const [data, setData] = useState(pickRandom)
  const stagedRef = useRef(data.containersStaged)

  useEffect(() => {
    const d = pickRandom()
    setData(d)
    stagedRef.current = d.containersStaged
  }, [])

  // Decrement containersStaged by 4 every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      stagedRef.current = Math.max(0, stagedRef.current - 4)
      setData((prev) => ({
        ...prev,
        containersStaged: stagedRef.current,
        occupiedSlots: Math.max(0, prev.occupiedSlots - 4),
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const utilizationPct = ((data.occupiedSlots / data.totalSlots) * 100).toFixed(1)

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
            {data.yardZone}
          </div>
          <div style={{ fontSize: 18, color: '#aed581', marginBottom: 10 }}>
            Top Destination: {data.topDestination}
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Utilization</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{utilizationPct}%</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Slots</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.occupiedSlots} / {data.totalSlots}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>In Transit</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.containersInTransit}</div>
            </div>
            <div>
              <div style={{ fontSize: 16, color: '#c5e1a5' }}>Dwell</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{data.avgDwellTimeHours}h</div>
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
              {data.containersStaged}
            </span>
          </div>
        </div>
      </Html>
    </group>
  )
}
