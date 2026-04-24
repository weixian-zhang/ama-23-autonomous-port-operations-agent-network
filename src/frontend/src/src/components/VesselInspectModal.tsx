import { useState, useMemo, useCallback } from 'react'
import { Modal, Box, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html } from '@react-three/drei'
import { Suspense } from 'react'
import * as THREE from 'three'

const CONTAINER_NAME = /^container_(\d+)_(\d+)_(\d+)$/

interface HoveredContainer {
  row: number
  col: number
  tier: number
  position: THREE.Vector3
}

function VesselScene({ vesselGlb }: { vesselGlb: string }) {
  const [hovered, setHovered] = useState<HoveredContainer | null>(null)

  const vesselGltf = useGLTF(vesselGlb)
  const vesselScene = useMemo(() => vesselGltf.scene.clone(true), [vesselGltf.scene])

  const containerGltf = useGLTF('/blender-asset/vessel-container-info.glb')
  const containerScene = useMemo(() => containerGltf.scene.clone(true), [containerGltf.scene])

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const match = e.object.name.match(CONTAINER_NAME)
    if (match) {
      document.body.style.cursor = 'pointer'
      const pos = new THREE.Vector3()
      e.object.getWorldPosition(pos)
      setHovered({
        row: parseInt(match[1]),
        col: parseInt(match[2]),
        tier: parseInt(match[3]),
        position: pos,
      })
    }
  }, [])

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (CONTAINER_NAME.test(e.object.name)) {
      document.body.style.cursor = 'auto'
      setHovered(null)
    }
  }, [])

  return (
    <group onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
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
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Container</div>
            <div>Row {hovered.row} · Col {hovered.col} · Tier {hovered.tier}</div>
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
