import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useRef } from "react";
import { useMemo } from "react";
interface BurningBook3DProps {
  items: any[];
}
function FireParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 5,
      y: Math.random() * 2,
      z: (Math.random() - 0.5) * 4,
      size: Math.random() * 0.04 + 0.02,
      speed: Math.random() * 0.8 + 0.5,
    }));
  }, []);

  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    group.current.children.forEach((child, i) => {
      child.position.y +=
        Math.sin(state.clock.elapsedTime * particles[i].speed) * 0.002;

      child.rotation.z += 0.01;
    });
  });

  return (
    <group ref={group}>
      {particles.map((p) => (
        <mesh
          key={p.id}
          position={[p.x, p.y, p.z]}
        >
          <sphereGeometry
            args={[p.size, 8, 8]}
          />

          <meshBasicMaterial
            color="#ff7a00"
          />
        </mesh>
      ))}
    </group>
  );
}


function FireGlow() {
  const light = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!light.current) return;

    light.current.intensity =
      4 + Math.sin(state.clock.elapsedTime * 8) * 1.5;
  });


  return (
    <pointLight
      ref={light}
      position={[0,2,1]}
      color="#ff5500"
      intensity={5}
      distance={8}
    />
  );
}
function FireAura() {
  const aura = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!aura.current) return;

    const scale =
      1 + Math.sin(state.clock.elapsedTime * 3) * 0.04;

    aura.current.scale.set(
      scale,
      scale,
      scale
    );
  });

  return (
    <mesh ref={aura} position={[0, 0.3, 0]}>
      <sphereGeometry args={[3.8, 32, 32]} />

      <meshBasicMaterial
        color="#ff3300"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
function SmokeLayer() {
  const smoke = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!smoke.current) return;

    smoke.current.rotation.y =
      state.clock.elapsedTime * 0.05;
  });

  return (
    <mesh
      ref={smoke}
      position={[0, 2, 0]}
    >
      <sphereGeometry
        args={[4.5, 32, 32]}
      />

      <meshBasicMaterial
        color="#555555"
        transparent
        opacity={0.025}
        side={THREE.BackSide}
      />
    </mesh>
  );
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
              <FireAura />
              <SmokeLayer />
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
