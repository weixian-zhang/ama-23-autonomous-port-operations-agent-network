import { useGLTF } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Bump this whenever terrain-port.glb is re-exported from Blender to bypass
// the browser HTTP cache and drei's per-URL useGLTF cache.
const TERRAIN_GLB = '/blender-asset/terrain-port.glb?v=2026-05-03-gapnarrow'

// Names of the shape keys baked into the Sea mesh in Blender.
// Order doesn't matter — we look them up via `morphTargetDictionary`.
const SEA_WAVE_KEYS = ['WaveA', 'WaveB', 'WaveC'] as const

// Per-wave drive parameters: angular frequency (rad/s), phase offset (rad),
// amplitude (0..0.5 around a midpoint), and bias.
// Periods are deliberately incommensurate so the ocean never repeats visibly.
// The camera sits ~250 m above the sea, so amplitudes need to stay bold to
// produce visible motion. The previous "cube tile" look was caused by flat
// shading on the Sea mesh — that's now fixed via smooth shading + morph
// normals in the GLB, so we can drive the influences across their full range
// without it looking spiky.
const SEA_WAVE_PARAMS: Record<
  (typeof SEA_WAVE_KEYS)[number],
  { freq: number; phase: number; amp: number; bias: number }
> = {
  WaveA: { freq: 0.62, phase: 0,           amp: 0.5, bias: 0.5 },
  WaveB: { freq: 0.41, phase: Math.PI / 3, amp: 0.5, bias: 0.5 },
  WaveC: { freq: 0.27, phase: Math.PI / 2, amp: 0.5, bias: 0.5 },
}

export function PortTerrain() {
  const { scene, animations } = useGLTF(TERRAIN_GLB)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const seaMeshesRef = useRef<THREE.Mesh[]>([])
  const debugLoggedRef = useRef(false)

  useEffect(() => {
    // ---- Non-Sea animations (e.g. flags, future props) via the GLB clip ----
    // We deliberately skip the Sea_MeshAction track because Blender 4.4+'s
    // layered-Action exporter + three.js GLTFLoader binding to a single-primitive
    // morph-weights node is fragile. Sea waves are driven directly in JS below.
    const nonSeaClips = animations
      .map((clip) => {
        const filteredTracks = clip.tracks.filter(
          (t) => !/morphTargetInfluences/.test(t.name) || !/Sea/.test(t.name),
        )
        if (filteredTracks.length === 0) return null
        return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks)
      })
      .filter((c): c is THREE.AnimationClip => c !== null)

    console.log(
      `[PortTerrain] GLB animations: total=${animations.length} non-sea=${nonSeaClips.length}`,
    )

    if (nonSeaClips.length > 0) {
      const mixer = new THREE.AnimationMixer(scene)
      mixerRef.current = mixer
      for (const clip of nonSeaClips) {
        const action = mixer.clipAction(clip)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.clampWhenFinished = false
        action.enabled = true
        action.play()
      }
    }

    // ---- Material / mesh fix-ups + collect Sea meshes for the JS wave driver
    const seaMeshes: THREE.Mesh[] = []
    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      // Sky dome: render from inside (double-sided) + unlit
      if (child.name === 'SkyDome') {
        const mat = child.material as THREE.Material | undefined
        if (mat) {
          mat.side = THREE.DoubleSide
          mat.depthWrite = false
          child.renderOrder = -1
        }
      }

      // Mountains – backdrop mesh needs double-sided rendering
      if (child.name.startsWith('Mountain')) {
        const mat = child.material as THREE.Material | undefined
        if (mat) mat.side = THREE.DoubleSide
      }

      // Sea — register for the JS wave driver. Match by morph-target
      // dictionary (presence of WaveA) rather than by name, so a future
      // rename in Blender won't silently break the animation.
      const dictMaybe = child.morphTargetDictionary
      const isSeaMesh =
        child.name === 'Sea' ||
        child.name.startsWith('Sea') ||
        (dictMaybe !== undefined && SEA_WAVE_KEYS.some((k) => k in dictMaybe))
      if (isSeaMesh) {
        const geom = child.geometry
        const morphCount = geom.morphAttributes?.position?.length ?? 0
        if (morphCount === 0) {
          console.warn('[PortTerrain] Sea mesh has no morph targets:', child.name)
          return
        }

        // Defensive: ensure influences array matches morph count.
        if (
          !child.morphTargetInfluences ||
          child.morphTargetInfluences.length !== morphCount
        ) {
          child.morphTargetInfluences = new Array(morphCount).fill(0)
        }

        // Sea is huge (~4 km) and deforms via morphs — disable frustum culling
        // so it isn't skipped at view edges and morphs aren't clipped by a
        // stale bbox.
        child.frustumCulled = false

        const mat = child.material as THREE.MeshStandardMaterial | undefined
        if (mat) {
          mat.side = THREE.DoubleSide
          mat.needsUpdate = true
        }

        seaMeshes.push(child)

        console.log('[PortTerrain] Sea wave driver attached:', {
          name: child.name,
          morphTargetCount: morphCount,
          morphTargetDictionary: child.morphTargetDictionary,
        })
      }

      // Reduce Berth/Yard floating labels by 40%
      if (/^(BerthText_|YardText_|YardLabel)/.test(child.name)) {
        child.scale.multiplyScalar(0.2)
      }
    })
    seaMeshesRef.current = seaMeshes

    return () => {
      mixerRef.current?.stopAllAction()
      mixerRef.current?.uncacheRoot(scene)
      mixerRef.current = null
      seaMeshesRef.current = []
      debugLoggedRef.current = false
    }
  }, [scene, animations])

  useFrame((state, delta) => {
    // Generic clip mixer (non-Sea animations only).
    mixerRef.current?.update(delta)

    // Sea wave driver — directly modulate the Sea shape key influences
    // every frame using phased sine waves. Independent of GLB animation
    // tracks, so this keeps working across Blender export quirks.
    const t = state.clock.elapsedTime
    for (const mesh of seaMeshesRef.current) {
      const dict = mesh.morphTargetDictionary
      const inf = mesh.morphTargetInfluences
      if (!dict || !inf) continue
      for (const key of SEA_WAVE_KEYS) {
        const idx = dict[key]
        if (idx === undefined) continue
        const p = SEA_WAVE_PARAMS[key]
        inf[idx] = p.bias + p.amp * Math.sin(t * p.freq + p.phase)
      }
    }

    // One-shot diagnostic: log the first set of computed influences so a
    // missing wave animation can be diagnosed from the browser console.
    if (!debugLoggedRef.current && seaMeshesRef.current.length > 0) {
      debugLoggedRef.current = true
      const m = seaMeshesRef.current[0]
      console.log('[PortTerrain] Sea driver running. First-frame influences:', {
        name: m.name,
        dict: m.morphTargetDictionary,
        influences: Array.from(m.morphTargetInfluences ?? []),
      })
    }
  })

  return <primitive object={scene} />
}
