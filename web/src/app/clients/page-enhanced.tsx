import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Plus, Users } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import ClientCardEnhanced from "@/components/ClientCardEnhanced";

type Client = {
  id: string;
  nombre: string;
  contacto: string | null;
  direccion: string | null;
  phone: string | null;
  route: string | null;
  city: string | null;
  created_at: string | null;
};

type OrderStats = {
  cliente_id: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  avg_order_value: number;
};

type ProductStats = {
  cliente_id: string;
  product_name: string;
  order_count: number;
};

const PAGE_SIZE = 12;

function num(v: string | string[] | undefined, def = 1) {
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

export default async function ClientsPageEnhanced({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) || {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const selectedCity = typeof sp.city === "string" ? sp.city : "";
  const selectedRoute = typeof sp.route === "string" ? sp.route : "";
  const sortParam = typeof sp.sort === "string" ? sp.sort : "created_at";
  const orderParam = typeof sp.order === "string" ? sp.order : "desc";
  const page = num(sp.page);

  const sb = supabaseServer;
  const offset = (page - 1) * PAGE_SIZE;

  // Build query
  let query = sb.from("clients").select("*", { count: "exact" });
  
  if (q) {
    query = query.or(`nombre.ilike.%${q}%,contacto.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  if (selectedCity) {
    query = query.eq("city", selectedCity);
  }
  if (selectedRoute) {
    query = query.eq("route", selectedRoute);
  }

  // Apply sorting
  const validSorts = ["nombre", "created_at", "city", "route"];
  const sortField = validSorts.includes(sortParam) ? sortParam : "created_at";
  const sortOrder = orderParam === "asc" ? true : false;
  query = query.order(sortField, { ascending: sortOrder });

  // Apply pagination
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: clients, count } = await query;

  // Get client IDs for stats
  const clientIds = (clients || []).map(c => c.id);

  // Get order statistics for all clients
  let orderStats: OrderStats[] = [];
  if (clientIds.length > 0) {
    const { data: stats } = await sb
      .from("orders")
      .select("cliente_id, total, fecha, created_at")
      .in("cliente_id", clientIds);

    // Process stats
    const statsMap = new Map<string, OrderStats>();
    (stats || []).forEach(order => {
      const existing = statsMap.get(order.cliente_id) || {
        cliente_id: order.cliente_id,
        total_orders: 0,
        total_spent: 0,
        last_order_date: null,
        avg_order_value: 0
      };
      
      existing.total_orders++;
      existing.total_spent += order.total || 0;
      
      const orderDate = order.fecha || order.created_at;
      if (!existing.last_order_date || (orderDate && orderDate > existing.last_order_date)) {
        existing.last_order_date = orderDate;
      }
      
      statsMap.set(order.cliente_id, existing);
    });

    // Calculate averages
    statsMap.forEach(stat => {
      stat.avg_order_value = stat.total_orders > 0 ? stat.total_spent / stat.total_orders : 0;
    });

    orderStats = Array.from(statsMap.values());
  }

  // Get favorite products for all clients
  let productStats: Map<string, { name: string; count: number }[]> = new Map();
  if (clientIds.length > 0) {
    const { data: orderIds } = await sb
      .from("orders")
      .select("id, cliente_id")
      .in("cliente_id", clientIds);

    if (orderIds && orderIds.length > 0) {
      const { data: items } = await sb
        .from("order_items")
        .select("order_id, nombre_producto, cantidad")
        .in("order_id", orderIds.map(o => o.id));

      // Map order items to clients
      const clientOrderMap = new Map(orderIds.map(o => [o.id, o.cliente_id]));
      const clientProductMap = new Map<string, Map<string, number>>();

      (items || []).forEach(item => {
        const clientId = clientOrderMap.get(item.order_id);
        if (clientId && item.nombre_producto) {
          const products = clientProductMap.get(clientId) || new Map();
          const current = products.get(item.nombre_producto) || 0;
          products.set(item.nombre_producto, current + (item.cantidad || 1));
          clientProductMap.set(clientId, products);
        }
      });

      // Convert to array format
      clientProductMap.forEach((products, clientId) => {
        const sorted = Array.from(products.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        productStats.set(clientId, sorted);
      });
    }
  }

  // Get month trend (simplified - comparing to last 30 days)
  const monthlyTrends = new Map<string, number>();
  if (clientIds.length > 0) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: recentOrders } = await sb
      .from("orders")
      .select("cliente_id, created_at")
      .in("cliente_id", clientIds)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: previousOrders } = await sb
      .from("orders")
      .select("cliente_id, created_at")
      .in("cliente_id", clientIds)
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    const recentCount = new Map<string, number>();
    const previousCount = new Map<string, number>();

    (recentOrders || []).forEach(o => {
      recentCount.set(o.cliente_id, (recentCount.get(o.cliente_id) || 0) + 1);
    });

    (previousOrders || []).forEach(o => {
      previousCount.set(o.cliente_id, (previousCount.get(o.cliente_id) || 0) + 1);
    });

    clientIds.forEach(id => {
      const recent = recentCount.get(id) || 0;
      const previous = previousCount.get(id) || 0;
      if (previous > 0) {
        const trend = ((recent - previous) / previous) * 100;
        monthlyTrends.set(id, Math.round(trend));
      } else if (recent > 0) {
        monthlyTrends.set(id, 100);
      }
    });
  }

  // Get routes and cities for filters
  const { data: routesRaw } = await sb
    .from("clients")
    .select("route")
    .not("route", "is", null)
    .order("route", { ascending: true })
    .limit(1000);
  const routes = Array.from(new Set(((routesRaw as { route: string | null }[]) ?? []).map(r => r.route).filter(Boolean))) as string[];

  const { data: citiesRaw } = await sb
    .from("clients")
    .select("city")
    .not("city", "is", null)
    .order("city", { ascending: true })
    .limit(1000);
  const cities = Array.from(new Set(((citiesRaw as { city: string | null }[]) ?? []).map(r => r.city).filter(Boolean))) as string[];

  const total = count ?? 0;
  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;

  // Determine client status and loyalty
  const getClientStatus = (stats: OrderStats | undefined, lastOrderDate: string | null) => {
    if (!stats || stats.total_orders === 0) return 'new';
    if (stats.total_spent > 10000) return 'vip';
    if (lastOrderDate) {
      const daysSince = Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 60) return 'inactive';
    }
    return 'active';
  };

  const getLoyaltyScore = (stats: OrderStats | undefined) => {
    if (!stats) return 0;
    // Simple loyalty calculation based on orders and value
    const orderScore = Math.min(stats.total_orders * 10, 50);
    const valueScore = Math.min(stats.total_spent / 200, 50);
    return Math.round(orderScore + valueScore);
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-5">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <div className="flex items-center gap-2">
          <Link href="/clients/new" className="btn btn-primary btn-md"><Plus size={16} /> Agregar cliente</Link>
          <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username'}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md">🤖 Abrir bot</a>
        </div>
      </div>

      {/* Filters */}
      <form method="get" className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs text-[var(--muted-foreground)]">Buscar</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Nombre, email o teléfono"
            className="input w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted-foreground)]">Ruta</label>
          <select name="route" defaultValue={selectedRoute} className="input">
            <option value="">Todas</option>
            {routes.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted-foreground)]">Ciudad</label>
          <select name="city" defaultValue={selectedCity} className="input">
            <option value="">Todas</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Filtrar</button>
      </form>

      {/* Results */}
      {!clients || clients.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No hay clientes"
          description={q || selectedCity || selectedRoute ? "No se encontraron clientes con los filtros aplicados" : "Agrega tu primer cliente para empezar"}
          action={{
            label: "Agregar cliente",
            href: "/clients/new",
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const stats = orderStats.find(s => s.cliente_id === client.id);
              const favoriteProducts = productStats.get(client.id) || [];
              const monthlyTrend = monthlyTrends.get(client.id) || 0;
              const status = getClientStatus(stats, stats?.last_order_date || null);
              const loyaltyScore = getLoyaltyScore(stats);

              return (
                <ClientCardEnhanced
                  key={client.id}
                  {...client}
                  totalOrders={stats?.total_orders || 0}
                  totalSpent={stats?.total_spent || 0}
                  lastOrderDate={stats?.last_order_date}
                  averageOrderValue={stats?.avg_order_value || 0}
                  favoriteProducts={favoriteProducts}
                  monthlyTrend={monthlyTrend}
                  status={status}
                  paymentStatus="on-time"
                  loyaltyScore={loyaltyScore}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {(hasPrev || hasNext) && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {offset + 1} - {Math.min(offset + PAGE_SIZE, total)} de {total} clientes
              </div>
              <div className="flex gap-2">
                {hasPrev && (
                  <Link
                    href={`?page=${page - 1}${q ? `&q=${q}` : ''}${selectedCity ? `&city=${selectedCity}` : ''}${selectedRoute ? `&route=${selectedRoute}` : ''}`}
                    className="btn btn-ghost btn-sm"
                  >
                    ← Anterior
                  </Link>
                )}
                {hasNext && (
                  <Link
                    href={`?page=${page + 1}${q ? `&q=${q}` : ''}${selectedCity ? `&city=${selectedCity}` : ''}${selectedRoute ? `&route=${selectedRoute}` : ''}`}
                    className="btn btn-ghost btn-sm"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
