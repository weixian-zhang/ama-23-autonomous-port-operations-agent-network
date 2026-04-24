import { useState, useMemo, useEffect } from 'react'
import { Modal, Box, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'
import containerInfoData from '../data/vessel-container-info.json'

const CONTAINER_NAME = /^container_(\d+)_(\d+)_(\d+)$/

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

function VesselScene({ vesselGlb }: { vesselGlb: string }) {
  const [hovered, setHovered] = useState<HoveredContainer | null>(null)
  const { camera, gl, scene } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouse = useMemo(() => new THREE.Vector2(), [])

  const vesselGltf = useGLTF(vesselGlb)
  const vesselScene = useMemo(() => vesselGltf.scene.clone(true), [vesselGltf.scene])

  const containerGltf = useGLTF('/blender-asset/inspect-vessel-container-info.glb')
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
    <group>
      <primitive object={vesselScene} scale={30} />
      <primitive object={containerScene} scale={30} />
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
    </group>
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
  if (!info) return null

  return (
    <Modal open={open} onClose={onClose}>
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
            px: 2,
            py: 1,
            bgcolor: '#2a2a2a',
          }}
        >
          <Typography variant="h6" sx={{ color: '#fff' }}>
            Vessel at Berth {info.berthId}
          </Typography>
          <IconButton onClick={onClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ width: '100%', height: 'calc(100% - 48px)' }}>
          <Canvas camera={{ position: [0, 35, 55], fov: 50 }} style={{ background: '#ffffff' }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 30, 15]} intensity={1} />
            <Suspense fallback={null}>
              <VesselScene vesselGlb={info.vesselGlb} />
            </Suspense>
            <OrbitControls />
          </Canvas>
        </Box>
      </Box>
    </Modal>
  )
}
