import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth, useAuthModal, inr } from "@/lib/store";
import { products } from "@/data/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Package,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "overview" | "orders" | "payments" | "inventory" | "customers" | "reports";
type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
type AdminOrder = {
  id: string;
  order_number: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_city: string;
  shipping_pincode: string;
  notes?: string | null;
  total_amount: number;
  subtotal: number;
  shipping_cost: number;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  payment_id?: string | null;
  created_at: string;
  updated_at?: string;
  confirmed_at?: string | null;
  items?: Array<{ id: string; item_name: string; quantity: number; unit_price?: number; total_price: number }>;
};

export const Route = createFileRoute("/admin")({
  validateSearch: (s): { tab: Tab } => ({ tab: (s.tab as Tab) || "overview" }),
  head: () => ({ meta: [{ title: "Admin Console — Lavish Grand Traders" }] }),
  errorComponent: AdminErrorPage,
  component: Admin,
});

const orderStatuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

function getPaymentDisplayState(order: AdminOrder): PaymentDisplayState {
  if (order.payment_status === "refunded" || order.status === "refunded") return "refunded";
  if (order.payment_method === "cod") return "cod";
  if (order.payment_status === "completed") return "paid";
  if (order.payment_status === "failed") return "failed";
  return "pending";
}

const paymentColours: Record<
  PaymentDisplayState,
  { row: string; badge: string; amount: string; dot: string }
> = {
  paid: {
    row: "border-l-4 border-l-emerald-500 hover:bg-emerald-50/40",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amount: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  failed: {
    row: "border-l-4 border-l-red-500 hover:bg-red-50/40",
    badge: "bg-red-100 text-red-700 border-red-200",
    amount: "text-red-700",
    dot: "bg-red-500",
  },
  cod: {
    row: "border-l-4 border-l-amber-500 hover:bg-amber-50/40",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    amount: "text-amber-700",
    dot: "bg-amber-500",
  },
  refunded: {
    row: "border-l-4 border-l-violet-500 hover:bg-violet-50/40",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    amount: "text-violet-700",
    dot: "bg-violet-500",
  },
  pending: {
    row: "border-l-4 border-l-blue-500 hover:bg-blue-50/40",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    amount: "text-blue-700",
    dot: "bg-blue-500",
  },
};

function normalizeAdminOrder(value: unknown): AdminOrder {
  const raw = (value ?? {}) as Record<string, unknown>;
  const validStatus = orderStatuses.includes(raw.status as OrderStatus)
    ? (raw.status as OrderStatus)
    : "pending";

  return {
    id: String(raw.id ?? ""),
    order_number: String(raw.order_number ?? "Pending order number"),
    shipping_name: String(raw.shipping_name ?? "Customer"),
    shipping_phone: String(raw.shipping_phone ?? "Not provided"),
    shipping_address_line1: String(raw.shipping_address_line1 ?? "Not provided"),
    shipping_city: String(raw.shipping_city ?? ""),
    shipping_pincode: String(raw.shipping_pincode ?? ""),
    notes: typeof raw.notes === "string" ? raw.notes : null,
    total_amount: Number(raw.total_amount) || 0,
    subtotal: Number(raw.subtotal) || 0,
    shipping_cost: Number(raw.shipping_cost) || 0,
    status: validStatus,
    payment_method: String(raw.payment_method ?? "unknown"),
    payment_status: String(raw.payment_status ?? "pending"),
    payment_id: typeof raw.payment_id === "string" ? raw.payment_id : null,
    created_at: typeof raw.created_at === "string" ? raw.created_at : new Date(0).toISOString(),
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
    confirmed_at: typeof raw.confirmed_at === "string" ? raw.confirmed_at : null,
    items: Array.isArray(raw.items)
      ? raw.items
          .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
          .map((item, index) => ({
            id: String(item.id ?? `${raw.id ?? "order"}-item-${index}`),
            item_name: String(item.item_name ?? "Order item"),
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            total_price: Number(item.total_price) || 0,
          }))
      : [],
  };
}

function AdminErrorPage({ reset }: { reset: () => void }) {
  return (
    <SiteLayout>
      <section className="max-w-lg mx-auto container-px py-24 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <h1 className="font-display text-3xl font-bold text-brand-deep mt-4">
          Admin dashboard needs a refresh
        </h1>
        <p className="text-muted-foreground mt-2">
          Your order data is safe. Reload the latest dashboard files to continue.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            className="bg-gradient-hero text-white"
            onClick={() => {
              reset();
              window.location.reload();
            }}
          >
            Reload dashboard
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}

function Admin() {
  const { tab } = Route.useSearch();
  const { user } = useAuth();
  const modal = useAuthModal();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const lowStock = products.filter((p) => p.stock < 70);
  const today = new Date().toDateString();
  const ordersToday = orders.filter((order) => new Date(order.created_at).toDateString() === today).length;
  const revenue = orders
    .filter((order) => !["cancelled", "refunded"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.total_amount), 0);
  const activeCustomers = useMemo(
    () => new Set(orders.map((order) => `${order.shipping_phone}-${order.shipping_name}`)).size,
    [orders],
  );

  useEffect(() => {
    if (user?.role !== "admin") return;

    let cancelled = false;
    async function loadOrders() {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, items:order_items(id, item_name, quantity, unit_price, total_price)")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("[Admin] Failed to load orders", error);
        toast.error("Could not load orders");
      } else {
        setOrders((data ?? []).map(normalizeAdminOrder));
      }
      setLoadingOrders(false);
    }

    // Load once when the admin session opens. Automatic polling and realtime
    // subscriptions made the table repeatedly remount on some connections.
    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  if (!user) return (
    <SiteLayout>
      <section className="max-w-md mx-auto py-24 text-center container-px">
        <ShieldAlert className="w-12 h-12 mx-auto text-brand" />
        <h1 className="font-display text-3xl font-bold text-brand-deep mt-4">Admin sign-in required</h1>
        <Button onClick={() => modal.trigger()} className="mt-6 bg-gradient-hero text-white">Sign In</Button>
        <p className="text-xs text-muted-foreground mt-4">
          Temporary admin: <b>lavanya.boga@lavishgrand.com</b>
        </p>
      </section>
    </SiteLayout>
  );

  if (user.role !== "admin") return (
    <SiteLayout>
      <section className="max-w-md mx-auto py-24 text-center container-px">
        <ShieldAlert className="w-12 h-12 mx-auto text-destructive" />
        <h1 className="font-display text-3xl font-bold text-brand-deep mt-4">Not authorized</h1>
        <p className="text-muted-foreground mt-2">Only admins can access this console.</p>
        <Button asChild className="mt-6 bg-brand text-brand-foreground"><Link to="/">Back to Home</Link></Button>
      </section>
    </SiteLayout>
  );

  async function updateOrderStatus(order: AdminOrder, status: OrderStatus) {
    setUpdatingId(order.id);
    const stamp =
      status === "confirmed"
        ? { confirmed_at: new Date().toISOString() }
        : status === "shipped"
          ? { shipped_at: new Date().toISOString() }
          : status === "delivered"
            ? { delivered_at: new Date().toISOString() }
            : {};

    const { error } = await supabase.from("orders").update({ status, ...stamp }).eq("id", order.id);
    if (error) {
      console.error("[Admin] Failed to update order", error);
      toast.error("Could not update order status");
    } else {
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status } : item)));
      toast.success(`Order ${order.order_number} marked ${statusLabels[status]}`);
    }
    setUpdatingId(null);
  }

  return (
    <SiteLayout>
      <section className="bg-gradient-deep text-white py-8">
        <div className="max-w-7xl mx-auto container-px flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold text-brand-deep flex items-center justify-center font-bold">A</div>
          <div>
            <div className="text-xs text-brand-cyan uppercase tracking-[0.2em]">Admin Console</div>
            <h1 className="font-display text-2xl font-bold">Lavish Grand Operations</h1>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto container-px py-8">
        <Tabs value={tab}>
          <TabsList className="bg-secondary mb-6 flex-wrap">
            <TabsTrigger value="overview" asChild><Link to="/admin" search={{ tab: "overview" }}>Overview</Link></TabsTrigger>
            <TabsTrigger value="orders" asChild><Link to="/admin" search={{ tab: "orders" }}>Orders</Link></TabsTrigger>
            <TabsTrigger value="payments" asChild><Link to="/admin" search={{ tab: "payments" }}>Payments</Link></TabsTrigger>
            <TabsTrigger value="inventory" asChild><Link to="/admin" search={{ tab: "inventory" }}>Inventory</Link></TabsTrigger>
            <TabsTrigger value="customers" asChild><Link to="/admin" search={{ tab: "customers" }}>Customers</Link></TabsTrigger>
            <TabsTrigger value="reports" asChild><Link to="/admin" search={{ tab: "reports" }}>Reports</Link></TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { l: "Revenue", v: inr(revenue), d: `${orders.length} orders`, i: TrendingUp },
                { l: "Orders Today",  v: ordersToday,            d: "Live", i: ShoppingBag },
                { l: "Active Customers", v: activeCustomers,       d: "From orders", i: Users },
                { l: "Inventory SKUs",  v: products.length, d: `${lowStock.length} low`, i: Package },
              ].map((s) => (
                <div key={s.l} className="bg-white border border-border rounded-2xl p-5 shadow-soft">
                  <div className="flex items-start justify-between"><s.i className="w-5 h-5 text-brand" /><span className="text-xs text-emerald-700 font-semibold flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{s.d}</span></div>
                  <div className="font-display text-3xl font-bold text-brand-deep mt-3">{s.v}</div>
                  <div className="text-sm text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-white border border-border rounded-2xl p-6 shadow-soft">
                <h3 className="font-display font-bold text-brand-deep mb-3">Recent Orders</h3>
                <div className="space-y-2 text-sm">
                  {loadingOrders && <div className="py-6 text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading orders</div>}
                  {!loadingOrders && orders.slice(0, 6).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
                      <div><div className="font-mono text-brand">{o.order_number}</div><div className="text-xs text-muted-foreground">{o.shipping_name}</div></div>
                      <div className="text-right"><div className="font-bold">{inr(Number(o.total_amount))}</div><div className="text-xs text-muted-foreground">{statusLabels[o.status]}</div></div>
                    </div>
                  ))}
                  {!loadingOrders && orders.length === 0 && <div className="py-6 text-muted-foreground">No orders yet.</div>}
                </div>
              </div>
              <div className="bg-white border border-border rounded-2xl p-6 shadow-soft">
                <h3 className="font-display font-bold text-brand-deep mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts</h3>
                <div className="space-y-2 text-sm">
                  {lowStock.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border">
                      <div><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.qty}</div></div>
                      <div className="font-bold text-amber-600">{p.stock} left</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="bg-white border border-border rounded-2xl overflow-x-auto shadow-soft">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-secondary text-brand-deep"><tr>{["Order ID","Customer","Items","Total","Payment","Status",""].map((h) => <th key={h} className="text-left p-4 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="[&_tr]:border-t [&_tr]:border-border">
                  {loadingOrders && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading orders</td></tr>
                  )}
                  {!loadingOrders && orders.map((o) => (
                    <tr key={o.id} className={`transition-colors ${paymentColours[getPaymentDisplayState(o)].row}`}>
                      <td className="p-4 font-mono text-brand">{o.order_number}<div className="text-xs text-muted-foreground font-sans">{new Date(o.created_at).toLocaleDateString("en-IN")}</div></td>
                      <td className="p-4">
                        <div className="font-semibold">{o.shipping_name}</div>
                        <div className="text-xs text-muted-foreground">{o.shipping_phone} · {o.shipping_city} {o.shipping_pincode}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{o.shipping_address_line1}</div>
                      </td>
                      <td className="p-4 min-w-64">
                        <div className="font-semibold">{o.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} items</div>
                        <div className="mt-1 space-y-1">
                          {(o.items ?? []).map((item) => (
                            <div key={item.id} className="text-xs text-muted-foreground flex justify-between gap-3">
                              <span className="line-clamp-1">{item.item_name} x {item.quantity}</span>
                              <span className="font-medium text-foreground">{inr(Number(item.total_price))}</span>
                            </div>
                          ))}
                          {!o.items?.length && <div className="text-xs text-muted-foreground">No item details saved yet.</div>}
                        </div>
                      </td>
                      <td className={`p-4 font-semibold ${paymentColours[getPaymentDisplayState(o)].amount}`}>
                        <div className="text-lg font-bold">{inr(Number(o.total_amount))}</div>
                        <div className="text-xs text-muted-foreground">Subtotal {inr(Number(o.subtotal))}</div>
                        <div className="text-xs text-muted-foreground">Delivery {o.shipping_cost ? inr(Number(o.shipping_cost)) : "Free"}</div>
                      </td>
                      <td className="p-4 capitalize">
                        <div className="flex items-center gap-2 font-semibold text-brand-deep">
                          {o.payment_method === "cod" ? <Banknote className="w-4 h-4 text-amber-600" /> : <CreditCard className="w-4 h-4 text-blue-600" />}
                          {o.payment_method === "cod" ? "Cash on Delivery" : o.payment_method === "bank_transfer" ? "Bank Transfer" : "Razorpay"}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 mt-2 rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${paymentColours[getPaymentDisplayState(o)].badge}`}>
                          <i className={`w-2 h-2 rounded-full ${paymentColours[getPaymentDisplayState(o)].dot}`} />
                          {getPaymentDisplayState(o)}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          Refund: {o.status === "refunded" ? "Refunded" : o.status === "cancelled" ? "Review needed" : "No refund"}
                        </div>
                      </td>
                      <td className="p-4 min-w-44">
                        <Select value={o.status} onValueChange={(value) => updateOrderStatus(o, value as OrderStatus)} disabled={updatingId === o.id}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {orderStatuses.map((status) => (
                              <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(o)}>
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loadingOrders && orders.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
              <div className="grid grid-cols-2 bg-slate-50 border-b border-border text-sm font-semibold text-brand-deep">
                <div className="px-5 py-4">Order Summary</div>
                <div className="px-5 py-4 border-l border-border">Payment Details</div>
              </div>
              <div className="p-3 sm:p-5 space-y-4">
                {loadingOrders && (
                  <div className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading payments
                  </div>
                )}
                {!loadingOrders && orders.map((order) => (
                  <PaymentSummaryCard
                    key={order.id}
                    order={order}
                    onDetails={() => setSelectedOrder(order)}
                  />
                ))}
                {!loadingOrders && orders.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">No payments yet.</div>
                )}
              </div>
              <div className="border-t border-border bg-slate-50 px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />Paid — order confirmed</span>
                <span><i className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />Failed — payment unsuccessful</span>
                <span><i className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />COD — pay on delivery</span>
                <span><i className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />Pending — awaiting payment</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-brand-deep"><tr>{["Product","Category","Pack","Price","Stock","Status"].map((h) => <th key={h} className="text-left p-4 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="[&_tr]:border-t [&_tr]:border-border">
                  {products.map((p) => {
                    const price = Math.round(p.mrp * (1 - p.discount / 100));
                    const status = p.stock > 70 ? "Healthy" : p.stock > 20 ? "Low" : "Critical";
                    return (<tr key={p.id}><td className="p-4 font-semibold">{p.name}</td><td className="p-4 capitalize text-muted-foreground">{p.category}</td><td className="p-4">{p.qty}</td><td className="p-4 font-bold text-brand">{inr(price)}</td><td className="p-4">{p.stock}</td><td className="p-4"><span className={"text-xs px-2 py-1 rounded-full font-semibold " + (status === "Healthy" ? "bg-emerald-100 text-emerald-700" : status === "Low" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{status}</span></td></tr>);
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="customers">
            <div className="bg-white border border-border rounded-2xl p-10 text-center">
              <Users className="w-10 h-10 text-brand mx-auto" />
              <div className="font-display text-2xl font-bold text-brand-deep mt-3">1,287 Customers</div>
              <div className="text-muted-foreground mt-1">Full CRM with segmentation coming soon.</div>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { l: "Daily Sales", v: inr(orders.filter((order) => new Date(order.created_at).toDateString() === today).reduce((sum, order) => sum + Number(order.total_amount), 0)), d: "Today" },
                { l: "Total Sales", v: inr(revenue), d: "All orders" },
                { l: "Pending Orders", v: orders.filter((order) => ["pending", "confirmed", "processing"].includes(order.status)).length, d: "Need action" },
              ].map((s) => (
                <div key={s.l} className="bg-white border border-border rounded-2xl p-6 shadow-soft">
                  <BarChart3 className="w-6 h-6 text-brand" />
                  <div className="font-display text-3xl font-bold text-brand-deep mt-3">{s.v}</div>
                  <div className="text-sm text-muted-foreground">{s.l} <span className="text-xs">· {s.d}</span></div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-brand-deep">
                  Order {selectedOrder.order_number}
                </DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-[1fr_260px] gap-5">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Customer</div>
                    <div className="font-semibold">{selectedOrder.shipping_name}</div>
                    <div className="text-sm text-muted-foreground">{selectedOrder.shipping_phone}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedOrder.shipping_address_line1}, {selectedOrder.shipping_city} {selectedOrder.shipping_pincode}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-secondary px-4 py-3 font-semibold text-brand-deep">Ordered items</div>
                    <div className="divide-y divide-border">
                      {(selectedOrder.items ?? []).map((item) => (
                        <div key={item.id} className="p-4 grid grid-cols-[1fr_auto] gap-4 text-sm">
                          <div>
                            <div className="font-medium">{item.item_name}</div>
                            <div className="text-xs text-muted-foreground">
                              Customer quantity: {item.quantity} x {inr(Number(item.unit_price ?? 0))}
                            </div>
                          </div>
                          <div className="font-semibold">{inr(Number(item.total_price))}</div>
                        </div>
                      ))}
                      {!selectedOrder.items?.length && (
                        <div className="p-4 text-sm text-muted-foreground">No item details saved yet.</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-4 text-sm space-y-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(Number(selectedOrder.subtotal))}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{selectedOrder.shipping_cost ? inr(Number(selectedOrder.shipping_cost)) : "Free"}</span></div>
                    <div className="flex justify-between border-t border-border pt-2 font-bold text-base"><span>Total</span><span>{inr(Number(selectedOrder.total_amount))}</span></div>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-sm">
                    <div className="text-muted-foreground">Payment</div>
                    <div className="font-semibold capitalize">{selectedOrder.payment_method} - {selectedOrder.payment_status}</div>
                  </div>
                  <div className="rounded-xl border border-border p-4 text-sm">
                    <div className="text-muted-foreground">Refund</div>
                    <div className="font-semibold">
                      {selectedOrder.status === "refunded" ? "Refunded" : selectedOrder.status === "cancelled" ? "Review needed" : "No refund"}
                    </div>
                    {selectedOrder.notes && <div className="text-xs text-muted-foreground mt-2">{selectedOrder.notes}</div>}
                  </div>
                  <Select value={selectedOrder.status} onValueChange={(value) => updateOrderStatus(selectedOrder, value as OrderStatus)} disabled={updatingId === selectedOrder.id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

type PaymentDisplayState = "paid" | "failed" | "cod" | "refunded" | "pending";

function PaymentSummaryCard({
  order,
  onDetails,
}: {
  order: AdminOrder;
  onDetails: () => void;
}) {
  const state = getPaymentDisplayState(order);

  const appearance = {
    paid: {
      label: "PAID",
      summary: "Payment Successful",
      detail: "Payment Completed",
      note: "Payment secured by Razorpay",
      border: "border-l-emerald-500",
      iconBg: "bg-emerald-50",
      text: "text-emerald-600",
      soft: "bg-emerald-50",
      Icon: CheckCircle2,
    },
    failed: {
      label: "FAILED",
      summary: "Payment Failed",
      detail: "Payment Failed",
      note: "Payment could not be completed",
      border: "border-l-red-500",
      iconBg: "bg-red-50",
      text: "text-red-600",
      soft: "bg-red-50",
      Icon: XCircle,
    },
    cod: {
      label: "COD",
      summary: "Cash on Delivery",
      detail: "Payment Pending",
      note: "Pay when the order is delivered",
      border: "border-l-amber-500",
      iconBg: "bg-amber-50",
      text: "text-amber-600",
      soft: "bg-amber-50",
      Icon: Package,
    },
    refunded: {
      label: "REFUNDED",
      summary: "Payment Refunded",
      detail: "Refund Completed",
      note: "Payment returned to customer",
      border: "border-l-violet-500",
      iconBg: "bg-violet-50",
      text: "text-violet-600",
      soft: "bg-violet-50",
      Icon: RotateCcw,
    },
    pending: {
      label: "PENDING",
      summary: "Awaiting Payment",
      detail: "Payment Processing",
      note: "Waiting for payment confirmation",
      border: "border-l-blue-500",
      iconBg: "bg-blue-50",
      text: "text-blue-600",
      soft: "bg-blue-50",
      Icon: Clock3,
    },
  }[state];

  const paymentProvider =
    order.payment_method === "cod"
      ? "Cash on Delivery"
      : order.payment_method === "bank_transfer"
        ? "Bank Transfer"
        : "Razorpay";
  const PaymentIcon =
    order.payment_method === "cod"
      ? Banknote
      : order.payment_method === "bank_transfer"
        ? CreditCard
        : CreditCard;
  const paymentDate = order.confirmed_at || order.updated_at || order.created_at;
  const refundText =
    state === "refunded"
      ? "Refunded"
      : order.status === "cancelled"
        ? "Review needed"
        : "No Refund";

  return (
    <article className={`rounded-2xl border border-border border-l-4 ${appearance.border} bg-white shadow-sm overflow-hidden`}>
      <div className="grid md:grid-cols-[1.15fr_0.85fr]">
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 shrink-0 rounded-full ${appearance.iconBg} ${appearance.text} flex items-center justify-center`}>
              <appearance.Icon className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-display text-2xl font-bold text-brand-deep">
                    {inr(Number(order.total_amount))}
                  </div>
                  <span className={`inline-flex mt-1 rounded-md px-2 py-1 text-xs font-semibold ${appearance.soft} ${appearance.text}`}>
                    {appearance.summary}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onDetails}>View order</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {order.order_number} · Placed {new Date(order.created_at).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Subtotal</span>
              <span className="font-semibold">{inr(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-2"><Truck className="w-4 h-4" />Delivery Charges</span>
              <span className="font-semibold">{Number(order.shipping_cost) ? inr(Number(order.shipping_cost)) : "Free"}</span>
            </div>
            <div className={`flex justify-between rounded-lg px-3 py-2 font-bold ${appearance.soft} ${appearance.text}`}>
              <span>{state === "paid" ? "Total Paid" : "Total Amount"}</span>
              <span>{inr(Number(order.total_amount))}</span>
            </div>
            <p className={`flex items-center gap-2 pt-1 text-xs ${appearance.text}`}>
              <ShieldCheck className="w-4 h-4" />
              {appearance.note}
            </p>
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-border p-5 md:p-6">
          <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ${appearance.soft} ${appearance.text}`}>
            {appearance.label}
          </span>
          <div className="mt-4 flex items-center gap-2 font-semibold text-brand-deep">
            <PaymentIcon className={`w-5 h-5 ${appearance.text}`} />
            {paymentProvider}
          </div>
          <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${appearance.text}`}>
            <appearance.Icon className="w-4 h-4" />
            {appearance.detail}
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            {new Date(paymentDate).toLocaleString("en-IN")}
          </div>
          {order.payment_id && (
            <div className="mt-3 text-xs text-muted-foreground break-all">
              Payment ID: <span className="font-mono">{order.payment_id}</span>
            </div>
          )}
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCcw className="w-4 h-4" />
              Refund Status
            </div>
            <div className={`mt-1 text-sm font-semibold ${state === "refunded" ? "text-violet-600" : appearance.text}`}>
              {refundText}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
