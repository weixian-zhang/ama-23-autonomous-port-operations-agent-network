import { UnloadAnimation } from './UnloadAnimation'

export function Berth2Animation({ onVesselClick }: { onVesselClick?: (vesselGlb: string, berthId: number) => void }) {
  return <UnloadAnimation berthId={2} vesselScale={60} vesselSeed={77} containerSeed={200} onVesselClick={onVesselClick} />
}
