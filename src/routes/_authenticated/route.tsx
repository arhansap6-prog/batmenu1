import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, Store, KeyRound, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, signOut } from "@/lib/use-session";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (session.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Force password change on first login (except while on that page itself)
  if (
    session.mustChangePassword &&
    typeof window !== "undefined" &&
    !window.location.pathname.endsWith("/change-password")
  ) {
    navigate({ to: "/change-password", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md gradient-red">
              <span className="font-display text-xs font-bold text-primary-foreground">B</span>
            </div>
            <span className="font-display text-base font-semibold tracking-wide">BAT MENU</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-foreground bg-accent" }}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            {session.isSuperAdmin && (
              <Link
                to="/admin/restaurants"
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "text-foreground bg-accent" }}
              >
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Restaurants</span>
              </Link>
            )}
            {session.primaryRestaurantId && (
              <Link
                to="/orders"
                search={{ r: session.primaryRestaurantId }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                activeProps={{ className: "text-foreground bg-accent" }}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
            )}
            <Link
              to="/change-password"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Password</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="ml-1 flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
