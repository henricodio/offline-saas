import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/types/calendar";

// Fallback en memoria para desarrollo sin BD
const memoryEvents: CalendarEvent[] = [];

function hasEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "0001-01-01";
  const to = searchParams.get("to") || "9999-12-31";

  if (hasEnv()) {
    try {
      const { data, error } = await supabaseServer
        .from("calendar_events")
        .select("id, title, description, date, type, completed, objective, keyResults, quarter, progress")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: true });
      if (error) throw error;
      return NextResponse.json({ events: (data as CalendarEvent[]) || [] });
    } catch {
      // fallback en caso de error
      const events = memoryEvents.filter((e) => e.date >= from && e.date <= to);
      return NextResponse.json({ events });
    }
  }
  const events = memoryEvents.filter((e) => e.date >= from && e.date <= to);
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Omit<CalendarEvent, "id"> & Partial<Pick<CalendarEvent, "id">>;
  const payload: Omit<CalendarEvent, "id"> = {
    title: body.title,
    description: body.description,
    date: body.date,
    type: body.type,
    completed: Boolean(body.completed) || false,
    objective: body.objective,
    keyResults: body.keyResults,
    quarter: body.quarter,
    progress: body.progress,
  };

  if (!payload.title || !payload.date || !payload.type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (hasEnv()) {
    try {
      const { data, error } = await supabaseServer
        .from("calendar_events")
        .insert(payload)
        .select("id, title, description, date, type, completed, objective, keyResults, quarter, progress")
        .single();
      if (error) throw error;
      return NextResponse.json({ event: data as CalendarEvent });
    } catch {
      // fallback en memoria
      const ev: CalendarEvent = { id: body.id || `mem-${Date.now()}`, ...payload } as CalendarEvent;
      memoryEvents.push(ev);
      return NextResponse.json({ event: ev });
    }
  }

  const ev: CalendarEvent = { id: body.id || `mem-${Date.now()}`, ...payload } as CalendarEvent;
  memoryEvents.push(ev);
  return NextResponse.json({ event: ev });
}

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const body = (await req.json().catch(() => ({}))) as Partial<CalendarEvent> & { id?: string };
  const targetId = id || body.id;
  if (!targetId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Limitar campos permitidos
  const updates: Partial<CalendarEvent> = {};
  const allowed: (keyof CalendarEvent)[] = [
    "title",
    "description",
    "date",
    "type",
    "completed",
    "objective",
    "keyResults",
    "quarter",
    "progress",
  ];
  const b = body as Partial<CalendarEvent>;
  const upd = updates as Record<string, unknown>;
  for (const k of allowed) {
    const v = b[k];
    if (typeof v !== "undefined") {
      upd[k as string] = v as unknown;
    }
  }

  if (hasEnv()) {
    try {
      const { data, error } = await supabaseServer
        .from("calendar_events")
        .update(updates)
        .eq("id", targetId)
        .select("id, title, description, date, type, completed, objective, keyResults, quarter, progress")
        .single();
      if (error) throw error;
      return NextResponse.json({ event: data as CalendarEvent });
    } catch {
      // fallback en memoria
      const idx = memoryEvents.findIndex((e) => e.id === String(targetId));
      if (idx >= 0) {
        memoryEvents[idx] = { ...memoryEvents[idx], ...updates } as CalendarEvent;
        return NextResponse.json({ event: memoryEvents[idx] });
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const idx = memoryEvents.findIndex((e) => e.id === String(targetId));
  if (idx >= 0) {
    memoryEvents[idx] = { ...memoryEvents[idx], ...updates } as CalendarEvent;
    return NextResponse.json({ event: memoryEvents[idx] });
  }
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  const targetId = id || body.id;
  if (!targetId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (hasEnv()) {
    try {
      const { error } = await supabaseServer.from("calendar_events").delete().eq("id", targetId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    } catch {
      // fallback en memoria
      const before = memoryEvents.length;
      for (let i = memoryEvents.length - 1; i >= 0; i--) if (memoryEvents[i].id === String(targetId)) memoryEvents.splice(i, 1);
      return NextResponse.json({ ok: memoryEvents.length < before });
    }
  }

  const before = memoryEvents.length;
  for (let i = memoryEvents.length - 1; i >= 0; i--) if (memoryEvents[i].id === String(targetId)) memoryEvents.splice(i, 1);
  return NextResponse.json({ ok: memoryEvents.length < before });
}
