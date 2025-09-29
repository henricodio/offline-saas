"use client"

import { useState } from "react"
import { Calendar } from "@/components/calendar"
import { EventForm } from "@/components/event-form"
import { EventList } from "@/components/event-list"
import { OKRDashboard } from "@/components/okr-dashboard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, CalendarIcon, List, Moon, Sun, Target } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  type: "note" | "task" | "reminder" | "okr"
  completed?: boolean
  objective?: string
  keyResults?: KeyResult[]
  quarter?: string
  progress?: number
}

export interface KeyResult {
  id: string
  description: string
  target: number
  current: number
  unit: string
  completed: boolean
}

export default function CalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<"calendar" | "list" | "okr">("calendar")
  const { theme, toggleTheme } = useTheme()

  const addEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString(),
    }
    setEvents((prev) => [...prev, newEvent])
    setShowForm(false)
  }

  const updateEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...updates } : event)))
  }

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id))
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return events.filter((event) => event.date === dateStr)
  }

  const getOKRs = () => {
    return events.filter((event) => event.type === "okr")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Mi Calendario</h1>
            <p className="text-muted-foreground text-lg">Organiza tus notas, tareas, recordatorios y OKRs</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full bg-transparent">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={view === "calendar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("calendar")}
                className="rounded-md"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendario
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                className="rounded-md"
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
              <Button
                variant={view === "okr" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("okr")}
                className="rounded-md"
              >
                <Target className="h-4 w-4 mr-2" />
                OKRs
              </Button>
            </div>

            <Button onClick={() => setShowForm(true)} className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar/List/OKR View */}
          <div className="lg:col-span-2">
            <Card className="p-6">
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
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {selectedDate.toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>

              <div className="space-y-3">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-muted-foreground text-sm">No hay eventos para este día</p>
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
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Resumen</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total eventos</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tareas pendientes</span>
                  <span className="font-medium">{events.filter((e) => e.type === "task" && !e.completed).length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Notas</span>
                  <span className="font-medium">{events.filter((e) => e.type === "note").length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Recordatorios</span>
                  <span className="font-medium">{events.filter((e) => e.type === "reminder").length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">OKRs activos</span>
                  <span className="font-medium">{events.filter((e) => e.type === "okr").length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Progreso promedio</span>
                  <span className="font-medium">
                    {events.filter((e) => e.type === "okr").length > 0
                      ? Math.round(
                          events.filter((e) => e.type === "okr").reduce((acc, e) => acc + (e.progress || 0), 0) /
                            events.filter((e) => e.type === "okr").length,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Event Form Modal */}
        {showForm && <EventForm selectedDate={selectedDate} onAddEvent={addEvent} onClose={() => setShowForm(false)} />}
      </div>
    </div>
  )
}
