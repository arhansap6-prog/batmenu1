import { useMemo } from "react";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

export default function FireEffect() {
  const particles = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 1.4 + Math.random() * 0.8;

      positions[i * 3] =
        (Math.random() - 0.5) * radius;

      positions[i * 3 + 1] =
        Math.random() * 2;

      positions[i * 3 + 2] =
        (Math.random() - 0.5) * radius;
    }

    return positions;
  }, []);

  return (
    <Points positions={particles}>
      <PointMaterial
        transparent
        size={0.06}
        sizeAttenuation
        depthWrite={false}
        color={new THREE.Color("#ff6a00")}
      />
    </Points>
  );
}
