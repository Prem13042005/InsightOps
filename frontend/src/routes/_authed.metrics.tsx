import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { BarChart3, TrendingUp, DollarSign, ShoppingCart, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authed/metrics")({
  head: () => ({ meta: [{ title: "Visual Metrics Deck · InsightOps" }] }),
  component: MetricsDeck,
});

interface OrderMetric {
  id: number;
  order_date: string | null;
  day: string;
  quantity: number;
  total_amount: number;
  status: string;
}

interface InventoryMetric {
  id: number;
  product_name: string;
  category: string;
  price: number;
  stock: number;
}

function MetricsDeck() {
  const [orderData, setOrderData] = useState<OrderMetric[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const data = await api.getChartMetrics();
        setOrderData(data.order_metrics);
        setInventoryData(data.inventory_metrics);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch live metrics:", err);
        setError("Failed to load live database metrics from the server.");
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-auto">
        <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Metrics</div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Visual Metrics Deck</h1>
          <p className="mt-1 text-sm text-slate-600">Premium real-time analytics data charting console.</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-3" />
          <p className="text-sm font-mono text-slate-500">Querying live metrics deck data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-auto">
        <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Metrics</div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Visual Metrics Deck</h1>
          <p className="mt-1 text-sm text-slate-600">Premium real-time analytics data charting console.</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-6">
          <div className="rounded-md bg-rose-50 border border-rose-200 p-4 max-w-md text-center">
            <p className="text-sm text-rose-800 font-mono">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate live dynamic KPI summaries
  const totalRevenue = orderData.reduce((acc, curr) => acc + curr.total_amount, 0);
  const totalOrders = orderData.length;
  const totalProducts = inventoryData.length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-auto">
      <header className="border-b border-slate-200/60 px-8 py-5 bg-white shrink-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Workspace / Metrics</div>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Visual Metrics Deck</h1>
        <p className="mt-1 text-sm text-slate-600">Premium real-time analytics data charting console.</p>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* KPI Row */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Total Vault Revenue"
            value={"$" + totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            change="Accumulated sales from SQL engine"
            icon={DollarSign}
          />
          <KpiCard
            title="Processed Orders"
            value={String(totalOrders)}
            change="Executed tenant transactions"
            icon={ShoppingCart}
          />
          <KpiCard
            title="Catalog Inventory"
            value={totalProducts === 1 ? "1 Product" : `${totalProducts} Products`}
            change="Active catalog entries"
            icon={TrendingUp}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Bar Chart card */}
          <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-950">Revenue Distribution per Order</h2>
            </div>
            <div className="h-80 w-full font-mono text-[11px]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orderData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, "Amount"]} contentStyle={{ background: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="total_amount" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Area Chart card */}
          <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-950">Daily Items Ordered Volume</h2>
            </div>
            <div className="h-80 w-full font-mono text-[11px]">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={orderData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#ffffff", borderRadius: "6px", border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="quantity" name="Quantity" stroke="#9333ea" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category Share & Details card */}
        <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950 mb-4">Inventory Stock Shares by Product</h2>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 items-center">
            <div className="h-80 w-full font-mono text-[11px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={inventoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="stock" nameKey="product_name">
                    {inventoryData.map((entry, index) => {
                      const purpleShades = ["#4c1d95", "#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"];
                      const shade = purpleShades[index % purpleShades.length];
                      return <Cell key={`cell-${index}`} fill={shade} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} units`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {inventoryData.map((cat, index) => {
                const purpleShades = ["#4c1d95", "#6d28d9", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"];
                const shade = purpleShades[index % purpleShades.length];
                return (
                  <div key={cat.id} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: shade }} />
                      <span className="text-sm text-slate-700 font-sans">{cat.product_name}</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900">{cat.stock} units</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, change, icon: Icon }: { title: string; value: string; change: string; icon: any }) {
  return (
    <div className="rounded-lg border border-slate-200/60 bg-white p-6 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">{title}</span>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs font-mono text-slate-500">{change}</div>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-violet-50 text-violet-600">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
