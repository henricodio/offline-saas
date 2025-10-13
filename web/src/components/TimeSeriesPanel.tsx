"use client";

import React from "react";
import { fmtMoney } from "@/utils/dashboardUtils";

type Point = { period: string; sales: number; orders: number; active_clients: number };

type Granularity = "day" | "week" | "month";

type Preset = "7d" | "30d" | "90d" | "ytd";

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

function computeRange(preset: Preset): { from: string; to: string; granularity: Granularity } {
  const now = new Date();
  const to = toISODate(now);
  if (preset === "7d") {
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)), to, granularity: "day" };
  }
  if (preset === "30d") {
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)), to, granularity: "day" };
  }
  if (preset === "90d") {
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)), to, granularity: "week" };
  }
  // ytd
  return { from: toISODate(new Date(now.getFullYear(), 0, 1)), to, granularity: "month" };
}

export default function TimeSeriesPanel({ compact = false }: { compact?: boolean }) {
  const [points, setPoints] = React.useState<Point[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [preset, setPreset] = React.useState<Preset>("30d");
  const base = React.useMemo(() => computeRange(preset), [preset]);
  const [from, setFrom] = React.useState<string>(base.from);
  const [to, setTo] = React.useState<string>(base.to);
  const [granularity, setGranularity] = React.useState<Granularity>(base.granularity);
  const [metric, setMetric] = React.useState<keyof Point>("sales");
  const [rangeWarning, setRangeWarning] = React.useState<string | null>(null);

  // Sincronizar estado inicial desde la URL (from, to, granularity, metric, preset)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const usp = new URLSearchParams(window.location.search);
    const qFrom = usp.get("from");
    const qTo = usp.get("to");
    const qGran = usp.get("granularity") as Granularity | null;
    const qMetric = usp.get("metric") as keyof Point | null;
    const qPreset = usp.get("preset") as Preset | null;
    if (qPreset && (["7d","30d","90d","ytd"] as Preset[]).includes(qPreset as Preset)) {
      setPreset(qPreset as Preset);
    }
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qGran && (qGran === "day" || qGran === "week" || qGran === "month")) setGranularity(qGran);
    if (qMetric && (qMetric === "sales" || qMetric === "orders" || qMetric === "active_clients")) setMetric(qMetric);
  }, []);

  // Mantener sincronizados los controles cuando cambia preset
  React.useEffect(() => {
    // Si la URL ya especifica from/to, no sobreescribirlos
    if (typeof window !== "undefined") {
      const usp = new URLSearchParams(window.location.search);
      if (usp.has("from") || usp.has("to")) {
        return;
      }
    }
    const r = computeRange(preset);
    setFrom(r.from);
    setTo(r.to);
    setGranularity(r.granularity);
  }, [preset]);

  // Validar rango: from <= to (en formato YYYY-MM-DD se puede comparar lexicográficamente)
  React.useEffect(() => {
    if (from && to && from > to) {
      setRangeWarning("El rango de fechas es inválido (desde > hasta)");
    } else {
      setRangeWarning(null);
    }
  }, [from, to]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ from, to, granularity });
      const res = await fetch(`/api/metrics/timeseries?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setPoints(json.points || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error cargando datos";
      setError(message);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, granularity]);

  // Reflejar estado en la URL
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const usp = new URLSearchParams(window.location.search);
    usp.set("from", from);
    usp.set("to", to);
    usp.set("granularity", granularity);
    usp.set("metric", String(metric));
    usp.set("preset", preset);
    const newUrl = `${window.location.pathname}?${usp.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [from, to, granularity, metric, preset]);

  // Render simple line chart
  function LineChart({ data, height = 160 }: { data: number[]; height?: number }) {
    const w = Math.max(320, (data.length - 1) * 24 + 20);
    const max = Math.max(1, ...data);
    const min = 0; // baseline en 0 para interpretabilidad
    const pad = 10;
    const h = height;

    const pointsStr = data
      .map((v, i) => {
        const x = pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1);
        const y = h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <div className="overflow-auto" role="img" aria-label="Evolución temporal">
        <svg width={w} height={h} className="min-w-full">
          {/* eje x base */}
          <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
          {/* línea */}
          <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={pointsStr} />
        </svg>
      </div>
    );
  }

  const series = points.map((p) => (metric === "sales" ? Number(p.sales || 0) : metric === "orders" ? Number(p.orders || 0) : Number(p.active_clients || 0)));
  const total = series.reduce((acc, v) => acc + v, 0);
  const metricLabel = metric === "sales" ? "Ventas" : metric === "orders" ? "Pedidos" : "Clientes activos";

  return (
    <div className="space-y-3">
      {/* Toolbar (oculta en compacto) */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center rounded-md bg-[var(--muted)] p-0.5">
            {(["7d", "30d", "90d", "ytd"] as Preset[]).map((p) => (
              <button key={p} type="button" onClick={() => setPreset(p)} className={`btn btn-sm ${preset === p ? "btn-primary" : "btn-ghost"}`}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1">
              <span>Desde</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input input-sm" />
            </label>
            <label className="inline-flex items-center gap-1">
              <span>Hasta</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input input-sm" />
            </label>
            <label className="inline-flex items-center gap-1">
              <span>Granularidad</span>
              <select value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)} className="select select-sm">
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-1">
              <span>Métrica</span>
              <select value={metric} onChange={(e) => setMetric(e.target.value as keyof Point)} className="select select-sm">
                <option value="sales">Ventas ($)</option>
                <option value="orders">Pedidos (#)</option>
                <option value="active_clients">Clientes activos (#)</option>
              </select>
            </label>
            <button type="button" onClick={fetchData} className="btn btn-sm" disabled={!!rangeWarning}>Actualizar</button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                const r = computeRange("90d");
                setPreset("90d");
                setFrom(r.from);
                setTo(r.to);
                setGranularity(r.granularity);
              }}
            >
              Restablecer (90d)
            </button>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="text-xs text-[var(--muted-foreground)]">
        {metric === "sales" ? `Total: $${fmtMoney(total)}` : `Total: ${total}`}
        {loading ? " · Cargando..." : null}
        {error ? ` · Error: ${error}` : null}
        {rangeWarning ? ` · ${rangeWarning}` : null}
      </div>

      {/* Chart */}
      {points.length === 0 ? (
        <div className="text-sm text-gray-500">No hay datos para el rango seleccionado.</div>
      ) : (
        <LineChart data={series} height={compact ? 80 : 160} />
      )}

      {/* Lista por periodos compacta (5 líneas visibles con scroll) */}
      {compact && points.length > 0 && (
        <div className="overflow-auto max-h-28">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-[var(--muted-foreground)]">
                <th className="py-0.5 pr-2">Periodo</th>
                <th className="py-0.5 pr-2">{metricLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.period} className="border-t">
                  <td className="py-0.5 pr-2 tabular-nums">{p.period}</td>
                  <td className="py-0.5 pr-2 tabular-nums">
                    {metric === "sales" ? `$${fmtMoney(Number(p.sales || 0))}` : metric === "orders" ? Number(p.orders || 0) : Number(p.active_clients || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabla (oculta en compacto) */}
      {!compact && (
        <div className="overflow-auto max-h-40">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--muted-foreground)]">
                <th className="py-0.5 pr-2">Periodo</th>
                <th className="py-0.5 pr-2">Ventas</th>
                <th className="py-0.5 pr-2">Pedidos</th>
                <th className="py-0.5 pr-2">Clientes activos</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.period} className="border-t">
                  <td className="py-0.5 pr-2 tabular-nums">{p.period}</td>
                  <td className="py-0.5 pr-2 tabular-nums">${fmtMoney(Number(p.sales || 0))}</td>
                  <td className="py-0.5 pr-2 tabular-nums">{Number(p.orders || 0)}</td>
                  <td className="py-0.5 pr-2 tabular-nums">{Number(p.active_clients || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
