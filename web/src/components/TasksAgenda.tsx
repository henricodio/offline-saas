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
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  return addDays(s, 6);
}

export default function TasksAgenda() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Task[]>([]);

  const today = new Date();
  const from = toISODate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  const to = toISODate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)));

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/tasks?from=${from}&to=${to}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = (await res.json()) as { tasks: Task[] };
        if (cancelled) return;
        setItems((data.tasks || []).slice().sort((a, b) => (
          (a.due_date || '').localeCompare(b.due_date || '') || String(a.id || '').localeCompare(String(b.id || ''))
        )));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [from, to]);

  // Agrupación
  const groups: { title: string; filter: (t: Task) => boolean }[] = [];
  const todayKey = toISODate(today);
  const tomorrowKey = toISODate(addDays(today, 1));
  const weekStart = toISODate(startOfWeek(today));
  const weekEnd = toISODate(endOfWeek(today));

  groups.push({ title: "Atrasadas", filter: (t) => (t.due_date || '') < todayKey });
  groups.push({ title: "Hoy", filter: (t) => (t.due_date || '').slice(0,10) === todayKey });
  groups.push({ title: "Mañana", filter: (t) => (t.due_date || '').slice(0,10) === tomorrowKey });
  groups.push({ title: "Esta semana", filter: (t) => (t.due_date || '') > todayKey && (t.due_date || '') <= weekEnd });
  groups.push({ title: "Próximas", filter: (t) => (t.due_date || '') > weekEnd });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Agenda</div>
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="space-y-3">
        {groups.map((g) => {
          const list = items.filter(g.filter);
          if (list.length === 0) return null;
          return (
            <section key={g.title} className="card p-4">
              <div className="text-sm font-medium text-[var(--muted-foreground)] mb-2">{g.title}</div>
              <ul className="divide-y">
                {list.map((t) => {
                  const dateStr = (t.due_date || '').slice(0,10);
                  return (
                    <li key={`${t.id}-${dateStr}`} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm truncate">{t.title || t.status || 'Tarea'}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">Vence: {dateStr}</div>
                      </div>
                      <div className="inline-flex gap-2">
                        <button className="btn btn-sm btn-ghost">Editar</button>
                        <button className="btn btn-sm btn-ghost">Completar</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {loading ? <div className="text-xs text-[var(--muted-foreground)]">Cargando…</div> : null}
    </div>
  );
}
