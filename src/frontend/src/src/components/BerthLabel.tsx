import { Html } from '@react-three/drei'

export function BerthLabel({ position, label }: { position: [number, number, number]; label: string }) {
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
            padding: '8px 24px',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: 30,
            fontWeight: 800,
            color: '#00e5ff',
            letterSpacing: 3,
            textTransform: 'uppercase',
            textShadow: '0 0 12px rgba(0,229,255,0.6), 0 0 24px rgba(0,229,255,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}
