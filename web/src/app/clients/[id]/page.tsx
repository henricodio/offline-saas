import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ClientDetailCard from "@/components/ClientDetailCard";

type Client = {
  id: string;
  nombre: string;
  contacto: string | null;
  direccion: string | null;
  phone?: string | null;
  route?: string | null;
  city?: string | null;
  created_at: string | null;
};

type OrderRow = {
  id: string;
  total: number | null;
  fecha: string | null;
  created_at: string | null;
  short_code?: string | null;
  estado?: string | null;
};

export default async function ClientDetail({ params }: { params: { id: string } }) {
  const sb = supabaseServer;

  const { data: clientRow, error: cErr } = await sb
    .from("clients")
    .select("id, nombre, contacto, direccion, phone, route, city, created_at")
    .eq("id", params.id)
    .single();
  if (cErr) console.error(cErr);
  if (!clientRow) return notFound();
  const client: Client = clientRow as Client;

  const [countRes, ordersTotalRes] = await Promise.all([
    sb.from("orders").select("id", { count: "exact", head: true }).eq("cliente_id", params.id),
    sb.from("orders").select("total").eq("cliente_id", params.id).limit(10000),
  ]);
  const ordersCount = countRes.count ?? 0;
  const totalSpent = (ordersTotalRes.data ?? []).reduce((acc: number, r: { total: number | null }) => acc + Number(r.total ?? 0), 0);
  const avgOrder = ordersCount > 0 ? totalSpent / ordersCount : 0;

  let recent: OrderRow[] = [];
  try {
    const { data, error } = await sb
      .from("orders_with_short_code")
      .select("id, total, fecha, created_at, short_code")
      .eq("cliente_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    recent = (data as OrderRow[]) ?? [];
  } catch {
    const { data } = await sb
      .from("orders")
      .select("id, total, fecha, created_at")
      .eq("cliente_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10);
    recent = (data as OrderRow[]) ?? [];
  }

  return (
    <ClientDetailCard
      client={{
        id: client.id,
        nombre: client.nombre,
        contacto: client.contacto ?? null,
        phone: client.phone ?? null,
        direccion: client.direccion ?? null,
        city: client.city ?? null,
        route: client.route ?? null,
        created_at: client.created_at,
      }}
      stats={{
        ordersCount,
        totalSpent,
        avgOrder,
        lastOrderDate: recent[0]?.fecha ?? null,
      }}
      recentOrders={recent.map((o) => ({
        id: o.id,
        total: o.total,
        fecha: o.fecha,
        created_at: o.created_at,
        estado: o.estado,
      }))}
    />
  );
}
