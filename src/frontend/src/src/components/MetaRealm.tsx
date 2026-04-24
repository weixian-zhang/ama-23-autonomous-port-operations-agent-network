import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import { Suspense, useEffect, useRef, useCallback } from 'react'
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
import { OperatorNPCYard_5_1_Route_Animation } from './OperatorNPCYard_5_1_Route_Animation'
import { OperatorNPC } from './OperatorNPC'

function KeyboardMovement({ speed = 45 }: { speed?: number }) {
  const { camera } = useThree()
  const keys = useRef<Set<string>>(new Set())
  const direction = useRef(new THREE.Vector3())
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.code)
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    direction.current.set(0, 0, 0)
    camera.getWorldDirection(forward.current)
    right.current.crossVectors(forward.current, camera.up).normalize()

    if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) direction.current.add(forward.current)
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) direction.current.sub(forward.current)
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) direction.current.sub(right.current)
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) direction.current.add(right.current)
    if (keys.current.has('Space')) direction.current.y += 1
    if (keys.current.has('ShiftLeft') || keys.current.has('ShiftRight')) direction.current.y -= 1

    if (direction.current.lengthSq() > 0) {
      direction.current.normalize()
      camera.position.addScaledVector(direction.current, speed * delta)
    }
  })

  return null
}

function InteractKey({ onVesselClick }: { onVesselClick?: (vesselGlb: string, berthId: number) => void }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code !== 'KeyE') return
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object
      while (obj) {
        if (obj.userData?.type === 'vessel') {
          onVesselClick?.(obj.userData.vesselGlb, obj.userData.berthId)
          return
        }
        obj = obj.parent
      }
    }
  }, [camera, scene, onVesselClick])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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
}

export function MetaRealm({ onVesselClick }: MetaRealmProps) {
  return (
    <Canvas camera={{ position: [-300, 250, 70], fov: 60 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Suspense fallback={null}>
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
        </group>
      </Suspense>
      <PointerLockControls />
      <KeyboardMovement speed={55} />
      <InteractKey onVesselClick={onVesselClick} />
      <InitialCameraView />
    </Canvas>
  )
}
