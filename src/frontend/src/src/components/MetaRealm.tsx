import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
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

function InitialCameraView() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(-300, 250, 0)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

export function MetaRealm() {
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
          <Berth5Animation />
          <Berth2Animation />
        </group>
      </Suspense>
      <PointerLockControls />
      <KeyboardMovement speed={55} />
      <InitialCameraView />
    </Canvas>
  )
}
