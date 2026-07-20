import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FireAura() {
  const aura = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!aura.current) return;

    const scale =
      1 + Math.sin(state.clock.elapsedTime * 3) * 0.04;

    aura.current.scale.set(
      scale,
      scale,
      scale
    );
  });

  return (
    <mesh
      ref={aura}
      position={[0, 0.3, 0]}
    >
      <sphereGeometry
        args={[3.8, 32, 32]}
      />

      <meshBasicMaterial
        color="#ff3300"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
