import { VesselLateAnimation } from './VesselLateAnimation'
import type { VesselLateAnimationHandle } from './VesselLateAnimation'

interface Berth3AnimationProps {
  onVesselClick?: (vesselGlb: string, berthId: number) => void
  handleRef?: React.MutableRefObject<VesselLateAnimationHandle | null>
}

export function Berth3Animation({ onVesselClick, handleRef }: Berth3AnimationProps) {
  return (
    <VesselLateAnimation
      berthId={3}
      vesselScale={60}
      vesselSeed={99}
      containerSeed={500}
      onVesselClick={onVesselClick}
      handleRef={handleRef}
    />
  )
}

