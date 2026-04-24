import { LoadAnimation } from './LoadAnimation'

export function Berth1Animation({ onVesselClick }: { onVesselClick?: (vesselGlb: string, berthId: number) => void }) {
  return <LoadAnimation berthId={1} vesselScale={60} vesselSeed={33} containerSeed={400} onVesselClick={onVesselClick} />
}
