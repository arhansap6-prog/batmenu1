
-- Table
CREATE TABLE public.app_intro_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Only one active at a time
CREATE UNIQUE INDEX app_intro_videos_one_active
  ON public.app_intro_videos ((is_active))
  WHERE is_active = true;

GRANT SELECT ON public.app_intro_videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_intro_videos TO authenticated;
GRANT ALL ON public.app_intro_videos TO service_role;

ALTER TABLE public.app_intro_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active intro video"
  ON public.app_intro_videos FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can insert intro videos"
  ON public.app_intro_videos FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update intro videos"
  ON public.app_intro_videos FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete intro videos"
  ON public.app_intro_videos FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Storage policies on intro-videos bucket
CREATE POLICY "Public can read intro-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'intro-videos');

CREATE POLICY "Super admin can upload intro-videos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'intro-videos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update intro-videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'intro-videos' AND public.is_super_admin(auth.uid()))
  WITH CHECK (bucket_id = 'intro-videos' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete intro-videos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'intro-videos' AND public.is_super_admin(auth.uid()));
