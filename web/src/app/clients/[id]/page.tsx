import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, ShoppingCart, DollarSign, Plus } from "lucide-react";
import OrderCard from "@/components/OrderCard";

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

  const { data: clientRow, error: cErr } = await sb
    .from("clients")
    .select("id, nombre, contacto, direccion, phone, route, city, created_at")
    .eq("id", params.id)
    .single();
  if (cErr) console.error(cErr);
  if (!clientRow) return notFound();
  const client: Client = clientRow as Client;

  const [{ count: ordersCount = 0 }, ordersTotalRes] = await Promise.all([
    sb.from("orders").select("id", { count: "exact", head: true }).eq("cliente_id", params.id),
    sb.from("orders").select("total").eq("cliente_id", params.id).limit(10000),
  ]);
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

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tel = (client.phone || "").replace(/[^+\d]/g, "");
  const waLink = tel ? `https://wa.me/${tel.replace(/^\+/, "")}` : null;
  const mapsLink = client.direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.direccion)}` : null;
  const createdDate = client.created_at ? new Date(client.created_at).toLocaleDateString("es-ES") : "-";

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/clients" className="text-sm text-blue-600 hover:underline">Clientes</Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-600">{client.nombre}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{client.nombre}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href={`/clients/${client.id}/edit`} className="btn btn-primary btn-md inline-flex items-center gap-2">
            <Pencil size={16} />
            Editar
          </Link>
          <Link href="/orders/new" className="btn btn-ghost btn-md inline-flex items-center gap-2">
            <Plus size={16} />
            Nuevo pedido
          </Link>
          <Link href="/clients" aria-label="Volver" className="btn btn-ghost btn-md">
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 font-medium">Pedidos totales</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{ordersCount}</div>
            </div>
            <ShoppingCart size={32} className="text-blue-400 opacity-50" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 font-medium">Total gastado</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">${fmt(totalSpent)}</div>
            </div>
            <DollarSign size={32} className="text-green-400 opacity-50" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 font-medium">Ticket promedio</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">${fmt(avgOrder)}</div>
            </div>
            <ShoppingCart size={32} className="text-purple-400 opacity-50" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 font-medium">Cliente desde</div>
              <div className="text-sm font-bold text-gray-900 mt-1">{createdDate}</div>
            </div>
            <Calendar size={32} className="text-orange-400 opacity-50" />
          </div>
        </div>
      </section>

      {/* Información de contacto */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Información de contacto</h2>
          <div className="space-y-3">
            {client.contacto && (
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <a href={`mailto:${client.contacto}`} className="text-blue-600 hover:underline truncate">
                  {client.contacto}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-gray-400" />
                <a href={`tel:${tel}`} className="text-blue-600 hover:underline">
                  {client.phone}
                </a>
              </div>
            )}
            {client.direccion && (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700">{client.direccion}</p>
                  {client.city && <p className="text-sm text-gray-500">{client.city}</p>}
                </div>
              </div>
            )}
            {client.route && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded">Ruta: {client.route}</span>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {tel && <a href={`tel:${tel}`} className="btn btn-sm btn-ghost">📞 Llamar</a>}
            {waLink && <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">💬 WhatsApp</a>}
            {mapsLink && <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">🗺️ Ubicación</a>}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link href={`/orders/new`} className="btn btn-primary w-full justify-start">
              <Plus size={18} />
              Crear nuevo pedido
            </Link>
            <Link href={`/clients/${client.id}/edit`} className="btn btn-ghost w-full justify-start">
              <Pencil size={18} />
              Editar información
            </Link>
            <Link href="/orders?client=" className="btn btn-ghost w-full justify-start">
              <ShoppingCart size={18} />
              Ver todos los pedidos
            </Link>
          </div>
        </div>
      </section>

      {/* Últimos pedidos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Últimos pedidos</h2>
          <Link href="/orders" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-8 text-center">
            <ShoppingCart size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Este cliente aún no tiene pedidos</p>
            <Link href="/orders/new" className="btn btn-primary btn-sm mt-4 inline-flex items-center gap-2">
              <Plus size={16} />
              Crear primer pedido
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((o) => (
              <OrderCard
                key={o.id}
                id={o.id}
                total={o.total}
                fecha={o.fecha}
                created_at={o.created_at}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
