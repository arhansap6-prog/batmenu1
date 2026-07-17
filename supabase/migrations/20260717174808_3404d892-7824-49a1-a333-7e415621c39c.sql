
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.user_manages_restaurant(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_edit_restaurant(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_single_super_admin() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.block_super_admin_update() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_touch_updated_at() FROM public, anon, authenticated;
