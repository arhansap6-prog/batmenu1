import Scene from "./burning-book/core/Scene";
import Navigation from "./burning-book/Navigation";

interface BurningBook3DProps {
  items: any[];
}

export default function BurningBook3D({
  items,
}: BurningBook3DProps) {

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">

      <Scene items={items} />

      <div className="absolute inset-0">

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
