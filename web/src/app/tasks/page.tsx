"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/calendar";
import { EventForm } from "@/components/event-form";
import { EventList } from "@/components/event-list";
import { OKRDashboard } from "@/components/okr-dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, CalendarIcon, List, Target } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CalendarEvent } from "@/types/calendar";


export default function CalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"calendar" | "list" | "okr">("calendar");
  const searchParams = useSearchParams();

  // Vista inicial desde query param (?view=okr|list|calendar)
  useEffect(() => {
    const v = searchParams.get("view");
    if (v === "okr" || v === "list" || v === "calendar") {
      setView(v);
    }
  }, [searchParams]);

  // Cargar eventos del backend
  useEffect(() => {
    async function load() {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()).toISOString().slice(0, 10);
      const to = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate()).toISOString().slice(0, 10);
      try {
        const res = await fetch(`/api/calendar/events?from=${from}&to=${to}`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const loaded = Array.isArray(json.events) ? json.events : [];
          // Evita sobrescribir adiciones locales (p. ej., si el usuario creó algo antes de que terminara la carga)
          setEvents((prev) => (prev.length > 0 ? prev : loaded));
        }
      } catch {}
    }
    load();
  }, []);

  const addEvent = async (event: Omit<CalendarEvent, "id">) => {
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      if (res.ok) {
        const json = await res.json();
        const ev = json.event as CalendarEvent;
        setEvents((prev) => [...prev, ev]);
        // Refetch para asegurar consistencia con backend (IDs normalizados, etc.)
        try {
          const today = new Date();
          const from = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()).toISOString().slice(0, 10);
          const to = new Date(today.getFullYear(), today.getMonth() + 12, today.getDate()).toISOString().slice(0, 10);
          const r2 = await fetch(`/api/calendar/events?from=${from}&to=${to}`, { cache: "no-store" });
          if (r2.ok) {
            const j2 = await r2.json();
            const loaded = Array.isArray(j2.events) ? j2.events : [];
            setEvents(loaded);
          }
        } catch {}
      } else {
        // fallback local si el endpoint falla
        const newEvent: CalendarEvent = { ...event, id: Date.now().toString() } as CalendarEvent;
        setEvents((prev) => [...prev, newEvent]);
      }
    } finally {
      setShowForm(false);
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    // Optimista
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...updates } : event)));
    try {
      await fetch(`/api/calendar/events?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    } catch {
      // En caso de error, podríamos recargar; por simplicidad mantenemos el estado optimista
    }
  };

  const deleteEvent = async (id: string) => {
    // Optimista
    setEvents((prev) => prev.filter((event) => event.id !== id));
    try {
      await fetch(`/api/calendar/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // En caso de error, recargamos el listado
      const res = await fetch("/api/calendar/events", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setEvents(Array.isArray(json.events) ? json.events : []);
      }
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => event.date === dateStr);
  };

  const getOKRs = () => {
    return events.filter((event) => event.type === "okr");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header mejorado con gradiente */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-indigo-500/10 p-8 mb-8 border border-purple-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">Mi Calendario</h1>
              <p className="text-muted-foreground text-base sm:text-lg">Organiza tus notas, tareas, recordatorios y OKRs</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
              <div className="flex bg-muted/80 backdrop-blur-sm rounded-xl p-1 shadow-sm">
                <Button
                  variant={view === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("calendar")}
                  className="rounded-lg transition-all"
                >
                  <CalendarIcon className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Calendario</span>
                </Button>
                <Button
                  variant={view === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("list")}
                  className="rounded-lg transition-all"
                >
                  <List className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Lista</span>
                </Button>
                <Button
                  variant={view === "okr" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setView("okr")}
                  className="rounded-lg transition-all"
                >
                  <Target className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">OKRs</span>
                </Button>
              </div>

              <Button onClick={() => setShowForm(true)} className="rounded-full shadow-lg hover:shadow-xl transition-shadow">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Agregar</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar/List/OKR View */}
          <div className="lg:col-span-2">
            <Card className="p-4 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
              {view === "calendar" ? (
                <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} events={events} />
              ) : view === "list" ? (
                <EventList events={events} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />
              ) : (
                <OKRDashboard okrs={getOKRs()} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} />
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Date Events */}
            <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow border-l-4 border-l-purple-500">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">
                  {selectedDate.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
              </div>

              <div className="space-y-3">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center mx-auto mb-3">
                      <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">No hay eventos para este día</p>
                    <Button onClick={() => setShowForm(true)} variant="ghost" size="sm" className="mt-2">
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar evento
                    </Button>
                  </div>
                ) : (
                  getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        event.type === "note"
                          ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20"
                          : event.type === "task"
                          ? "border-l-purple-500 bg-purple-50 dark:bg-purple-950/20"
                          : event.type === "reminder"
                          ? "border-l-green-500 bg-green-50 dark:bg-green-950/20"
                          : "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            event.type === "note"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : event.type === "task"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                              : event.type === "reminder"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                          }`}
                        >
                          {event.type === "note"
                            ? "Nota"
                            : event.type === "task"
                            ? "Tarea"
                            : event.type === "reminder"
                            ? "Recordatorio"
                            : "OKR"}
                        </span>
                      </div>
                      {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                      {event.type === "okr" && event.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span>Progreso</span>
                            <span>{event.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${event.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-background to-muted/20">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Resumen</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-muted-foreground">Total eventos</span>
                  <span className="font-semibold text-lg">{events.length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-muted-foreground">Tareas pendientes</span>
                  <span className="font-semibold text-lg text-purple-600">{events.filter((e) => e.type === "task" && !e.completed).length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-muted-foreground">Notas</span>
                  <span className="font-semibold text-lg text-blue-600">{events.filter((e) => e.type === "note").length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-muted-foreground">Recordatorios</span>
                  <span className="font-semibold text-lg text-green-600">{events.filter((e) => e.type === "reminder").length}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm text-muted-foreground">OKRs activos</span>
                  <span className="font-semibold text-lg text-orange-600">{events.filter((e) => e.type === "okr").length}</span>
                </div>
                <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progreso promedio OKRs</span>
                    <span className="font-bold text-lg text-orange-600">
                      {events.filter((e) => e.type === "okr").length > 0
                        ? Math.round(
                            events
                              .filter((e) => e.type === "okr")
                              .reduce((acc, e) => acc + (e.progress || 0), 0) /
                              events.filter((e) => e.type === "okr").length
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${events.filter((e) => e.type === "okr").length > 0
                          ? Math.round(
                              events
                                .filter((e) => e.type === "okr")
                                .reduce((acc, e) => acc + (e.progress || 0), 0) /
                                events.filter((e) => e.type === "okr").length
                            )
                          : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Event Form Modal */}
        {showForm && (
          <EventForm
            selectedDate={selectedDate}
            onAddEvent={addEvent}
            onClose={() => setShowForm(false)}
            onDateChange={(d) => setSelectedDate(d)}
          />
        )}
      </div>
    </div>
  );
}
