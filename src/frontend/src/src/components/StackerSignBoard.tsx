import { Html } from '@react-three/drei'
import { useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import stackerSignalData from '../data/stacker-signal-data.json'

function pickRandom() {
  return stackerSignalData[Math.floor(Math.random() * stackerSignalData.length)]
}

export function StackerSignBoard({ stackerName }: { stackerName: string }) {
  const [data, setData] = useState(pickRandom)
  const groupRef = useRef<THREE.Group>(null)
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0])

  useEffect(() => {
    setData(pickRandom())
  }, [])

  // Stackers are stationary in this scene — read the world position once
  // after mount instead of every frame. Previously this ran inside useFrame
  // for all 16 stackers (16 getWorldPosition() calls / render frame) just
  // to display a value that never changes.
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    const wp = new THREE.Vector3()
    g.getWorldPosition(wp)
    setPos([
      Math.round(wp.x * 10) / 10,
      Math.round(wp.y * 10) / 10,
      Math.round(wp.z * 10) / 10,
    ])
  }, [])

  // Randomize speed, RPM, temperature and load height every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        motion: {
          ...prev.motion,
          speedKph: Math.round((3 + Math.random() * 15) * 10) / 10,
          loadHeightMeters: Math.round(Math.random() * 12 * 10) / 10,
        },
        engine: {
          ...prev.engine,
          rpm: Math.round(1000 + Math.random() * 600),
          engineTempC: Math.round(75 + Math.random() * 30),
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
    <group ref={groupRef} position={[0, 18, 0]}>
      <Html
        center
        distanceFactor={140}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(10, 22, 40, 0.45)',
            border: '1px solid #ff9100',
            borderRadius: 8,
            padding: '6px 10px',
            color: '#fff3e0',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            minWidth: 140,
            boxShadow: '0 0 10px rgba(255,145,0,0.3)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, color: '#ffab40', marginBottom: 2, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' }}>
            STACKER
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#ff9100', marginBottom: 4, letterSpacing: 1, textTransform: 'uppercase' }}>
            {stackerName}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
            <div>
              <div style={{ fontSize: 7, color: '#ffcc80' }}>Speed</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.motion.speedKph} km/h</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ffcc80' }}>Fuel</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: fuelColor }}>{data.fuel.dieselLevelPercent}%</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ffcc80' }}>Health</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: healthColor }}>{data.health.overallHealthScore}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <div style={{ fontSize: 7, color: '#ffcc80' }}>RPM</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.engine.rpm}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ffcc80' }}>Temp</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.engine.engineTempC}°C</div>
            </div>
            <div>
              <div style={{ fontSize: 7, color: '#ffcc80' }}>Lift</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>{data.motion.loadHeightMeters}m</div>
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
              <div style={{ fontSize: 7, color: '#ffcc80' }}>Location</div>
              <div style={{ fontSize: 10, fontWeight: 600 }}>[{pos[0]}, {pos[1]}, {pos[2]}]</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}
