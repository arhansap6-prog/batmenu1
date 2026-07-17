import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUSES = ["pending", "preparing", "ready", "served", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders — BAT MENU" }, { name: "robots", content: "noindex" }] }),
  validateSearch: z.object({ r: z.string().uuid().optional() }),
  beforeLoad: async ({ search }) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", userRes.user.id);
    const isSA = (roles ?? []).some((r) => r.role === "super_admin");
    const staffed = (roles ?? [])
      .map((r) => r.restaurant_id)
      .filter(Boolean) as string[];
    let rid = search.r;
    if (!rid) rid = staffed[0];
    if (!rid) throw redirect({ to: "/dashboard" });
    if (!isSA && !staffed.includes(rid)) throw redirect({ to: "/access-denied" });
    return { restaurantId: rid };
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { restaurantId } = Route.useRouteContext();
  const qc = useQueryClient();

  const ordersQ = useQuery({
    queryKey: ["orders", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, table_number, customer_name, notes, total, currency, status, created_at, order_items(name, price, qty)")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => qc.invalidateQueries({ queryKey: ["orders", restaurantId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [restaurantId, qc]);

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["orders", restaurantId] });
  }

  if (ordersQ.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  type Order = NonNullable<typeof ordersQ.data>[number];
  const buckets: Record<Status, Order[]> = {
    pending: [],
    preparing: [],
    ready: [],
    served: [],
    cancelled: [],
  };
  (ordersQ.data ?? []).forEach((o) => {
    buckets[o.status as Status]?.push(o);
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Kitchen</p>
          <h1 className="font-display text-3xl font-semibold">Live orders</h1>
        </div>
        <button
          onClick={() => ordersQ.refetch()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${ordersQ.isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {(!ordersQ.data || ordersQ.data.length === 0) && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-sm text-muted-foreground">No orders yet — they'll appear here in real time.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(["pending", "preparing", "ready"] as Status[]).map((s) => (
          <Column key={s} title={label(s)} orders={buckets[s] ?? []} onStatus={setStatus} nextStatus={next(s)} />
        ))}
      </div>

      {(buckets.served.length > 0 || buckets.cancelled.length > 0) && (
        <details className="glass rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-medium">Recent (served / cancelled)</summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[...buckets.served, ...buckets.cancelled].slice(0, 20).map((o) => (
              <OrderCard key={o.id} order={o} onStatus={setStatus} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function next(s: Status): Status | null {
  if (s === "pending") return "preparing";
  if (s === "preparing") return "ready";
  if (s === "ready") return "served";
  return null;
}
function label(s: Status) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Order = NonNullable<ReturnType<typeof useQuery<any, any, any[]>>["data"]>[number];

function Column({
  title,
  orders,
  onStatus,
  nextStatus,
}: {
  title: string;
  orders: Order[];
  onStatus: (id: string, s: Status) => void;
  nextStatus: Status | null;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {orders.length}
        </span>
      </div>
      <div className="space-y-3">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} onStatus={onStatus} nextStatus={nextStatus} />
        ))}
        {orders.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Empty</p>}
      </div>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  nextStatus,
}: {
  order: Order;
  onStatus: (id: string, s: Status) => void;
  nextStatus?: Status | null;
}) {
  const items = (order.order_items ?? []) as { name: string; price: number; qty: number }[];
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          #{order.id.slice(0, 6)} · {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-sm font-semibold text-primary">
          {order.currency} {Number(order.total).toFixed(2)}
        </p>
      </div>
      <p className="mt-1 text-sm font-medium">
        {order.table_number ? `Table ${order.table_number}` : "Takeaway"}
        {order.customer_name ? ` · ${order.customer_name}` : ""}
      </p>
      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>
            {it.qty}× {it.name}
          </li>
        ))}
      </ul>
      {order.notes && <p className="mt-2 rounded-md bg-muted px-2 py-1 text-[11px] italic">"{order.notes}"</p>}
      <div className="mt-3 flex gap-2">
        {nextStatus && (
          <button
            onClick={() => onStatus(order.id, nextStatus)}
            className="flex-1 rounded-md gradient-red px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Mark {nextStatus}
          </button>
        )}
        {order.status !== "cancelled" && order.status !== "served" && (
          <button
            onClick={() => onStatus(order.id, "cancelled")}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
