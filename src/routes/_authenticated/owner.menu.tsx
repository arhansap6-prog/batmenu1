import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff, Upload, Box, ImageIcon, Star, Flame, Leaf, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrView } from "@/components/QrCode";

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

async function uploadAssetSigned(restaurantId: string, file: File, subfolder: "dishes" | "3d") {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${restaurantId}/${subfolder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("restaurant-assets")
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (upErr) throw upErr;
  const { data: signed, error: signErr } = await supabase.storage
    .from("restaurant-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed) throw signErr ?? new Error("Could not sign URL");
  return signed.signedUrl;
}

function OwnerMenu() {
  const { restaurantId } = Route.useRouteContext();
  const qc = useQueryClient();
  const [showQr, setShowQr] = useState(false);

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
        .select("id, name, price, discount_price, category_id, is_available, description, image_url, is_veg, is_chef_recommended, is_todays_special, model_3d_url, model_3d_ios_url, enable_3d")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [catName, setCatName] = useState("");
  const [item, setItem] = useState({
    name: "",
    price: "",
    discount_price: "",
    category_id: "",
    description: "",
    is_veg: false,
    is_chef_recommended: false,
    is_todays_special: false,
  });

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = catName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("categories")
      .insert({ restaurant_id: restaurantId, name, sort_order: catsQ.data?.length ?? 0 });
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
    const discount = item.discount_price === "" ? null : Number(item.discount_price);
    const { error } = await supabase.from("food_items").insert({
      restaurant_id: restaurantId,
      name: item.name.trim(),
      description: item.description.trim() || null,
      price,
      discount_price: discount,
      category_id: item.category_id || null,
      is_veg: item.is_veg,
      is_chef_recommended: item.is_chef_recommended,
      is_todays_special: item.is_todays_special,
    });
    if (error) return toast.error(error.message);
    setItem({ name: "", price: "", discount_price: "", category_id: "", description: "", is_veg: false, is_chef_recommended: false, is_todays_special: false });
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

  async function updateItem(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("food_items").update(patch as never).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["items", restaurantId] });
  }

  if (restaurantQ.isLoading) {
    return <div className="grid min-h-[40vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (restaurantQ.isError || !restaurantQ.data) {
    return <div className="glass rounded-xl p-6 text-sm text-destructive">Failed to load restaurant.</div>;
  }

  const r = restaurantQ.data;
  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${r.slug}` : `/r/${r.slug}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Menu manager</p>
          <h1 className="font-display text-3xl font-semibold">{r.name}</h1>
          <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">
            /r/{r.slug} ↗
          </a>
        </div>
        <button
          onClick={() => setShowQr((s) => !s)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
        >
          <QrCode className="h-4 w-4" /> {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {showQr && (
        <section className="glass rounded-2xl p-6">
          <QrView url={menuUrl} label={r.slug} />
        </section>
      )}

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Categories</h2>
        <form onSubmit={addCategory} className="mt-3 flex gap-2">
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Starters" maxLength={60}
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary" />
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
          {catsQ.data && catsQ.data.length === 0 && <p className="text-xs text-muted-foreground">No categories yet.</p>}
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Add a dish</h2>
        <form onSubmit={addItem} className="mt-3 grid gap-3 sm:grid-cols-4">
          <input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Dish name" maxLength={120} required
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm sm:col-span-2" />
          <input value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} placeholder={`Price (${r.currency})`}
            type="number" step="0.01" min="0" required className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
          <input value={item.discount_price} onChange={(e) => setItem({ ...item, discount_price: e.target.value })} placeholder="Discount price (optional)"
            type="number" step="0.01" min="0" className="rounded-lg border border-border bg-input px-3 py-2 text-sm" />
          <select value={item.category_id} onChange={(e) => setItem({ ...item, category_id: e.target.value })}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm sm:col-span-2">
            <option value="">Uncategorised</option>
            {catsQ.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })}
            placeholder="Short description (optional)" maxLength={500}
            className="rounded-lg border border-border bg-input px-3 py-2 text-sm sm:col-span-4" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.is_veg} onChange={(e) => setItem({ ...item, is_veg: e.target.checked })} /> Veg</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.is_chef_recommended} onChange={(e) => setItem({ ...item, is_chef_recommended: e.target.checked })} /> Chef's pick</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={item.is_todays_special} onChange={(e) => setItem({ ...item, is_todays_special: e.target.checked })} /> Today's special</label>
          <button className="inline-flex items-center justify-center gap-1.5 rounded-lg gradient-red px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </form>
      </section>

      <section className="glass rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Menu items</h2>
        <div className="mt-4 space-y-3">
          {itemsQ.data?.map((it) => {
            const cat = catsQ.data?.find((c) => c.id === it.category_id);
            return (
              <ItemRow
                key={it.id}
                item={it}
                categoryName={cat?.name}
                currency={r.currency}
                restaurantId={restaurantId}
                onToggle={(next) => toggleAvail(it.id, next)}
                onDelete={() => delItem(it.id)}
                onPatch={(patch) => updateItem(it.id, patch)}
              />
            );
          })}
          {itemsQ.data && itemsQ.data.length === 0 && <p className="text-xs text-muted-foreground">No items yet.</p>}
        </div>
      </section>
    </div>
  );
}

type FoodItem = {
  id: string;
  name: string;
  price: number | string;
  discount_price: number | string | null;
  category_id: string | null;
  is_available: boolean;
  description: string | null;
  image_url: string | null;
  is_veg: boolean;
  is_chef_recommended: boolean;
  is_todays_special: boolean;
  model_3d_url: string | null;
  model_3d_ios_url: string | null;
  enable_3d: boolean;
};

function ItemRow({
  item,
  categoryName,
  currency,
  restaurantId,
  onToggle,
  onDelete,
  onPatch,
}: {
  item: FoodItem;
  categoryName?: string;
  currency: string;
  restaurantId: string;
  onToggle: (next: boolean) => void;
  onDelete: () => void;
  onPatch: (patch: Record<string, unknown>) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<"img" | "glb" | "usdz" | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const glbRef = useRef<HTMLInputElement>(null);
  const usdzRef = useRef<HTMLInputElement>(null);

  async function upload(file: File, kind: "img" | "glb" | "usdz") {
    setBusy(kind);
    try {
      const url = await uploadAssetSigned(restaurantId, file, kind === "img" ? "dishes" : "3d");
      const patch: Record<string, unknown> =
        kind === "img" ? { image_url: url } : kind === "glb" ? { model_3d_url: url, enable_3d: true } : { model_3d_ios_url: url };
      await onPatch(patch);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 flex-none">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-20 w-20 rounded-lg object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-lg bg-muted text-[10px] text-muted-foreground">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <button
            onClick={() => imgRef.current?.click()}
            className="absolute inset-0 grid place-items-center rounded-lg bg-black/50 text-[10px] text-white opacity-0 hover:opacity-100"
            title="Upload photo"
          >
            {busy === "img" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3 w-3" /> Photo</>}
          </button>
          <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "img")} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{item.name}</p>
            {item.is_veg && <Leaf className="h-3 w-3 text-green-500" />}
            {item.is_chef_recommended && <Star className="h-3 w-3 text-amber-400" />}
            {item.is_todays_special && <Flame className="h-3 w-3 text-primary" />}
            {item.enable_3d && item.model_3d_url && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                <Box className="h-2.5 w-2.5" /> 3D
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {categoryName ?? "Uncategorised"} · {currency} {Number(item.price).toFixed(2)}
            {item.discount_price != null && <> · <span className="text-primary">{currency} {Number(item.discount_price).toFixed(2)}</span></>}
            {!item.is_available && <span className="ml-2 text-destructive">Hidden</span>}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px]">
              <input type="checkbox" checked={item.is_veg} onChange={(e) => onPatch({ is_veg: e.target.checked })} /> Veg
            </label>
            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px]">
              <input type="checkbox" checked={item.is_chef_recommended} onChange={(e) => onPatch({ is_chef_recommended: e.target.checked })} /> Chef
            </label>
            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px]">
              <input type="checkbox" checked={item.is_todays_special} onChange={(e) => onPatch({ is_todays_special: e.target.checked })} /> Today's special
            </label>
            <label className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px]">
              <input type="checkbox" checked={item.enable_3d} onChange={(e) => onPatch({ enable_3d: e.target.checked })} /> 3D
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2 text-[11px]">
            <span className="text-muted-foreground">3D:</span>
            <button onClick={() => glbRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent">
              {busy === "glb" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {item.model_3d_url ? "Replace .glb" : "Upload .glb (Android/WebXR)"}
            </button>
            <input ref={glbRef} type="file" accept=".glb,.gltf,model/gltf-binary" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "glb")} />

            <button onClick={() => usdzRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:bg-accent">
              {busy === "usdz" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {item.model_3d_ios_url ? "Replace .usdz" : "Upload .usdz (iPhone AR)"}
            </button>
            <input ref={usdzRef} type="file" accept=".usdz,model/vnd.usdz+zip" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "usdz")} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => onToggle(!item.is_available)}
            className="rounded-md border border-border bg-card p-1.5 hover:bg-accent"
            title={item.is_available ? "Hide" : "Show"}>
            {item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button onClick={onDelete}
            className="rounded-md border border-border bg-card p-1.5 text-destructive hover:bg-destructive/10"
            title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
