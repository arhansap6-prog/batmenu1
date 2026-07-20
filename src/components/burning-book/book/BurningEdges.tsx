import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function BurningEdges() {
  const glow = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!glow.current) return;

    const pulse =
      1 + Math.sin(state.clock.elapsedTime * 5) * 0.04;

    glow.current.scale.set(
      pulse,
      pulse,
      pulse
    );
  });

  return (
    <group>

      {/* TOP FIRE EDGE */}
      <mesh
        ref={glow}
        position={[0, 0.28, -2]}
      >
        <boxGeometry
          args={[5.8, 0.06, 0.08]}
        />

        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0.35}
        />
      </mesh>


      {/* LEFT FIRE EDGE */}
      <mesh
        position={[-2.9, 0.28, 0]}
      >
        <boxGeometry
          args={[0.08, 0.06, 4]}
        />

        <meshBasicMaterial
          color="#ff5500"
          transparent
          opacity={0.3}
        />
      </mesh>


      {/* RIGHT FIRE EDGE */}
      <mesh
        position={[2.9, 0.28, 0]}
      >
        <boxGeometry
          args={[0.08, 0.06, 4]}
        />

        <meshBasicMaterial
          color="#ff5500"
          transparent
          opacity={0.3}
        />
      </mesh>

    </group>
  );
}
