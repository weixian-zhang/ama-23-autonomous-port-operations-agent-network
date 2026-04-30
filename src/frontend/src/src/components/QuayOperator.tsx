import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const OPERATOR_SCALE = 7           // shrunk 30% from previous 10
const OPERATOR_X = -35             // on the quay deck (quay edge x=-43, road x=-25)
const OPERATOR_Y = 0               // ground level (armature was lifted in Blender so feet sit at y=0)
const PATROL_Z_MIN = -500
const PATROL_Z_MAX = 500
const WALK_SPEED = 12              // units per second
const ANIMATION_INDEX = 0          // index into the GLB's animation clips (model has 1 clip)
const START_Z = 60                 // initial z position (close to camera's initial look-at)

// The GLB was exported with export_yup=True so axes already match three.js (Y-up). No rotation fix needed.
// Flip this if she walks the wrong way (faces backward).
const FACING_OFFSET = 0

/**
 * The exported clip has translation tracks on every bone (not just the root).
 * Per-bone position keys fight the bind pose and produce visible jitter,
 * especially on long limbs. For a skinned humanoid we only need rotation —
 * strip every ".position" track. We control the world position ourselves.
 */
function stripBonePositions(clip: THREE.AnimationClip): THREE.AnimationClip {
  const filtered = clip.tracks.filter((t) => !t.name.endsWith('.position'))
  return new THREE.AnimationClip(clip.name, clip.duration, filtered)
}

/**
 * NPC operator that walks back and forth along the quay.
 * Loads operator-female-1.glb (a rigged + animated character) and plays
 * one of its built-in clips while patrolling between PATROL_Z_MIN/MAX.
 */
export function QuayOperator() {
  const { scene, animations } = useGLTF('/blender-asset/operator-female-2.glb')
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const directionRef = useRef<1 | -1>(1) // +1 = walking +Z, -1 = walking -Z

  // Strip per-bone position tracks once per loaded clip set.
  const cleanClips = useMemo(
    () => animations.map(stripBonePositions),
    [animations],
  )

  useEffect(() => {
    if (!scene || cleanClips.length === 0) return
    const mixer = new THREE.AnimationMixer(scene)
    mixerRef.current = mixer
    const clipIndex = Math.min(ANIMATION_INDEX, cleanClips.length - 1)
    const action = mixer.clipAction(cleanClips[clipIndex])
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.play()

    // Skinned meshes can disappear when their (static) bounding sphere is
    // wrong after bone deformation — keep them always-rendered.
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh | THREE.SkinnedMesh
      if ((mesh as THREE.Mesh).isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) {
        mesh.frustumCulled = false
      }
    })

    // CRITICAL: tear the mixer down on unmount, otherwise React StrictMode
    // (dev) double-mounts the effect and runs two mixers on the same scene,
    // doubling every keyframe — that alone looks like aggressive jitter.
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      mixerRef.current = null
    }
  }, [scene, cleanClips])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)

    const group = groupRef.current
    if (!group) return

    // Patrol along z-axis, flip at endpoints.
    let z = group.position.z + directionRef.current * WALK_SPEED * delta
    if (z >= PATROL_Z_MAX) {
      z = PATROL_Z_MAX
      directionRef.current = -1
    } else if (z <= PATROL_Z_MIN) {
      z = PATROL_Z_MIN
      directionRef.current = 1
    }
    group.position.z = z

    // Face the direction of travel (Y is world-up).
    group.rotation.y =
      (directionRef.current === 1 ? 0 : Math.PI) + FACING_OFFSET
  })

  return (
    <group
      ref={groupRef}
      position={[OPERATOR_X, OPERATOR_Y, START_Z]}
      name="quay-operator-1"
    >
      <primitive object={scene} scale={OPERATOR_SCALE} />
    </group>
  )
}

useGLTF.preload('/blender-asset/operator-female-1.glb')
