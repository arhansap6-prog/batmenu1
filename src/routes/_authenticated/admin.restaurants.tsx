import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Store, Power, ExternalLink, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createRestaurantWithOwner, setRestaurantActive } from "@/lib/admin.functions";
import { QrModal, QrView } from "@/components/QrCode";

export const Route = createFileRoute("/_authenticated/admin/restaurants")({
  head: () => ({ meta: [{ title: "Restaurants — Admin" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: userRes.user.id });
    if (!isSA) throw redirect({ to: "/access-denied" });
  },
  component: AdminRestaurants,
});

type NewForm = {
  restaurant_name: string;
  category: string;
  currency: string;
  language: string;
  country: string;
  plan: "free" | "starter" | "basic" | "professional" | "premium" | "enterprise" | "unlimited";
  menu_template_id: string;
  owner_full_name: string;
  owner_email: string;
  owner_mobile: string;
  owner_username: string;
  owner_password: string;
};

const emptyForm: NewForm = {
  restaurant_name: "",
  category: "",
  currency: "USD",
  language: "en",
  country: "",
  plan: "starter",
  menu_template_id: "",
  owner_full_name: "",
  owner_email: "",
  owner_mobile: "",
  owner_username: "",
  owner_password: "",
};

function AdminRestaurants() {
  const qc = useQueryClient();
  const createFn = useServerFn(createRestaurantWithOwner);
  const toggleFn = useServerFn(setRestaurantActive);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; slug: string } | null>(null);
  const [qrFor, setQrFor] = useState<{ name: string; slug: string } | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, is_active, plan, currency, category, country, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const templatesQ = useQuery({
    queryKey: ["templates-published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_templates")
        .select("id, name, slug")
        .eq("is_published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  function up<K extends keyof NewForm>(k: K, v: NewForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createFn({
        data: {
          ...form,
          menu_template_id: form.menu_template_id || null,
        },
      });
      toast.success(`Created ${form.restaurant_name}`);
      setJustCreated({ name: form.restaurant_name, slug: res.slug });
      try {
        await navigator.clipboard.writeText(
          `Restaurant: ${form.restaurant_name}\nMenu: ${window.location.origin}/r/${res.slug}\nOwner email: ${form.owner_email}\nTemp password: ${form.owner_password}`,
        );
        toast.info("Credentials copied to clipboard");
      } catch {}
      setForm(emptyForm);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    try {
      await toggleFn({ data: { id, is_active: next } });
      toast.success(next ? "Activated" : "Suspended");
      qc.invalidateQueries({ queryKey: ["admin-restaurants"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Super Admin</p>
          <h1 className="font-display text-3xl font-semibold">Restaurants</h1>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-md gradient-red px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Close" : "New restaurant"}
        </button>
      </div>

      {justCreated && (
        <div className="glass rounded-2xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">{justCreated.name} is live</h3>
            <button onClick={() => setJustCreated(null)} className="text-xs text-muted-foreground hover:underline">Dismiss</button>
          </div>
          <QrView url={`${origin}/r/${justCreated.slug}`} label={justCreated.slug} />
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="glass grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
          <Field label="Restaurant name" required value={form.restaurant_name} onChange={(v) => up("restaurant_name", v)} />
          <Field label="Category (e.g. Cafe)" value={form.category} onChange={(v) => up("category", v)} />
          <Field label="Currency" value={form.currency} onChange={(v) => up("currency", v)} />
          <Field label="Language" value={form.language} onChange={(v) => up("language", v)} />
          <Field label="Country" value={form.country} onChange={(v) => up("country", v)} />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan</label>
            <select
              value={form.plan}
              onChange={(e) => up("plan", e.target.value as NewForm["plan"])}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm"
            >
              {["free","starter","basic","professional","premium","enterprise","unlimited"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Menu template</label>
            <select
              value={form.menu_template_id}
              onChange={(e) => up("menu_template_id", e.target.value)}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm"
            >
              <option value="">Default (Fire Book)</option>
              {templatesQ.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 mt-2 border-t border-border/60 pt-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Owner account</p>
          </div>
          <Field label="Owner full name" required value={form.owner_full_name} onChange={(v) => up("owner_full_name", v)} />
          <Field label="Owner email" required type="email" value={form.owner_email} onChange={(v) => up("owner_email", v)} />
          <Field label="Owner mobile" value={form.owner_mobile} onChange={(v) => up("owner_mobile", v)} />
          <Field label="Username" required value={form.owner_username} onChange={(v) => up("owner_username", v)} />
          <Field
            label="Temporary password (min 8)"
            required
            type="text"
            value={form.owner_password}
            onChange={(v) => up("owner_password", v)}
          />
          <div className="sm:col-span-2">
            <button
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg gradient-red px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create restaurant & owner
            </button>
          </div>
        </form>
      )}

      {listQ.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : listQ.isError ? (
        <div className="glass rounded-xl p-6 text-sm text-destructive">
          Failed to load.{" "}
          <button onClick={() => listQ.refetch()} className="underline">Retry</button>
        </div>
      ) : listQ.data && listQ.data.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg">No restaurants yet</h3>
          <p className="text-sm text-muted-foreground">Create your first restaurant above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {listQ.data?.map((r) => (
                <tr key={r.id} className="bg-background/40">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.slug}</td>
                  <td className="px-4 py-3">{r.plan}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setQrFor({ name: r.name, slug: r.slug })}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        <QrCode className="h-3 w-3" /> QR
                      </button>
                      <a
                        href={`/r/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => toggleActive(r.id, !r.is_active)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        <Power className="h-3 w-3" />
                        {r.is_active ? "Suspend" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrFor && (
        <QrModal
          url={`${origin}/r/${qrFor.slug}`}
          label={qrFor.name}
          onClose={() => setQrFor(null)}
        />
      )}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={255}
        className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
