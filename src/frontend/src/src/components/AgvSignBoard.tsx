import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import agvSignalData from '../data/agv-signal-data.json'

function pickRandom() {
  return agvSignalData[Math.floor(Math.random() * agvSignalData.length)]
}

export function AgvSignBoard({ agvName }: { agvName: string }) {
  const [data, setData] = useState(pickRandom)
  const groupRef = useRef<THREE.Group>(null)
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0])
  const _worldPos = useRef(new THREE.Vector3())

  useEffect(() => {
    setData(pickRandom())
  }, [])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.getWorldPosition(_worldPos.current)
      const x = Math.round(_worldPos.current.x * 10) / 10
      const y = Math.round(_worldPos.current.y * 10) / 10
      const z = Math.round(_worldPos.current.z * 10) / 10
      setPos((prev) => (prev[0] === x && prev[1] === y && prev[2] === z ? prev : [x, y, z]))
    }
  })

  // Randomize speed, RPM, and temperature every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        motion: { ...prev.motion, speedKph: Math.round((5 + Math.random() * 25) * 10) / 10 },
        engine: {
          ...prev.engine,
          rpm: Math.round(800 + Math.random() * 700),
          engineTempC: Math.round(70 + Math.random() * 35),
        },
      }))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const healthColor =
    data.health.overallHealthScore >= 90
      ? '#76ff03'
      : data.health.overallHealthScore >= 70
        ? '#ffea00'
        : '#ff1744'

  const fuelColor =
    data.fuel.dieselLevelPercent >= 50
      ? '#76ff03'
      : data.fuel.dieselLevelPercent >= 20
        ? '#ffea00'
        : '#ff1744'

  return (
    <group ref={groupRef} position={[0, 3.5, 0]}>
      <Html
        center
        distanceFactor={80}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10, 22, 40, 0.85)',
            border: '1px solid #40c4ff',
            borderRadius: 8,
            padding: '6px 10px',
            color: '#e0f7fa',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 140,
            boxShadow: '0 0 10px rgba(64,196,255,0.3)',
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: '#40c4ff', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
            {agvName}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Speed</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.motion.speedKph} km/h</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Fuel</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: fuelColor }}>{data.fuel.dieselLevelPercent}%</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Health</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: healthColor }}>{data.health.overallHealthScore}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>RPM</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.engine.rpm}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Temp</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.engine.engineTempC}°C</div>
            </div>
            {data.health.faultCode && (
              <div>
                <div style={{ fontSize: 7, color: '#ff1744' }}>Fault</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#ff1744' }}>{data.health.faultCode}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
            <div>
              <div style={{ fontSize: 7, color: '#80deea' }}>Location</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>[{pos[0]}, {pos[1]}, {pos[2]}]</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}
