import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import TopKPIsSection from "@/components/TopKPIsSection";
import { pctChange, fmtMoney } from "@/utils/dashboardUtils";
import TimeSeriesPanel from "@/components/TimeSeriesPanel";
import BreakdownsPanel from "@/components/BreakdownsPanel";
import PendingTasksCard from "@/components/PendingTasksCard";
import { Target, TrendingUp, CheckCircle2, Clock3 } from "lucide-react";

type OrderRow = {
  id: number;
  total: number | null;
  fecha: string | null;
  created_at: string | null;
  short_code?: string | null;
};

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!hasEnv) {
    return (
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="toolbar flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/orders" className="btn btn-primary btn-md">Ver pedidos</Link>
            <Link href="/clients" className="btn btn-ghost btn-md">Clientes</Link>
            <Link href="/products" className="btn btn-ghost btn-md">Productos</Link>
            <Link href="/tasks" className="btn btn-ghost btn-md">Tareas</Link>
            <Link href="/mapa" className="btn btn-ghost btn-md">Mapa</Link>
            <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username'}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md">🤖 Abrir bot</a>
          </div>
        </div>
        <p className="text-sm text-orange-600">Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en <code>.env.local</code>.</p>
      </main>
    );
  }

  const sb = supabaseServer;
  const now = new Date();
  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const nextMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const prevMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastYearMonthStart = toISODate(new Date(now.getFullYear() - 1, now.getMonth(), 1));
  const lastYearNextMonthStart = toISODate(new Date(now.getFullYear() - 1, now.getMonth() + 1, 1));
  const monthEnd = toISODate(new Date(new Date(nextMonthStart).getTime() - 24 * 60 * 60 * 1000));

  // KPIs del mes
  type MonthOrderRow = { total: number | null; cliente_id: string | null };
  const [
    { data: monthRows },
    { data: prevMonthRows },
    { data: lastYearRows },
  ] = await Promise.all([
    sb.from("orders").select("total, cliente_id").gte("fecha", monthStart).lt("fecha", nextMonthStart).limit(50000),
    sb.from("orders").select("total, cliente_id").gte("fecha", prevMonthStart).lt("fecha", monthStart).limit(50000),
    sb.from("orders").select("total, cliente_id").gte("fecha", lastYearMonthStart).lt("fecha", lastYearNextMonthStart).limit(50000),
  ]);

  const monthRowsData = (monthRows as MonthOrderRow[]) ?? [];
  const monthOrdersCount = monthRowsData.length;
  const monthTotal = monthRowsData.reduce((acc, r) => acc + Number(r.total ?? 0), 0);
  const monthActiveClients = new Set(monthRowsData.map(r => r.cliente_id).filter(Boolean)).size;
  const monthAvg = monthOrdersCount > 0 ? monthTotal / monthOrdersCount : 0;

  const prevMonthRowsData = (prevMonthRows as MonthOrderRow[]) ?? [];
  const prevMonthOrdersCount = prevMonthRowsData.length;
  const prevMonthTotal = prevMonthRowsData.reduce((acc, r) => acc + Number(r.total ?? 0), 0);
  const prevMonthActiveClients = new Set(prevMonthRowsData.map(r => r.cliente_id).filter(Boolean)).size;
  const prevMonthAvg = prevMonthOrdersCount > 0 ? prevMonthTotal / prevMonthOrdersCount : 0;

  const lastYearRowsData = (lastYearRows as MonthOrderRow[]) ?? [];
  const lastYearOrdersCount = lastYearRowsData.length;
  const monthYoYTotal = lastYearRowsData.reduce((acc, r) => acc + Number(r.total ?? 0), 0);
  const lastYearActiveClients = new Set(lastYearRowsData.map(r => r.cliente_id).filter(Boolean)).size;
  const lastYearAvg = lastYearOrdersCount > 0 ? monthYoYTotal / lastYearOrdersCount : 0;

  // KPIs de HOY (comparado con AYER)
  const todayStart = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const tomorrowStart = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const yesterdayStart = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  type OnlyTotal = { total: number | null };
  const [{ data: todayRows }, { data: yesterdayRows }] = await Promise.all([
    sb.from("orders").select("total").gte("fecha", todayStart).lt("fecha", tomorrowStart),
    sb.from("orders").select("total").gte("fecha", yesterdayStart).lt("fecha", todayStart),
  ]);
  const todayRowsData = (todayRows as OnlyTotal[]) ?? [];
  const yesterdayRowsData = (yesterdayRows as OnlyTotal[]) ?? [];
  const ordersToday = todayRowsData.length;
  const ordersYesterday = yesterdayRowsData.length;
  const totalToday = todayRowsData.reduce((acc, r) => acc + Number(r.total ?? 0), 0);
  const totalYesterday = yesterdayRowsData.reduce((acc, r) => acc + Number(r.total ?? 0), 0);

  // Clientes nuevos este mes (y comparación con mes anterior)
  type ClientRow = { id: string };
  const [{ data: newClientsMonthRows }, { data: newClientsPrevMonthRows }] = await Promise.all([
    sb.from("clients").select("id").gte("created_at", monthStart).lt("created_at", nextMonthStart),
    sb.from("clients").select("id").gte("created_at", prevMonthStart).lt("created_at", monthStart),
  ]);
  const newClientsThisMonth = ((newClientsMonthRows as ClientRow[]) ?? []).length;
  const newClientsPrevMonth = ((newClientsPrevMonthRows as ClientRow[]) ?? []).length;

  const qs = (await searchParams) || {};
  const topLimit = (typeof qs.top === 'string' && qs.top === 'more') ? 20 : 5;

  // Top clientes del mes (por ingresos)
  const totalsByClient = new Map<string, number>();
  for (const r of monthRowsData) {
    const cid = r.cliente_id as string | null;
    if (!cid) continue;
    const prev = totalsByClient.get(cid) || 0;
    totalsByClient.set(cid, prev + Number(r.total ?? 0));
  }
  const topClientEntries = Array.from(totalsByClient.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topLimit);
  const topClientIds = topClientEntries.map(([id]) => id);

  // Top clientes del mes anterior (para comparación)
  const totalsByClientPrev = new Map<string, number>();
  for (const r of prevMonthRowsData) {
    const cid = r.cliente_id as string | null;
    if (!cid) continue;
    totalsByClientPrev.set(cid, (totalsByClientPrev.get(cid) || 0) + Number(r.total ?? 0));
  }
  const prevTopClientEntries = Array.from(totalsByClientPrev.entries()).sort((a, b) => b[1] - a[1]).slice(0, topLimit);
  const prevTopClientIds = prevTopClientEntries.map(([id]) => id);
  const combinedClientIds = Array.from(new Set([...topClientIds, ...prevTopClientIds]));
  let topClients: { id: string; nombre: string | null; total: number }[] = [];
  let prevTopClients: { id: string; nombre: string | null; total: number }[] = [];
  if (combinedClientIds.length > 0) {
    const { data: clientsRowsAll } = await sb
      .from("clients")
      .select("id, nombre")
      .in("id", combinedClientIds);
    const nameByIdAll = new Map<string, string | null>();
    for (const c of (clientsRowsAll as { id: string; nombre: string | null }[]) || []) {
      nameByIdAll.set(c.id, c.nombre ?? null);
    }
    topClients = topClientEntries.map(([id, total]) => ({ id, nombre: nameByIdAll.get(id) ?? 'N/D', total }));
    prevTopClients = prevTopClientEntries.map(([id, total]) => ({ id, nombre: nameByIdAll.get(id) ?? 'N/D', total }));
  }

  // --- Productividad (tasks) del mes ---
  type TaskRow = { status: string | null; created_at: string | null; updated_at: string | null; due_date: string | null };
  const { data: taskRows } = await sb
    .from("tasks")
    .select("status, created_at, updated_at, due_date")
    .gte("due_date", monthStart)
    .lt("due_date", nextMonthStart)
    .limit(50000);
  const tasksData = (taskRows as TaskRow[]) ?? [];
  const totalTasks = tasksData.length;
  const completedTasks = tasksData.filter(t => (t.status || '').toLowerCase() === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0;
  function hoursBetween(a?: string | null, b?: string | null) {
    if (!a || !b) return 0;
    const t1 = new Date(a).getTime();
    const t2 = new Date(b).getTime();
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) return 0;
    return Math.max(0, (t2 - t1) / 3600000);
  }
  const completedForAvg = tasksData.filter(t => (t.status || '').toLowerCase() === 'completed' && t.created_at && t.updated_at);
  const avgResponseHours = completedForAvg.length > 0
    ? completedForAvg.reduce((acc, t) => acc + hoursBetween(t.created_at, t.updated_at), 0) / completedForAvg.length
    : 0;

  // (Se eliminó estacionalidad para simplificar)

  // OKR: progreso medio del mes (si existe la tabla okrs)
  let okrAvgProgress: number | null = null;
  try {
    const { data: okrRows } = await sb
      .from("okrs")
      .select("progress, created_at")
      .gte("created_at", monthStart)
      .lt("created_at", nextMonthStart)
      .limit(50000);
    const rows = (okrRows as { progress: number | null }[] | null) || [];
    const vals = rows.map(r => Number(r.progress ?? NaN)).filter(v => Number.isFinite(v));
    if (vals.length > 0) okrAvgProgress = vals.reduce((a, b) => a + b, 0) / vals.length;
  } catch {}

  // Tasa de finalización del mes anterior para delta
  const { data: prevTaskRows } = await sb
    .from("tasks")
    .select("status, created_at, updated_at, due_date")
    .gte("due_date", prevMonthStart)
    .lt("due_date", monthStart)
    .limit(50000);
  const prevTasksData = (prevTaskRows as TaskRow[]) ?? [];
  const prevTotalTasks = prevTasksData.length;
  const prevCompletedTasks = prevTasksData.filter(t => (t.status || '').toLowerCase() === 'completed').length;
  const prevCompletionRate = prevTotalTasks > 0 ? (prevCompletedTasks / prevTotalTasks) : 0;

  // (Lista de pendientes para hidratar el cliente)
  type InitialPending = { title: string; due_date: string | null };
  let initialPending: InitialPending[] = [];
  try {
    const todayISO = toISODate(new Date());
    const { data: pendingCalSrv } = await sb
      .from("calendar_events")
      .select("title, date, completed, type")
      .eq("type", "task")
      .eq("completed", false)
      .gte("date", todayISO)
      .order("date", { ascending: true })
      .limit(5);
    const rows = (pendingCalSrv as { title: string | null; date: string | null; completed: boolean | null; type: string | null }[] | null) || [];
    initialPending = rows.map(r => ({ title: r.title || "Tarea", due_date: r.date }));
  } catch {
    function parseTime(d?: string | null) {
      if (!d) return Number.POSITIVE_INFINITY;
      const t = new Date(d).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    }
    initialPending = tasksData
      .filter(t => (t.status || '').toLowerCase() !== 'completed')
      .sort((a, b) => parseTime(a.due_date) - parseTime(b.due_date))
      .slice(0, 5)
      .map(t => ({ title: (t.status || 'pendiente').toString(), due_date: t.due_date }));
  }

  // Top productos del mes (por ingresos)
  type IdRow = { id: string };
  const { data: orderIdsData } = await sb
    .from("orders")
    .select("id")
    .gte("fecha", monthStart)
    .lt("fecha", nextMonthStart)
    .limit(50000);
  const monthOrderIds = ((orderIdsData as IdRow[]) || []).map(r => r.id);
  type OIRow = { order_id: string; product_id: string | null; nombre_producto: string | null; cantidad: number | null; total_linea: number | null };
  let topProducts: { key: string; nombre: string; qty: number; total: number }[] = [];

  // Top productos del mes anterior (para comparación)
  const { data: prevOrderIdsData } = await sb
    .from("orders")
    .select("id")
    .gte("fecha", prevMonthStart)
    .lt("fecha", monthStart)
    .limit(50000);
  const prevMonthOrderIds = ((prevOrderIdsData as IdRow[]) || []).map(r => r.id);
  let prevTopProducts: { key: string; nombre: string; qty: number; total: number }[] = [];
  const combinedMonthOrderIds = Array.from(new Set([...monthOrderIds, ...prevMonthOrderIds]));
  if (combinedMonthOrderIds.length > 0) {
    const { data: allMonthItems } = await sb
      .from("order_items")
      .select("product_id, nombre_producto, cantidad, total_linea, order_id")
      .in("order_id", combinedMonthOrderIds)
      .limit(300000);
    const accCurr = new Map<string, { nombre: string; qty: number; total: number }>();
    const accPrev = new Map<string, { nombre: string; qty: number; total: number }>();
    const monthSet = new Set(monthOrderIds);
    const prevSet = new Set(prevMonthOrderIds);
    for (const r of (allMonthItems as OIRow[]) || []) {
      const target = monthSet.has(r.order_id) ? accCurr : (prevSet.has(r.order_id) ? accPrev : null);
      if (!target) continue;
      const key = (r.product_id || r.nombre_producto || '').toString() || 'unknown';
      const nombre = (r.nombre_producto || 'Producto');
      const prev = target.get(key) || { nombre, qty: 0, total: 0 };
      prev.qty += Number(r.cantidad || 0);
      prev.total += Number(r.total_linea || 0);
      target.set(key, prev);
    }
    topProducts = Array.from(accCurr.entries()).map(([key, v]) => ({ key, nombre: v.nombre, qty: v.qty, total: v.total })).sort((a, b) => b.total - a.total).slice(0, topLimit);
    prevTopProducts = Array.from(accPrev.entries()).map(([key, v]) => ({ key, nombre: v.nombre, qty: v.qty, total: v.total })).sort((a, b) => b.total - a.total).slice(0, topLimit);
  }

  // --- Agregados anuales (año actual vs año anterior) ---
  const thisYearStart = toISODate(new Date(now.getFullYear(), 0, 1));
  const nextYearStart = toISODate(new Date(now.getFullYear() + 1, 0, 1));
  const thisYearEnd = toISODate(new Date(new Date(nextYearStart).getTime() - 24 * 60 * 60 * 1000));
  const lastYearStart = toISODate(new Date(now.getFullYear() - 1, 0, 1));

  type YearOrderRow = { id: string; total: number | null; cliente_id: string | null };
  const [{ data: yearOrders }, { data: lastYearOrders }] = await Promise.all([
    sb.from("orders").select("id, total, cliente_id").gte("fecha", thisYearStart).lt("fecha", nextYearStart).limit(50000),
    sb.from("orders").select("id, total, cliente_id").gte("fecha", lastYearStart).lt("fecha", thisYearStart).limit(50000),
  ]);
  const yearOrderRows = (yearOrders as YearOrderRow[]) || [];
  const lastYearOrderRows = (lastYearOrders as YearOrderRow[]) || [];
  const yearTotal = yearOrderRows.reduce((acc, r) => acc + Number(r.total || 0), 0);
  const yearPrevTotal = lastYearOrderRows.reduce((acc, r) => acc + Number(r.total || 0), 0);
  const yearOrdersCount = yearOrderRows.length;
  const yearPrevOrdersCount = lastYearOrderRows.length;
  const yearActiveClientsCount = new Set(yearOrderRows.map(r => r.cliente_id).filter(Boolean)).size;
  const yearPrevActiveClientsCount = new Set(lastYearOrderRows.map(r => r.cliente_id).filter(Boolean)).size;
  const yearAvg = yearOrdersCount > 0 ? yearTotal / yearOrdersCount : 0;
  const yearPrevAvg = yearPrevOrdersCount > 0 ? yearPrevTotal / yearPrevOrdersCount : 0;

  // Top clientes año actual / anterior
  const yearTotalsByClient = new Map<string, number>();
  for (const r of yearOrderRows) {
    const cid = r.cliente_id as string | null;
    if (!cid) continue;
    yearTotalsByClient.set(cid, (yearTotalsByClient.get(cid) || 0) + Number(r.total || 0));
  }
  const lastYearTotalsByClient = new Map<string, number>();
  for (const r of lastYearOrderRows) {
    const cid = r.cliente_id as string | null;
    if (!cid) continue;
    lastYearTotalsByClient.set(cid, (lastYearTotalsByClient.get(cid) || 0) + Number(r.total || 0));
  }
  const yearTopClientEntries = Array.from(yearTotalsByClient.entries()).sort((a, b) => b[1] - a[1]).slice(0, topLimit);
  const lastYearTopClientEntries = Array.from(lastYearTotalsByClient.entries()).sort((a, b) => b[1] - a[1]).slice(0, topLimit);
  const yearClientIds = yearTopClientEntries.map(([id]) => id);
  const lastYearClientIds = lastYearTopClientEntries.map(([id]) => id);
  let yearTopClients: { id: string; nombre: string | null; total: number }[] = [];
  let lastYearTopClients: { id: string; nombre: string | null; total: number }[] = [];
  const combinedYearClientIds = Array.from(new Set([...yearClientIds, ...lastYearClientIds]));
  if (combinedYearClientIds.length > 0) {
    const { data: cRowsAll } = await sb.from("clients").select("id, nombre").in("id", combinedYearClientIds);
    const nameById = new Map<string, string | null>();
    for (const c of (cRowsAll as { id: string; nombre: string | null }[]) || []) nameById.set(c.id, c.nombre ?? null);
    yearTopClients = yearTopClientEntries.map(([id, total]) => ({ id, nombre: nameById.get(id) ?? 'N/D', total }));
    lastYearTopClients = lastYearTopClientEntries.map(([id, total]) => ({ id, nombre: nameById.get(id) ?? 'N/D', total }));
  }

  // Top productos año actual / anterior
  const yearOrderIds = yearOrderRows.map(r => r.id);
  const lastYearOrderIds = lastYearOrderRows.map(r => r.id);
  let yearTopProducts: { key: string; nombre: string; qty: number; total: number }[] = [];
  let lastYearTopProducts: { key: string; nombre: string; qty: number; total: number }[] = [];
  const combinedYearOrderIds = Array.from(new Set([...yearOrderIds, ...lastYearOrderIds]));
  if (combinedYearOrderIds.length > 0) {
    const { data: allYearItems } = await sb
      .from("order_items")
      .select("product_id, nombre_producto, cantidad, total_linea, order_id")
      .in("order_id", combinedYearOrderIds)
      .limit(600000);
    const accYear = new Map<string, { nombre: string; qty: number; total: number }>();
    const accLast = new Map<string, { nombre: string; qty: number; total: number }>();
    const yearSet = new Set(yearOrderIds);
    const lastSet = new Set(lastYearOrderIds);
    for (const it of ((allYearItems as OIRow[]) || [])) {
      const target = yearSet.has(it.order_id) ? accYear : (lastSet.has(it.order_id) ? accLast : null);
      if (!target) continue;
      const key = (it.product_id || it.nombre_producto || '').toString() || 'unknown';
      const nombre = it.nombre_producto || 'Producto';
      const cur = target.get(key) || { nombre, qty: 0, total: 0 };
      cur.qty += Number(it.cantidad || 0);
      cur.total += Number(it.total_linea || 0);
      target.set(key, cur);
    }
    yearTopProducts = Array.from(accYear.entries()).map(([key, v]) => ({ key, nombre: v.nombre, qty: v.qty, total: v.total })).sort((a, b) => b.total - a.total).slice(0, topLimit);
    lastYearTopProducts = Array.from(accLast.entries()).map(([key, v]) => ({ key, nombre: v.nombre, qty: v.qty, total: v.total })).sort((a, b) => b.total - a.total).slice(0, topLimit);
  }

  // Recent orders (try view first)
  let recent: OrderRow[] = [];
  try {
    const { data, error } = await sb
      .from("orders_with_short_code")
      .select("id, total, fecha, created_at, short_code")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    recent = (data as OrderRow[]) ?? [];
  } catch {
    const { data } = await sb
      .from("orders")
      .select("id, total, fecha, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    recent = (data as OrderRow[]) ?? [];
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="toolbar flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/tasks" className="btn btn-ghost btn-md">Tareas</Link>
          <Link href="/mapa" className="btn btn-ghost btn-md">Mapa</Link>
          <a href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username'}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-md">🤖 Abrir bot</a>
        </div>
      </div>

      <div className="text-xs text-[var(--muted-foreground)]">Mes actual: {monthStart} – {monthEnd}</div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-sm text-[var(--muted-foreground)]">Clientes activos del mes</div>
          <div
            className="text-2xl font-semibold text-center"
            title={`Actual: ${monthActiveClients} | Mes ant.: ${prevMonthActiveClients} | YoY: ${lastYearActiveClients}`}
          >
            {monthActiveClients}
          </div>
          {(() => { const pc = pctChange(monthActiveClients, prevMonthActiveClients); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mes anterior</div>
          ); })()}
          {(() => { const pc = pctChange(monthActiveClients, lastYearActiveClients); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mismo mes año anterior</div>
          ); })()}
          <div className="mt-2">
            <Link href={`/clients?active=1&from=${monthStart}&to=${monthEnd}` } className="text-xs underline">Ver clientes activos del mes</Link>
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-sm text-[var(--muted-foreground)]">Total ventas del mes</div>
          <div
            className="text-2xl font-semibold text-center"
            title={`Actual: $${fmtMoney(monthTotal)} | Mes ant.: $${fmtMoney(prevMonthTotal)} | YoY: $${fmtMoney(monthYoYTotal)}`}
          >
            ${""}{fmtMoney(monthTotal)}
          </div>
          {(() => { const pc = pctChange(monthTotal, prevMonthTotal); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mes anterior</div>
          ); })()}
          {(() => { const pc = pctChange(monthTotal, monthYoYTotal); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mismo mes año anterior</div>
          ); })()}
          <div className="mt-2 flex gap-3">
            <Link href={`/orders?from=${monthStart}&to=${monthEnd}` } className="text-xs underline">Ver pedidos del mes</Link>
            <a href={`/api/export/monthly?type=orders&from=${monthStart}&to=${monthEnd}`} className="text-xs underline">Descargar CSV</a>
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-sm text-[var(--muted-foreground)]">Ticket medio del mes</div>
          <div
            className="text-2xl font-semibold text-center"
            title={`Actual: $${fmtMoney(monthAvg)} | Mes ant.: $${fmtMoney(prevMonthAvg)} | YoY: $${fmtMoney(lastYearAvg)}`}
          >
            ${""}{fmtMoney(monthAvg)}
          </div>
          {(() => { const pc = pctChange(monthAvg, prevMonthAvg); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mes anterior</div>
          ); })()}
          {(() => { const pc = pctChange(monthAvg, lastYearAvg); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mismo mes año anterior</div>
          ); })()}
        </div>
      </section>

      {/* KPIs de HOY */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-sm text-[var(--muted-foreground)]">Pedidos hoy</div>
          <div
            className="text-2xl font-semibold text-center"
            title={`Ayer: ${ordersYesterday}`}
          >
            {ordersToday}
          </div>
          {(() => { const pc = pctChange(ordersToday, ordersYesterday); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs ayer</div>
          ); })()}
          <div className="mt-2">
            <Link href={`/orders?from=${todayStart}&to=${tomorrowStart}`} className="text-xs underline">Ver pedidos de hoy</Link>
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-sm text-[var(--muted-foreground)]">Ingresos hoy</div>
          <div
            className="text-2xl font-semibold text-center"
            title={`Ayer: $${fmtMoney(totalYesterday)}`}
          >
            ${""}{fmtMoney(totalToday)}
          </div>
          {(() => { const pc = pctChange(totalToday, totalYesterday); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs ayer</div>
          ); })()}
        </div>
        <div className="card p-4 text-center">
          <div className="text-sm text-[var(--muted-foreground)]">Clientes nuevos este mes</div>
          <div
            className="text-2xl font-semibold text-center"
            title={`Mes ant.: ${newClientsPrevMonth}`}
          >
            {newClientsThisMonth}
          </div>
          {(() => { const pc = pctChange(newClientsThisMonth, newClientsPrevMonth); return (
            <div className={`text-xs ${pc.cls}`}>{pc.label} vs mes anterior</div>
          ); })()}
        </div>
      </section>

      {/* Productividad + Tendencia compacta */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/tasks?view=okr" className="block">
          <div className="card p-4 hover:bg-[var(--muted)]/40 transition-colors cursor-pointer h-full bg-gradient-to-br from-indigo-500/5 to-sky-500/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Target className="w-4 h-4" />
                <span>Productividad (mes)</span>
              </div>
              {(() => { const pc = pctChange(Math.round(completionRate * 100), Math.round(prevCompletionRate * 100)); return (
                <div className={`text-xs ${pc.cls} inline-flex items-center gap-1`}>
                  <TrendingUp className="w-3 h-3" />
                  {pc.label} vs mes anterior
                </div>
              ); })()}
            </div>

            <div className="mt-1 text-3xl font-semibold">{(completionRate * 100).toFixed(0)}%</div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">Completadas</div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Tareas</span>
                <span className="tabular-nums">{completedTasks}/{totalTasks}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />Tiempo medio resp.</span>
                <span className="tabular-nums">{avgResponseHours.toFixed(1)} h</span>
              </div>

              <div className="text-xs mt-1">OKR</div>
              <div className="w-full bg-gray-200/70 rounded-full h-1.5" aria-label="Progreso OKR promedio">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${okrAvgProgress ?? 0}%` }} />
              </div>
              <div className="text-xs text-right">{okrAvgProgress !== null ? `${okrAvgProgress.toFixed(0)}%` : '—'}</div>
            </div>
          </div>
        </Link>
        <PendingTasksCard initialItems={initialPending} />
      </section>

      {/* Tendencias (series temporales) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tendencias</h2>
        </div>
        <TimeSeriesPanel />
      </section>

      {/* Breakdowns y Drill-downs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Breakdowns</h2>
        </div>
        <BreakdownsPanel />
      </section>

      {/* Top clientes y productos - pestañas Mes/Año con comparación */}
      <TopKPIsSection
        month={{
          clients: topClients.map(c => ({ id: c.id, nombre: c.nombre || 'N/D', total: Number(c.total || 0) })),
          products: topProducts.map(p => ({ key: p.key, nombre: p.nombre, qty: p.qty, total: p.total })),
          from: monthStart,
          to: monthEnd,
          grandTotal: monthTotal,
          compareClients: prevTopClients.map(c => ({ id: c.id, nombre: c.nombre || 'N/D', total: Number(c.total || 0) })),
          compareProducts: prevTopProducts.map(p => ({ key: p.key, nombre: p.nombre, qty: p.qty, total: p.total })),
          grandTotalCompare: prevMonthTotal,
          // KPIs globales
          ordersCount: monthOrdersCount,
          compareOrdersCount: prevMonthOrdersCount,
          activeClientsCount: monthActiveClients,
          compareActiveClientsCount: prevMonthActiveClients,
          avgTicket: monthAvg,
          avgTicketCompare: prevMonthAvg,
        }}
        year={{
          clients: yearTopClients.map(c => ({ id: c.id, nombre: c.nombre || 'N/D', total: Number(c.total || 0) })),
          products: yearTopProducts.map(p => ({ key: p.key, nombre: p.nombre, qty: p.qty, total: p.total })),
          from: thisYearStart,
          to: thisYearEnd,
          grandTotal: yearTotal,
          compareClients: lastYearTopClients.map(c => ({ id: c.id, nombre: c.nombre || 'N/D', total: Number(c.total || 0) })),
          compareProducts: lastYearTopProducts.map(p => ({ key: p.key, nombre: p.nombre, qty: p.qty, total: p.total })),
          grandTotalCompare: yearPrevTotal,
          // KPIs globales (año)
          ordersCount: yearOrdersCount,
          compareOrdersCount: yearPrevOrdersCount,
          activeClientsCount: yearActiveClientsCount,
          compareActiveClientsCount: yearPrevActiveClientsCount,
          avgTicket: yearAvg,
          avgTicketCompare: yearPrevAvg,
        }}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Últimos pedidos</h2>
          <Link href="/orders" className="text-sm underline">Ver todos</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No hay pedidos recientes.</p>
        ) : (
          <ul className="card divide-y p-0">
            {recent.map((o) => (
              <li key={o.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">#{o.short_code ?? `${o.fecha ?? o.created_at?.slice(0, 10)} - ${o.id}`}</div>
                  <div className="text-sm text-gray-500">{o.fecha ?? o.created_at?.slice(0, 10)}</div>
                </div>
                <div className="font-semibold">${""}{fmtMoney(Number(o.total ?? 0))}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
