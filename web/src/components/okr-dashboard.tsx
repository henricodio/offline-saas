"use client";

import * as React from "react";
import type { CalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function computeProgress(okr: CalendarEvent): number {
  if (okr.keyResults && okr.keyResults.length > 0) {
    const ratios = okr.keyResults.map((kr) => {
      const target = Number(kr.target || 0);
      const current = Number(kr.current || 0);
      if (!Number.isFinite(target) || target <= 0) return 0;
      return Math.max(0, Math.min(1, current / target));
    });
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    return Math.round(avg * 100);
  }
  return Math.round(Number(okr.progress || 0));
}

export function OKRDashboard({ okrs, onUpdateEvent, onDeleteEvent }: {
  okrs: CalendarEvent[];
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  onDeleteEvent: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {okrs.length === 0 ? (
        <div className="text-sm text-[var(--muted-foreground)]">Sin OKRs todavía. Crea uno nuevo desde &quot;Agregar&quot; y elige el tipo OKR.</div>
      ) : (
        okrs.map((okr) => {
          const pct = computeProgress(okr);
          return (
            <Card key={okr.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{okr.title}</div>
                  {okr.description ? (
                    <div className="text-xs text-[var(--muted-foreground)] truncate">{okr.description}</div>
                  ) : null}
                  {okr.quarter ? (
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-1">Trimestre: {okr.quarter}</div>
                  ) : null}
                </div>
                <div className="inline-flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => onUpdateEvent(okr.id, { progress: pct })}>
                    Actualizar progreso
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDeleteEvent(okr.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span>Progreso</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {okr.keyResults && okr.keyResults.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Resultados clave</div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {okr.keyResults.map((kr) => (
                      <li key={kr.id} className="border rounded p-2">
                        <div className="text-xs font-medium truncate">{kr.description}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">
                          {kr.current} / {kr.target} {kr.unit}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          );
        })
      )}
    </div>
  );
}
