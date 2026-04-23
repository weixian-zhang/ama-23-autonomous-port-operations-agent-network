import { PORT_ZONES } from '../data/portZoneData'

export function BerthLocations() {
  return (
    <group>
      {PORT_ZONES.map((zone) => (
        <group key={zone.id} position={zone.quay} name={`berth-${zone.id}`} />
      ))}
    </group>
  )
}
