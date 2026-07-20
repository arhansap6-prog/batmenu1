export default function BookPages() {
  return (
    <group>

      {/* LEFT PAGE STACK */}
      <mesh position={[-1.25, 0.16, 0]}>
        <boxGeometry
          args={[2.55, 0.14, 3.8]}
        />

        <meshStandardMaterial
          color="#f4dfad"
          roughness={1}
        />
      </mesh>


      {/* RIGHT PAGE STACK */}
      <mesh position={[1.25, 0.16, 0]}>
        <boxGeometry
          args={[2.55, 0.14, 3.8]}
        />

        <meshStandardMaterial
          color="#f4dfad"
          roughness={1}
        />
      </mesh>


      {/* INNER PAGE GLOW */}
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry
          args={[0.08, 0.02, 3.6]}
        />

        <meshBasicMaterial
          color="#ffb347"
          transparent
          opacity={0.35}
        />
      </mesh>


      {/* PAGE EDGE DETAIL */}
      <mesh position={[0, 0.08, -1.95]}>
        <boxGeometry
          args={[5, 0.04, 0.03]}
        />

        <meshStandardMaterial
          color="#c9a86a"
          roughness={1}
        />
      </mesh>

    </group>
  );
}
