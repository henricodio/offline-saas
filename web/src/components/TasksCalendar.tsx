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

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}
function endOfMonth(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0));
}

function addMonths(d: Date, n: number) {
  const nd = new Date(Date.UTC(d.getFullYear(), d.getMonth() + n, 1));
  return nd;
}

function getCalendarGrid(current: Date) {
  // Empezar en lunes: calcular offset desde el primer día del mes
  const first = startOfMonth(current);
  const last = endOfMonth(current);
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0=lunes
  const daysInMonth = last.getUTCDate();

  const days: { date: Date; inMonth: boolean }[] = [];
  // Días previos del mes anterior para completar fila
  for (let i = 0; i < firstWeekday; i++) {
    const d = new Date(first);
    d.setUTCDate(d.getUTCDate() - (firstWeekday - i));
    days.push({ date: d, inMonth: false });
  }
  // Días del mes
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(first);
    d.setUTCDate(i);
    days.push({ date: d, inMonth: true });
  }
  // Completar hasta múltiplo de 7
  while (days.length % 7 !== 0) {
    const lastDate = days[days.length - 1].date;
    const d = new Date(lastDate);
    d.setUTCDate(d.getUTCDate() + 1);
    days.push({ date: d, inMonth: false });
  }
  return days;
}

export default function TasksCalendar({ initialFrom }: { initialFrom: string }) {
  const [current, setCurrent] = React.useState<Date>(() => new Date(initialFrom + "T00:00:00Z"));
  const [tasksByDay, setTasksByDay] = React.useState<Record<string, Task[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [newStatus, setNewStatus] = React.useState<string>("");
  const [newDue, setNewDue] = React.useState<string>(() => toISODate(new Date()));
  const [selected, setSelected] = React.useState<string>(() => toISODate(new Date()));

  const from = toISODate(startOfMonth(current));
  const to = toISODate(endOfMonth(current));

  const loadTasks = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const url = `/api/tasks?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = (await res.json()) as { tasks: Task[] };
      const map: Record<string, Task[]> = {};
      for (const t of data.tasks || []) {
        const key = (t.due_date || t.updated_at || t.created_at || "").slice(0, 10);
        if (!key) continue;
        (map[key] ||= []).push(t);
      }
      setTasksByDay(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return; await loadTasks();
    })();
    return () => { cancelled = true; };
  }, [from, to, loadTasks]);

  async function createTask() {
    try {
      if (!newStatus.trim() || !newDue) return;
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus.trim(), due_date: newDue }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setShowCreate(false);
      setNewStatus("");
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const days = getCalendarGrid(current);
  const monthLabel = current.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdayShort = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const todayKey = toISODate(new Date());

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight capitalize">{monthLabel}</div>
          <div className="inline-flex gap-2">
            <button className="btn btn-sm btn-ghost" onClick={() => setCurrent(addMonths(current, -1))} aria-label="Mes anterior">◀</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setCurrent(new Date())} aria-label="Hoy">Hoy</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setCurrent(addMonths(current, 1))} aria-label="Mes siguiente">▶</button>
            <button className="btn btn-sm btn-primary" onClick={() => setShowCreate((v) => !v)} aria-label="Nueva tarea">+ Nueva tarea</button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : null}

      {showCreate ? (
        <div className="card p-3">
          <div className="text-sm text-[var(--muted-foreground)] mb-2">Crear tarea</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Descripción / estado"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <input
              type="date"
              value={newDue}
              onChange={(e) => setNewDue(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
            <div className="inline-flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={createTask}>Guardar</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
            </div>
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Por ahora: status + fecha límite. Añadiremos recordatorios y notificaciones tras definir esquema.</div>
        </div>
      ) : null}

      <div className="card p-3">
        <div className="grid grid-cols-7 gap-1">
          {weekdayShort.map((w) => (
            <div key={w} className="text-[10px] uppercase tracking-wide text-center text-[var(--muted-foreground)] py-1">{w}</div>
          ))}
          {days.map(({ date, inMonth }, idx) => {
            const key = toISODate(date);
            const list = tasksByDay[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selected;
            const base = `group min-h-24 p-2 rounded-md border transition-colors ${inMonth ? 'bg-white' : 'bg-[var(--muted)]'} border-[var(--border)]`;
            const state = isSelected
              ? 'ring-1 ring-indigo-500/60 bg-indigo-50'
              : isToday
                ? 'ring-1 ring-indigo-400/40'
                : 'hover:bg-gray-50';
            return (
              <button
                key={idx}
                type="button"
                className={`${base} ${state} text-left`}
                onClick={() => setSelected(key)}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-xs ${inMonth ? '' : 'text-[var(--muted-foreground)]'}`}>{date.getUTCDate()}</div>
                  {list.length > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-medium">
                      {list.length}
                    </span>
                  ) : null}
                </div>
                <ul className="mt-1 space-y-1">
                  {list.slice(0, 3).map((t, i) => (
                    <li key={i} className="text-xs truncate text-[var(--foreground)]/90" title={t.title || t.status || ''}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1 align-middle"></span>
                      {t.title || t.status || 'Tarea'}
                    </li>
                  ))}
                  {list.length > 3 ? (
                    <li className="text-[10px] text-[var(--muted-foreground)]">+{list.length - 3} más</li>
                  ) : null}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <div className="text-xs text-[var(--muted-foreground)]">Cargando…</div> : null}
    </div>
  );
}
