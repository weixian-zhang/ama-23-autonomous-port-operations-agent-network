import { LoadAnimation } from './LoadAnimation'

export function Berth4Animation({ onVesselClick }: { onVesselClick?: (vesselGlb: string, berthId: number) => void }) {
  return <LoadAnimation berthId={4} vesselScale={60} vesselSeed={55} containerSeed={300} onVesselClick={onVesselClick} />
}
