import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function PortTerrain() {
  const { scene, animations } = useGLTF('/blender-asset/terrain-port.glb')
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  useEffect(() => {
    // Play all GLB animations (sea shape keys, etc.)
    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(scene)
      mixerRef.current = mixer
      for (const clip of animations) {
        const action = mixer.clipAction(clip)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.play()
      }
    }

    // Fix sky dome & mountain materials
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      // Sky dome: render from inside (double-sided) + unlit
      if (child.name === 'SkyDome') {
        if (child.material) {
          child.material.side = THREE.DoubleSide
          child.material.depthWrite = false
          child.renderOrder = -1
        }
      }

      // Mountains – backdrop mesh needs double-sided rendering
      if (child.name.startsWith('Mountain')) {
        if (child.material) {
          child.material.side = THREE.DoubleSide
          // Debug: log what the material looks like
          const mat = child.material as THREE.MeshStandardMaterial
          console.log('[Mountain]', child.name, {
            hasMap: !!mat.map,
            mapImage: mat.map?.image?.src ?? mat.map?.image?.width,
            color: mat.color?.getHexString(),
            type: mat.type,
          })
        }
      }

      // Reduce Berth/Yard floating labels by 40%
      if (/^(BerthText_|YardText_|YardLabel)/.test(child.name)) {
        child.scale.multiplyScalar(0.2)
      }
    })

    return () => {
      mixerRef.current?.stopAllAction()
      mixerRef.current?.uncacheRoot(scene)
      mixerRef.current = null
    }
  }, [scene, animations])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
  })

  return <primitive object={scene} />
}
