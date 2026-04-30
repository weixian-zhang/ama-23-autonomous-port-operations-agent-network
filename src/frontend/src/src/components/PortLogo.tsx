import { useTexture, Billboard } from '@react-three/drei'

export function PortLogo({ position, src = '/salacia-goddess.png', width = 80, height = 80 }: { position: [number, number, number]; src?: string; width?: number; height?: number }) {
  const texture = useTexture(src)

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent depthTest={false} />
      </mesh>
    </Billboard>
  )
}
