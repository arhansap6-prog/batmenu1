import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const menuQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public-menu", slug],
    queryFn: async () => {
      const { data: r, error: rErr } = await supabase
        .from("restaurants")
        .select("id, name, slug, category, currency, is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (rErr) throw rErr;
      if (!r || !r.is_active) throw notFound();

      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, sort_order")
          .eq("restaurant_id", r.id)
          .order("sort_order"),
        supabase
          .from("food_items")
          .select("id, name, description, price, category_id, sort_order")
          .eq("restaurant_id", r.id)
          .eq("is_available", true)
          .order("sort_order"),
      ]);
      return { restaurant: r, categories: cats ?? [], items: items ?? [] };
    },
  });

export const Route = createFileRoute("/r/$slug")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(menuQueryOptions(params.slug)),
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Menu — BAT MENU" }] };
    const r = loaderData.restaurant;
    return {
      meta: [
        { title: `${r.name} — Menu` },
        { name: "description", content: `Digital menu for ${r.name}${r.category ? ` — ${r.category}` : ""}.` },
        { property: "og:title", content: `${r.name} — Menu` },
        { property: "og:description", content: `Explore the digital menu for ${r.name}.` },
        { property: "og:type", content: "website" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold">Menu not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">This restaurant is not accepting orders right now.</p>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="text-center">
        <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="mt-4 rounded-md gradient-red px-4 py-2 text-sm text-primary-foreground">Retry</button>
      </div>
    </div>
  ),
  component: PublicMenu,
});

function PublicMenu() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(menuQueryOptions(slug));
  const { restaurant: r, categories, items } = data;

  const grouped: { key: string; name: string; items: typeof items }[] = [
    ...categories.map((c) => ({
      key: c.id,
      name: c.name,
      items: items.filter((it) => it.category_id === c.id),
    })),
    { key: "_uncat", name: "More", items: items.filter((it) => !it.category_id) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 py-10 text-center">
          <p className="text-xs uppercase tracking-widest text-primary">{r.category || "Menu"}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">{r.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Prices in {r.currency}</p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">
        {grouped.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">This menu is still being prepared.</p>
        )}
        <div className="space-y-10">
          {grouped.map((g) => (
            <section key={g.key}>
              <h2 className="font-display text-xl font-semibold">{g.name}</h2>
              <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
                {g.items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{it.name}</p>
                      {it.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{it.description}</p>
                      )}
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium text-primary">
                      {r.currency} {Number(it.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-16 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Powered by BAT MENU
        </p>
      </main>
    </div>
  );
}
