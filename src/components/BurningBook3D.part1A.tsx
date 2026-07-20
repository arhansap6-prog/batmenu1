import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef } from "react";

interface BurningBook3DProps {
  items: any[];
}

function OpenBookModel() {
  const bookRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!bookRef.current) return;

    bookRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.3) * 0.08;

    bookRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
  });

  return (
    <group ref={bookRef} rotation={[0.15, -0.25, 0]}>

      {/* LEFT COVER */}
      <mesh position={[-1.55,0,0]}>
        <boxGeometry args={[3,0.18,4]} />
        <meshStandardMaterial
          color="#2b0904"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>


      {/* RIGHT COVER */}
      <mesh position={[1.55,0,0]}>
        <boxGeometry args={[3,0.18,4]} />
        <meshStandardMaterial
          color="#2b0904"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>


      {/* LEFT PAGE */}
      <mesh position={[-1.35,0.15,0]}>
        <boxGeometry args={[2.6,0.08,3.7]} />
        <meshStandardMaterial
          color="#f4e6c8"
          roughness={1}
        />
      </mesh>


      {/* RIGHT PAGE */}
      <mesh position={[1.35,0.15,0]}>
        <boxGeometry args={[2.6,0.08,3.7]} />
        <meshStandardMaterial
          color="#f4e6c8"
          roughness={1}
        />
      </mesh>


      {/* CENTER SPINE */}
      <mesh position={[0,0.05,0]}>
        <boxGeometry args={[0.25,0.3,4]} />
        <meshStandardMaterial
          color="#120402"
          roughness={0.8}
        />
      </mesh>


    </group>
  );
}


export default function BurningBook3D({
  items,
}: BurningBook3DProps) {

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">

      <Canvas
        camera={{
          position:[0,3,8],
          fov:45
        }}
      >

        <ambientLight intensity={0.5}/>

        <pointLight
          position={[0,4,3]}
          intensity={5}
          color="#ff5500"
        />

        <OpenBookModel/>

        <Environment preset="night"/>

        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />

      </Canvas>

    </div>
  );
}
