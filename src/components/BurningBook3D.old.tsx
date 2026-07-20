import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import FireEffect from "./burning-book/FireEffect";
import Navigation from "./burning-book/Navigation";
import { Dish } from "./burning-book/types";

interface BurningBook3DProps {
  items: Dish[];
}

function BurningBookModel() {
  return (
    <group rotation={[0.15, -0.25, 0]}>
      <mesh>
        <boxGeometry args={[3.2, 0.35, 4]} />
        <meshStandardMaterial
          color="#160803"
          roughness={0.8}
        />
      </mesh>

      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[3, 0.25, 3.8]} />
        <meshStandardMaterial
          color="#f5e6c8"
          roughness={1}
        />
      </mesh>
    </group>
  );
}

export default function BurningBook3D({
  items,
}: BurningBook3DProps) {
  return (
    <div className="w-full h-[700px] bg-black rounded-3xl overflow-hidden relative">

      <Canvas
        camera={{
          position: [0, 3, 7],
          fov: 45,
        }}
      >

        <ambientLight intensity={0.7} />

        <pointLight
          position={[0, 3, 2]}
          intensity={5}
          color={new THREE.Color("#ff5500")}
        />

        <BurningBookModel />

        <FireEffect />

        <Environment preset="night" />

        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
        />

      </Canvas>


      <div className="absolute inset-0 pointer-events-none">
        <Navigation
          items={items}
          onHome={() => {
            window.location.href = "/";
          }}
        />
      </div>

    </div>
  );
}
