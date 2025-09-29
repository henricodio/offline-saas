"use client";

import * as React from "react";
import type { CalendarEvent } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Estilo mejorado para puntos de eventos
const dotStyleFor = (type: CalendarEvent["type"]): React.CSSProperties => ({
  backgroundColor: ({
    note: "var(--blue-500, #3b82f6)",
    task: "var(--green-500, #10b981)",
    reminder: "var(--yellow-500, #f59e0b)",
    okr: "var(--purple-500, #8b5cf6)",
  } as Record<string, string>)[type] || "var(--gray-500, #6b7280)",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  display: "inline-block",
});

export const Calendar = React.memo(({ selectedDate, onDateSelect, events }: {
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  events: CalendarEvent[];
}) => {
  type Mode = "day" | "week" | "month";
  const [mode, setMode] = React.useState<Mode>("month");
  // Helpers para vista mensual (lunes a domingo)
  const today = new Date();
  const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const endOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  const addDays = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
  const formatKey = (d: Date) => d.toISOString().slice(0, 10);
  const startOfWeek = (d: Date) => {
    const wd = (d.getUTCDay() + 6) % 7; // lunes=0
    return addDays(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), -wd);
  };
  const endOfWeek = (d: Date) => addDays(startOfWeek(d), 6);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7; // 0=lunes
  const daysInMonth = monthEnd.getUTCDate();

  const grid: { date: Date; inMonth: boolean }[] = [];
  // Relleno previo
  for (let i = 0; i < firstWeekday; i++) {
    const d = addDays(monthStart, -(firstWeekday - i));
    grid.push({ date: d, inMonth: false });
  }
  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day));
    grid.push({ date: d, inMonth: true });
  }
  // Relleno posterior
  while (grid.length % 7 !== 0) {
    const last = grid[grid.length - 1].date;
    grid.push({ date: addDays(last, 1), inMonth: false });
  }

  const weekdayShort = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const selectedKey = formatKey(selectedDate);
  const todayKey = formatKey(today);

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = (e.date || "").slice(0, 10);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const monthLabel = selectedDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const dayLabel = selectedDate.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekLabel = `${weekStart.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} – ${weekEnd.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`;

  function gotoPrev() {
    if (mode === "day") onDateSelect(addDays(selectedDate, -1));
    else if (mode === "week") onDateSelect(addDays(selectedDate, -7));
    else onDateSelect(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() - 1, 1)));
  }
  function gotoNext() {
    if (mode === "day") onDateSelect(addDays(selectedDate, 1));
    else if (mode === "week") onDateSelect(addDays(selectedDate, 7));
    else onDateSelect(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 1)));
  }
  function gotoToday() { onDateSelect(new Date()); }

  return (
    <TooltipProvider>
      <div className="space-y-3 font-sans">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight capitalize text-gray-900">
            {mode === "day" ? dayLabel : mode === "week" ? weekLabel : monthLabel}
          </h2>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg bg-gray-100 p-1 shadow-sm">
              {(["day","week","month"] as Mode[]).map(m => (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode(m)}
                  className={cn("rounded-lg px-3 py-1 text-sm font-medium", mode === m ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-200")}
                  aria-label={`Cambiar a vista ${m === "day" ? "diaria" : m === "week" ? "semanal" : "mensual"}`}
                >
                  {m === "day" ? <CalendarIcon className="w-4 h-4 mr-1" /> : m === "week" ? <List className="w-4 h-4 mr-1" /> : <Grid className="w-4 h-4 mr-1" />}
                  {m === "day" ? "Día" : m === "week" ? "Semana" : "Mes"}
                </Button>
              ))}
            </div>
            <div className="inline-flex gap-2">
              <Button variant="outline" size="icon" onClick={gotoPrev} aria-label="Ir al período anterior">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={gotoToday} className="text-sm font-medium">Hoy</Button>
              <Button variant="outline" size="icon" onClick={gotoNext} aria-label="Ir al período siguiente">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

      {/* Contenido según modo */}
      {mode === "month" ? (
        <Card className="p-4 shadow-lg rounded-xl bg-white">
          {/* Cabecera de días */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekdayShort.map((w) => (
              <div key={w} className="text-xs font-semibold uppercase tracking-wide text-center text-gray-500">{w}</div>
            ))}
          </div>
          {/* Grilla mensual */}
          <div className="grid grid-cols-7 gap-2">
            {grid.map(({ date, inMonth }, idx) => {
              const k = formatKey(date);
              const list = eventsByDate.get(k) || [];
              const isSelected = k === selectedKey;
              const isToday = k === todayKey;
              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "min-h-[88px] p-3 rounded-lg border transition-all duration-200 text-left",
                        inMonth ? "bg-white" : "bg-gray-50",
                        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : isToday ? "ring-1 ring-blue-300" : "hover:bg-gray-100",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500"
                      )}
                      onClick={() => onDateSelect(date)}
                      aria-label={`Seleccionar ${date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn("text-sm font-medium", inMonth ? "text-gray-900" : "text-gray-400")}>{date.getUTCDate()}</span>
                        {list.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">{list.length}</span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {list.slice(0, 4).map((e, i) => (
                          <span key={`${e.id}-${i}`} className="inline-block w-2 h-2 rounded-full" style={dotStyleFor(e.type)} />
                        ))}
                        {list.length > 4 && <span className="text-xs text-gray-500">+{list.length - 4}</span>}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {list.length > 0 ? (
                      <ul className="space-y-1">
                        {list.map((e) => (
                          <li key={e.id} className="text-sm">
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={dotStyleFor(e.type)} />
                            {e.title} ({e.type})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Sin eventos</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </Card>
      ) : mode === "week" ? (
        <div className="space-y-3">
          {[0,1,2,3,4,5,6].map(offset => {
            const d = addDays(weekStart, offset);
            const k = formatKey(d);
            const list = (eventsByDate.get(k) || []);
            return (
              <Card key={k} className="p-4 shadow-md rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-800">{d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onDateSelect(d); setMode("day"); }}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    Ir al día
                  </Button>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-gray-500">Sin eventos</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map(ev => (
                      <li key={ev.id} className="flex items-center justify-between text-sm">
                        <div className="truncate flex items-center">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={dotStyleFor(ev.type)} />
                          <span className="text-gray-800">{ev.title}</span>
                        </div>
                        <span className="text-xs text-gray-500 capitalize">{ev.type}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-4 shadow-md rounded-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{dayLabel}</h3>
          {(() => {
            const k = formatKey(selectedDate);
            const list = eventsByDate.get(k) || [];
            if (list.length === 0) return <p className="text-xs text-gray-500">Sin eventos</p>;
            return (
              <ul className="space-y-2">
                {list.map(ev => (
                  <li key={ev.id} className="flex items-center justify-between text-sm">
                    <div className="truncate flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={dotStyleFor(ev.type)} />
                      <span className="text-gray-800">{ev.title}</span>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{ev.type}</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
});

Calendar.displayName = "Calendar";
