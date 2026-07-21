import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode, type CSSProperties } from "react";
import { Minus, Plus, Search, ShoppingBag, Sparkles, X, Loader2, CheckCircle2, Home, UtensilsCrossed, Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recommendDishes } from "@/lib/ai.functions";
import { useServerFn } from "@tanstack/react-start";

import { mergeConfig, type TemplateConfig } from "@/lib/menu-template";
import { ViewIn3DButton } from "@/components/ViewIn3D";




import { FireBookMenu } from "@/components/FireBookMenu";


const menuQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public-menu", slug],
    queryFn: async () => {
      const { data: r, error: rErr } = await supabase
        .from("restaurants")
        .select("id, name, slug, category, currency, is_active, logo_url, cover_url, menu_template_id")
        .eq("slug", slug)
        .maybeSingle();
      if (rErr) throw rErr;
      if (!r || !r.is_active) throw notFound();

      const [{ data: cats }, { data: items }, tplRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, sort_order")
          .eq("restaurant_id", r.id)
          .order("sort_order"),
        supabase
          .from("food_items")
          .select(
            "id, name, description, price, discount_price, category_id, sort_order, image_url, is_veg, is_chef_recommended, is_todays_special, model_3d_url, model_3d_ios_url, enable_3d",
          )
          .eq("restaurant_id", r.id)
          .eq("is_available", true)
          .order("sort_order"),
        r.menu_template_id
          ? supabase.from("menu_templates").select("config").eq("id", r.menu_template_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const tpl = mergeConfig(((tplRes as { data: { config: TemplateConfig } | null }).data?.config) ?? null);
      return { restaurant: r, categories: cats ?? [], items: items ?? [], template: tpl };
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
  const { restaurant: r, categories, items, template } = data;
  const [tab, setTab] = useState<"home" | "menu" | "offers">("home");


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

  async function askAI(e: FormEvent) {
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

  const styleVars = {
    "--tpl-bg": template.background,
    "--tpl-surface": template.surface,
    "--tpl-accent-from": template.accentFrom,
    "--tpl-accent-to": template.accentTo,
    "--tpl-price": template.priceColor,
    "--tpl-text": template.textColor,
    "--tpl-muted": template.mutedColor,
    fontFamily: undefined,
  } as CSSProperties;
  const headingStyle: CSSProperties = { fontFamily: template.headingFont, color: template.textColor };
  const offers = items.filter((it) => it.is_todays_special);

  return (
    <div className="min-h-screen pb-32" style={{ ...styleVars, background: template.background, color: template.textColor }}>
      {tab === "menu" ? (
        <FireBookMenu
          restaurantName={r.name}
          logoUrl={r.logo_url}
          currency={r.currency}
          categories={categories}
          items={items}
          template={template}
          cart={Object.fromEntries(
            Object.entries(cart).map(([id, l]) => [id, l.qty])
          )}
          onAdd={(it) => addToCart(it as any)}
          onBump={(id, d) => bump(id, d)}
          onBack={() => setTab("home")}
          onOpenCart={() => setShowCart(true)}
          cartCount={cartCount}
        />
      ) : (
        <>
          <header className="border-b" style={{ borderColor: `${template.textColor}22` }}>
            <div className="mx-auto max-w-3xl px-5 py-10 text-center">
              {r.cover_url && (
                <img src={r.cover_url} alt="" className="mx-auto mb-4 h-40 w-full max-w-xl rounded-2xl object-cover" />
              )}
              {r.logo_url && (
                <img src={r.logo_url} alt={r.name} className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-2" style={{ boxShadow: template.glow ? `0 0 40px ${template.accentFrom}` : undefined }} />
              )}
              <p className="text-xs uppercase tracking-widest" style={{ color: template.accentFrom }}>{r.category || "Menu"}</p>
              <h1 className="mt-2 text-4xl font-semibold" style={headingStyle}>{r.name}</h1>
              <p className="mt-1 text-xs" style={{ color: template.mutedColor }}>Prices in {r.currency}</p>
          {r.logo_url && (
            <img src={r.logo_url} alt={r.name} className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-2" style={{ boxShadow: template.glow ? `0 0 40px ${template.accentFrom}` : undefined }} />
          )}
          <p className="text-xs uppercase tracking-widest" style={{ color: template.accentFrom }}>{r.category || "Menu"}</p>
          <h1 className="mt-2 text-4xl font-semibold" style={headingStyle}>{r.name}</h1>
          <p className="mt-1 text-xs" style={{ color: template.mutedColor }}>Prices in {r.currency}</p>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-2 px-5 pb-4">
          {(["home","menu","offers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
  setTab(t);
}}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition"
              style={tab === t
                ? { background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`, color: "#fff" }
                : { background: template.surface, color: template.mutedColor }}
            >
              {t === "home" ? <Home className="h-3.5 w-3.5" /> : t === "menu" ? <UtensilsCrossed className="h-3.5 w-3.5" /> : <Flame className="h-3.5 w-3.5" />}
              {t === "home" ? "Home" : t === "menu" ? "Menu" : "Offers"}
            </button>
          ))}
        </nav>
      </header>

      {tab === "home" && (
        <div className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: `${template.background}dd`, borderColor: `${template.textColor}22` }}>
          <div className="mx-auto max-w-3xl px-5 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: template.mutedColor }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search dishes"
                className="w-full rounded-full border py-2 pl-9 pr-3 text-sm outline-none"
                style={{ background: template.surface, borderColor: `${template.textColor}22`, color: template.textColor }}
              />
            </div>
            <nav className="mx-auto flex max-w-3xl gap-2 px-5 pb-4">
              {(["home","menu","offers"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition"
                  style={tab === t
                    ? { background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})`, color: "#fff" }
                    : { background: template.surface, color: template.mutedColor }}
                >
                  {t === "home" ? <Home className="h-3.5 w-3.5" /> : t === "menu" ? <UtensilsCrossed className="h-3.5 w-3.5" /> : <Flame className="h-3.5 w-3.5" />}
                  {t === "home" ? "Home" : t === "menu" ? "Menu" : "Offers"}
                </button>
              ))}
            </nav>
          </header>

          {tab === "home" && (
            <div className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: `${template.background}dd`, borderColor: `${template.textColor}22` }}>
              <div className="mx-auto max-w-3xl px-5 py-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: template.mutedColor }} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search dishes"
                    className="w-full rounded-full border py-2 pl-9 pr-3 text-sm outline-none"
                    style={{ background: template.surface, borderColor: `${template.textColor}22`, color: template.textColor }}
                  />
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  <FilterChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>All</FilterChip>
                  {categories.map((c) => (
                    <FilterChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>{c.name}</FilterChip>
                  ))}
                </div>
              </div>
            </div>
          )}

          <main className="mx-auto max-w-3xl px-5 py-8">
            {tab === "offers" && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold" style={headingStyle}>Today's specials</h2>
                {offers.length === 0 && <p className="text-sm" style={{ color: template.mutedColor }}>No specials today — check the full menu.</p>}
                {offers.map((it) => (
                  <DishRow key={it.id} it={it} r={r} template={template} isAI={aiIdSet.has(it.id)} cartQty={cart[it.id]?.qty} onAdd={() => addToCart(it)} onBump={(d) => bump(it.id, d)} />
                ))}
              </div>
            )}

            {tab === "home" && (
              <div className="space-y-8">
                {grouped.map((g) => (
                  <section key={g.key} className="space-y-3">
                    <h2 className="text-xl font-semibold" style={headingStyle}>{g.name}</h2>
                    {g.items.map((it) => (
                      <DishRow key={it.id} it={it} r={r} template={template} isAI={aiIdSet.has(it.id)} cartQty={cart[it.id]?.qty} onAdd={() => addToCart(it)} onBump={(d) => bump(it.id, d)} />
                    ))}
                  </section>
                ))}
                {grouped.length === 0 && (
                  <p className="text-center text-sm" style={{ color: template.mutedColor }}>No dishes match your search.</p>
                )}
              </div>
            )}

            <p className="mt-16 text-center text-[10px] uppercase tracking-widest" style={{ color: template.mutedColor }}>
              Powered by BAT MENU
            </p>
          </main>
        </>
      )}




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
  children: ReactNode;
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
type MenuItem = {
  id: string; name: string; description: string | null; price: number | string;
  discount_price: number | string | null; category_id: string | null;
  image_url: string | null; is_veg: boolean; is_chef_recommended: boolean;
  is_todays_special: boolean; model_3d_url: string | null; model_3d_ios_url: string | null; enable_3d: boolean;
};

function DishRow({ it, r, template, isAI, cartQty, onAdd, onBump }: {
  it: MenuItem;
  r: { currency: string };
  template: { surface: string; textColor: string; mutedColor: string; priceColor: string; accentFrom: string; accentTo: string };
  isAI: boolean; cartQty: number | undefined;
  onAdd: () => void; onBump: (delta: number) => void;
}) {
  const price = Number(it.discount_price ?? it.price);
  return (
    <div className="flex items-start gap-4 rounded-2xl border p-3" style={{ background: template.surface, borderColor: isAI ? template.accentFrom : `${template.textColor}22` }}>
      {it.image_url ? (
        <img src={it.image_url} alt={it.name} className="h-20 w-20 flex-none rounded-xl object-cover" />
      ) : (
        <div className="grid h-20 w-20 flex-none place-items-center rounded-xl text-xs" style={{ background: `${template.textColor}11`, color: template.mutedColor }}>
          {it.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold" style={{ color: template.textColor }}>{it.name}</p>
          {it.is_chef_recommended && <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: `${template.priceColor}33`, color: template.priceColor }}>Chef</span>}
          {it.is_todays_special && <span className="rounded-full px-1.5 py-0.5 text-[9px] text-white" style={{ background: template.accentFrom }}>Today</span>}
          {isAI && <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] text-white" style={{ background: template.accentTo }}><Sparkles className="h-2.5 w-2.5" /> Pick</span>}
        </div>
        {it.description && <p className="mt-0.5 line-clamp-2 text-xs" style={{ color: template.mutedColor }}>{it.description}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: template.priceColor }}>
            {r.currency} {price.toFixed(2)}
            {it.discount_price != null && <span className="ml-2 text-[10px] line-through" style={{ color: template.mutedColor }}>{Number(it.price).toFixed(2)}</span>}
          </p>
          <div className="flex items-center gap-2">
            {it.enable_3d && (it.model_3d_url || it.model_3d_ios_url) && (
              <ViewIn3DButton glbUrl={it.model_3d_url} usdzUrl={it.model_3d_ios_url} name={it.name} />
            )}
            {cartQty ? (
              <div className="flex items-center gap-2 rounded-full border px-1.5 py-1" style={{ borderColor: `${template.textColor}22` }}>
                <button onClick={() => onBump(-1)} className="grid h-6 w-6 place-items-center rounded-full" style={{ background: `${template.textColor}11`, color: template.textColor }}><Minus className="h-3 w-3" /></button>
                <span className="min-w-4 text-center text-xs font-semibold" style={{ color: template.textColor }}>{cartQty}</span>
                <button onClick={() => onBump(1)} className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}><Plus className="h-3 w-3" /></button>
              </div>
            ) : (
              <button onClick={onAdd} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: `linear-gradient(135deg, ${template.accentFrom}, ${template.accentTo})` }}>Add</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
