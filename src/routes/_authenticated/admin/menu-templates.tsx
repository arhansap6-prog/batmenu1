import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff, Palette } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { defaultConfig, type TemplateConfig } from "@/lib/menu-template";

export const Route = createFileRoute("/_authenticated/admin/menu-templates")({
  head: () => ({ meta: [{ title: "Menu templates — Admin" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: userRes.user.id });
    if (!isSA) throw redirect({ to: "/access-denied" });
  },
  component: AdminMenuTemplates,
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function AdminMenuTemplates() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    background: defaultConfig.background,
    surface: defaultConfig.surface,
    accentFrom: defaultConfig.accentFrom,
    accentTo: defaultConfig.accentTo,
    priceColor: defaultConfig.priceColor,
    textColor: defaultConfig.textColor,
    mutedColor: defaultConfig.mutedColor,
    glow: false,
  });

  const listQ = useQuery({
    queryKey: ["menu-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_templates")
        .select("id, name, slug, description, config, is_published, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const config: TemplateConfig = {
        background: form.background,
        surface: form.surface,
        accentFrom: form.accentFrom,
        accentTo: form.accentTo,
        priceColor: form.priceColor,
        textColor: form.textColor,
        mutedColor: form.mutedColor,
        headingFont: defaultConfig.headingFont,
        glow: form.glow,
      };
      let slug = slugify(form.name);
      if (!slug) slug = `template-${Date.now()}`;
      const { error } = await supabase.from("menu_templates").insert({
        name: form.name.trim(),
        slug,
        description: form.description.trim() || null,
        config,
        is_published: true,
      });
      if (error) throw error;
      toast.success("Template created");
      setShowForm(false);
      setForm({ ...form, name: "", description: "" });
      qc.invalidateQueries({ queryKey: ["menu-templates"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(id: string, next: boolean) {
    const { error } = await supabase.from("menu_templates").update({ is_published: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["menu-templates"] });
  }

  async function del(id: string) {
    if (!confirm("Delete this template? Restaurants using it will fall back to the default.")) return;
    const { error } = await supabase.from("menu_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["menu-templates"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Super Admin</p>
          <h1 className="font-display text-3xl font-semibold">Menu templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visual styles restaurants can apply to their public menu.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-md gradient-red px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> {showForm ? "Close" : "New template"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
            <input required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
            <input maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm" />
          </div>
          {([
            ["background", "Background"],
            ["surface", "Card surface"],
            ["accentFrom", "Accent (start)"],
            ["accentTo", "Accent (end)"],
            ["priceColor", "Price color"],
            ["textColor", "Text color"],
            ["mutedColor", "Muted text"],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
                <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-xs font-mono" />
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.glow} onChange={(e) => setForm({ ...form, glow: e.target.checked })} />
            Enable glow / flicker effect on category headings
          </label>
          <div className="sm:col-span-2">
            <button disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg gradient-red px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create template
            </button>
          </div>
        </form>
      )}

      {listQ.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listQ.data?.map((t) => {
            const cfg = (t.config ?? {}) as TemplateConfig;
            return (
              <div key={t.id} className="glass overflow-hidden rounded-2xl">
                <div
                  className="h-24"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.background ?? "#111"} 0%, ${cfg.surface ?? "#222"} 100%)`,
                  }}
                >
                  <div
                    className="ml-4 mt-4 inline-block rounded-md px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: `linear-gradient(90deg, ${cfg.accentFrom ?? "#f00"}, ${cfg.accentTo ?? "#900"})` }}
                  >
                    Preview
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                      <p className="text-[11px] text-muted-foreground">/{t.slug}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.is_published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {t.is_published ? "Published" : "Hidden"}
                    </span>
                  </div>
                  {t.description && <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>}
                  <div className="mt-3 flex gap-1.5">
                    {[cfg.background, cfg.accentFrom, cfg.accentTo, cfg.priceColor, cfg.textColor].map((c, i) => (
                      <span key={i} className="h-5 w-5 rounded-full border border-border" style={{ background: c ?? "#000" }} />
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => togglePublish(t.id, !t.is_published)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent">
                      {t.is_published ? <><EyeOff className="h-3 w-3" /> Unpublish</> : <><Eye className="h-3 w-3" /> Publish</>}
                    </button>
                    <button onClick={() => del(t.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {listQ.data && listQ.data.length === 0 && (
            <div className="glass col-span-full rounded-2xl p-10 text-center">
              <Palette className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No templates yet. Create your first one.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
