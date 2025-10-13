"use client";

import React from "react";
import Link from "next/link";
import { fmtMoney } from "@/utils/dashboardUtils";

type SubItem = { key: string; label: string; sales: number };
type Item = { key: string; label: string; sales: number; orders: number; clients: number; sub?: SubItem[] };

type Data = {
  categories: Item[];
  routes: Item[]; // canal
  cities: Item[]; // región
  from: string;
  to: string;
};

export default function BreakdownsPanel() {
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [from, setFrom] = React.useState<string>(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    return toISODate(d);
  });
  const [to, setTo] = React.useState<string>(() => toISODate(new Date()));

  const [activeTab, setActiveTab] = React.useState<"categories" | "routes" | "cities">("categories");

  // Inicializar estado desde la URL
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const usp = new URLSearchParams(window.location.search);
    const qFrom = usp.get("from");
    const qTo = usp.get("to");
    const qTab = usp.get("tab") as ("categories" | "routes" | "cities" | null);
    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qTab === "categories" || qTab === "routes" || qTab === "cities") setActiveTab(qTab);
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/metrics/breakdowns?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Data = await res.json();
      setData(json);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error cargando breakdowns";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    // Si la URL ya especifica from/to, evitamos un fetch inicial redundante
    if (typeof window !== "undefined") {
      const usp = new URLSearchParams(window.location.search);
      if (usp.has("from") || usp.has("to")) return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Reflejar estado en la URL
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const usp = new URLSearchParams(window.location.search);
    usp.set("from", from);
    usp.set("to", to);
    usp.set("tab", activeTab);
    const newUrl = `${window.location.pathname}?${usp.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [from, to, activeTab]);

  const items: Item[] = React.useMemo(() => {
    if (!data) return [];
    if (activeTab === "categories") return data.categories || [];
    if (activeTab === "routes") return data.routes || [];
    return data.cities || [];
  }, [data, activeTab]);

  const totalSales = items.reduce((acc, it) => acc + Number(it.sales || 0), 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-md bg-[var(--muted)] p-0.5">
          <button type="button" onClick={() => setActiveTab("categories")} className={`btn btn-sm ${activeTab === "categories" ? "btn-primary" : "btn-ghost"}`}>Categorías</button>
          <button type="button" onClick={() => setActiveTab("routes")} className={`btn btn-sm ${activeTab === "routes" ? "btn-primary" : "btn-ghost"}`}>Canales</button>
          <button type="button" onClick={() => setActiveTab("cities")} className={`btn btn-sm ${activeTab === "cities" ? "btn-primary" : "btn-ghost"}`}>Regiones</button>
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
          <button type="button" onClick={fetchData} className="btn btn-sm">Actualizar</button>
        </div>
      </div>

      <div className="text-xs text-[var(--muted-foreground)]">
        {loading ? "Cargando…" : error ? `Error: ${error}` : data ? `Rango: ${data.from} → ${data.to}` : ""}
      </div>

      {/* Barras horizontales (apiladas si hay subsegmentos) */}
      {items.length === 0 ? (
        <div className="text-sm text-gray-500">No hay datos en el rango seleccionado.</div>
      ) : (
        <div className="card p-3">
          <ul className="space-y-2">
            {items.map((it, idx) => {
              const share = totalSales > 0 ? (Number(it.sales || 0) / totalSales) * 100 : 0;
              const details = drilldownLinks(activeTab, it, from, to);
              const subs = it.sub || [];
              const subTotal = subs.reduce((acc, s) => acc + Number(s.sales || 0), 0);
              return (
                <li key={it.key} className="group">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium" title={it.label}>{it.label}</div>
                        {idx < 3 ? (
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : 'bg-orange-300 text-white'}`}>
                            {idx === 0 ? '🥇 Top 1' : idx === 1 ? '🥈 Top 2' : '🥉 Top 3'}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">{share.toFixed(1)}% · ${fmtMoney(Number(it.sales || 0))} · {it.orders} pedidos · {it.clients} clientes</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {details.productLink ? <Link href={details.productLink} className="underline opacity-70 hover:opacity-100">ver productos</Link> : null}
                      {details.clientsLink ? <Link href={details.clientsLink} className="underline opacity-70 hover:opacity-100">ver clientes</Link> : null}
                      {details.ordersLink ? <Link href={details.ordersLink} className="underline opacity-70 hover:opacity-100">ver pedidos</Link> : null}
                    </div>
                  </div>
                  <div className="mt-1 h-2 rounded bg-[var(--muted)]" role="group" aria-label="Participación por subsegmentos">
                    {subs.length > 0 && subTotal > 0 ? (
                      <div className="flex h-2 w-full overflow-hidden rounded">
                        {subs.slice(0, 8).map((s, sidx) => {
                          const frac = Math.max(0, Math.min(1, Number(s.sales || 0) / subTotal));
                          const widthPct = `${(frac * 100).toFixed(2)}%`;
                          return (
                            <div
                              key={s.key}
                              className="h-2"
                              style={{ width: widthPct, backgroundColor: palette((idx * 8 + sidx) % 12) }}
                              title={`${s.label}: $${fmtMoney(Number(s.sales || 0))} (${(frac * 100).toFixed(1)}%)`}
                              aria-label={`${s.label}: ${(frac * 100).toFixed(1)}%`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className={`h-2 rounded ${activeTab === "categories" ? "bg-emerald-500/70" : activeTab === "routes" ? "bg-sky-500/70" : "bg-fuchsia-500/70"}`} style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Treemap jerárquico simple (padre → subsegmentos) */}
      {items.length > 0 ? (
        <div className="card p-3">
          <div className="text-xs text-[var(--muted-foreground)] mb-2">Treemap {activeTab === "categories" ? "por categoría" : activeTab === "routes" ? "por canal" : "por región"}</div>
          <Treemap data={items} />
        </div>
      ) : null}
    </div>
  );
}

function toISODate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}

function drilldownLinks(
  tab: "categories" | "routes" | "cities",
  it: Item,
  from: string,
  to: string
): { productsLink?: string; productLink?: string; clientsLink?: string; ordersLink?: string } {
  // Enlaces de navegación a detalle según tab
  if (tab === "categories") {
    return {
      productLink: `/products?category=${encodeURIComponent(it.key)}`,
      ordersLink: `/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    };
  }
  if (tab === "routes") {
    return {
      clientsLink: `/clients?route=${encodeURIComponent(it.key)}`,
      ordersLink: `/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    };
  }
  // cities
  return {
    clientsLink: `/clients?city=${encodeURIComponent(it.key)}`,
    ordersLink: `/orders?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  };
}

function Treemap({ data }: { data: Item[] }) {
  // Treemap jerárquico simple: bloques por padre, subdivididos por subsegmentos
  const total = data.reduce((acc, d) => acc + Number(d.sales || 0), 0);
  const w = 640;
  const h = 180;
  let x = 0;
  const nodes = data.slice(0, 10).map((d, idx) => {
    const fracParent = total > 0 ? Math.max(0.02, Math.min(1, Number(d.sales || 0) / total)) : 0;
    const ww = Math.max(20, Math.round(fracParent * w));
    const parentX = x;
    x += ww;
    const subs = d.sub || [];
    const subTotal = subs.reduce((acc, s) => acc + Number(s.sales || 0), 0) || 1;
    let sx = 0;
    const childrenRects = subs.slice(0, 6).map((s, sidx) => {
      const frac = Math.max(0.02, Math.min(1, Number(s.sales || 0) / subTotal));
      const sww = Math.round(frac * (ww - 4));
      const node = (
        <g key={`${d.key}-${s.key}`} transform={`translate(${parentX + 2 + sx},${24})`}>
          <rect width={sww} height={h - 28} fill={palette((idx * 6 + sidx) % 12)} className="opacity-85" />
          <title>{`${s.label}: $${fmtMoney(Number(s.sales || 0))}`}</title>
        </g>
      );
      sx += sww;
      return node;
    });
    return (
      <g key={d.key}>
        {/* Label del padre */}
        <g transform={`translate(${parentX},0)`}>
          <rect width={ww} height={20} fill={palette(idx)} className="opacity-90" />
          <foreignObject x={2} y={2} width={ww - 4} height={16}>
            <div className="text-[10px] leading-none text-white/95 truncate" title={`${d.label} · $${fmtMoney(Number(d.sales || 0))}`}>
              {d.label}
            </div>
          </foreignObject>
          <title>{`${d.label}: $${fmtMoney(Number(d.sales || 0))}`}</title>
        </g>
        {childrenRects}
      </g>
    );
  });
  return (
    <div className="overflow-auto" role="img" aria-label="Treemap jerárquico">
      <svg width={w} height={h}>
        {nodes}
      </svg>
    </div>
  );
}

function palette(i: number) {
  const colors = ["#10b981", "#34d399", "#059669", "#38bdf8", "#0ea5e9", "#818cf8", "#a78bfa", "#f472b6", "#f59e0b", "#fbbf24", "#ef4444", "#fb7185"];
  return colors[i % colors.length];
}
