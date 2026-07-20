import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";

import FloatingBook from "../book/FloatingBook";

import FireParticles from "../effects/FireParticles";
import SmokeLayer from "../effects/SmokeLayer";
import FireAura from "../effects/FireAura";
import MagicGlow from "../effects/MagicGlow";

import FireLights from "../lights/FireLights";
import CameraRig from "../camera/CameraRig";

interface SceneProps {
  items: any[];
}
export default function Scene({
  items,
}: SceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: [0, 1.2, 7],
          fov: 45,
        }}
      >

        <ambientLight intensity={0.4} />

        <CameraRig />

        <FireLights />

        <FloatingBook>
          <FireAura />
          <SmokeLayer />
          <MagicGlow />
        </FloatingBook>

        <FireParticles />

        <Environment preset="night" />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
        />

      </Canvas>
    </div>
  );
}
