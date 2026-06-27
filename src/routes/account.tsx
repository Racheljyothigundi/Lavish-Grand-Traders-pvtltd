import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, useAuthModal, useWishlist, inr } from "@/lib/store";
import { products, subscriptionPlans } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  Heart,
  Repeat,
  User,
  ShoppingBag,
  Gift,
  Loader2,
} from "lucide-react";

type Tab = "dashboard" | "orders" | "subscriptions" | "wishlist" | "profile";
type CustomerOrder = {
  id: string;
  order_number: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  payment_status: string;
  total_amount: number;
  shipping_cost: number;
  notes?: string | null;
  created_at: string;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  items?: Array<{ id: string; item_name: string; quantity: number; unit_price?: number; total_price: number }>;
};
type CustomerSubscription = {
  id: string;
  plan_id: string;
  status: string;
  start_date: string;
  next_billing_date: string;
};

export const Route = createFileRoute("/account")({
  validateSearch: (s): { tab: Tab } => ({ tab: (s.tab as Tab) || "dashboard" }),
  head: () => ({ meta: [{ title: "My Account — Lavish Grand Traders" }] }),
  component: Account,
});

const statusLabels: Record<CustomerOrder["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const statusTone: Record<CustomerOrder["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-700",
};

function Account() {
  const { tab } = Route.useSearch();
  const { user, logout, loading } = useAuth();
  const modal = useAuthModal();
  const wish = useWishlist();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionActionId, setSubscriptionActionId] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<CustomerOrder | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function loadOrders() {
      setOrdersLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(id, item_name, quantity, unit_price, total_price)")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("[Account] Failed to load orders", error);
      } else {
        setOrders((data ?? []) as unknown as CustomerOrder[]);
      }
      setOrdersLoading(false);
    }

    loadOrders();

    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => loadOrders())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function loadSubscriptions() {
      setSubscriptionsLoading(true);
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("id, plan_id, status, start_date, next_billing_date")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("[Account] Failed to load subscriptions", error);
      } else {
        setSubscriptions((data ?? []) as CustomerSubscription[]);
      }
      setSubscriptionsLoading(false);
    }

    loadSubscriptions();

    const channel = supabase
      .channel(`customer-subscriptions-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_subscriptions", filter: `user_id=eq.${user.id}` }, () => loadSubscriptions())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function updateSubscription(subscription: CustomerSubscription, patch: Partial<CustomerSubscription>, message: string) {
    setSubscriptionActionId(subscription.id);
    const { error } = await supabase
      .from("user_subscriptions")
      .update(patch)
      .eq("id", subscription.id);

    if (error) {
      console.error("[Account] Failed to update subscription", error);
      toast.error("Could not update subscription");
    } else {
      setSubscriptions((current) =>
        current.map((item) => (item.id === subscription.id ? { ...item, ...patch } : item)),
      );
      toast.success(message);
    }
    setSubscriptionActionId(null);
  }

  async function skipNextDelivery(subscription: CustomerSubscription) {
    const nextDate = new Date(subscription.next_billing_date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    await updateSubscription(
      subscription,
      { next_billing_date: nextDate.toISOString().slice(0, 10) },
      "Next delivery skipped",
    );
  }

  async function pauseSubscription(subscription: CustomerSubscription) {
    await updateSubscription(subscription, { status: "paused" }, "Subscription paused");
  }

  async function removeSubscription(subscription: CustomerSubscription) {
    if (typeof window !== "undefined" && !window.confirm("Remove this subscription?")) return;

    setSubscriptionActionId(subscription.id);
    const { error } = await supabase
      .from("user_subscriptions")
      .delete()
      .eq("id", subscription.id);

    if (error) {
      console.error("[Account] Failed to remove subscription", error);
      toast.error("Could not remove subscription");
    } else {
      setSubscriptions((current) => current.filter((item) => item.id !== subscription.id));
      toast.success("Subscription removed");
    }
    setSubscriptionActionId(null);
  }

  const wishItems = products.filter((p) => wish.has(p.id));
  const orderItemCount = useMemo(
    () => orders.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) ?? 0), 0),
    [orders],
  );

  if (loading)
    return (
      <SiteLayout>
        <section className="max-w-md mx-auto container-px py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" />
          <p className="mt-4 text-muted-foreground">Loading your account…</p>
        </section>
      </SiteLayout>
    );

  if (!user)
    return (
      <SiteLayout>
        <section className="max-w-md mx-auto container-px py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-hero text-white mx-auto flex items-center justify-center">
            <User className="w-7 h-7" />
          </div>
          <h1 className="font-display text-3xl font-bold text-brand-deep mt-4">
            Sign in to continue
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your orders, subscriptions, gift boxes and profile.
          </p>
          <Button onClick={() => modal.trigger()} className="mt-6 bg-gradient-hero text-white">
            Sign In / Create Account
          </Button>
        </section>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <section className="bg-gradient-deep text-white py-10">
        <div className="max-w-7xl mx-auto container-px flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-gold text-brand-deep flex items-center justify-center font-display text-xl font-bold">
            {user.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-brand-cyan uppercase tracking-[0.2em]">Welcome back</div>
            <h1 className="font-display text-3xl font-bold">{user.name}</h1>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="ml-auto border-white/20 text-white hover:bg-white/10"
          >
            Sign Out
          </Button>
        </div>
      </section>
      <section className="max-w-7xl mx-auto container-px py-10">
        <Tabs value={tab}>
          <TabsList className="bg-secondary mb-6 flex-wrap">
            <TabsTrigger value="dashboard" asChild>
              <Link to="/account" search={{ tab: "dashboard" }} className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            </TabsTrigger>
            <TabsTrigger value="orders" asChild>
              <Link to="/account" search={{ tab: "orders" }} className="gap-2">
                <Package className="w-4 h-4" />
                Orders
              </Link>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" asChild>
              <Link to="/account" search={{ tab: "subscriptions" }} className="gap-2">
                <Repeat className="w-4 h-4" />
                Subscriptions
              </Link>
            </TabsTrigger>
            <TabsTrigger value="wishlist" asChild>
              <Link to="/account" search={{ tab: "wishlist" }} className="gap-2">
                <Heart className="w-4 h-4" />
                Wishlist
              </Link>
            </TabsTrigger>
            <TabsTrigger value="profile" asChild>
              <Link to="/account" search={{ tab: "profile" }} className="gap-2">
                <User className="w-4 h-4" />
                Profile
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { i: ShoppingBag, l: "Orders", v: orders.length },
              { i: Repeat, l: "Active Subscriptions", v: subscriptions.filter((item) => item.status === "active").length },
              { i: Heart, l: "Saved Items", v: wish.ids.length },
              { i: Gift, l: "Ordered Items", v: orderItemCount },
            ].map((s) => (
              <div key={s.l} className="bg-white border border-border rounded-2xl p-5 shadow-soft">
                <s.i className="w-6 h-6 text-brand" />
                <div className="font-display text-3xl font-bold text-brand-deep mt-2">{s.v}</div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-brand-deep">
                  <tr>
                    {["Order ID", "Date", "Items", "Total", "Status", ""].map((h) => (
                      <th key={h} className="text-left p-4 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_tr]:border-t [&_tr]:border-border">
                  {ordersLoading && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading orders
                      </td>
                    </tr>
                  )}
                  {!ordersLoading && orders.map((o) => (
                    <tr key={o.id}>
                      <td className="p-4 font-mono text-brand">{o.order_number}</td>
                      <td className="p-4">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="p-4">
                        <div className="font-semibold">{o.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {o.items?.[0]?.item_name ?? "Order items"}
                          {(o.items?.length ?? 0) > 1 ? ` + ${(o.items?.length ?? 1) - 1} more` : ""}
                        </div>
                      </td>
                      <td className="p-4 font-semibold">
                        {inr(Number(o.total_amount))}
                        <div className="text-xs text-muted-foreground">Delivery {o.shipping_cost ? inr(Number(o.shipping_cost)) : "Free"}</div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusTone[o.status]}`}>
                          {statusLabels[o.status]}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">{o.payment_status}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setTrackedOrder(o)}
                          className="text-brand hover:underline text-sm"
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!ordersLoading && orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <div className="grid md:grid-cols-2 gap-5">
              {subscriptionsLoading && (
                <div className="bg-white border border-border rounded-2xl p-10 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading subscriptions
                </div>
              )}
              {!subscriptionsLoading && subscriptions.map((subscription) => {
                const plan = subscriptionPlans.find((item) => item.id === subscription.plan_id);
                const busy = subscriptionActionId === subscription.id;
                return (
                  <div key={subscription.id} className="bg-white border border-border rounded-2xl p-6 shadow-soft">
                    <div className={`text-xs px-2 py-0.5 rounded-full inline-block font-semibold ${
                      subscription.status === "active"
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-amber-700 bg-amber-50"
                    }`}>
                      {subscription.status.toUpperCase()}
                    </div>
                    <div className="font-display text-2xl font-bold text-brand-deep mt-2">
                      {plan?.name ?? "Subscription Plan"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next delivery: {new Date(subscription.next_billing_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="font-display text-2xl font-bold text-brand mt-3">
                      {inr(plan?.monthly ?? 0)}{" "}
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || subscription.status !== "active"}
                        onClick={() => skipNextDelivery(subscription)}
                      >
                        Skip next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || subscription.status !== "active"}
                        className="text-amber-700 border-amber-300"
                        onClick={() => pauseSubscription(subscription)}
                      >
                        Pause
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        className="text-destructive border-destructive/30"
                        onClick={() => removeSubscription(subscription)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!subscriptionsLoading && subscriptions.length === 0 && (
                <div className="bg-white border border-border rounded-2xl p-10 text-center">
                  <Repeat className="w-8 h-8 text-brand mx-auto" />
                  <div className="font-display text-2xl font-bold text-brand-deep mt-3">
                    No active subscriptions
                  </div>
                  <div className="text-muted-foreground mt-1">Add a plan whenever you need regular monthly delivery.</div>
                </div>
              )}
              <div className="bg-gradient-cream border-2 border-dashed border-brand/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <Repeat className="w-8 h-8 text-brand" />
                <div className="font-display font-bold text-brand-deep mt-2">Add another plan</div>
                <Button asChild className="mt-3 bg-brand text-brand-foreground">
                  <Link to="/subscriptions">Browse Plans</Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wishlist">
            {wishItems.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">No saved items yet.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {wishItems.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-border rounded-2xl overflow-hidden"
                  >
                    <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" />
                    <div className="p-3">
                      <div className="font-semibold text-brand-deep text-sm line-clamp-1">
                        {p.name}
                      </div>
                      <div className="text-brand font-bold mt-1">
                        {inr(Math.round(p.mrp * (1 - p.discount / 100)))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <div className="bg-white border border-border rounded-2xl p-6 shadow-soft max-w-xl space-y-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Name</div>
                <div className="font-semibold">{user.name}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Email</div>
                <div className="font-semibold">{user.email}</div>
              </div>
              {user.phone && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Phone
                  </div>
                  <div className="font-semibold">{user.phone}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Role</div>
                <div className="font-semibold capitalize">{user.role}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
      <Dialog open={Boolean(trackedOrder)} onOpenChange={(open) => !open && setTrackedOrder(null)}>
        <DialogContent className="max-w-2xl">
          {trackedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-brand-deep">
                  Track {trackedOrder.order_number}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid sm:grid-cols-4 gap-2">
                  {(["confirmed", "processing", "shipped", "delivered"] as CustomerOrder["status"][]).map((status) => {
                    const complete = orderStatusRank(trackedOrder.status) >= orderStatusRank(status);
                    return (
                      <div key={status} className={`rounded-xl border p-3 ${complete ? "border-brand bg-brand/5" : "border-border bg-secondary/40"}`}>
                        <div className={`w-3 h-3 rounded-full mb-2 ${complete ? "bg-brand" : "bg-muted-foreground/30"}`} />
                        <div className="text-sm font-semibold">{statusLabels[status]}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-muted-foreground">Payment</div>
                    <div className="font-semibold capitalize">{trackedOrder.payment_status}</div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-muted-foreground">Delivery</div>
                    <div className="font-semibold">{trackedOrder.shipping_cost ? inr(Number(trackedOrder.shipping_cost)) : "Free"}</div>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-muted-foreground">Refund</div>
                    <div className="font-semibold">{trackedOrder.status === "refunded" ? "Refunded" : trackedOrder.status === "cancelled" ? "Eligible for review" : "No refund requested"}</div>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-brand-deep mb-2">Ordered items</div>
                  <div className="rounded-xl border border-border divide-y overflow-hidden">
                    {(trackedOrder.items ?? []).map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 p-3 text-sm">
                        <div>
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Customer quantity: {item.quantity} x {inr(Number(item.unit_price ?? 0))}
                          </div>
                        </div>
                        <div className="font-semibold">{inr(Number(item.total_price))}</div>
                      </div>
                    ))}
                    {!trackedOrder.items?.length && (
                      <div className="p-3 text-sm text-muted-foreground">Items are still syncing for this order.</div>
                    )}
                  </div>
                </div>
                <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
                  {trackedOrder.notes
                    ? trackedOrder.notes
                    : "Refunds are tracked when the order is cancelled or marked refunded by the admin. For paid orders, the final refund depends on payment verification and business approval."}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

function orderStatusRank(status: CustomerOrder["status"]) {
  const rank: Record<CustomerOrder["status"], number> = {
    pending: 0,
    confirmed: 1,
    processing: 2,
    shipped: 3,
    delivered: 4,
    cancelled: 0,
    refunded: 0,
  };
  return rank[status];
}
