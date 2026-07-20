import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function FireLights() {
  const light1 = useRef<THREE.PointLight>(null);
  const light2 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (light1.current) {
      light1.current.intensity =
        3 + Math.sin(time * 8) * 1.2;
    }

    if (light2.current) {
      light2.current.intensity =
        2 + Math.sin(time * 6 + 2) * 0.8;
    }
  });

  return (
    <>
      <pointLight
        ref={light1}
        position={[-2, 1, 1]}
        color="#ff5500"
        intensity={4}
        distance={8}
      />

      <pointLight
        ref={light2}
        position={[2, 1, -1]}
        color="#ff8800"
        intensity={3}
        distance={7}
      />
    </>
  );
}
