import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Palette, Zap, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BAT MENU — Smart Digital Menus For Every Food Business" },
      { name: "description", content: "Premium digital menu platform for restaurants. Beautiful QR menus, real-time updates, and full control over your brand." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg gradient-red">
              <span className="font-display text-lg font-bold text-primary-foreground">B</span>
            </div>
            <span className="font-display text-lg font-semibold tracking-wide">BAT MENU</span>
          </div>
          <Link
            to="/auth"
            className="rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Premium Restaurant Platform
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Smart Digital Menus
            <br />
            <span className="text-gradient-gold">For Every Food Business</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Elegant QR menus, real-time updates, multi-restaurant control. Built to feel like Apple, work like Stripe, and delight like the best food apps.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full gradient-red px-7 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.62_0.22_25/0.6)] transition-transform hover:scale-[1.03]"
            >
              Enter dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Access is invite-only. Only the platform administrator can create restaurant accounts.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: QrCode, title: "Instant QR Menus", body: "Customers scan and browse — no app, no login." },
            { icon: Palette, title: "Luxury Themes", body: "Craft a distinct identity your guests remember." },
            { icon: Zap, title: "Real-Time Updates", body: "Prices, availability, offers — live in seconds." },
            { icon: ShieldCheck, title: "Enterprise Security", body: "Row-level isolation. Your data stays yours." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-6xl px-5 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} BAT MENU. Smart Digital Menus For Every Food Business.
        </div>
      </footer>
    </div>
  );
}
