import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldX } from "lucide-react";

export const Route = createFileRoute("/access-denied")({
  head: () => ({
    meta: [
      { title: "Access denied — BAT MENU" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccessDenied,
});

function AccessDenied() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/15">
          <ShieldX className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to view that page. If you think this is a mistake, contact
          your Super Admin.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-md gradient-red px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back to dashboard
          </Link>
          <Link
            to="/"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
