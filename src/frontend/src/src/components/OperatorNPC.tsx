import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

const OPERATOR_GLBS = [
  '/blender-asset/operator-female-1.glb',
  '/blender-asset/operator-female-2.glb'
]

function seeded(seed: number) {
  let h = seed | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 0x100000000
}

interface OperatorNPCProps {
  seed?: number
  scale?: number
  animation?: string
  position?: THREE.Vector3Tuple
}

export function OperatorNPC({
  seed = 0,
  scale = 5,
  animation = 'walk',
  position = [0, 0, 0],
}: OperatorNPCProps) {
  const modelIndex = useMemo(() => Math.floor(seeded(seed) * OPERATOR_GLBS.length), [seed])
  const gltf = useGLTF(OPERATOR_GLBS[modelIndex])
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf.scene])
  // Clone animation clips so they bind to the cloned skeleton
  const animations = useMemo(() => gltf.animations.map((clip) => clip.clone()), [gltf.animations])
  const groupRef = useRef<THREE.Group>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  useEffect(() => {
    if (!scene) return
    const mixer = new THREE.AnimationMixer(scene)
    mixerRef.current = mixer

    // Play the first matching or first available clip immediately
    const clip = animations.find(
      (c) => c.name.toLowerCase().includes(animation.toLowerCase())
    ) ?? animations[0]
    if (clip) {
      const action = mixer.clipAction(clip, scene)
      action.play()
      action.setLoop(THREE.LoopRepeat, Infinity)
    }

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
    }
  }, [scene, animations])

  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
  })

  return (
    <group ref={groupRef} position={position}>
      <group position={[0, scale * 0.9, 0]}>
        <primitive object={scene} scale={scale} />
      </group>
    </group>
  )
}

OperatorNPC.GLBS = OPERATOR_GLBS
OperatorNPC.seeded = seeded
