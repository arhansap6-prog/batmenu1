import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole =
  | "super_admin"
  | "owner"
  | "manager"
  | "cashier"
  | "chef"
  | "kitchen"
  | "waiter"
  | "designer"
  | "viewer";

export interface SessionState {
  loading: boolean;
  user: User | null;
  roles: { role: AppRole; restaurant_id: string | null }[];
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  primaryRestaurantId: string | null;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true,
    user: null,
    roles: [],
    isSuperAdmin: false,
    mustChangePassword: false,
    primaryRestaurantId: null,
  });

  useEffect(() => {
    let mounted = true;

    async function load(user: User | null) {
      if (!user) {
        if (mounted)
          setState({
            loading: false,
            user: null,
            roles: [],
            isSuperAdmin: false,
            mustChangePassword: false,
            primaryRestaurantId: null,
          });
        return;
      }
      const [rolesRes, profRes] = await Promise.all([
        supabase.from("user_roles").select("role, restaurant_id").eq("user_id", user.id),
        supabase.from("profiles").select("must_change_password").eq("id", user.id).maybeSingle(),
      ]);
      const roles = (rolesRes.data ?? []) as { role: AppRole; restaurant_id: string | null }[];
      if (!mounted) return;
      setState({
        loading: false,
        user,
        roles,
        isSuperAdmin: roles.some((r) => r.role === "super_admin"),
        mustChangePassword: profRes.data?.must_change_password ?? false,
        primaryRestaurantId: roles.find((r) => r.restaurant_id)?.restaurant_id ?? null,
      });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session?.user ?? null));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut() {
  await supabase.auth.signOut();
}
