import { Dish } from "./types";

interface BookPageProps {
  title: string;
  dishes: Dish[];
  onDishClick: (dish: Dish) => void;
}

export default function BookPage({
  title,
  dishes,
  onDishClick,
}: BookPageProps) {
  return (
    <div className="w-full h-full bg-[#f5ead7] rounded-xl p-6 shadow-2xl">
      <h2 className="text-3xl font-serif text-center mb-6 text-black">
        {title}
      </h2>

      <div className="grid grid-cols-2 gap-5">
        {dishes.map((dish) => (
          <button
            key={dish.id}
            onClick={() => onDishClick(dish)}
            className="text-left group"
          >
            <div className="overflow-hidden rounded-xl shadow-lg">
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <h3 className="mt-3 font-bold text-lg text-black">
              {dish.name}
            </h3>

            <p className="text-orange-600 font-semibold">
              {dish.price}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
