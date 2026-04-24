import { useRef, useImperativeHandle, forwardRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const CONTAINER_GLBS = [
  '/blender-asset/container-blue-1.glb',
  '/blender-asset/container-red-1.glb',
  '/blender-asset/container-yellow-1.glb',
]

function seeded(seed: number) {
  let h = seed | 0
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 0x100000000
}

export interface ContainerHandle {
  /** Spawn 4 new container groups, add them to the internal group, return refs */
  spawnContainers(): THREE.Group[]
  /** Remove a set of container groups that were not placed */
  removeContainers(groups: (THREE.Group | null)[]): void
}

interface ContainerProps {
  craneCount?: number
  scale?: number
  seed?: number
}

export const Container = forwardRef<ContainerHandle, ContainerProps>(
  function Container({ craneCount = 4, scale = 8, seed = 100 }, ref) {
    const containerGltfs = [
      useGLTF(CONTAINER_GLBS[0]),
      useGLTF(CONTAINER_GLBS[1]),
      useGLTF(CONTAINER_GLBS[2]),
    ]

    const groupRef = useRef<THREE.Group>(null)
    const spawnCount = useRef(0)

    useImperativeHandle(ref, () => ({
      spawnContainers() {
        const groups: THREE.Group[] = []
        if (!groupRef.current) return groups
        const batch = spawnCount.current++
        for (let i = 0; i < craneCount; i++) {
          const idx = Math.floor(seeded(seed + batch * craneCount + i) * 3)
          const clone = containerGltfs[idx].scene.clone(true)
          const group = new THREE.Group()
          group.add(clone)
          group.scale.setScalar(scale)
          group.visible = false
          groupRef.current.add(group)
          groups.push(group)
        }
        return groups
      },
      removeContainers(groups: (THREE.Group | null)[]) {
        for (const g of groups) {
          if (g) g.removeFromParent()
        }
      },
    }))

    return <group ref={groupRef} />
  },
)
