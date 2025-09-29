import { supabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowUpDown, ChevronDown, ChevronUp, Eye, Pencil, Trash2 } from "lucide-react";

type OrderRow = {
  id: number;
  total: number | null;
  fecha: string | null;
  created_at: string | null;
  short_code?: string | null;
  shortCode?: string | null;
  estado?: string | null;
};

function qs(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) usp.set(k, v); });
  const s = usp.toString();
  return s ? `?${s}` : "?";
}

function looksLikeUUID(s: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Pedidos recientes</h1>
        <p className="text-sm text-orange-600">
          Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en <code>.env.local</code>.
        </p>
      </main>
    );
  }
  const sb = supabaseServer;
  const sp = (await searchParams) || {};
  const page = (() => {
    const v = typeof sp.page === "string" ? parseInt(sp.page, 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : 1;
  })();
  const PAGE_SIZE = 10;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const estadoFilter = typeof sp.estado === "string" ? sp.estado : "";
  const fromDate = typeof sp.from === "string" ? sp.from : "";
  const toDate = typeof sp.to === "string" ? sp.to : "";
  const clientFilter = typeof sp.client === "string" ? sp.client : "";
  const sortParam = typeof sp.sort === "string" ? sp.sort : "created_at";
  const orderParam = typeof sp.order === "string" ? sp.order : "desc";
  const allowedSort = new Set(["created_at", "fecha", "total"]);
  const sortCol = allowedSort.has(sortParam) ? sortParam : "created_at";
  const ascending = orderParam === "asc";

  let rows: OrderRow[] = [];
  let total = 0;
  let errMsg: string | null = null;

  // Resolver filtro de cliente: soportar UUID o búsqueda por nombre (ilike)
  let clientIdsForFilter: string[] | null = null;
  if (clientFilter) {
    if (looksLikeUUID(clientFilter)) {
      clientIdsForFilter = [clientFilter];
    } else {
      try {
        const { data: crows } = await sb
          .from("clients")
          .select("id")
          .ilike("nombre", `%${clientFilter}%`)
          .limit(500);
        clientIdsForFilter = ((crows as { id: string }[]) || []).map(r => r.id);
      } catch {
        clientIdsForFilter = [];
      }
    }
  }

  // Sugerencias de clientes para autocomplete
  type ClientSuggestRow = { id: string; nombre: string | null };
  const { data: clientSuggestRows } = await sb
    .from("clients")
    .select("id, nombre")
    .order("nombre", { ascending: true })
    .limit(500);
  const clientSuggest = (clientSuggestRows as ClientSuggestRow[] | null) ?? [];

  function estadoBadge(e?: string | null) {
    const label = e ?? "-";
    const cls =
      e === "completado" ? "badge badge-success" :
      e === "pendiente" ? "badge badge-warning" :
      e === "en_proceso" ? "badge badge-info" :
      e === "cancelado" ? "badge badge-destructive" :
      "badge";
    return <span className={cls}>{label}</span>;
  }

  // Seleccionar fuente: usar vista si no filtramos por estado/cliente; si hay estado o cliente, usar tabla orders
  const source = (estadoFilter || clientFilter) ? "orders" : "orders_with_short_code";
  try {
    let listQuery = source === "orders_with_short_code"
      ? sb.from("orders_with_short_code").select("id, total, fecha, created_at, short_code")
      : sb.from("orders").select("id, total, fecha, created_at, estado");

    if (estadoFilter && source === "orders") {
      listQuery = listQuery.eq("estado", estadoFilter);
    }
    if (clientFilter && source === "orders") {
      if ((clientIdsForFilter || []).length > 0) {
        listQuery = listQuery.in("cliente_id", clientIdsForFilter as string[]);
      } else {
        listQuery = listQuery.eq("cliente_id", "00000000-0000-0000-0000-000000000000");
      }
    }
    if (fromDate) {
      listQuery = listQuery.gte("fecha", fromDate);
    }
    if (toDate) {
      listQuery = listQuery.lte("fecha", toDate);
    }

    let countQuery = (source === "orders_with_short_code"
      ? sb.from("orders_with_short_code")
      : sb.from("orders")
    ).select("id", { count: "exact", head: true });
    if (estadoFilter && source === "orders") {
      countQuery = countQuery.eq("estado", estadoFilter);
    }
    if (clientFilter && source === "orders") {
      if ((clientIdsForFilter || []).length > 0) {
        countQuery = countQuery.in("cliente_id", clientIdsForFilter as string[]);
      } else {
        countQuery = countQuery.eq("cliente_id", "00000000-0000-0000-0000-000000000000");
      }
    }
    if (fromDate) {
      countQuery = countQuery.gte("fecha", fromDate);
    }
    if (toDate) {
      countQuery = countQuery.lte("fecha", toDate);
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      listQuery.order(sortCol, { ascending }).range(from, to),
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;
    rows = (data as OrderRow[]) ?? [];
    total = count ?? 0;
  } catch {
    // Fallback a tabla orders si falla la vista
    try {
      let listQuery = sb.from("orders").select("id, total, fecha, created_at, estado");
      if (estadoFilter) listQuery = listQuery.eq("estado", estadoFilter);
      if (clientFilter) {
        if ((clientIdsForFilter || []).length > 0) {
          listQuery = listQuery.in("cliente_id", clientIdsForFilter as string[]);
        } else {
          listQuery = listQuery.eq("cliente_id", "00000000-0000-0000-0000-000000000000");
        }
      }
      if (fromDate) listQuery = listQuery.gte("fecha", fromDate);
      if (toDate) listQuery = listQuery.lte("fecha", toDate);

      let countQuery = sb.from("orders").select("id", { count: "exact", head: true });
      if (estadoFilter) countQuery = countQuery.eq("estado", estadoFilter);
      if (clientFilter) {
        if ((clientIdsForFilter || []).length > 0) {
          countQuery = countQuery.in("cliente_id", clientIdsForFilter as string[]);
        } else {
          countQuery = countQuery.eq("cliente_id", "00000000-0000-0000-0000-000000000000");
        }
      }
      if (fromDate) countQuery = countQuery.gte("fecha", fromDate);
      if (toDate) countQuery = countQuery.lte("fecha", toDate);

      const [{ data, error }, { count, error: countError }] = await Promise.all([
        listQuery.order(sortCol, { ascending }).range(from, to),
        countQuery,
      ]);
      if (error) throw error;
      if (countError) throw countError;
      rows = (data as OrderRow[]) ?? [];
      total = count ?? 0;
      errMsg = "Usando tabla 'orders' (vista no disponible)";
    } catch (ee) {
      errMsg = (ee as { message?: string })?.message ?? "Error al cargar pedidos";
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="toolbar">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <div className="flex items-center gap-2">
          <Link href="/orders/new" className="btn btn-primary btn-md">Agregar pedido</Link>
          <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username'}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md">🤖 Abrir bot</a>
        </div>
      </div>
      {/* Controles simplificados: estado como grupo de botones */}
      {/* Barra de filtros moderna */}
      <form method="get" className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted-foreground)]">Estado</label>
          <select name="estado" defaultValue={estadoFilter} className="input">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted-foreground)]">Desde</label>
          <input type="date" name="from" defaultValue={fromDate} className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted-foreground)]">Hasta</label>
          <input type="date" name="to" defaultValue={toDate} className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--muted-foreground)]">Cliente</label>
          <input list="clientOptions" type="text" name="client" defaultValue={clientFilter} placeholder="Nombre o UUID" className="input" />
        </div>
        <div className="flex items-end gap-2">
          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="sort" value={sortCol} />
          <input type="hidden" name="order" value={orderParam} />
          <button type="submit" className="btn btn-primary btn-md">Aplicar</button>
          {(estadoFilter || clientFilter || fromDate || toDate) ? (
            <Link href={qs({ sort: sortCol, order: orderParam, page: "1" })} className="btn btn-ghost btn-md">Limpiar</Link>
          ) : null}
        </div>
      </form>

      {/* Autocomplete options */}
      <datalist id="clientOptions">
        {clientSuggest.map((c) => (
          <option key={c.id} value={c.nombre || ''} />
        ))}
      </datalist>

      {/* Chips de filtros activos */}
      {(estadoFilter || clientFilter || fromDate || toDate) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {estadoFilter ? (
            <Link href={qs({ client: clientFilter || undefined, from: fromDate || undefined, to: toDate || undefined, sort: sortCol, order: orderParam, page: "1" })} className="badge">Estado: {estadoFilter} ✕</Link>
          ) : null}
          {clientFilter ? (
            <Link href={qs({ estado: estadoFilter || undefined, from: fromDate || undefined, to: toDate || undefined, sort: sortCol, order: orderParam, page: "1" })} className="badge">Cliente: {clientFilter.slice(0,8)}… ✕</Link>
          ) : null}
          {(fromDate || toDate) ? (
            <Link href={qs({ estado: estadoFilter || undefined, client: clientFilter || undefined, sort: sortCol, order: orderParam, page: "1" })} className="badge">Fecha: {fromDate || '—'} → {toDate || '—'} ✕</Link>
          ) : null}
        </div>
      ) : null}
      {errMsg ? (
        <p className="text-sm text-orange-600">{errMsg}</p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No hay pedidos para mostrar.</p>
      ) : (
        <div className="overflow-auto">
          <table className="table-base table-compact text-center">
            <thead>
              <tr>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <a href={`?estado=${encodeURIComponent(estadoFilter)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&sort=created_at&order=${sortCol === "created_at" && orderParam !== "asc" ? "asc" : "desc"}&page=1`} className="inline-flex items-center gap-1">
                    Fecha {sortCol === "created_at" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </a>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>Código</th>
                <th className="text-center" style={{ textAlign: "center" }}>
                  <a href={`?estado=${encodeURIComponent(estadoFilter)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&sort=total&order=${sortCol === "total" && orderParam !== "asc" ? "asc" : "desc"}&page=1`} className="inline-flex items-center gap-1">
                    Total {sortCol === "total" ? (ascending ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                  </a>
                </th>
                <th className="text-center" style={{ textAlign: "center" }}>Estado</th>
                <th className="text-center whitespace-nowrap" style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o: OrderRow) => (
                <tr key={o.id}>
                  <td className="text-center">{o.created_at?.slice(0, 10) ?? o.fecha ?? "-"}</td>
                  <td className="text-center">#{o.short_code ?? o.shortCode ?? `${o.fecha ?? o.created_at?.slice(0, 10)} - ${o.id}`}</td>
                  <td className="text-center">${""}{Number(o.total ?? 0).toFixed(2)}</td>
                  <td className="text-center">{estadoBadge(o.estado)}</td>
                  <td className="text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Link href={`/orders/${o.id}`} aria-label="Ver" title="Ver" className="icon-btn">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/orders/${o.id}/edit`} aria-label="Editar" title="Editar" className="icon-btn">
                        <Pencil size={14} />
                      </Link>
                      <button aria-label="Eliminar" title="Eliminar (requiere permisos)" className="icon-btn destructive opacity-60 cursor-not-allowed" disabled>
                        <Trash2 size={14} />
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
        <div className="text-sm text-gray-500">Página {page} · {total} resultados</div>
        <div className="flex gap-2">
          {page > 1 ? (
            <a href={`?estado=${encodeURIComponent(estadoFilter)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&sort=${sortCol}&order=${orderParam}&page=${page - 1}`} className="btn btn-ghost btn-sm">◀️ Anterior</a>
          ) : null}
          {page * PAGE_SIZE < total ? (
            <a href={`?estado=${encodeURIComponent(estadoFilter)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}&sort=${sortCol}&order=${orderParam}&page=${page + 1}`} className="btn btn-ghost btn-sm">Siguiente ▶️</a>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Configura tus variables en <code>.env.local</code> para conectar a Supabase.
      </p>
    </main>
  );
}
