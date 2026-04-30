import { useState, useMemo, useCallback } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { PORT_ZONES, getYardCellPosition } from '../data/portZoneData'
import containerData from '../data/vessel-container-info.json'

const CONTAINER_COUNT = 50 // matches INITIAL_CONTAINERS in LoadAnimation
const CELL_SIZE: [number, number, number] = [13, 3, 12] // hit-box per cell
const YARD_ROTATION = Math.PI / 2

function pickRandom() {
  return containerData[Math.floor(Math.random() * containerData.length)]
}

function ContainerHitbox({
  position,
  onHover,
  onUnhover,
  id,
}: {
  position: [number, number, number]
  onHover: (id: string, pos: [number, number, number]) => void
  onUnhover: () => void
  id: string
}) {
  return (
    <mesh
      position={position}
      rotation={[0, YARD_ROTATION, 0]}
      onPointerEnter={(e) => {
        e.stopPropagation()
        onHover(id, position)
      }}
      onPointerLeave={onUnhover}
    >
      <boxGeometry args={CELL_SIZE} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

export function YardContainerTooltips() {
  const [hovered, setHovered] = useState<{
    id: string
    position: [number, number, number]
    data: (typeof containerData)[0]
  } | null>(null)

  const cells = useMemo(() => {
    const result: { id: string; position: [number, number, number] }[] = []
    for (const zone of PORT_ZONES) {
      // Yard 3 has no containers (different animation)
      if (zone.id === 3) continue
      const { rows, cols } = zone.yardGrid
      for (let i = 0; i < CONTAINER_COUNT; i++) {
        const cellIdx = i % (rows * cols)
        const tier = Math.floor(i / (rows * cols))
        const row = cellIdx % rows
        const col = Math.floor(cellIdx / rows)
        const pos = getYardCellPosition(zone.yardGrid, row, col, tier)
        result.push({
          id: `yard-${zone.id}-${row}-${col}-${tier}`,
          position: [pos[0], pos[1] + 2, pos[2]],
        })
      }
    }
    return result
  }, [])

  const onHover = useCallback((id: string, pos: [number, number, number]) => {
    setHovered({ id, position: pos, data: pickRandom() })
  }, [])

  const onUnhover = useCallback(() => {
    setHovered(null)
  }, [])

  return (
    <group>
      {cells.map((cell) => (
        <ContainerHitbox
          key={cell.id}
          id={cell.id}
          position={cell.position}
          onHover={onHover}
          onUnhover={onUnhover}
        />
      ))}
      {hovered && (
        <group position={[hovered.position[0], hovered.position[1] + 12, hovered.position[2]]}>
          <Html center distanceFactor={120} style={{ pointerEvents: 'none' }}>
            <div
              style={{
                background: 'transparent',
                border: '2px solid #ff1744',
                borderRadius: 10,
                padding: '14px 20px',
                color: '#e0f7fa',
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                minWidth: 260,
                boxShadow: '0 0 16px rgba(255,23,68,0.4), inset 0 0 12px rgba(255,23,68,0.05)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: '#40c4ff', marginBottom: 6, letterSpacing: 1 }}>
                {hovered.data.containerNumber}
              </div>
              <div style={{ fontSize: 11, color: '#80deea', marginBottom: 8 }}>
                {hovered.data.vesselName} &middot; {hovered.data.status}
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#4dd0e1' }}>Cargo</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{hovered.data.cargoType}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#4dd0e1' }}>Weight</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{(hovered.data.grossWeightKg / 1000).toFixed(1)}t</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#4dd0e1' }}>Origin</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{hovered.data.originPort}</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#4dd0e1' }}>Destination</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{hovered.data.destinationPort}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: '#b0bec5' }}>
                Shipper: {hovered.data.shipper}
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
