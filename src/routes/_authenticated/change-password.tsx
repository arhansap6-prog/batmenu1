import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearMustChangePassword } from "@/lib/admin.functions";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Change password — BAT MENU" }, { name: "robots", content: "noindex" }] }),
  component: ChangePwd,
});

function ChangePwd() {
  const session = useSession();
  const navigate = useNavigate();
  const clearFlag = useServerFn(clearMustChangePassword);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) return toast.error("Password must be at least 8 characters");
    if (pwd !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    try {
      await clearFlag();
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold">
          {session.mustChangePassword ? "Set your permanent password" : "Change password"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.mustChangePassword
            ? "This is your first sign-in. Please choose a new password to continue."
            : "Choose a new password for your account."}
        </p>
      </div>
      <form onSubmit={submit} className="glass mt-6 space-y-4 rounded-2xl p-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New password (min 8)</label>
          <input
            required
            type="password"
            minLength={8}
            maxLength={128}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</label>
          <input
            required
            type="password"
            minLength={8}
            maxLength={128}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg gradient-red px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
