
-- Order status enum
CREATE TYPE public.order_status AS ENUM ('pending','preparing','ready','served','cancelled');

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number TEXT,
  customer_name TEXT,
  notes TEXT,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can place orders at active restaurants"
  ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.is_active = true));

CREATE POLICY "Staff can view restaurant orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_manages_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Staff can update restaurant orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_manages_restaurant(auth.uid(), restaurant_id));

CREATE POLICY "Owners can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_can_edit_restaurant(auth.uid(), restaurant_id));

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can add items to their new orders"
  ON public.order_items FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.id = order_id AND r.is_active = true
  ));

CREATE POLICY "Staff can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (public.is_super_admin(auth.uid()) OR public.user_manages_restaurant(auth.uid(), o.restaurant_id))
  ));

CREATE INDEX orders_restaurant_status_idx ON public.orders(restaurant_id, status, created_at DESC);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
