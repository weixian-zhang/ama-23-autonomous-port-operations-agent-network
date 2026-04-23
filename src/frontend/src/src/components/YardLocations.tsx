import { PORT_ZONES } from '../data/portZoneData'

export function YardLocations() {
  return (
    <group>
      {PORT_ZONES.map((zone) => (
        <group key={zone.id} position={zone.yard} name={`yard-${zone.id}`} />
      ))}
    </group>
  )
}
