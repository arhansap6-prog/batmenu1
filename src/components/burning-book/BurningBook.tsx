import BookPage from "./BookPage";
import { Dish } from "./types";

interface BurningBookProps {
  items: Dish[];
  onDishOpen: (dish: Dish) => void;
}

export default function BurningBook({
  items,
  onDishOpen,
}: BurningBookProps) {

  const dishes = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    description:
      item.description || "Delicious restaurant special dish",
  }));


  return (
    <div className="relative w-full min-h-screen flex items-center justify-center bg-black p-5">

      <div className="absolute inset-0 bg-orange-500/10 blur-3xl" />


      <div className="relative w-full max-w-4xl">

        <BookPage
          title="BAT MENU"
          dishes={dishes}
          onDishClick={onDishOpen}
        />

      </div>

    </div>
  );
}
