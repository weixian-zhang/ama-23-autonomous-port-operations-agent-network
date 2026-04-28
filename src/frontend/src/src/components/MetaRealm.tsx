import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { FirstPersonControls } from '@react-three/drei'
import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { PortTerrain } from './PortTerrain'
import { Agv } from './Agv'
import { BerthLocations } from './BerthLocations'
import { YardLocations } from './YardLocations'
import { Cranes } from './Cranes'
import { Stackers } from './Stackers'
import { Berth5Animation } from './Berth5Animation'
import { Berth2Animation } from './Berth2Animation'
import { Berth4Animation } from './Berth4Animation'
import { Berth1Animation } from './Berth1Animation'
import { Berth3Animation } from './Berth3Animation'
import { OperatorNPCYard_5_1_Route_Animation } from './OperatorNPCYard_5_1_Route_Animation'
import { OperatorNPC } from './OperatorNPC'
import { AgvOwnershipProvider } from '../context/AgvOwnershipContext'
import type { VesselLateAnimationHandle } from './VesselLateAnimation'

const IDLE_TIMEOUT_MS = 150

function IdleMouseGuard({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onMove = () => {
      if (controlsRef.current) controlsRef.current.lookSpeed = 0.07
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (controlsRef.current) controlsRef.current.lookSpeed = 0
      }, IDLE_TIMEOUT_MS)
    }

    window.addEventListener('mousemove', onMove)
    // Start with look disabled until the mouse moves
    if (controlsRef.current) controlsRef.current.lookSpeed = 0

    return () => {
      window.removeEventListener('mousemove', onMove)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [controlsRef])

  return null
}

function InitialCameraView() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(-300, 250, 0)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

interface MetaRealmProps {
  onVesselClick?: (vesselGlb: string, berthId: number) => void
  vesselLateHandleRef?: React.MutableRefObject<VesselLateAnimationHandle | null>
}

export function MetaRealm({ onVesselClick, vesselLateHandleRef }: MetaRealmProps) {
  const controlsRef = useRef<any>(null)
  return (
    <Canvas camera={{ position: [-300, 250, 70], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Suspense fallback={null}>
        <AgvOwnershipProvider>
          <group>
            <PortTerrain />
            <Agv />
            <BerthLocations />
            <YardLocations />
            <Cranes />
            <Stackers />
            <Berth5Animation onVesselClick={onVesselClick} />
            <Berth2Animation onVesselClick={onVesselClick} />
            <Berth4Animation onVesselClick={onVesselClick} />
            <Berth1Animation onVesselClick={onVesselClick} />
            <Berth3Animation onVesselClick={onVesselClick} handleRef={vesselLateHandleRef} />
          </group>
        </AgvOwnershipProvider>
      </Suspense>
      <FirstPersonControls ref={controlsRef} movementSpeed={70} lookSpeed={0.07} />
      <IdleMouseGuard controlsRef={controlsRef} />
      <InitialCameraView />
    </Canvas>
  )
}
