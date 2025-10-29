import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import OrderDetailCard from "@/components/OrderDetailCard";

type Order = {
  id: string;
  fecha: string | null;
  created_at: string | null;
  estado: string | null;
  total: number | null;
  cliente_id: string;
  clients?: { id: string; nombre: string | null } | null;
  short_code?: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  nombre_producto: string | null;
  precio_unitario: number;
  cantidad: number;
  total_linea: number;
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = supabaseServer;

  // Intentar traer short_code si la vista existe
  let order: Order | null = null;
  try {
    const { data, error } = await sb
      .from("orders_with_short_code")
      .select("id, fecha, created_at, estado, total, cliente_id, short_code, clients ( id, nombre )")
      .eq("id", id)
      .single();
    if (error) throw error;
    order = data as unknown as Order;
  } catch {
    const { data } = await sb
      .from("orders")
      .select("id, fecha, created_at, estado, total, cliente_id, clients ( id, nombre )")
      .eq("id", id)
      .single();
    order = (data as unknown as Order) ?? null;
  }

  if (!order) return notFound();

  const { data: items } = await sb
    .from("order_items")
    .select("id, order_id, nombre_producto, precio_unitario, cantidad, total_linea")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const lines = (items as OrderItem[]) ?? [];

  return (
    <OrderDetailCard
      order={{
        id: order.id,
        cliente_id: order.cliente_id,
        cliente_nombre: order.clients?.nombre ?? undefined,
        total: order.total,
        fecha: order.fecha,
        created_at: order.created_at,
        estado: order.estado,
      }}
      items={lines.map((item) => ({
        id: item.id,
        nombre_producto: item.nombre_producto ?? 'Producto',
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        total_linea: item.total_linea,
      }))}
    />
  );
}
