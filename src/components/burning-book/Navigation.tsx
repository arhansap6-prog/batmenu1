import { useState } from "react";
import BurningBook from "./BurningBook";
import DishDetails from "./DishDetails";
import { Dish } from "./types";

interface NavigationProps {
  items: Dish[];
  onHome: () => void;
}

export default function Navigation({
  items,
  onHome,
}: NavigationProps) {

  const [selectedDish, setSelectedDish] =
    useState<Dish | null>(null);


  if (selectedDish) {
    return (
      <DishDetails
        dish={selectedDish}
        onBackBook={() => setSelectedDish(null)}
        onBackHome={onHome}
      />
    );
  }


  return (
    <BurningBook
      items={items}
      onDishOpen={(dish) =>
        setSelectedDish(dish)
      }
    />
  );
}
