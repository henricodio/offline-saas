"use client";

import React from "react";

type Task = {
  id?: string | number;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  due_date?: string | null;
  title?: string | null;
};

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function addDays(d: Date, n: number) {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
  return nd;
}

function startOfWeek(d: Date) {
  const wd = (d.getUTCDay() + 6) % 7; // 0=lunes
  return addDays(d, -wd);
}

export default function TasksWeek() {
  const [cursor, setCursor] = React.useState<Date>(() => new Date());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [itemsByDay, setItemsByDay] = React.useState<Record<string, Task[]>>({});

  const weekStart = startOfWeek(cursor);
  const days: Date[] = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = toISODate(days[0]);
  const to = toISODate(days[6]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/tasks?from=${from}&to=${to}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = (await res.json()) as { tasks: Task[] };
        if (cancelled) return;
        const map: Record<string, Task[]> = {};
        for (const t of data.tasks || []) {
          const key = (t.due_date || t.updated_at || t.created_at || "").slice(0, 10);
          if (!key) continue;
          (map[key] ||= []).push(t);
        }
        // Ordenar cada día por hora (si no hay, por id)
        Object.keys(map).forEach(k => {
          map[k].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '') || String(a.id || '').localeCompare(String(b.id || '')));
        });
        setItemsByDay(map);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  const weekLabel = `${days[0].toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const todayKey = toISODate(new Date());

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">Semana: {weekLabel}</div>
          <div className="inline-flex gap-2">
            <button className="btn btn-sm btn-ghost" onClick={() => setCursor(addDays(cursor, -7))} aria-label="Semana anterior">◀</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setCursor(new Date())} aria-label="Esta semana">Hoy</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setCursor(addDays(cursor, 7))} aria-label="Semana siguiente">▶</button>
          </div>
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="card p-3">
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {days.map((d) => {
            const key = toISODate(d);
            const list = itemsByDay[key] || [];
            const isToday = key === todayKey;
            return (
              <div key={key} className={`rounded-md border border-[var(--border)] ${isToday ? 'ring-1 ring-indigo-400/40' : ''} bg-white p-2 min-h-32`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{d.getUTCDate()}</div>
                </div>
                <ul className="space-y-1">
                  {list.length === 0 ? (
                    <li className="text-[10px] text-[var(--muted-foreground)]">Sin tareas</li>
                  ) : (
                    list.map((t, i) => (
                      <li key={`${t.id}-${i}`} className="text-xs px-2 py-1 rounded bg-[var(--muted)]">
                        {t.title || t.status || 'Tarea'}
                        <span className="ml-1 text-[10px] text-[var(--muted-foreground)]">{(t.due_date || '').slice(11,16)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? <div className="text-xs text-[var(--muted-foreground)]">Cargando…</div> : null}
    </div>
  );
}
