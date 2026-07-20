import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function MagicGlow() {
  const glow = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!glow.current) return;

    glow.current.intensity =
      3 + Math.sin(state.clock.elapsedTime * 5) * 1;
  });

  return (
    <pointLight
      ref={glow}
      position={[0, 0.5, 0]}
      color="#ff9900"
      intensity={4}
      distance={6}
    />
  );
}
