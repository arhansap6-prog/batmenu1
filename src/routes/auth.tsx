import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bootstrapSuperAdmin, platformStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — BAT MENU" },
      { name: "description", content: "Sign in to the BAT MENU control center." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const platformStatusFn = useServerFn(platformStatus);
  const bootstrapFn = useServerFn(bootstrapSuperAdmin);

  const statusQ = useQuery({
    queryKey: ["platform-status"],
    queryFn: () => platformStatusFn(),
  });

  const [mode, setMode] = useState<"signin" | "bootstrap">("signin");
  useEffect(() => {
    if (statusQ.data && !statusQ.data.hasSuperAdmin) setMode("bootstrap");
  }, [statusQ.data]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await bootstrapFn({ data: { email, password, full_name: fullName } });
      toast.success("Super Admin created. Signing you in…");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create Super Admin");
      statusQ.refetch();
    } finally {
      setSubmitting(false);
    }
  }

  if (statusQ.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (statusQ.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-5">
        <div className="max-w-sm text-center">
          <p className="text-sm text-destructive">Couldn't reach the server.</p>
          <button
            onClick={() => statusQ.refetch()}
            className="mt-3 rounded-md gradient-red px-4 py-2 text-sm text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isBootstrap = mode === "bootstrap" && !statusQ.data?.hasSuperAdmin;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-red">
            <span className="font-display text-xl font-bold text-primary-foreground">B</span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold">BAT MENU</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isBootstrap ? "Claim this platform as Super Admin" : "Sign in to your dashboard"}
          </p>
        </div>

        <form
          onSubmit={isBootstrap ? handleBootstrap : handleSignIn}
          className="glass space-y-4 rounded-2xl p-6"
        >
          {isBootstrap && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Full name
              </label>
              <input
                required
                minLength={1}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              required
              type="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Password {isBootstrap && <span>(min 8)</span>}
            </label>
            <input
              required
              type="password"
              minLength={isBootstrap ? 8 : 1}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isBootstrap ? "new-password" : "current-password"}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg gradient-red px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isBootstrap ? "Create Super Admin" : "Sign in"}
          </button>
          {!isBootstrap && (
            <p className="text-center text-xs text-muted-foreground">
              Restaurant owners: your account is created by the platform administrator.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
