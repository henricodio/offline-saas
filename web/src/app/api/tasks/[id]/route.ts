import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
// Next.js 15 compatible

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (typeof body.status === 'string') updates.status = body.status;
    if (typeof body.due_date === 'string') updates.due_date = body.due_date;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
    }
    const { data, error } = await supabaseServer
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select("id, status, created_at, updated_at, due_date")
      .single();
    if (error) throw error;
    return NextResponse.json({ task: data }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    const { error } = await supabaseServer.from("tasks").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}