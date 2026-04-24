import { UnloadAnimation } from './UnloadAnimation'

export function Berth5Animation({ onVesselClick }: { onVesselClick?: (vesselGlb: string, berthId: number) => void }) {
  return <UnloadAnimation berthId={5} vesselScale={60} vesselSeed={42} containerSeed={100} onVesselClick={onVesselClick} />
}
