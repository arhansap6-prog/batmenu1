
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM (
  'super_admin','owner','manager','cashier','chef','kitchen','waiter','designer','viewer'
);

CREATE TYPE public.subscription_plan AS ENUM (
  'free','starter','basic','professional','premium','enterprise','unlimited'
);

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  mobile text,
  username text UNIQUE,
  avatar_url text,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER_ROLES (never store role on profiles)
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  restaurant_id uuid, -- nullable: platform-level roles (super_admin) have no restaurant
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, restaurant_id)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_restaurant ON public.user_roles(restaurant_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- SECURITY DEFINER helpers (avoid RLS recursion)
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.user_manages_restaurant(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND restaurant_id = _restaurant_id
      AND role IN ('owner','manager','cashier','chef','kitchen','waiter','designer','viewer')
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_restaurant(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND restaurant_id = _restaurant_id
      AND role IN ('owner','manager')
  )
$$;

-- =========================================================
-- SUPER-ADMIN INTEGRITY TRIGGER
-- Only allow super_admin insertion when NONE exists yet (first-account rule)
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_single_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
      RAISE EXCEPTION 'A Super Admin already exists. Only one Super Admin is allowed.';
    END IF;
    -- Super admin never scoped to a restaurant
    NEW.restaurant_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_single_super_admin
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_super_admin();

-- Block updates to promote someone to super_admin
CREATE OR REPLACE FUNCTION public.block_super_admin_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND OLD.role <> 'super_admin' THEN
    RAISE EXCEPTION 'Cannot promote to Super Admin.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_super_admin_update
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.block_super_admin_update();

-- =========================================================
-- AUTO-PROFILE + FIRST-USER = SUPER ADMIN
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_super boolean;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO _has_super;

  IF NOT _has_super THEN
    -- First ever account → Super Admin
    INSERT INTO public.user_roles (user_id, role, restaurant_id)
    VALUES (NEW.id, 'super_admin', NULL);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RESTAURANTS
-- =========================================================
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text,
  currency text NOT NULL DEFAULT 'USD',
  language text NOT NULL DEFAULT 'en',
  country text,
  logo_url text,
  cover_url text,
  intro_video_url text,
  menu_intro_video_url text,
  theme text NOT NULL DEFAULT 'luxury-black',
  plan public.subscription_plan NOT NULL DEFAULT 'starter',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_restaurants_owner ON public.restaurants(owner_id);
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);
GRANT SELECT ON public.restaurants TO anon; -- public menu view via slug
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- CATEGORIES
-- =========================================================
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- FOOD ITEMS
-- =========================================================
CREATE TABLE public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  discount_price numeric(10,2),
  image_url text,
  is_veg boolean NOT NULL DEFAULT true,
  is_available boolean NOT NULL DEFAULT true,
  is_chef_recommended boolean NOT NULL DEFAULT false,
  is_todays_special boolean NOT NULL DEFAULT false,
  prep_time_minutes integer,
  calories integer,
  ingredients text,
  allergy_info text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_food_items_restaurant ON public.food_items(restaurant_id);
CREATE INDEX idx_food_items_category ON public.food_items(category_id);
GRANT SELECT ON public.food_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_items TO authenticated;
GRANT ALL ON public.food_items TO service_role;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- AUDIT LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER tg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_restaurants_updated BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_categories_updated BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
CREATE TRIGGER tg_food_items_updated BEFORE UPDATE ON public.food_items
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "super admin reads all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "super admin updates any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY "read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "super admin reads all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- restaurants
CREATE POLICY "public reads active restaurants" ON public.restaurants
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "authenticated reads active restaurants" ON public.restaurants
  FOR SELECT TO authenticated USING (
    is_active = true
    OR public.is_super_admin(auth.uid())
    OR public.user_manages_restaurant(auth.uid(), id)
  );
CREATE POLICY "super admin manages restaurants" ON public.restaurants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "owner updates own restaurant" ON public.restaurants
  FOR UPDATE TO authenticated
  USING (public.user_can_edit_restaurant(auth.uid(), id))
  WITH CHECK (public.user_can_edit_restaurant(auth.uid(), id));

-- categories
CREATE POLICY "public reads categories of active restaurants" ON public.categories
  FOR SELECT TO anon USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.is_active = true
    )
  );
CREATE POLICY "authenticated reads categories" ON public.categories
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.user_manages_restaurant(auth.uid(), restaurant_id)
    OR is_active = true
  );
CREATE POLICY "owner manages own categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.user_can_edit_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.user_can_edit_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "super admin manages categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- food_items
CREATE POLICY "public reads available foods" ON public.food_items
  FOR SELECT TO anon USING (
    is_available = true AND EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.is_active = true
    )
  );
CREATE POLICY "authenticated reads foods" ON public.food_items
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.user_manages_restaurant(auth.uid(), restaurant_id)
    OR is_available = true
  );
CREATE POLICY "owner manages own foods" ON public.food_items
  FOR ALL TO authenticated
  USING (public.user_can_edit_restaurant(auth.uid(), restaurant_id))
  WITH CHECK (public.user_can_edit_restaurant(auth.uid(), restaurant_id));
CREATE POLICY "super admin manages foods" ON public.food_items
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- audit_log
CREATE POLICY "super admin reads audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "self reads own audit" ON public.audit_log
  FOR SELECT TO authenticated USING (auth.uid() = actor_id);
-- Writes only via service_role (server functions)
