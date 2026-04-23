import { useGLTF } from '@react-three/drei'

export function PortTerrain() {
  const { scene } = useGLTF('/blender-asset/terrain-port.glb')
  return <primitive object={scene} />
}
