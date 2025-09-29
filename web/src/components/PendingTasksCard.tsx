"use client";

import React from "react";
import Link from "next/link";
import type { CalendarEvent } from "@/types/calendar";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

function dueInfo(d?: string | null) {
  if (!d) return { label: "Sin fecha", cls: "text-slate-400", dot: "bg-slate-300" };
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return { label: "Sin fecha", cls: "text-slate-400", dot: "bg-slate-300" };
  const diffHrs = (t - Date.now()) / 3600000;
  if (diffHrs < 0) return { label: "Vencida", cls: "text-red-600", dot: "bg-red-500" };
  if (diffHrs <= 48) return { label: "En 48h", cls: "text-amber-600", dot: "bg-amber-500" };
  return { label: "Próxima", cls: "text-slate-500", dot: "bg-slate-400" };
}

export default function PendingTasksCard({ initialItems = [] }: { initialItems?: Array<{ title: string; due_date: string | null }> }) {
  const [items, setItems] = React.useState<Array<{ title: string; due_date: string | null }>>(initialItems);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const from = toISODate(new Date());
        const res = await fetch(`/api/calendar/events?from=${from}&to=9999-12-31`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const events: CalendarEvent[] = json.events || [];
          const tasks = events
            .filter(e => e.type === "task" && e.completed !== true)
            .sort((a, b) => (a.date || "") < (b.date || "") ? -1 : 1)
            .slice(0, 5)
            .map(e => ({ title: e.title, due_date: e.date || null }));
          if (tasks.length > 0) {
            setItems(tasks);
          } else if (initialItems.length > 0) {
            // mantener los initialItems como fallback
            setItems(initialItems);
          } else {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } catch {
        // En error, mantenemos los initialItems si existen
        setItems(initialItems);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [initialItems]);

  return (
    <div className="card p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--muted-foreground)]">Tareas pendientes</div>
        <Link href="/tasks?view=list" className="text-xs underline">Ver tareas</Link>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500 mt-2">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500 mt-2">
          Sin pendientes. <Link href="/tasks?view=list" className="underline">Crear tarea</Link>
        </div>
      ) : (
        <div className="mt-2 max-h-40 overflow-auto">
          <ul className="space-y-1 text-sm">
            {items.map((t, i) => {
              const info = dueInfo(t.due_date);
              const dateStr = t.due_date ? t.due_date : "—";
              return (
                <li key={i} className="flex items-center justify-between">
                  <div className="truncate flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${info.dot}`}></span>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <div className="text-xs flex items-center gap-2">
                    <span className={info.cls}>{info.label}</span>
                    <span className="text-[var(--muted-foreground)] tabular-nums">{dateStr}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
