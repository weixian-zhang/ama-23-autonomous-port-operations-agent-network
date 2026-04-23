import { Html } from '@react-three/drei'
import { BERTHS } from '../data/berthData'

export function BerthLabels() {
  return (
    <group>
      {BERTHS.map((berth) => (
        <Html
          key={berth.id}
          position={berth.quay}
          center
          distanceFactor={80}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'sans-serif',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {berth.name}
          </div>
        </Html>
      ))}
    </group>
  )
}
