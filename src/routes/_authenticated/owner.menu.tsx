import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/owner/menu")({
  head: () => ({ meta: [{ title: "Menu manager — BAT MENU" }, { name: "robots", content: "noindex" }] }),
  validateSearch: z.object({ r: z.string().uuid().optional() }),
  beforeLoad: async ({ search }) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", userRes.user.id);
    const isSA = (roles ?? []).some((r) => r.role === "super_admin");
    const owned = (roles ?? [])
      .filter((r) => r.role === "owner" || r.role === "manager")
      .map((r) => r.restaurant_id)
      .filter(Boolean) as string[];
    let rid = search.r;
    if (!rid) rid = owned[0];
    if (!rid) throw redirect({ to: "/dashboard" });
    if (!isSA && !owned.includes(rid)) throw redirect({ to: "/access-denied" });
    return { restaurantId: rid };
  },
  component: OwnerMenu,
});

function OwnerMenu() {
  const { restaurantId } = Route.useRouteContext();
  const qc = useQueryClient();

  const restaurantQ = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, currency, is_active")
        .eq("id", restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const catsQ = useQuery({
    queryKey: ["categories", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const itemsQ = useQuery({
    queryKey: ["items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_items")
        .select("id, name, price, category_id, is_available, description")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [catName, setCatName] = useState("");
  const [item, setItem] = useState({ name: "", price: "", category_id: "", description: "" });

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("categories")
      .insert({ restaurant_id: restaurantId, name, sort_order: (catsQ.data?.length ?? 0) });
    if (error) return toast.error(error.message);
    setCatName("");
    qc.invalidateQueries({ queryKey: ["categories", restaurantId] });
    toast.success("Category added");
  }

  async function delCategory(id: string) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories", restaurantId] });
    qc.invalidateQueries({ queryKey: ["items", restaurantId] });
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(item.price);
    if (!item.name.trim() || !Number.isFinite(price) || price < 0)
      return toast.error("Enter a valid name and price");
    const { error } = await supabase.from("food_items").insert({
      restaurant_id: restaurantId,
      name: item.name.trim(),
      description: item.description.trim() || null,
      price,
      category_id: item.category_id || null,
    });
    if (error) return toast.error(error.message);
    setItem({ name: "", price: "", category_id: "", description: "" });
    qc.invalidateQueries({ queryKey: ["items", restaurantId] });
    toast.success("Item added");
  }

  async function toggleAvail(id: string, next: boolean) {
    const { error } = await supabase.from("food_items").update({ is_available: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["items", restaurantId] });
  }

  async function delItem(id: string) {
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["items", restaurantId] });
  }

  if (restaurantQ.isLoading) {
    return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (restaurantQ.isError || !restaurantQ.data) {
    return <div className="glass rounded-xl p-6 text-sm text-destructive">Failed to load restaurant.</div>;
  }

  const r = restaurantQ.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Menu manager</p>
          <h1 className="font-display text-3xl font-semibold">{r.name}</h1>
          <a
            href={`/r/${r.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-primary hover:underline"
          >
            /r/{r.slug} ↗
          </a>
        </div>
      </div>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Categories</h2>
        <form onSubmit={addCategory} className="mt-3 flex gap-2">
          <input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Starters"
            maxLength={60}
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button className="inline-flex items-center gap-1.5 rounded-lg gradient-red px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {catsQ.data?.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs">
              {c.name}
              <button onClick={() => delCategory(c.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
          {catsQ.data && catsQ.data.length === 0 && (
            <p className="text-xs text-muted-foreground">No categories yet.</p>
          )}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Items</h2>
        <form onSubmit={addItem} className="mt-3 grid gap-3 sm:grid-cols-4">
          <input
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
            placeholder="Item name"
            maxLength={120}
            required
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            value={item.price}
            onChange={(e) => setItem({ ...item, price: e.target.value })}
            placeholder={`Price (${r.currency})`}
            type="number"
            step="0.01"
            min="0"
            required
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
          />
          <select
            value={item.category_id}
            onChange={(e) => setItem({ ...item, category_id: e.target.value })}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm"
          >
            <option value="">Uncategorised</option>
            {catsQ.data?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea
            value={item.description}
            onChange={(e) => setItem({ ...item, description: e.target.value })}
            placeholder="Short description (optional)"
            maxLength={500}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm sm:col-span-3"
          />
          <button className="inline-flex items-center justify-center gap-1.5 rounded-lg gradient-red px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </form>

        <div className="mt-6 divide-y divide-border/60 rounded-xl border border-border/60">
          {itemsQ.data?.map((it) => {
            const cat = catsQ.data?.find((c) => c.id === it.category_id);
            return (
              <div key={it.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cat ? cat.name : "Uncategorised"} · {r.currency} {Number(it.price).toFixed(2)}
                    {!it.is_available && <span className="ml-2 text-destructive">Hidden</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAvail(it.id, !it.is_available)}
                    className="rounded-md border border-border bg-card p-1.5 hover:bg-accent"
                    title={it.is_available ? "Hide" : "Show"}
                  >
                    {it.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => delItem(it.id)}
                    className="rounded-md border border-border bg-card p-1.5 text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {itemsQ.data && itemsQ.data.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No items yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
