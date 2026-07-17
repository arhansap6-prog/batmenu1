import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingBag, Sparkles, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recommendDishes } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";

const menuQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public-menu", slug],
    queryFn: async () => {
      const { data: r, error: rErr } = await supabase
        .from("restaurants")
        .select("id, name, slug, category, currency, is_active, logo_url, cover_url")
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
          .select(
            "id, name, description, price, discount_price, category_id, sort_order, image_url, is_veg, is_chef_recommended, is_todays_special",
          )
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
        ...(r.cover_url ? [{ property: "og:image", content: r.cover_url } as const] : []),
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

type CartLine = { id: string; name: string; price: number; qty: number };

function PublicMenu() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(menuQueryOptions(slug));
  const { restaurant: r, categories, items } = data;

  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [showCart, setShowCart] = useState(false);
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string } | null>(null);

  // AI concierge state
  const recommend = useServerFn(recommendDishes);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ picks: { id: string; reason: string }[]; summary: string } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((it) => {
      if (activeCat !== "all" && (it.category_id ?? "_uncat") !== activeCat) return false;
      if (!term) return true;
      return (
        it.name.toLowerCase().includes(term) ||
        (it.description?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [items, q, activeCat]);

  const grouped = useMemo(() => {
    const groups: { key: string; name: string; items: typeof filtered }[] = categories.map((c) => ({
      key: c.id,
      name: c.name,
      items: filtered.filter((it) => it.category_id === c.id),
    }));
    const uncat = filtered.filter((it) => !it.category_id);
    if (uncat.length) groups.push({ key: "_uncat", name: "More", items: uncat });
    return groups.filter((g) => g.items.length > 0);
  }, [filtered, categories]);

  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0);
  const cartTotal = cartLines.reduce((a, l) => a + l.qty * l.price, 0);

  function addToCart(it: (typeof items)[number]) {
    const price = Number(it.discount_price ?? it.price);
    setCart((c) => {
      const next = { ...c };
      const line = next[it.id];
      next[it.id] = line
        ? { ...line, qty: line.qty + 1 }
        : { id: it.id, name: it.name, price, qty: 1 };
      return next;
    });
    toast.success(`${it.name} added`, { duration: 1200 });
  }
  function bump(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c };
      const line = next[id];
      if (!line) return c;
      const nq = line.qty + delta;
      if (nq <= 0) delete next[id];
      else next[id] = { ...line, qty: nq };
      return next;
    });
  }

  async function askAI(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await recommend({
        data: {
          query: aiQuery,
          restaurant_name: r.name,
          currency: r.currency,
          items: items.slice(0, 120).map((it) => ({
            id: it.id,
            name: it.name,
            description: it.description ?? null,
            price: Number(it.discount_price ?? it.price),
            category:
              categories.find((c) => c.id === it.category_id)?.name ?? null,
          })),
        },
      });
      setAiResult(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI unavailable");
    } finally {
      setAiLoading(false);
    }
  }

  async function placeOrder() {
    if (cartLines.length === 0) return;
    setPlacing(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: r.id,
          table_number: table.trim() || null,
          customer_name: name.trim() || null,
          notes: notes.trim() || null,
          currency: r.currency,
          total: cartTotal,
        })
        .select("id")
        .single();
      if (error || !order) throw new Error(error?.message ?? "Could not place order");

      const { error: itemsErr } = await supabase.from("order_items").insert(
        cartLines.map((l) => ({
          order_id: order.id,
          food_item_id: l.id,
          name: l.name,
          price: l.price,
          qty: l.qty,
        })),
      );
      if (itemsErr) throw new Error(itemsErr.message);

      setPlaced({ id: order.id });
      setCart({});
      setShowCart(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  const aiIdSet = new Set(aiResult?.picks.map((p) => p.id) ?? []);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 py-10 text-center">
          {r.logo_url && (
            <img src={r.logo_url} alt={r.name} className="mx-auto mb-4 h-14 w-14 rounded-full object-cover ring-2 ring-primary/40" />
          )}
          <p className="text-xs uppercase tracking-widest text-primary">{r.category || "Menu"}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">{r.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">Prices in {r.currency}</p>

          <button
            onClick={() => setAiOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <Sparkles className="h-3.5 w-3.5" /> Ask the AI concierge
          </button>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes"
              className="w-full rounded-full border border-border bg-input py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <FilterChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>All</FilterChip>
            {categories.map((c) => (
              <FilterChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                {c.name}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {grouped.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No dishes match your search.</p>
        )}
        <div className="space-y-10">
          {grouped.map((g) => (
            <section key={g.key}>
              <h2 className="font-display text-xl font-semibold">{g.name}</h2>
              <div className="mt-4 space-y-3">
                {g.items.map((it) => {
                  const price = Number(it.discount_price ?? it.price);
                  const isAI = aiIdSet.has(it.id);
                  return (
                    <div
                      key={it.id}
                      className={`flex items-start gap-4 rounded-2xl border p-3 transition ${
                        isAI ? "border-primary/60 bg-primary/5" : "border-border/60 bg-card"
                      }`}
                    >
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.name} className="h-20 w-20 flex-none rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-20 w-20 flex-none place-items-center rounded-xl bg-muted text-xs text-muted-foreground">
                          {it.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold">{it.name}</p>
                          {it.is_chef_recommended && (
                            <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-medium text-gold">Chef</span>
                          )}
                          {it.is_todays_special && (
                            <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium text-primary">Today</span>
                          )}
                          {isAI && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                              <Sparkles className="h-2.5 w-2.5" /> Pick
                            </span>
                          )}
                        </div>
                        {it.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{it.description}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-sm font-medium text-primary">
                            {r.currency} {price.toFixed(2)}
                            {it.discount_price != null && (
                              <span className="ml-2 text-[10px] text-muted-foreground line-through">
                                {Number(it.price).toFixed(2)}
                              </span>
                            )}
                          </p>
                          {cart[it.id] ? (
                            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1.5 py-1">
                              <button onClick={() => bump(it.id, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-muted">
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-4 text-center text-xs font-semibold">{cart[it.id].qty}</span>
                              <button onClick={() => bump(it.id, 1)} className="grid h-6 w-6 place-items-center rounded-full gradient-red text-primary-foreground">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(it)}
                              className="rounded-full gradient-red px-3 py-1 text-xs font-medium text-primary-foreground"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-16 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Powered by BAT MENU
        </p>
      </main>

      {/* Sticky cart bar */}
      {cartCount > 0 && !showCart && !placed && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-full gradient-red px-5 py-3 text-primary-foreground shadow-2xl"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="h-4 w-4" /> {cartCount} item{cartCount > 1 ? "s" : ""}
          </span>
          <span className="text-sm font-semibold">
            {r.currency} {cartTotal.toFixed(2)} · Review
          </span>
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={() => setShowCart(false)}>
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Your order</h3>
              <button onClick={() => setShowCart(false)} className="rounded-full p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {cartLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="text-[11px] text-muted-foreground">{r.currency} {l.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-border bg-background px-1.5 py-1">
                    <button onClick={() => bump(l.id, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-muted">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-4 text-center text-xs font-semibold">{l.qty}</span>
                    <button onClick={() => bump(l.id, 1)} className="grid h-6 w-6 place-items-center rounded-full gradient-red text-primary-foreground">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <input
                value={table}
                onChange={(e) => setTable(e.target.value)}
                placeholder="Table # (optional)"
                maxLength={20}
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                maxLength={80}
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for the kitchen (allergies, etc.)"
                maxLength={400}
                rows={2}
                className="rounded-lg border border-border bg-input px-3 py-2 text-sm sm:col-span-2"
              />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-display text-xl font-semibold">
                  {r.currency} {cartTotal.toFixed(2)}
                </p>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="inline-flex items-center gap-2 rounded-full gradient-red px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {placing && <Loader2 className="h-4 w-4 animate-spin" />}
                Place order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {placed && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-6 backdrop-blur">
          <div className="w-full max-w-sm rounded-3xl border border-primary/40 bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-3 font-display text-2xl font-semibold">Order sent</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Your order is with the kitchen. Reference #{placed.id.slice(0, 8)}
            </p>
            <button
              onClick={() => setPlaced(null)}
              className="mt-5 w-full rounded-full gradient-red py-2.5 text-sm font-medium text-primary-foreground"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* AI concierge modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 bg-background/70 p-6 backdrop-blur" onClick={() => setAiOpen(false)}>
          <div
            className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold">AI concierge</h3>
              </div>
              <button onClick={() => setAiOpen(false)} className="rounded-full p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={askAI} className="space-y-3">
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="e.g. Something light and spicy for two, no seafood"
                rows={3}
                maxLength={400}
                className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiQuery.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-red py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Recommend
              </button>
            </form>

            {aiResult && (
              <div className="mt-4 space-y-3">
                {aiResult.summary && <p className="text-sm text-muted-foreground">{aiResult.summary}</p>}
                {aiResult.picks.map((p) => {
                  const it = items.find((i) => i.id === p.id);
                  if (!it) return null;
                  return (
                    <div key={p.id} className="rounded-xl border border-primary/40 bg-primary/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{it.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{p.reason}</p>
                        </div>
                        <button
                          onClick={() => {
                            addToCart(it);
                          }}
                          className="rounded-full gradient-red px-3 py-1 text-xs font-medium text-primary-foreground"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
                {aiResult.picks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No matching dishes today — try rephrasing your craving.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
