import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import LeatherCover from "./LeatherCover";
import BookPages from "./BookPages";
import BurningEdges from "./BurningEdges";

interface FloatingBookProps {
  children?: React.ReactNode;
}

export default function FloatingBook({
  children,
}: FloatingBookProps) {

  const book = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!book.current) return;

    const time = state.clock.elapsedTime;

    book.current.position.y =
      Math.sin(time * 0.8) * 0.08;

    book.current.rotation.y =
      Math.sin(time * 0.25) * 0.05;
  });


  return (
    <group
      ref={book}
      rotation={[
        THREE.MathUtils.degToRad(-8),
        0,
        THREE.MathUtils.degToRad(2),
      ]}
    >

      <LeatherCover />

      <BookPages />

      <BurningEdges />


      {children}

    </group>
  );
}
