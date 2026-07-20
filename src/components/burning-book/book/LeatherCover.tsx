export default function LeatherCover() {
  return (
    <group>

      {/* LEFT LEATHER COVER */}
      <mesh position={[-1.55, 0, 0]}>
        <boxGeometry
          args={[3.15, 0.22, 4.15]}
        />

        <meshStandardMaterial
          color="#140705"
          roughness={0.92}
          metalness={0.08}
        />
      </mesh>


      {/* RIGHT LEATHER COVER */}
      <mesh position={[1.55, 0, 0]}>
        <boxGeometry
          args={[3.15, 0.22, 4.15]}
        />

        <meshStandardMaterial
          color="#140705"
          roughness={0.92}
          metalness={0.08}
        />
      </mesh>


      {/* CENTER SPINE */}
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry
          args={[0.32, 0.3, 4.25]}
        />

        <meshStandardMaterial
          color="#080303"
          roughness={1}
        />
      </mesh>


      {/* COVER EMBLEM AREA */}
      <mesh position={[0, 0.13, 0]}>
        <boxGeometry
          args={[1.2, 0.02, 1.2]}
        />

        <meshStandardMaterial
          color="#2b1208"
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

    </group>
  );
}
