
-- Public read (needed for customer QR menu)
CREATE POLICY "public read restaurant assets"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'restaurant-assets');

-- Path convention: <restaurant_id>/<...>
CREATE POLICY "super admin writes restaurant assets"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'restaurant-assets' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'restaurant-assets' AND public.is_super_admin(auth.uid()));

CREATE POLICY "owner writes own restaurant assets"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'restaurant-assets'
  AND public.user_can_edit_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'restaurant-assets'
  AND public.user_can_edit_restaurant(auth.uid(), (storage.foldername(name))[1]::uuid)
);
