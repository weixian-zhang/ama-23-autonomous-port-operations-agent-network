import { YARDS } from '../data/yardData'

export function YardLocations() {
  return (
    <group>
      {YARDS.map((yard) => (
        <group key={yard.id} position={yard.center} name={`yard-${yard.id}`} />
      ))}
    </group>
  )
}
