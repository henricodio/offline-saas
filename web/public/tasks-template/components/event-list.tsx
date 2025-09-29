"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, CheckSquare, Bell, Trash2, Search, Filter } from "lucide-react"
import type { CalendarEvent } from "@/app/page"

interface EventListProps {
  events: CalendarEvent[]
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  onDeleteEvent: (id: string) => void
}

export function EventList({ events, onUpdateEvent, onDeleteEvent }: EventListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "note" | "task" | "reminder">("all")

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || event.type === filterType
    return matchesSearch && matchesFilter
  })

  const sortedEvents = filteredEvents.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return dateB.getTime() - dateA.getTime()
  })

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "note":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "task":
        return <CheckSquare className="h-4 w-4 text-purple-600" />
      case "reminder":
        return <Bell className="h-4 w-4 text-green-600" />
    }
  }

  const getEventTypeLabel = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "note":
        return "Nota"
      case "task":
        return "Tarea"
      case "reminder":
        return "Recordatorio"
    }
  }

  const handleTaskToggle = (id: string, completed: boolean) => {
    onUpdateEvent(id, { completed })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")}>
            Todos
          </Button>
          <Button
            variant={filterType === "note" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("note")}
          >
            Notas
          </Button>
          <Button
            variant={filterType === "task" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("task")}
          >
            Tareas
          </Button>
          <Button
            variant={filterType === "reminder" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("reminder")}
          >
            Recordatorios
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No se encontraron eventos</p>
          </div>
        ) : (
          sortedEvents.map((event) => (
            <Card key={event.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getEventIcon(event.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {event.type === "task" && (
                          <Checkbox
                            checked={event.completed || false}
                            onCheckedChange={(checked) => handleTaskToggle(event.id, checked as boolean)}
                          />
                        )}
                        <h3
                          className={`font-medium ${
                            event.type === "task" && event.completed
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {event.title}
                        </h3>
                      </div>

                      {event.description && <p className="text-sm text-muted-foreground mb-2">{event.description}</p>}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            event.type === "note"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : event.type === "task"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          }`}
                        >
                          {getEventTypeLabel(event.type)}
                        </span>
                        <span>
                          {new Date(event.date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
