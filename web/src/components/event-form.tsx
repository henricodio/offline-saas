"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Target, Plus, Trash2, FileText, CheckSquare, Bell } from "lucide-react";
import type { CalendarEvent, KeyResult } from "@/types/calendar";

export function EventForm({ selectedDate, onAddEvent, onClose, onDateChange }: {
  selectedDate: Date;
  onAddEvent: (e: Omit<CalendarEvent, "id">) => void;
  onClose: () => void;
  onDateChange: (d: Date) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<"note" | "task" | "reminder" | "okr">("note");
  const [quarter, setQuarter] = React.useState("");
  const [keyResults, setKeyResults] = React.useState<Omit<KeyResult, "id">[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const eventData: Omit<CalendarEvent, "id"> = {
      title: title.trim(),
      description: description.trim() || undefined,
      date: selectedDate.toISOString().split("T")[0],
      type,
      completed: false,
    };
    if (type === "okr") {
      eventData.quarter = quarter;
      eventData.keyResults = keyResults.map((kr, index) => ({ ...kr, id: `kr-${Date.now()}-${index}`, completed: false }));
      eventData.progress = 0;
    }
    onAddEvent(eventData);
    setTitle(""); setDescription(""); setType("note"); setQuarter(""); setKeyResults([]);
  };

  const addKeyResult = () => {
    setKeyResults((list) => ([...list, { description: "", target: 0, current: 0, unit: "", completed: false }]));
  };
  const updateKeyResult = (index: number, field: keyof Omit<KeyResult, "id">, value: string | number | boolean) => {
    setKeyResults((list) => list.map((kr, i) => i === index ? { ...kr, [field]: value } : kr));
  };
  const removeKeyResult = (index: number) => {
    setKeyResults((list) => list.filter((_, i) => i !== index));
  };

  const eventTypes = [
    { value: "note", label: "Nota", icon: FileText, color: "blue" as const },
    { value: "task", label: "Tarea", icon: CheckSquare, color: "purple" as const },
    { value: "reminder", label: "Recordatorio", icon: Bell, color: "green" as const },
    { value: "okr", label: "OKR", icon: Target, color: "orange" as const },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto bg-[var(--card)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Agregar Evento</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{type === "okr" ? "Objetivo" : "Título"}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "okr" ? "Ej: Aumentar la satisfacción del cliente" : "Ingresa el título..."}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder={type === "okr" ? "Describe el contexto y la importancia de este objetivo..." : "Agrega una descripción..."}
              rows={3}
            />
          </div>

          <div>
            <Label>Tipo de evento</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {eventTypes.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value as ("note" | "task" | "reminder" | "okr"))}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    type === value
                      ? color === "blue"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                        : color === "purple"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                          : color === "green"
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      type === value
                        ? color === "blue"
                          ? "text-blue-600"
                          : color === "purple"
                            ? "text-purple-600"
                            : color === "green"
                              ? "text-green-600"
                              : "text-orange-600"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {type === "okr" && (
            <>
              <div>
                <Label htmlFor="quarter">Trimestre</Label>
                <select id="quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)} className="input">
                  <option value="" disabled>Selecciona el trimestre</option>
                  <option value="Q1">Q1 - Enero a Marzo</option>
                  <option value="Q2">Q2 - Abril a Junio</option>
                  <option value="Q3">Q3 - Julio a Septiembre</option>
                  <option value="Q4">Q4 - Octubre a Diciembre</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Resultados Clave</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addKeyResult}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar KR
                  </Button>
                </div>

                {keyResults.length === 0 ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Agrega resultados clave medibles para este objetivo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {keyResults.map((kr, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Ej: Aumentar NPS de satisfacción del cliente"
                              value={kr.description}
                              onChange={(e) => updateKeyResult(index, "description", e.target.value)}
                              required
                            />
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeKeyResult(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Valor inicial</Label>
                            <Input type="number" placeholder="0" value={kr.current} onChange={(e) => updateKeyResult(index, "current", Number(e.target.value))} />
                          </div>
                          <div>
                            <Label className="text-xs">Meta</Label>
                            <Input type="number" placeholder="100" value={kr.target} onChange={(e) => updateKeyResult(index, "target", Number(e.target.value))} required />
                          </div>
                          <div>
                            <Label className="text-xs">Unidad</Label>
                            <Input placeholder="puntos, %, usuarios..." value={kr.unit} onChange={(e) => updateKeyResult(index, "unit", e.target.value)} required />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <Label>Fecha</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="date"
                className="input"
                value={selectedDate.toISOString().slice(0, 10)}
                onChange={(e) => {
                  const v = e.target.value;
                  const [yy, mm, dd] = v.split('-').map(n => Number(n));
                  if (yy && mm && dd) {
                    onDateChange(new Date(Date.UTC(yy, mm - 1, dd)));
                  }
                }}
              />
              <div className="text-xs text-muted-foreground">
                {selectedDate.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <div className="ml-auto flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => onDateChange(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate() - 1)))}>◀</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onDateChange(new Date())}>Hoy</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onDateChange(new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate() + 1)))}>▶</Button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">Cancelar</Button>
            <Button type="submit" className="flex-1">{type === "okr" ? "Crear OKR" : "Agregar"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
