"use client"

import { useState } from "react"
import type { CalendarEvent } from "@/app/page"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Target, TrendingUp, Calendar, Edit3, Trash2, CheckCircle2, Circle } from "lucide-react"

interface OKRDashboardProps {
  okrs: CalendarEvent[]
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  onDeleteEvent: (id: string) => void
}

export function OKRDashboard({ okrs, onUpdateEvent, onDeleteEvent }: OKRDashboardProps) {
  const [editingKeyResult, setEditingKeyResult] = useState<{ okrId: string; krId: string } | null>(null)
  const [newProgress, setNewProgress] = useState("")

  const updateKeyResultProgress = (okrId: string, krId: string, newCurrent: number) => {
    const okr = okrs.find((o) => o.id === okrId)
    if (!okr || !okr.keyResults) return

    const updatedKeyResults = okr.keyResults.map((kr) =>
      kr.id === krId ? { ...kr, current: newCurrent, completed: newCurrent >= kr.target } : kr,
    )

    // Calcular progreso general del OKR
    const totalProgress =
      updatedKeyResults.reduce((acc, kr) => {
        return acc + Math.min((kr.current / kr.target) * 100, 100)
      }, 0) / updatedKeyResults.length

    onUpdateEvent(okrId, {
      keyResults: updatedKeyResults,
      progress: Math.round(totalProgress),
    })

    setEditingKeyResult(null)
    setNewProgress("")
  }

  const getQuarterColor = (quarter: string) => {
    switch (quarter) {
      case "Q1":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "Q2":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Q3":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Q4":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  if (okrs.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No tienes OKRs definidos</h3>
        <p className="text-muted-foreground mb-6">
          Los OKRs (Objectives and Key Results) te ayudan a establecer y medir objetivos claros.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
          <h4 className="font-medium mb-2">¿Qué son los OKRs?</h4>
          <ul className="text-sm text-muted-foreground space-y-1 text-left">
            <li>
              • <strong>Objetivos:</strong> Metas cualitativas inspiradoras
            </li>
            <li>
              • <strong>Resultados Clave:</strong> Métricas cuantificables
            </li>
            <li>
              • <strong>Seguimiento:</strong> Progreso medible y transparente
            </li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-orange-500" />
            Dashboard OKRs
          </h2>
          <p className="text-muted-foreground">Seguimiento de objetivos y resultados clave</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {okrs.length} OKR{okrs.length !== 1 ? "s" : ""} activo{okrs.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {okrs.map((okr) => (
          <Card key={okr.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{okr.title}</h3>
                  {okr.quarter && <Badge className={getQuarterColor(okr.quarter)}>{okr.quarter}</Badge>}
                </div>
                {okr.description && <p className="text-muted-foreground mb-3">{okr.description}</p>}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(okr.date).toLocaleDateString("es-ES")}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {okr.progress || 0}% completado
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onDeleteEvent(okr.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progreso General</span>
                <span className="text-sm text-muted-foreground">{okr.progress || 0}%</span>
              </div>
              <Progress value={okr.progress || 0} className="h-2" />
            </div>

            {/* Key Results */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Resultados Clave</h4>

              {okr.keyResults && okr.keyResults.length > 0 ? (
                <div className="space-y-3">
                  {okr.keyResults.map((kr) => (
                    <div key={kr.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-shrink-0">
                        {kr.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{kr.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {editingKeyResult?.okrId === okr.id && editingKeyResult?.krId === kr.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={newProgress}
                                onChange={(e) => setNewProgress(e.target.value)}
                                placeholder={kr.current.toString()}
                                className="w-20 h-7 text-xs"
                              />
                              <span className="text-xs text-muted-foreground">
                                / {kr.target} {kr.unit}
                              </span>
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateKeyResultProgress(okr.id, kr.id, Number(newProgress) || kr.current)
                                }
                                className="h-7 px-2 text-xs"
                              >
                                Guardar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingKeyResult(null)}
                                className="h-7 px-2 text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs">
                                <span className="font-medium">{kr.current}</span> / {kr.target} {kr.unit}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingKeyResult({ okrId: okr.id, krId: kr.id })
                                  setNewProgress(kr.current.toString())
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <Progress value={Math.min((kr.current / kr.target) * 100, 100)} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No hay resultados clave definidos para este objetivo
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
