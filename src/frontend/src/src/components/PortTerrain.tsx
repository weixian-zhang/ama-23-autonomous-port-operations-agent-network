import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Bump this whenever terrain-port.glb is re-exported from Blender to bypass
// the browser HTTP cache and drei's per-URL useGLTF cache.
const TERRAIN_GLB = '/blender-asset/terrain-port.glb?v=2026-05-02-buildings2'

export function PortTerrain() {
  const { scene, animations } = useGLTF(TERRAIN_GLB)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  useEffect(() => {
    // ---- Animation setup (sea waves via morph targets, etc.) ----
    console.log(`[PortTerrain] GLB animations found: ${animations.length}`)
    animations.forEach((c) => {
      console.log(
        `[PortTerrain]   clip="${c.name}" duration=${c.duration.toFixed(2)}s tracks=${c.tracks.length}`,
        c.tracks.map((t) => t.name),
      )
    })

    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(scene)
      mixerRef.current = mixer
      for (const clip of animations) {
        const action = mixer.clipAction(clip)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.clampWhenFinished = false
        action.enabled = true
        action.play()
      }
    }

    // Fix sky dome & mountain materials, prepare Sea for morph-target animation
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
        }
      }

      // Sea — make sure morph targets actually animate
      if (child.name === 'Sea' || child.name.startsWith('Sea')) {
        const geom = child.geometry
        const hasMorph =
          !!geom.morphAttributes && Object.keys(geom.morphAttributes).length > 0
        const morphCount = geom.morphAttributes?.position?.length ?? 0

        // Ensure influences array exists (gltf-loader normally sets this, but be defensive)
        if (hasMorph && (!child.morphTargetInfluences || child.morphTargetInfluences.length === 0)) {
          child.morphTargetInfluences = new Array(morphCount).fill(0)
        }
        // The Sea is huge (~4km) and animated via morphs — disable frustum culling
        // so it never gets skipped on edges of the view, and so morph deformation
        // never moves verts outside a stale bbox.
        child.frustumCulled = false

        // Mark material as needing morph support (no-op on modern three.js, safe)
        const mat = child.material as THREE.MeshStandardMaterial | undefined
        if (mat) {
          mat.side = THREE.DoubleSide
          mat.needsUpdate = true
        }

        console.log('[PortTerrain] Sea mesh:', {
          name: child.name,
          hasMorphAttributes: hasMorph,
          morphTargetCount: morphCount,
          morphTargetDictionary: child.morphTargetDictionary,
          influences: child.morphTargetInfluences,
        })
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
