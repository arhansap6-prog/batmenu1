import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FireParticles() {
  const group = useRef<THREE.Group>(null);

  const particles = useMemo(() => {
    return Array.from({ length: 120 }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 2,
        (Math.random() - 0.5) * 4
      ),
      speed: 0.2 + Math.random() * 0.6,
      size: 0.02 + Math.random() * 0.04,
    }));
  }, []);

  useFrame((state) => {
    if (!group.current) return;

    group.current.children.forEach((child, i) => {
      const p = particles[i];

      child.position.y += p.speed * 0.01;
      child.position.x += Math.sin(state.clock.elapsedTime + i) * 0.001;

      if (child.position.y > 3) {
        child.position.y = 0;
      }
    });
  });

  return (
    <group ref={group}>
      {particles.map((p, i) => (
        <mesh
          key={i}
          position={[p.position.x, p.position.y, p.position.z]}
        >
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial
            color="#ff7a00"
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}
