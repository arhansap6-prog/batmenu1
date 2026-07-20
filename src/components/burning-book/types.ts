export interface Dish {
  id: string;
  name: string;
  price: string;
  image: string;
  description: string;
  ingredients?: string[];
}

export interface BookPageData {
  id: number;
  title: string;
  dishes: Dish[];
}

export type BookView =
  | "book"
  | "dish";
