import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ArrowUpDown, ChevronDown, ChevronUp, Plus, Eye, Pencil, Trash2, Users } from "lucide-react";
import EmptyState from "@/components/EmptyState";

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

const PAGE_SIZE = 10;

function qs(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) usp.set(k, v); });
  const s = usp.toString();
  return s ? `?${s}` : "?";
}

function num(v: string | string[] | undefined, def = 1) {
  const n = typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

function buildQS(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) usp.set(k, v);
  });
  return `?${usp.toString()}`;
}

export default async function ClientsPage({
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
  const page = num(sp.page, 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const sb = supabaseServer;

  const baseSelect = sb.from("clients").select("id, nombre, phone, contacto, direccion, route, city, created_at");
  const baseCount = sb.from("clients").select("id", { count: "exact", head: true });

  const allowedSort = new Set(["nombre", "phone", "contacto", "direccion", "route", "city", "created_at"]);
  const sortCol = allowedSort.has(sortParam) ? sortParam : "created_at";
  const ascending = orderParam === "asc";

  let listQuery = baseSelect;
  let countQuery = baseCount;

  if (q) {
    listQuery = listQuery.ilike("nombre", `%${q}%`);
    countQuery = countQuery.ilike("nombre", `%${q}%`);
  }

  if (selectedRoute) {
    listQuery = listQuery.eq("route", selectedRoute);
    countQuery = countQuery.eq("route", selectedRoute);
  }
  if (selectedCity) {
    listQuery = listQuery.eq("city", selectedCity);
    countQuery = countQuery.eq("city", selectedCity);
  }

  listQuery = listQuery.order(sortCol, { ascending }).range(from, to);

  const [{ data: rows, error: listError }, { count, error: countError }] = await Promise.all([
    listQuery,
    countQuery,
  ]);

  let errMsg: string | null = null;
  if (listError) errMsg = listError.message;
  if (countError) errMsg = (errMsg ? `${errMsg} | ` : "") + countError.message;

  const clients: Client[] = (rows as Client[]) ?? [];
  const { data: routesRaw } = await sb
    .from("clients")
    .select("route")
    .not("route", "is", null)
    .order("route", { ascending: true })
    .limit(1000);
  const routes = Array.from(new Set(((routesRaw as { route: string | null }[] ) ?? []).map(r => r.route).filter(Boolean))) as string[];
  const { data: citiesRaw } = await sb
    .from("clients")
    .select("city")
    .not("city", "is", null)
    .order("city", { ascending: true })
    .limit(1000);
  const cities = Array.from(new Set(((citiesRaw as { city: string | null }[] ) ?? []).map(r => r.city).filter(Boolean))) as string[];
  const total = count ?? 0;
  const hasPrev = page > 1;
  const hasNext = page * PAGE_SIZE < total;
  

  function sortHref(col: string) {
    const isActive = sortCol === col;
    const nextOrder = isActive && orderParam !== "asc" ? "asc" : "desc";
    return buildQS({
      q: q || undefined,
      route: selectedRoute || undefined,
      city: selectedCity || undefined,
      sort: col,
      order: nextOrder,
      page: "1",
    });
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <div className="flex items-center gap-2">
          <Link href="/clients/new" className="btn btn-primary btn-md"><Plus size={16} /> Agregar cliente</Link>
          <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username'}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md">🤖 Abrir bot</a>
        </div>
      </div>

      {/* Barra de filtros simplificada (nombre, ciudad, ruta) */}
      <form method="get" className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs text-[var(--muted-foreground)]">Buscar</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Nombre"
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
        <div className="flex items-end gap-2">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="sort" value={sortCol} />
          <input type="hidden" name="order" value={orderParam} />
          <button type="submit" className="btn btn-primary btn-md">Aplicar</button>
          {(q || selectedRoute || selectedCity) ? (
            <Link href={qs({ sort: sortCol, order: orderParam, page: "1" })} className="btn btn-ghost btn-md">Limpiar</Link>
          ) : null}
        </div>
      </form>

      {/* Chips de filtros activos */}
      {(q || selectedRoute || selectedCity) ? (
        <div className="-mt-1 flex flex-wrap gap-2">
          {q ? (
            <Link href={qs({ route: selectedRoute || undefined, city: selectedCity || undefined, sort: sortCol, order: orderParam, page: '1' })} className="badge">Nombre: “{q}” ✕</Link>
          ) : null}
          {selectedCity ? (
            <Link href={qs({ q: q || undefined, route: selectedRoute || undefined, sort: sortCol, order: orderParam, page: '1' })} className="badge">Ciudad: {selectedCity} ✕</Link>
          ) : null}
          {selectedRoute ? (
            <Link href={qs({ q: q || undefined, city: selectedCity || undefined, sort: sortCol, order: orderParam, page: '1' })} className="badge">Ruta: {selectedRoute} ✕</Link>
          ) : null}
        </div>
      ) : null}

      {errMsg ? <p className="text-sm text-orange-600">{errMsg}</p> : null}

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay clientes"
          description={q || selectedRoute || selectedCity 
            ? "No se encontraron clientes con los filtros aplicados. Intenta ajustar tu búsqueda."
            : "Comienza agregando tu primer cliente para gestionar tus ventas y pedidos de forma eficiente."
          }
          action={
            <Link href="/clients/new" className="btn btn-primary btn-md inline-flex items-center gap-2">
              <Plus size={16} />
              Agregar Cliente
            </Link>
          }
        />
      ) : (
        <div className="overflow-auto">
          <table className="table-base table-compact text-center">
            <thead>
              <tr>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <Link href={sortHref("nombre")} className="inline-flex items-center gap-1">
                    Nombre {sortCol === "nombre" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </Link>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <Link href={sortHref("phone")} className="inline-flex items-center gap-1">
                    Teléfono {sortCol === "phone" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </Link>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <Link href={sortHref("contacto")} className="inline-flex items-center gap-1">
                    Contacto {sortCol === "contacto" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </Link>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <Link href={sortHref("direccion")} className="inline-flex items-center gap-1">
                    Dirección {sortCol === "direccion" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </Link>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <Link href={sortHref("city")} className="inline-flex items-center gap-1">
                    Ciudad {sortCol === "city" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </Link>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <Link href={sortHref("route")} className="inline-flex items-center gap-1">
                    Ruta {sortCol === "route" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </Link>
                </th>
                <th className="text-center whitespace-nowrap" style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="text-center">
                    <Link href={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="text-center">{c.phone || "-"}</td>
                  <td className="text-center">{c.contacto || "-"}</td>
                  <td className="text-center">
                    <div className="max-w-[280px] truncate mx-auto text-center" title={c.direccion || "-"}>
                      {c.direccion || "-"}
                    </div>
                  </td>
                  <td className="text-center">{c.city || "-"}</td>
                  <td className="text-center">{c.route || "-"}</td>
                  <td className="text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 table-actions">
                      <Link href={`/clients/${c.id}`} aria-label="Ver cliente" title="Ver detalles" className="icon-btn">
                        <Eye size={16} />
                      </Link>
                      <Link href={`/clients/${c.id}/edit`} aria-label="Editar cliente" title="Editar información" className="icon-btn">
                        <Pencil size={16} />
                      </Link>
                      <button aria-label="Eliminar cliente" title="Eliminar (requiere permisos)" className="icon-btn destructive opacity-60 cursor-not-allowed" disabled>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-500">
          Página {page} · {total} resultados
        </div>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link
              href={buildQS({ q: q || undefined, route: selectedRoute || undefined, city: selectedCity || undefined, sort: sortCol, order: orderParam, page: String(page - 1) })}
              className="btn btn-ghost btn-sm"
            >
              ◀️ Anterior
            </Link>
          ) : null}
          {hasNext ? (
            <Link
              href={buildQS({ q: q || undefined, route: selectedRoute || undefined, city: selectedCity || undefined, sort: sortCol, order: orderParam, page: String(page + 1) })}
              className="btn btn-ghost btn-sm"
            >
              Siguiente ▶️
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
