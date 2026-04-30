import { useMemo } from 'react'
import * as THREE from 'three'
import { PORT_ZONES } from '../data/portZoneData'

const PAD = 5
const LINE_Y = 4
const THICKNESS = 0.2 // width of the border strip
const HEIGHT = 0.4   // height of the border strip

const glowMaterial = new THREE.MeshBasicMaterial({
  color: '#ffea00',
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false,
})

function BorderSegment({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const length = Math.sqrt(dx * dx + dz * dz)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[2] + to[2]) / 2
  const angle = Math.atan2(dx, dz)

  return (
    <mesh
      position={[cx, LINE_Y, cz]}
      rotation={[0, angle, 0]}
      material={glowMaterial}
    >
      <boxGeometry args={[THICKNESS, HEIGHT, length]} />
    </mesh>
  )
}

export function YardBoundaries() {
  const boundaries = useMemo(() => {
    return PORT_ZONES.map((zone) => {
      const { origin, rows, cols, cellSize } = zone.yardGrid
      const x0 = origin[0] - PAD
      const x1 = origin[0] + rows * cellSize[0] + PAD
      const z0 = origin[2] - PAD
      const z1 = origin[2] + cols * cellSize[2] + PAD

      const corners: [number, number, number][] = [
        [x0, LINE_Y, z0],
        [x1, LINE_Y, z0],
        [x1, LINE_Y, z1],
        [x0, LINE_Y, z1],
      ]

      const segments: { from: [number, number, number]; to: [number, number, number] }[] = []
      for (let i = 0; i < corners.length; i++) {
        segments.push({ from: corners[i], to: corners[(i + 1) % corners.length] })
      }

      return { id: zone.id, segments }
    })
  }, [])

  return (
    <group>
      {boundaries.map(({ id, segments }) =>
        segments.map((seg, i) => (
          <BorderSegment key={`${id}-${i}`} from={seg.from} to={seg.to} />
        ))
      )}
    </group>
  )
}
