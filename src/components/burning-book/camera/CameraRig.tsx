import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function CameraRig() {
  const { camera } = useThree();

  const target = useRef(
    new THREE.Vector3(0, 0, 0)
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    camera.position.x =
      Math.sin(t * 0.15) * 0.25;

    camera.position.y =
      1.2 + Math.sin(t * 0.4) * 0.05;

    camera.position.z =
      7 + Math.sin(t * 0.3) * 0.15;

    camera.lookAt(target.current);
  });

  return null;
}
