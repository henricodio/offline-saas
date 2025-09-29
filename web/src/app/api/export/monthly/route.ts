import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function csvEscape(value: unknown) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]) {
  const headerLine = headers.map(csvEscape).join(",");
  const lines = rows.map(r => r.map(csvEscape).join(","));
  return [headerLine, ...lines].join("\n");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "orders"; // orders | top-clients | top-products
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const monthEnd = toISODate(new Date(new Date(nextMonthStart).getTime() - 24 * 60 * 60 * 1000));

    const fromDate = from || monthStart;
    const toDate = to || monthEnd;

    const sb = supabaseServer;

    type OrderRowCSV = { id: string; cliente_id: string | null; fecha: string | null; created_at: string | null; estado?: string | null; total: number | null };
    type ClientRow = { id: string; nombre: string | null };
    type OrderIdRow = { id: string };
    type ItemRow = { product_id: string | null; nombre_producto: string | null; cantidad: number | null; total_linea: number | null; order_id: string };

    if (type === "orders") {
      const { data: rows, error } = await sb
        .from("orders")
        .select("id, cliente_id, fecha, created_at, estado, total")
        .gte("fecha", fromDate)
        .lte("fecha", toDate)
        .limit(50000);
      if (error) throw error;
      const list = (rows as OrderRowCSV[]) || [];
      const clientIds = Array.from(new Set(list.map((r) => r.cliente_id).filter(Boolean))) as string[];
      const nameById = new Map<string, string | null>();
      if (clientIds.length) {
        const { data: clients } = await sb
          .from("clients")
          .select("id, nombre")
          .in("id", clientIds);
        for (const c of (clients as ClientRow[]) || []) {
          nameById.set(c.id, c.nombre ?? null);
        }
      }
      const headers = ["id", "fecha", "total", "estado", "cliente_id", "cliente_nombre"];
      const csvRows = list.map((r) => [
        r.id,
        r.fecha || (r.created_at ? r.created_at.slice(0, 10) : ""),
        Number(r.total || 0).toFixed(2),
        r.estado || "",
        r.cliente_id || "",
        (r.cliente_id ? nameById.get(r.cliente_id) : "") || ""
      ]);
      const csv = toCSV(headers, csvRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="orders_${fromDate}_a_${toDate}.csv"`
        }
      });
    }

    if (type === "top-clients") {
      const { data: rows } = await sb
        .from("orders")
        .select("cliente_id, total")
        .gte("fecha", fromDate)
        .lte("fecha", toDate)
        .limit(50000);
      const list = (rows as { cliente_id: string | null; total: number | null }[]) || [];
      const totals = new Map<string, number>();
      for (const r of list) {
        const cid = r.cliente_id as string | null;
        if (!cid) continue;
        totals.set(cid, (totals.get(cid) || 0) + Number(r.total || 0));
      }
      const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
      const ids = entries.map(([id]) => id);
      const nameById = new Map<string, string | null>();
      if (ids.length) {
        const { data: clients } = await sb
          .from("clients")
          .select("id, nombre")
          .in("id", ids);
        for (const c of (clients as ClientRow[]) || []) nameById.set(c.id, c.nombre ?? null);
      }
      const headers = ["cliente_id", "cliente_nombre", "total"];
      const csvRows = entries.map(([id, total]) => [id, nameById.get(id) || "", Number(total || 0).toFixed(2)]);
      const csv = toCSV(headers, csvRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="top_clientes_${fromDate}_a_${toDate}.csv"`
        }
      });
    }

    if (type === "top-products") {
      const { data: orderIds } = await sb
        .from("orders")
        .select("id")
        .gte("fecha", fromDate)
        .lte("fecha", toDate)
        .limit(50000);
      const ids = ((orderIds as OrderIdRow[]) || []).map(r => r.id);
      const acc = new Map<string, { nombre: string; qty: number; total: number }>();
      if (ids.length) {
        const { data: items } = await sb
          .from("order_items")
          .select("product_id, nombre_producto, cantidad, total_linea, order_id")
          .in("order_id", ids)
          .limit(200000);
        for (const it of (items as ItemRow[]) || []) {
          const key = String(it.product_id || it.nombre_producto || "unknown");
          const nombre = it.nombre_producto || "Producto";
          const cur = acc.get(key) || { nombre, qty: 0, total: 0 };
          cur.qty += Number(it.cantidad || 0);
          cur.total += Number(it.total_linea || 0);
          acc.set(key, cur);
        }
      }
      const entries = Array.from(acc.entries()).sort((a, b) => b[1].total - a[1].total);
      const headers = ["producto_key", "producto_nombre", "cantidad_total", "total"];
      const csvRows = entries.map(([key, v]) => [key, v.nombre, v.qty, Number(v.total || 0).toFixed(2)]);
      const csv = toCSV(headers, csvRows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="top_productos_${fromDate}_a_${toDate}.csv"`
        }
      });
    }

    return NextResponse.json({ error: "Tipo no soportado" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
