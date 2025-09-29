import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

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
};

export default async function ClientDetail({ params }: { params: { id: string } }) {
  const sb = supabaseServer;

  // Cargar cliente
  const { data: clientRow, error: cErr } = await sb
    .from("clients")
    .select("id, nombre, contacto, direccion, phone, route, city, created_at")
    .eq("id", params.id)
    .single();
  if (cErr) {
    console.error(cErr);
  }
  if (!clientRow) return notFound();
  const client: Client = clientRow as Client;

  // KPIs del cliente: número de pedidos y total acumulado (últimos 12 meses opcional)
  const [{ count: ordersCount = 0 }, ordersTotalRes] = await Promise.all([
    sb.from("orders").select("id", { count: "exact", head: true }).eq("cliente_id", params.id),
    sb
      .from("orders")
      .select("total")
      .eq("cliente_id", params.id)
      .limit(10000),
  ]);
  const totalSpent = (ordersTotalRes.data ?? []).reduce((acc: number, r: { total: number | null }) => acc + Number(r.total ?? 0), 0);

  // Últimos pedidos del cliente
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

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tel = (client.phone || "").replace(/[^+\d]/g, "");
  const waLink = tel ? `https://wa.me/${tel.replace(/^\+/, "")}` : null;
  const mapsLink = client.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.direccion)}` : null;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{client.nombre}</h1>
        <div className="flex items-center gap-1.5">
          <Link href="/clients" aria-label="Volver" title="Volver" className="icon-btn">
            <ArrowLeft size={16} />
          </Link>
          <Link href={`/clients/${client.id}/edit`} aria-label="Editar" title="Editar" className="icon-btn">
            <Pencil size={16} />
          </Link>
          <button aria-label="Eliminar" title="Eliminar (requiere permisos)" className="icon-btn destructive opacity-60 cursor-not-allowed" disabled>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Pedidos</div>
          <div className="text-2xl font-semibold">{ordersCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Total comprado</div>
          <div className="text-2xl font-semibold">${""}{fmt(totalSpent)}</div>
        </div>
        <div className="card p-4 space-y-2">
          <div className="text-sm text-gray-500">Contacto</div>
          <div className="text-base">{client.contacto || "-"}</div>
          <div className="text-sm text-gray-500">Teléfono</div>
          <div className="text-base">{client.phone || "-"}</div>
          <div className="text-sm text-gray-500">Ruta</div>
          <div className="text-base">{client.route || "-"}</div>
          <div className="text-sm text-gray-500">Ciudad</div>
          <div className="text-base">{client.city || "-"}</div>
          <div className="text-sm text-gray-500">Dirección</div>
          <div className="text-base break-words">{client.direccion || "-"}</div>
          <div className="pt-2 flex flex-wrap gap-2">
            {tel ? (
              <a href={`tel:${tel}`} className="btn btn-ghost btn-sm">Llamar</a>
            ) : null}
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">WhatsApp</a>
            ) : null}
            {mapsLink ? (
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Maps</a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Últimos pedidos</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Este cliente aún no tiene pedidos.</p>
        ) : (
          <ul className="card divide-y p-0">
            {recent.map((o) => (
              <li key={o.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">#{o.short_code ?? `${o.fecha ?? o.created_at?.slice(0, 10)} - ${o.id}`}</div>
                  <div className="text-sm text-gray-500">{o.fecha ?? o.created_at?.slice(0, 10)}</div>
                </div>
                <div className="font-semibold">${""}{fmt(Number(o.total ?? 0))}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
