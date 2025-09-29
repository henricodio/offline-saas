import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    const fromDate = from || monthStart;
    const toDate = to || monthEnd;

    const sb = supabaseServer;
    // Campos mínimos existentes usados en el dashboard: status, created_at, updated_at, due_date
    // Si existen más (p.ej. title/notes), también se devolverán si están en la tabla.
    const { data, error } = await sb
      .from("tasks")
      .select("id, status, created_at, updated_at, due_date")
      .gte("due_date", fromDate)
      .lte("due_date", toDate)
      .limit(5000);

    if (error) throw error;

    return NextResponse.json({ tasks: data ?? [] }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sb = supabaseServer;
    const body = await req.json();
    const status = typeof body?.status === 'string' && body.status.trim().length > 0 ? String(body.status).trim() : null;
    const due_date = typeof body?.due_date === 'string' && body.due_date.match(/^\d{4}-\d{2}-\d{2}$/) ? body.due_date : null;
    if (!status || !due_date) {
      return NextResponse.json({ error: "Campos requeridos: status (string) y due_date (YYYY-MM-DD)" }, { status: 400 });
    }
    const { data, error } = await sb
      .from("tasks")
      .insert({ status, due_date })
      .select("id, status, created_at, updated_at, due_date")
      .single();
    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
