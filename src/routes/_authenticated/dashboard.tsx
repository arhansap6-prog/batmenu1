import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Store, ShieldCheck, ExternalLink, Palette, Utensils } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";
import { platformStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — BAT MENU" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.loading) return;
    if (session.mustChangePassword) navigate({ to: "/change-password", replace: true });
  }, [session, navigate]);

  const restaurantsQ = useQuery({
    queryKey: ["my-restaurants", session.user?.id, session.isSuperAdmin],
    enabled: !!session.user,
    queryFn: async () => {
      if (session.isSuperAdmin) {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, name, slug, is_active, plan, currency, category")
          .order("created_at", { ascending: false })
          .limit(6);
        if (error) throw error;
        return data ?? [];
      }
      const ids = session.roles.map((r) => r.restaurant_id).filter(Boolean) as string[];
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, is_active, plan, currency, category")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (session.loading || restaurantsQ.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
  <div className="space-y-8 pt-6 pb-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Welcome back{session.user?.email ? `, ${session.user.email}` : ""}
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          {session.isSuperAdmin ? "Platform Control Center" : "Your restaurants"}
        </h1>
        {session.isSuperAdmin && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <ShieldCheck className="h-3 w-3" /> Super Admin
          </span>
        )}
      </div>

      {restaurantsQ.isError && (
        <div className="glass rounded-xl p-6 text-sm text-destructive">
          Failed to load. <button onClick={() => restaurantsQ.refetch()} className="underline">Retry</button>
        </div>
      )}

      {restaurantsQ.data && restaurantsQ.data.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg">No restaurants yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {session.isSuperAdmin
              ? "Create your first restaurant to get started."
              : "You haven't been assigned to a restaurant yet. Contact your Super Admin."}
          </p>
          {session.isSuperAdmin && (
            <Link
              to="/admin/restaurants"
              className="mt-5 inline-flex rounded-md gradient-red px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Manage restaurants
            </Link>
          )}
        </div>
      )}

      {restaurantsQ.data && restaurantsQ.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurantsQ.data.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {r.category || "Restaurant"} · {r.currency} · {r.plan}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    r.is_active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.is_active ? "Active" : "Suspended"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/owner/menu"
                  search={{ r: r.id }}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  Manage menu
                </Link>
                <a
                  href={`/r/${r.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md gradient-red px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
