import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Cloud, Clouds, Sky } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
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
import { BerthSignBoard } from './BerthSignBoard'
import { BerthUnloadSignBoard } from './BerthUnloadSignBoard'
import { YardLoadSignBoard } from './YardLoadSignBoard'
import { YardUnloadSignBoard } from './YardUnloadSignBoard'
import { YardLabel } from './YardLabel'
import { BerthLabel } from './BerthLabel'
import { YardBoundaries } from './YardBoundaries'
import { YardContainerTooltips } from './YardContainerTooltips'
import { PortLogo } from './PortLogo'
import { PortNpcs } from './PortNpcs'
import { StagnantVesselBands } from './StagnantVessels'
import { AgvOwnershipProvider } from '../context/AgvOwnershipContext'
import type { VesselLateAnimationHandle } from './VesselLateAnimation'
import { isInputLocked, subscribeInputLock } from '../state/inputLock'

// --- Sky / sun constants ---
// Sunny afternoon: sun ~40° above horizon, slightly behind/over the city (WSW).
// Same vector drives the procedural sky and the directional sun light so the
// scene's highlights line up with the visible sun in the sky.
const SUN_ELEVATION_DEG = 40
const SUN_AZIMUTH_DEG = 135
const SUN_DISTANCE = 600 // how far away the directional light source sits
// Procedural sky radius. Must be inside the camera's far plane (8000), and
// comfortably outside the cloud field (CLOUD_SPREAD ~1.8k, height ~520).
const SKY_DISTANCE = 6000

// --- Cloud field constants ---
// Scattered fair-weather cumulus high above the port. Deterministic seed so
// they don't rearrange between renders.
const CLOUD_COUNT = 36
const CLOUD_HEIGHT = 520
const CLOUD_SPREAD_X = 1800
const CLOUD_SPREAD_Z = 1800

// Tiny seeded RNG so the cloud layout is stable across reloads.
function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// --- First-person camera constants ---
const WALK_SPEED = 40
const LOOK_SPEED_X = 4
const LOOK_SPEED_Y = 3
const HEAD_BOB_SPEED = 12
const HEAD_BOB_HEIGHT = 0.3
const ROTATION_SLERP_FACTOR = 5
const POSITION_LERP_FACTOR = 8

/**
 * FPS-style controller: right-click drag to look, WASD to move,
 * scroll wheel to adjust height. Left-click remains free for scene interaction.
 */
function FirstPersonController() {
  const { camera, gl } = useThree()

  const keys = useRef<Record<string, boolean>>({})
  const phi = useRef(0)           // yaw (around Y)
  const theta = useRef(0)         // pitch (around X)
  const targetPos = useRef(new THREE.Vector3())
  const headBobTimer = useRef(0)
  const headBobActive = useRef(false)
  const rightMouseDown = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  // Derive initial yaw/pitch so the camera keeps its lookAt(0,0,0) direction
  useEffect(() => {
    targetPos.current.copy(camera.position)
    const dir = new THREE.Vector3(0, 0, 0).sub(camera.position).normalize()
    phi.current = Math.atan2(-dir.x, -dir.z)
    const xzLen = Math.sqrt(dir.x * dir.x + dir.z * dir.z)
    theta.current = THREE.MathUtils.clamp(
      Math.atan2(dir.y, xzLen), -Math.PI / 3, Math.PI / 3,
    )
  }, [camera])

  // Input listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputLocked()) return
      keys.current[e.key.toLowerCase()] = true
    }
    const onKeyUp   = (e: KeyboardEvent) => {
      if (isInputLocked()) return
      keys.current[e.key.toLowerCase()] = false
    }

    // Whenever a foreground consumer (e.g. an inspect modal) takes the lock,
    // immediately release any keys we still believe to be held so the camera
    // doesn't keep coasting in the background.
    const unsubscribeLock = subscribeInputLock(() => {
      if (isInputLocked()) keys.current = {}
    })

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        rightMouseDown.current = true
        prevMouse.current = { x: e.clientX, y: e.clientY }
      }
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) rightMouseDown.current = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!rightMouseDown.current) return
      const dx = e.clientX - prevMouse.current.x
      const dy = e.clientY - prevMouse.current.y
      prevMouse.current = { x: e.clientX, y: e.clientY }
      phi.current   -= (dx / window.innerWidth)  * LOOK_SPEED_X
      theta.current  = THREE.MathUtils.clamp(
        theta.current - (dy / window.innerHeight) * LOOK_SPEED_Y,
        -Math.PI / 3, Math.PI / 3,
      )
    }
    const onWheel = (e: WheelEvent) => {
      targetPos.current.y -= e.deltaY * 0.1
      if (targetPos.current.y < 3) targetPos.current.y = 3
    }
    const onCtx = (e: Event) => e.preventDefault()

    const el = gl.domElement
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('contextmenu', onCtx)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onCtx)
      unsubscribeLock()
    }
  }, [gl])

  // Pre-allocated math objects (avoids GC in the render loop)
  const _fwd    = new THREE.Vector3()
  const _left   = new THREE.Vector3()
  const _qYaw   = new THREE.Quaternion()
  const _qPitch = new THREE.Quaternion()
  const _qTarget = new THREE.Quaternion()
  const _qCamYaw = new THREE.Quaternion()
  const _euler  = new THREE.Euler()
  const _yAxis  = new THREE.Vector3(0, 1, 0)
  const _xAxis  = new THREE.Vector3(1, 0, 0)

  useFrame((_, delta) => {
    // --- Slerp-smoothed rotation ---
    _qYaw.setFromAxisAngle(_yAxis, phi.current)
    _qPitch.setFromAxisAngle(_xAxis, theta.current)
    _qTarget.copy(_qYaw).multiply(_qPitch)
    const rt = 1.0 - Math.pow(0.01, ROTATION_SLERP_FACTOR * delta)
    camera.quaternion.slerp(_qTarget, rt)

    // --- WASD translation: derive direction from camera's actual quaternion ---
    const fwd    = (keys.current['w'] ? 1 : 0) + (keys.current['s'] ? -1 : 0)
    const strafe = (keys.current['a'] ? 1 : 0) + (keys.current['d'] ? -1 : 0)

    // Forward/back follows the full camera direction (including pitch)
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize().multiplyScalar(fwd * delta * WALK_SPEED)

    // Strafe stays on XZ plane (yaw-only)
    _euler.setFromQuaternion(camera.quaternion, 'YXZ')
    _qCamYaw.setFromAxisAngle(_yAxis, _euler.y)
    _left.set(-1, 0, 0).applyQuaternion(_qCamYaw).multiplyScalar(strafe * delta * WALK_SPEED)
    targetPos.current.add(_fwd).add(_left)

    // --- Lerp-smoothed position ---
    const pt = 1.0 - Math.pow(0.01, POSITION_LERP_FACTOR * delta)
    camera.position.lerp(targetPos.current, pt)

    // --- Head bob ---
    const isMoving = fwd !== 0 || strafe !== 0
    if (isMoving) {
      headBobActive.current = true
      headBobTimer.current += delta
      camera.position.y += Math.sin(headBobTimer.current * HEAD_BOB_SPEED) * HEAD_BOB_HEIGHT
    } else if (headBobActive.current) {
      headBobTimer.current = 0
      headBobActive.current = false
    }
  })

  return null
}

interface MetaRealmProps {
  onVesselClick?: (vesselGlb: string, berthId: number) => void
  vesselLateHandleRef?: React.MutableRefObject<VesselLateAnimationHandle | null>
}

export function MetaRealm({ onVesselClick, vesselLateHandleRef }: MetaRealmProps) {
  // Compute the sun position once. Spherical -> cartesian: y is up.
  const sunPosition = useMemo(() => {
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG)
    const theta = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG)
    return new THREE.Vector3().setFromSphericalCoords(1, phi, theta)
  }, [])

  // Place the directional light along the sun vector, far enough out to read as "sunlight".
  const sunLightPos = useMemo(
    () => sunPosition.clone().multiplyScalar(SUN_DISTANCE).toArray() as [number, number, number],
    [sunPosition],
  )

  // Pre-compute a stable cloud layout (seeded). Each cloud gets its own jittered
  // position, scale, rotation, and density so the field reads as natural.
  const cloudInstances = useMemo(() => {
    const rand = mulberry32(8675309)
    return Array.from({ length: CLOUD_COUNT }, (_, i) => ({
      key: i,
      position: [
        (rand() - 0.5) * CLOUD_SPREAD_X,
        CLOUD_HEIGHT + (rand() - 0.5) * 60,
        (rand() - 0.5) * CLOUD_SPREAD_Z,
      ] as [number, number, number],
      scale: 1 + rand() * 1.5,
      rotationY: rand() * Math.PI * 2,
      seed: Math.floor(rand() * 1000),
      bounds: [80 + rand() * 40, 12 + rand() * 8, 80 + rand() * 40] as [number, number, number],
      volume: 50 + rand() * 30,
      opacity: 0.7 + rand() * 0.25,
    }))
  }, [])

  return (
    <Canvas
      // The baked SkyDome mesh has been removed from the GLB; the sky is now
      // a procedural Drei <Sky> at SKY_DISTANCE units from the camera. far is
      // set just past that so the sky is never clipped, and near=1 keeps the
      // depth buffer well-balanced for the rest of the scene.
      camera={{ position: [-300, 250, 70], fov: 60, near: 1, far: 8000 }}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }}
    >
      {/* --- Bright sunny-afternoon sky ---
          Drei <Sky> wraps three's atmospheric scattering shader. The sun is
          placed at the same direction as the directionalLight below so the
          highlights on cranes/containers line up with the visible sun. */}
      <Sky
        distance={SKY_DISTANCE}
        sunPosition={sunPosition.toArray()}
        turbidity={6}            /* haze: 1 = ultra clear, 10 = hazy. 6 = sunny afternoon */
        rayleigh={2.4}           /* atmospheric scattering: higher = more vivid blue */
        mieCoefficient={0.005}   /* particles in the air */
        mieDirectionalG={0.8}    /* sun glow / forward scattering */
      />
      {/* --- Fair-weather cumulus clouds ---
          Drei <Clouds> batches all <Cloud> instances into one mesh for cheap render. */}
      <Clouds material={THREE.MeshBasicMaterial} limit={400} range={400}>
        {cloudInstances.map((c) => (
          <Cloud
            key={c.key}
            seed={c.seed}
            position={c.position}
            rotation={[0, c.rotationY, 0]}
            scale={c.scale}
            bounds={c.bounds}
            volume={c.volume}
            opacity={c.opacity}
            growth={4}
            speed={0.06}
            color="#ffffff"
          />
        ))}
      </Clouds>
      {/* --- Lighting matched to the visible sun --- */}
      {/* Warm sky fill from above, cool bounce from the ground */}
      <hemisphereLight args={['#cfe5ff', '#b08a5a', 0.9]} />
      {/* Soft ambient so shadowed areas don't go pitch black */}
      <ambientLight intensity={0.4} />
      {/* The sun: positioned along the same vector as the visible sun */}
      <directionalLight
        position={sunLightPos}
        intensity={3.2}
        color="#fff1d6"
      />
      <Suspense fallback={null}>
        <AgvOwnershipProvider>
          <group>
            <PortTerrain />
            <Agv />
            <BerthLocations />
            <YardLocations />
            <YardBoundaries />
            <YardContainerTooltips />
            <Cranes />
            <Stackers />
            <PortNpcs />
            {/* Idle vessels — scattered messily across the sea, with a small
                minimum distance between each so they never overlap. */}
            <StagnantVesselBands
              globalMinDistance={180}
              bands={[
                {
                  count: 63,
                  seed: 4242,
                  bounds: { xMin: -380.8, xMax: -108.8, zMin: -1100, zMax: 1100 },
                  minDistance: 180,
                },
              ]}
            />
            <Berth5Animation onVesselClick={onVesselClick} />
            <Berth2Animation onVesselClick={onVesselClick} />
            <Berth4Animation onVesselClick={onVesselClick} />
            <Berth1Animation onVesselClick={onVesselClick} />
            <Berth3Animation onVesselClick={onVesselClick} handleRef={vesselLateHandleRef} />
            {/* Digital sign boards above Berth 1 and Berth 4 */}
            <BerthSignBoard position={[-43, 83, 480]} />
            <BerthSignBoard position={[-43, 83, -240]} />
            {/* Digital unload sign boards above Berth 2 and Berth 5 */}
            <BerthUnloadSignBoard position={[-43, 83, 240]} />
            <BerthUnloadSignBoard position={[-43, 83, -480]} />
            {/* Digital unload sign board for Berth 3 (static) */}
            <BerthUnloadSignBoard position={[-43, 83, 0]} disableTimer />
            {/* Digital yard load sign boards above Yard 1 and Yard 4 */}
            <YardLoadSignBoard position={[70, 72, 480]} />
            <YardLoadSignBoard position={[70, 72, -240]} />
            {/* Digital yard unload sign boards above Yard 2 and Yard 5 */}
            <YardUnloadSignBoard position={[70, 72, 240]} />
            <YardUnloadSignBoard position={[70, 72, -480]} />
            {/* Yard labels above sign boards */}
            <YardLabel position={[70, 116, 480]} label="Yard 1" />
            <YardLabel position={[70, 116, 240]} label="Yard 2" />
            <YardLabel position={[70, 116, 0]} label="Yard 3" />
            <YardLabel position={[70, 116, -240]} label="Yard 4" />
            <YardLabel position={[70, 116, -480]} label="Yard 5" />
            {/* Berth labels above sign boards */}
            <BerthLabel position={[-43, 128, 480]} label="Berth 1" />
            <BerthLabel position={[-43, 128, 240]} label="Berth 2" />
            <BerthLabel position={[-43, 134.4, 0]} label="Berth 3" />
            <BerthLabel position={[-43, 128, -240]} label="Berth 4" />
            <BerthLabel position={[-43, 128, -480]} label="Berth 5" />
            {/* Logo high above port */}
            <PortLogo
              position={[20, 260, 0]}
              src="/salacia-goddess.png?v=2026-05-09"
              width={180}
              height={180}
            />
            <PortLogo position={[20, 160, 0]} src="/blender-asset/salacia-logo-metarealm.png" width={120} height={40} />
          </group>
        </AgvOwnershipProvider>
      </Suspense>
      <FirstPersonController />
    </Canvas>
  )
}
