import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  // Asumimos lunes como inicio de semana
  const day = d.getDay(); // 0=domingo
  const diff = (day === 0 ? -6 : 1) - day; // mueve a lunes
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addPeriod(d: Date, granularity: string): Date {
  const nd = new Date(d);
  if (granularity === "day") nd.setDate(nd.getDate() + 1);
  else if (granularity === "week") nd.setDate(nd.getDate() + 7);
  else if (granularity === "month") nd.setMonth(nd.getMonth() + 1);
  return nd;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const granularity = (url.searchParams.get("granularity") || "day").toLowerCase();
    const allowedGranularity = new Set(["day", "week", "month"]);
    if (!allowedGranularity.has(granularity)) {
      return NextResponse.json({ error: "invalid granularity" }, { status: 400 });
    }

    const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Rango por defecto: últimos 30 días
    const now = new Date();
    const defaultTo = toISODate(now);
    const defaultFrom = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    const fromStr = from || defaultFrom;
    const toStr = to || defaultTo;

    // Si no hay env, devolvemos datos sintéticos para preview
    if (!hasEnv) {
      const start = new Date(fromStr);
      const end = new Date(toStr);
      let cursor: Date;
      if (granularity === "day") cursor = startOfDay(start);
      else if (granularity === "week") cursor = startOfWeek(start);
      else cursor = startOfMonth(start);

      const points: { period: string; sales: number; orders: number; active_clients: number }[] = [];
      while (cursor < end) {
        const periodKey = toISODate(cursor);
        const seed = cursor.getTime() / (1000 * 60 * 60 * 24);
        const sales = Math.max(0, Math.round(800 + 300 * Math.sin(seed / 3) + (seed % 10)));
        const orders = Math.max(0, Math.round(10 + 5 * Math.cos(seed / 5) + (seed % 3)));
        const activeClients = Math.max(0, Math.round(5 + 2 * Math.sin(seed / 4)));
        points.push({ period: periodKey, sales, orders, active_clients: activeClients });
        cursor = addPeriod(cursor, granularity);
      }
      return NextResponse.json({ points }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } });
    }

    const sb = supabaseServer;
    // Obtenemos pedidos en el rango y agregamos en memoria por periodo
    const { data, error } = await sb
      .from("orders")
      .select("fecha,total,cliente_id")
      .gte("fecha", fromStr)
      .lt("fecha", toStr)
      .limit(200000);
    if (error) throw error;

    type Row = { fecha: string | null; total: number | null; cliente_id: string | null };
    const rows = (data as Row[]) || [];

    const bucketMap = new Map<string, { sales: number; orders: number; clients: Set<string> }>();
    function bucketKeyFor(fechaISO: string | null) {
      if (!fechaISO) return "";
      const d = new Date(fechaISO);
      let start: Date;
      if (granularity === "day") start = startOfDay(d);
      else if (granularity === "week") start = startOfWeek(d);
      else start = startOfMonth(d);
      return toISODate(start);
    }

    for (const r of rows) {
      const key = bucketKeyFor(r.fecha);
      if (!key) continue;
      const entry = bucketMap.get(key) || { sales: 0, orders: 0, clients: new Set<string>() };
      entry.sales += Number(r.total || 0);
      entry.orders += 1;
      if (r.cliente_id) entry.clients.add(r.cliente_id);
      bucketMap.set(key, entry);
    }

    // Rellenamos buckets vacíos para continuidad de la serie
    const start = new Date(fromStr);
    const end = new Date(toStr);
    let cursor: Date;
    if (granularity === "day") cursor = startOfDay(start);
    else if (granularity === "week") cursor = startOfWeek(start);
    else cursor = startOfMonth(start);

    const points: { period: string; sales: number; orders: number; active_clients: number }[] = [];
    while (cursor < end) {
      const key = toISODate(cursor);
      const entry = bucketMap.get(key);
      points.push({
        period: key,
        sales: Math.round(Number(entry?.sales || 0)),
        orders: Number(entry?.orders || 0),
        active_clients: entry ? entry.clients.size : 0,
      });
      cursor = addPeriod(cursor, granularity);
    }

    return NextResponse.json({ points }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unexpected";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
