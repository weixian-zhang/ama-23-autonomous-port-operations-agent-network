import { BERTHS } from '../data/berthData'

export function BerthLocations() {
  return (
    <group>
      {BERTHS.map((berth) => (
        <group key={berth.id} position={berth.quay} name={`berth-${berth.id}`} />
      ))}
    </group>
  )
}
