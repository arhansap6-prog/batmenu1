import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function SmokeLayer() {
  const smoke = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!smoke.current) return;

    smoke.current.rotation.y =
      state.clock.elapsedTime * 0.03;

    const pulse =
      1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;

    smoke.current.scale.set(
      pulse,
      pulse,
      pulse
    );
  });

  return (
    <mesh
      ref={smoke}
      position={[0, 2.5, 0]}
    >
      <sphereGeometry
        args={[4.5, 32, 32]}
      />

      <meshBasicMaterial
        color="#3a3a3a"
        transparent
        opacity={0.035}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
