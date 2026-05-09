import { useState, useMemo, useEffect, useRef } from 'react'
import { Modal, Box, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import containerInfoData from '../data/vessel-container-info.json'
import { acquireInputLock } from '../state/inputLock'

const CONTAINER_NAME = /^container_(\d+)_(\d+)_(\d+)$/

// First-person camera tuning. These values are copied verbatim from
// MetaRealm's FirstPersonController so the inspect modal's navigation has
// the exact same feel (look speed, walk speed, smoothing, head bob).
const WALK_SPEED = 4
const LOOK_SPEED_X = 7  // yaw — bumped for snappier left/right turning
const LOOK_SPEED_Y = 8
const HEAD_BOB_SPEED = 6
const HEAD_BOB_HEIGHT = 0.3
const ROTATION_SLERP_FACTOR = 5
const POSITION_LERP_FACTOR = 8

interface ContainerInfo {
  vesselName: string
  containerNumber: string
  status: string
  cargoType: string
  grossWeightKg: number
  shipper: string
  originPort: string
  destinationPort: string
}

/** Deterministic hash from container key → stable index into the info array */
function hashKey(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(31, h) + key.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

interface HoveredContainer {
  row: number
  col: number
  tier: number
  position: THREE.Vector3
  info: ContainerInfo
}

/**
 * First-person controller for the vessel-inspect modal. Behaviour mirrors
 * MetaRealm's FirstPersonController exactly:
 *   - right-mouse drag rotates yaw/pitch (pitch clamped to ±π/3)
 *   - WASD walks; W/S follow the full camera direction (incl. pitch),
 *     A/D strafe on the XZ plane (yaw-only)
 *   - scroll wheel adjusts target height (floor at y=3)
 *   - rotation is slerp-smoothed, position is lerp-smoothed, plus head bob
 *
 * Mouse and wheel listeners attach to the canvas (so they don't fight
 * MetaRealm's canvas behind the modal). Key listeners attach to `window`
 * so a key release is never missed; MetaRealm's own key listener bails on
 * `isInputLocked()`, which is held by the modal while open.
 */
function VesselFpsController() {
  const { camera, gl } = useThree()

  const keys = useRef<Record<string, boolean>>({})
  const phi = useRef(0)            // yaw (around Y)
  const theta = useRef(0)          // pitch (around X)
  const targetPos = useRef(new THREE.Vector3())
  const headBobTimer = useRef(0)
  const headBobActive = useRef(false)
  const rightMouseDown = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  // Derive initial yaw/pitch from the camera's starting position so the
  // first frame doesn't snap. The vessel scene is recentered on the origin,
  // so use that as the implicit lookAt target.
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
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true }
    const onKeyUp   = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false }
    const clearKeys = () => { keys.current = {} }

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
    window.addEventListener('blur', clearKeys)
    document.addEventListener('visibilitychange', clearKeys)
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('contextmenu', onCtx)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
      document.removeEventListener('visibilitychange', clearKeys)
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', onCtx)
      keys.current = {}
    }
  }, [gl])

  // Pre-allocated math objects (avoids GC in the render loop)
  const _fwd     = useMemo(() => new THREE.Vector3(), [])
  const _left    = useMemo(() => new THREE.Vector3(), [])
  const _qYaw    = useMemo(() => new THREE.Quaternion(), [])
  const _qPitch  = useMemo(() => new THREE.Quaternion(), [])
  const _qTarget = useMemo(() => new THREE.Quaternion(), [])
  const _qCamYaw = useMemo(() => new THREE.Quaternion(), [])
  const _euler   = useMemo(() => new THREE.Euler(), [])
  const _yAxis   = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const _xAxis   = useMemo(() => new THREE.Vector3(1, 0, 0), [])

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

function VesselScene({ vesselGlb }: { vesselGlb: string }) {
  const [hovered, setHovered] = useState<HoveredContainer | null>(null)
  const { camera, gl, scene } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])
  const groupRef = useRef<THREE.Group>(null)

  const vesselGltf = useGLTF(vesselGlb)
  const vesselScene = useMemo(() => vesselGltf.scene.clone(true), [vesselGltf.scene])

  // Bump ?v=... whenever inspect-vessel-container-info.glb is re-exported
  // from Blender to bypass the browser HTTP cache and drei's per-URL useGLTF cache.
  const containerGltf = useGLTF('/blender-asset/inspect-vessel-container-info.glb?v=2026-05-02-randtex')
  const containerScene = useMemo(() => {
    const s = containerGltf.scene.clone(true)
    console.log('[container-glb] dumping all mesh names:')
    s.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        console.log('  mesh:', child.name, 'parent:', child.parent?.name)
      }
    })
    return s
  }, [containerGltf.scene])

  // After geometry is mounted, recenter the group so the combined
  // vessel+containers bounding box centers on the origin (which OrbitControls targets).
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    // Reset any previous offset so we measure the true natural bounds
    g.position.set(0, 0, 0)
    g.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(g)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    g.position.sub(center)
  }, [vesselScene, containerScene])


  useEffect(() => {
    const canvas = gl.domElement
    let logCount = 0
    const handleMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(scene.children, true)
      if (intersects.length > 0 && logCount < 20) {
        logCount++
        console.log('[raycast] hits:', intersects.slice(0, 3).map(h => h.object.name))
      }
      for (const hit of intersects) {
        const match = hit.object.name.match(CONTAINER_NAME)
        if (match) {
          const pos = new THREE.Vector3()
          hit.object.getWorldPosition(pos)
          const key = hit.object.name
          const info = containerInfoData[hashKey(key) % containerInfoData.length] as ContainerInfo
          document.body.style.cursor = 'pointer'
          setHovered({
            row: parseInt(match[1]),
            col: parseInt(match[2]),
            tier: parseInt(match[3]),
            position: pos,
            info,
          })
          return
        }
      }
      document.body.style.cursor = 'auto'
      setHovered(null)
    }
    canvas.addEventListener('pointermove', handleMove)
    return () => {
      canvas.removeEventListener('pointermove', handleMove)
      document.body.style.cursor = 'auto'
    }
  }, [camera, gl, scene, raycaster, mouse])

  return (
    <>
      <group ref={groupRef}>
        <primitive object={vesselScene} scale={30} />
        <primitive object={containerScene} scale={30} />
      </group>
      {hovered && (
        <Html
          position={[hovered.position.x, hovered.position.y + 2, hovered.position.z]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              color: '#fff',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              whiteSpace: 'nowrap',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
              {hovered.info.containerNumber}
            </div>
            <div>Bay {hovered.row} · Row {hovered.col} · Tier {hovered.tier}</div>
            <table style={{ marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 4, borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(hovered.info).map(([key, value]) => (
                  <tr key={key}>
                    <td style={{ opacity: 0.6, paddingRight: 8, verticalAlign: 'top' }}>{key}</td>
                    <td>{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Html>
      )}
    </>
  )
}

export interface VesselInspectInfo {
  vesselGlb: string
  berthId: number
}

interface VesselInspectModalProps {
  open: boolean
  info: VesselInspectInfo | null
  onClose: () => void
}

export function VesselInspectModal({ open, info, onClose }: VesselInspectModalProps) {
  // Take the input lock for as long as the modal is open so MetaRealm's
  // window-level WSAD listener stops moving the background camera.
  useEffect(() => {
    if (!open) return
    const release = acquireInputLock()
    return release
  }, [open])

  if (!info) return null

  return (
    <Modal open={open} onClose={onClose} sx={{ zIndex: 50000 }}>
      <Box
        sx={{
          position: 'absolute',
          top: '5%',
          left: '5%',
          width: '90%',
          height: '90%',
          bgcolor: '#1e1e1e',
          borderRadius: 2,
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 1.5,
            height: 32,
            bgcolor: '#2a2a2a',
          }}
        >
          <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1 }}>
            Vessel at Berth {info.berthId} &nbsp;·&nbsp;
            <span style={{ opacity: 0.6, fontWeight: 400 }}>
              right-click drag to look · WASD to move · scroll to adjust height
            </span>
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: '#fff', p: 0.25 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ width: '100%', height: 'calc(100% - 32px)' }}>
          <Canvas camera={{ position: [33, 35, 0], fov: 50 }} style={{ background: '#ffffff' }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 30, 15]} intensity={1} />
            <Suspense fallback={null}>
              <VesselScene vesselGlb={info.vesselGlb} />
            </Suspense>
            <VesselFpsController />
          </Canvas>
        </Box>
      </Box>
    </Modal>
  )
}
