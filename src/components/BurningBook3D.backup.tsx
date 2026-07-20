import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Book(){
  return (
    <group rotation={[0.15,0,0]}>

      {/* LEFT PAGE */}
      <mesh position={[-1.15,0,0]}>
        <boxGeometry args={[2.3,0.12,3]} />
        <meshStandardMaterial
          color="#fff8e7"
          roughness={1}
        />
      </mesh>


      {/* RIGHT PAGE */}
      <mesh position={[1.15,0,0]}>
        <boxGeometry args={[2.3,0.12,3]} />
        <meshStandardMaterial
          color="#fff8e7"
          roughness={1}
        />
      </mesh>


      {/* CENTER SPINE */}
      <mesh position={[0,-0.1,0]}>
        <boxGeometry args={[0.25,0.25,3.2]} />
        <meshStandardMaterial
          color="#5b2b10"
        />
      </mesh>


      {/* BOTTOM COVER */}
      <mesh position={[0,-0.25,0]}>
        <boxGeometry args={[3,0.18,3.4]} />
        <meshStandardMaterial
          color="#2b1205"
          roughness={0.8}
        />
      </mesh>

    </group>
  );
}


export default function BurningBook3D(){

return(
<div className="fixed inset-0 bg-black">

<Canvas camera={{position:[0,2,8]}}>

<ambientLight intensity={0.8}/>

<pointLight
 position={[0,2,3]}
 color="#ff8a00"
 intensity={8}
/>

<Book/>

<OrbitControls/>

</Canvas>

</div>
);

}
