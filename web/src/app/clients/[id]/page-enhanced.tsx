import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ClientDetailEnhanced from "@/components/ClientDetailEnhanced";

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

type OrderRow = {
  id: string;
  total: number | null;
  fecha: string | null;
  created_at: string | null;
  estado: string | null;
  cliente_id: string;
};

type OrderItemRow = {
  order_id: string;
  nombre_producto: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  total_linea: number | null;
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseServer;

  // Get client data
  const { data: clientRow, error: cErr } = await sb
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  
  if (cErr || !clientRow) return notFound();
  const client = clientRow as Client;

  // Get all orders for this client
  const { data: orders } = await sb
    .from("orders")
    .select("id, total, fecha, created_at, estado, cliente_id")
    .eq("cliente_id", id)
    .order("created_at", { ascending: false });

  const orderRows = (orders || []) as OrderRow[];

  // Calculate basic stats
  const totalOrders = orderRows.length;
  const totalSpent = orderRows.reduce((sum, order) => sum + (order.total || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  
  // Get dates
  const lastOrderDate = orderRows.length > 0 ? (orderRows[0].fecha || orderRows[0].created_at) : null;
  const firstOrderDate = orderRows.length > 0 ? (orderRows[orderRows.length - 1].fecha || orderRows[orderRows.length - 1].created_at) : null;
  const daysSinceLastOrder = lastOrderDate ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Calculate monthly trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentOrders = orderRows.filter(o => new Date(o.created_at || o.fecha || '') >= thirtyDaysAgo);
  const previousOrders = orderRows.filter(o => {
    const date = new Date(o.created_at || o.fecha || '');
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  });

  const monthlyTrend = previousOrders.length > 0 
    ? Math.round(((recentOrders.length - previousOrders.length) / previousOrders.length) * 100)
    : recentOrders.length > 0 ? 100 : 0;

  // Determine status
  const status = totalOrders === 0 ? 'new' :
    totalSpent > 10000 ? 'vip' :
    daysSinceLastOrder && daysSinceLastOrder > 60 ? 'inactive' :
    'active';

  // Calculate loyalty score (simple formula)
  const orderScore = Math.min(totalOrders * 5, 50);
  const valueScore = Math.min(totalSpent / 200, 50);
  const loyaltyScore = Math.round(orderScore + valueScore);

  // Get monthly data for charts (last 12 months)
  const monthlyData = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthOrders = orderRows.filter(o => {
      const date = new Date(o.fecha || o.created_at || '');
      return date >= monthStart && date <= monthEnd;
    });

    monthlyData.push({
      month: monthStart.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      orders: monthOrders.length,
      revenue: monthOrders.reduce((sum, o) => sum + (o.total || 0), 0)
    });
  }

  // Get product statistics
  let productStats: Array<{ name: string; quantity: number; revenue: number; percentage: number }> = [];
  
  if (orderRows.length > 0) {
    const orderIds = orderRows.map(o => o.id);
    
    const { data: items } = await sb
      .from("order_items")
      .select("order_id, nombre_producto, cantidad, precio_unitario, total_linea")
      .in("order_id", orderIds);

    const itemRows = (items || []) as OrderItemRow[];
    
    // Aggregate by product
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    
    itemRows.forEach(item => {
      if (item.nombre_producto) {
        const existing = productMap.get(item.nombre_producto) || { quantity: 0, revenue: 0 };
        existing.quantity += item.cantidad || 0;
        existing.revenue += item.total_linea || 0;
        productMap.set(item.nombre_producto, existing);
      }
    });

    // Convert to array and calculate percentages
    const totalRevenue = Array.from(productMap.values()).reduce((sum, p) => sum + p.revenue, 0);
    
    productStats = Array.from(productMap.entries())
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  // Format recent orders for history tab
  const recentOrdersFormatted = orderRows.slice(0, 20).map(order => ({
    id: order.id,
    fecha: order.fecha || order.created_at || '',
    total: order.total || 0,
    estado: order.estado || 'pendiente',
    items: 0 // We'd need another query to get exact item count
  }));

  // Get item counts for recent orders
  if (recentOrdersFormatted.length > 0) {
    const { data: itemCounts } = await sb
      .from("order_items")
      .select("order_id")
      .in("order_id", recentOrdersFormatted.map(o => o.id));
    
    const countMap = new Map<string, number>();
    (itemCounts || []).forEach(item => {
      countMap.set(item.order_id, (countMap.get(item.order_id) || 0) + 1);
    });
    
    recentOrdersFormatted.forEach(order => {
      order.items = countMap.get(order.id) || 0;
    });
  }

  const stats = {
    totalOrders,
    totalSpent,
    averageOrderValue,
    lastOrderDate,
    firstOrderDate,
    daysSinceLastOrder,
    monthlyTrend,
    status: status as 'vip' | 'active' | 'inactive' | 'new',
    loyaltyScore
  };

  return (
    <ClientDetailEnhanced
      client={client}
      stats={stats}
      monthlyData={monthlyData}
      productStats={productStats}
      recentOrders={recentOrdersFormatted}
    />
  );
}
