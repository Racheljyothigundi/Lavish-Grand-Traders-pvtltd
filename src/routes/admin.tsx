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
import { TrendingUp, ShoppingBag, Users, Package, AlertTriangle, BarChart3, ShieldAlert, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "overview" | "orders" | "inventory" | "customers" | "reports";
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
  created_at: string;
  items?: Array<{ id: string; item_name: string; quantity: number; unit_price?: number; total_price: number }>;
};

export const Route = createFileRoute("/admin")({
  validateSearch: (s): { tab: Tab } => ({ tab: (s.tab as Tab) || "overview" }),
  head: () => ({ meta: [{ title: "Admin Console — Lavish Grand Traders" }] }),
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
        setOrders((data ?? []) as AdminOrder[]);
      }
      setLoadingOrders(false);
    }

    loadOrders();

    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .subscribe();
    const refresh = window.setInterval(loadOrders, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(refresh);
      supabase.removeChannel(channel);
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
            <div className="bg-white border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-brand-deep"><tr>{["Order ID","Customer","Items","Total","Payment","Status",""].map((h) => <th key={h} className="text-left p-4 font-semibold">{h}</th>)}</tr></thead>
                <tbody className="[&_tr]:border-t [&_tr]:border-border">
                  {loadingOrders && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading orders</td></tr>
                  )}
                  {!loadingOrders && orders.map((o) => (
                    <tr key={o.id}>
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
                      <td className="p-4 font-semibold">
                        {inr(Number(o.total_amount))}
                        <div className="text-xs text-muted-foreground">Subtotal {inr(Number(o.subtotal))}</div>
                        <div className="text-xs text-muted-foreground">Delivery {o.shipping_cost ? inr(Number(o.shipping_cost)) : "Free"}</div>
                      </td>
                      <td className="p-4 capitalize">
                        {o.payment_method}
                        <div className="text-xs text-muted-foreground">{o.payment_status}</div>
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
