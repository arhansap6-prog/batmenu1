
-- Menu templates
CREATE TABLE IF NOT EXISTS public.menu_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.menu_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_templates TO authenticated;
GRANT ALL ON public.menu_templates TO service_role;

ALTER TABLE public.menu_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_templates_public_read"
  ON public.menu_templates FOR SELECT
  USING (is_published = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "menu_templates_sa_insert"
  ON public.menu_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "menu_templates_sa_update"
  ON public.menu_templates FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "menu_templates_sa_delete"
  ON public.menu_templates FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_menu_templates_touch
  BEFORE UPDATE ON public.menu_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- Add template ref on restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS menu_template_id uuid REFERENCES public.menu_templates(id) ON DELETE SET NULL;

-- 3D fields on food_items
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS model_3d_url text,
  ADD COLUMN IF NOT EXISTS model_3d_ios_url text,
  ADD COLUMN IF NOT EXISTS enable_3d boolean NOT NULL DEFAULT false;

-- Seed Fire Book
INSERT INTO public.menu_templates (name, slug, description, config, is_published)
VALUES (
  'Fire Book',
  'fire-book',
  'A glowing antique-book aesthetic — warm flame accents, gold prices, elegant serif dish names on a deep charred background.',
  jsonb_build_object(
    'background', '#120806',
    'surface', '#1c110d',
    'accentFrom', '#ff8a1f',
    'accentTo', '#ff2d2d',
    'priceColor', '#f5c56b',
    'textColor', '#f7ecd8',
    'mutedColor', '#b8a58a',
    'headingFont', 'Playfair Display, serif',
    'glow', true
  ),
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Backfill restaurants without a template
UPDATE public.restaurants
SET menu_template_id = (SELECT id FROM public.menu_templates WHERE slug = 'fire-book')
WHERE menu_template_id IS NULL;
