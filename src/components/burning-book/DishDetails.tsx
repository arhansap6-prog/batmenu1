import { Dish } from "./types";

interface DishDetailsProps {
  dish: Dish;
  onBackBook: () => void;
  onBackHome: () => void;
}

export default function DishDetails({
  dish,
  onBackBook,
  onBackHome,
}: DishDetailsProps) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-5">

      <div className="w-full max-w-xl bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl">

        <img
          src={dish.image}
          alt={dish.name}
          className="w-full h-96 object-cover"
        />

        <div className="p-6">

          <h1 className="text-4xl font-serif mb-3">
            {dish.name}
          </h1>

          <p className="text-orange-400 text-2xl font-bold mb-4">
            {dish.price}
          </p>

          <p className="text-gray-300 mb-6">
            {dish.description}
          </p>


          <div className="flex gap-3">

            <button
              onClick={onBackBook}
              className="flex-1 bg-white text-black rounded-xl py-3 font-bold"
            >
              ← Back To Book
            </button>


            <button
              onClick={onBackHome}
              className="flex-1 bg-orange-600 rounded-xl py-3 font-bold"
            >
              🏠 Home
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}
