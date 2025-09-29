"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtMoney } from "@/utils/dashboardUtils";

type Client = { id: string; nombre: string; total: number };
type Product = { key: string; nombre: string; qty: number; total: number };

type PeriodData = {
  clients: Client[];
  products: Product[];
  from: string;
  to: string;
  grandTotal: number;
  compareClients?: Client[];
  compareProducts?: Product[];
  grandTotalCompare?: number;
  // KPIs agregados
  ordersCount?: number;
  compareOrdersCount?: number;
  activeClientsCount?: number;
  compareActiveClientsCount?: number;
  avgTicket?: number;
  avgTicketCompare?: number;
};

export default function TopKPIsSection({ month, year }: { month: PeriodData; year: PeriodData }) {
  const [topN, setTopN] = React.useState<number>(5);
  const [activeTab, setActiveTab] = React.useState<'month' | 'year'>('month');
  const [showCompare, setShowCompare] = React.useState<boolean>(false);
  const [productsMetric, setProductsMetric] = React.useState<'total' | 'qty'>('total');

  const period = activeTab === 'month' ? month : year;
  const label = activeTab === 'month' ? 'mes' : 'año';

  const shownClients = period.clients.slice(0, topN);
  const shownProducts = period.products.slice(0, topN);
  const shownCompareClients = (period.compareClients || []).slice(0, topN);
  const shownCompareProducts = (period.compareProducts || []).slice(0, topN);


  // Helpers
  function trend(current: number, previous: number | undefined | null) {
    const a = Number(current || 0);
    const b = Number(previous || 0);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return { dir: 0, pct: 0 } as const;
    if (b === 0 && a === 0) return { dir: 0, pct: 0 } as const;
    if (b === 0) return { dir: 1, pct: 100 } as const; // Nuevo
    const pct = ((a - b) / b) * 100;
    return { dir: a > b ? 1 : a < b ? -1 : 0, pct } as const;
  }

  // Mapas de ranking previo para mostrar delta de posición
  const prevClientRankMap = React.useMemo(() => {
    const map = new Map<string, number>();
    (period.compareClients ?? []).forEach((c, i) => map.set(c.id, i));
    return map;
  }, [period.compareClients]);

  const sortedCompareProducts = React.useMemo(() => {
    const arr = [ ...(period.compareProducts ?? []) ];
    if (productsMetric === 'total') {
      arr.sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
    } else {
      arr.sort((a, b) => Number(b.qty ?? 0) - Number(a.qty ?? 0));
    }
    return arr;
  }, [period.compareProducts, productsMetric]);

  const prevProductRankMap = React.useMemo(() => {
    const map = new Map<string, number>();
    sortedCompareProducts.forEach((p, i) => map.set(p.key, i));
    return map;
  }, [sortedCompareProducts]);

  const totalProductsMetric = React.useMemo(() => {
    const items = period.products || [];
    return productsMetric === 'total'
      ? items.reduce((acc, it) => acc + Number(it.total || 0), 0)
      : items.reduce((acc, it) => acc + Number(it.qty || 0), 0);
  }, [period.products, productsMetric]);

  const totalProductsMetricCompare = React.useMemo(() => {
    const items: Product[] = period.compareProducts ?? [];
    return productsMetric === 'total'
      ? items.reduce((acc, it) => acc + Number(it.total ?? 0), 0)
      : items.reduce((acc, it) => acc + Number(it.qty ?? 0), 0);
  }, [period.compareProducts, productsMetric]);

  // Sparkline simple con 2 puntos (prev → current)
  function Sparkline({ prev, current, color }: { prev: number; current: number; color: string }) {
    const w = 40;
    const h = 16;
    const max = Math.max(prev, current, 1);
    const yPrev = h - (prev / max) * h;
    const yCurr = h - (current / max) * h;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="opacity-80">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={`2,${yPrev.toFixed(2)} ${w - 2},${yCurr.toFixed(2)}`}
        />
      </svg>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar principal */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Tabs segmentadas */}
          <div className="inline-flex items-center rounded-md bg-[var(--muted)] p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('month')}
              className={`btn btn-sm ${activeTab === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              aria-current={activeTab === 'month' ? 'page' : undefined}
            >
              Mes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('year')}
              className={`btn btn-sm ${activeTab === 'year' ? 'btn-primary' : 'btn-ghost'}`}
              aria-current={activeTab === 'year' ? 'page' : undefined}
            >
              Año
            </button>
          </div>

          {/* Leyenda */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-indigo-500" /> Actual</span>
            <span className={`inline-flex items-center gap-1 ${showCompare ? '' : 'opacity-50'}`}><span className="inline-block w-2 h-2 rounded-full bg-slate-400" /> Comparación</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Comparación */}
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={showCompare} onChange={(e) => setShowCompare(e.target.checked)} />
            <span>Comparar con periodo anterior</span>
          </label>

          {/* Métrica productos */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <span className="text-[var(--muted-foreground)]">Productos:</span>
            <div className="inline-flex items-center rounded-md bg-[var(--muted)] p-0.5">
              <button
                type="button"
                onClick={() => setProductsMetric('total')}
                className={`btn btn-sm ${productsMetric === 'total' ? 'bg-amber-500 text-white' : 'btn-ghost'}`}
                aria-pressed={productsMetric === 'total'}
                aria-label="Mostrar ventas en $"
              >
                $ Ventas
              </button>
              <button
                type="button"
                onClick={() => setProductsMetric('qty')}
                className={`btn btn-sm ${productsMetric === 'qty' ? 'bg-amber-500 text-white' : 'btn-ghost'}`}
                aria-pressed={productsMetric === 'qty'}
                aria-label="Mostrar unidades"
              >
                Unidades
              </button>
            </div>
          </div>

          {/* Top N */}
          <div className="inline-flex items-center gap-1">
            <span className="text-xs text-[var(--muted-foreground)]">Mostrar:</span>
            <div className="inline-flex rounded-md bg-[var(--muted)] p-0.5">
              <button type="button" onClick={() => setTopN(5)} className={`btn btn-sm ${topN === 5 ? 'btn-primary' : 'btn-ghost'}`}>Top 5</button>
              <button type="button" onClick={() => setTopN(10)} className={`btn btn-sm ${topN === 10 ? 'btn-primary' : 'btn-ghost'}`}>Top 10</button>
              <button type="button" onClick={() => setTopN(20)} className={`btn btn-sm ${topN === 20 ? 'btn-primary' : 'btn-ghost'}`}>Top 20</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de KPIs agregados */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ventas del periodo */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Ventas del {label}</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">${fmtMoney(Number(period.grandTotal || 0))}</div>
            {showCompare && typeof period.grandTotalCompare === 'number' ? (
              (() => {
                const { dir, pct } = trend(Number(period.grandTotal || 0), Number(period.grandTotalCompare || 0));
                return (
                  <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                    {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                  </span>
                );
              })()
            ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
          </div>
        </div>

        {/* Top cliente (participación) */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Top cliente</div>
          {shownClients[0] ? (
            (() => {
              const top = shownClients[0];
              const share = period.grandTotal > 0 ? (Number(top.total || 0) / period.grandTotal) * 100 : 0;
              const prev = (shownCompareClients || []).find((x) => x.id === top.id);
              const prevShare = period.grandTotalCompare && prev ? (Number(prev.total || 0) / Number(period.grandTotalCompare || 0)) * 100 : 0;
              const { dir, pct } = showCompare ? trend(share, prevShare) : { dir: 0, pct: 0 } as const;
              return (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={top.nombre}>{top.nombre}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">{share.toFixed(1)}% del total</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showCompare ? (
                      <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                        {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                        {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                      </span>
                    ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
                    <Sparkline prev={Number(prev?.total || 0)} current={Number(top.total || 0)} color="#f59e0b" />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">—</div>
          )}
        </div>

        {/* Top producto (valor según métrica) */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Top producto ({productsMetric === 'total' ? 'ventas' : 'unidades'})</div>
          {shownProducts[0] ? (
            (() => {
              const top = shownProducts[0];
              const value = productsMetric === 'total' ? Number(top.total || 0) : Number(top.qty || 0);
              const prev = (shownCompareProducts || []).find((x) => x.key === top.key);
              const prevValue = productsMetric === 'total' ? Number(prev?.total || 0) : Number(prev?.qty || 0);
              const { dir, pct } = showCompare ? trend(value, prevValue) : { dir: 0, pct: 0 } as const;
              return (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={top.nombre}>{top.nombre}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {productsMetric === 'total' ? `$${fmtMoney(value)}` : `${value} u`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showCompare ? (
                      <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                        {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                        {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                      </span>
                    ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
                    <Sparkline prev={prevValue} current={value} color="#6366f1" />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">—</div>
          )}
        </div>

        {/* Participación top producto */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Participación top producto</div>
          {shownProducts[0] ? (
            (() => {
              const top = shownProducts[0];
              const value = productsMetric === 'total' ? Number(top.total || 0) : Number(top.qty || 0);
              const share = totalProductsMetric > 0 ? (value / totalProductsMetric) * 100 : 0;
              const prev = (shownCompareProducts || []).find((x) => x.key === top.key);
              const prevValue = productsMetric === 'total' ? Number(prev?.total || 0) : Number(prev?.qty || 0);
              const prevShare = totalProductsMetricCompare > 0 ? (prevValue / totalProductsMetricCompare) * 100 : 0;
              const { dir, pct } = showCompare ? trend(share, prevShare) : { dir: 0, pct: 0 } as const;
              return (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium" title={top.nombre}>{top.nombre}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">{share.toFixed(1)}% del total</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showCompare ? (
                      <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                        {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                        {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                      </span>
                    ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
                    <Sparkline prev={prevShare} current={share} color="#6366f1" />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-sm text-[var(--muted-foreground)]">—</div>
          )}
        </div>
      </section>

      {/* KPIs globales: Pedidos, Clientes activos, Ticket medio */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pedidos */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Pedidos del {label}</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{period.ordersCount ?? '—'}</div>
            {showCompare && typeof period.compareOrdersCount === 'number' ? (
              (() => {
                const { dir, pct } = trend(Number(period.ordersCount || 0), Number(period.compareOrdersCount || 0));
                return (
                  <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                    {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                  </span>
                );
              })()
            ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
          </div>
          <div className="mt-2">
            <Link href={`/orders?from=${period.from}&to=${period.to}`} className="text-xs underline">ver pedidos del periodo</Link>
          </div>
        </div>

        {/* Clientes activos */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Clientes activos</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{period.activeClientsCount ?? '—'}</div>
            {showCompare && typeof period.compareActiveClientsCount === 'number' ? (
              (() => {
                const { dir, pct } = trend(Number(period.activeClientsCount || 0), Number(period.compareActiveClientsCount || 0));
                return (
                  <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                    {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                  </span>
                );
              })()
            ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
          </div>
          <div className="mt-2">
            <Link href={`/clients?active=1&from=${period.from}&to=${period.to}`} className="text-xs underline">ver clientes activos</Link>
          </div>
        </div>

        {/* Ticket medio */}
        <div className="card p-4 hover:shadow transition">
          <div className="text-xs text-[var(--muted-foreground)] mb-1">Ticket medio</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold">{typeof period.avgTicket === 'number' ? `$${fmtMoney(Number(period.avgTicket || 0))}` : '—'}</div>
            {showCompare && typeof period.avgTicketCompare === 'number' ? (
              (() => {
                const { dir, pct } = trend(Number(period.avgTicket || 0), Number(period.avgTicketCompare || 0));
                return (
                  <span className={`inline-flex items-center gap-1 text-sm ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                    {dir > 0 ? <TrendingUp size={16} /> : dir < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                  </span>
                );
              })()
            ) : <span className="text-sm text-[var(--muted-foreground)]">—</span>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">Top clientes del {label}</div>
            <a href={`/api/export/monthly?type=top-clients&from=${period.from}&to=${period.to}`} className="btn btn-sm btn-ghost" aria-label="Descargar CSV top clientes">⬇️ CSV</a>
          </div>
          {shownClients.length === 0 ? (
            <div className="text-sm text-gray-500">No hay ventas registradas este {label}.</div>
          ) : (
            <div className="mt-3 space-y-4">
              {/* Lista compacta con % de participación y tendencia */}
              <ul className="space-y-1">
                {shownClients.map((c) => {
                  const share = period.grandTotal > 0 ? (Number(c.total || 0) / period.grandTotal) * 100 : 0;
                  const prev = (shownCompareClients || []).find((x) => x.id === c.id);
                  const { dir, pct } = showCompare ? trend(Number(c.total || 0), prev?.total) : { dir: 0, pct: 0 } as const;
                  const currentRank = (period.clients || []).findIndex((x) => x.id === c.id);
                  const prevRank = prevClientRankMap.get(c.id);
                  const rankDelta = (typeof prevRank === 'number' && currentRank >= 0) ? (prevRank - currentRank) : 0;
                  const linkHref = c.id ? `/clients/${c.id}` : `/clients?q=${encodeURIComponent(c.nombre)}`;
                  const ordersFilteredHref = c.id ? `/orders?client=${encodeURIComponent(c.id)}` : `/orders?client=${encodeURIComponent(c.nombre)}`;
                  return (
                    <li key={c.id} className="group rounded-md p-2 hover:bg-gradient-to-r from-amber-500/10 to-transparent transition">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={linkHref} className="font-medium hover:underline">
                          {c.nombre}
                        </Link>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="tabular-nums">${fmtMoney(Number(c.total || 0))}</span>
                          <span className="text-xs text-[var(--muted-foreground)]">{share.toFixed(1)}%</span>
                          {showCompare && typeof prevRank === 'number' ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] ${rankDelta > 0 ? 'text-emerald-600' : rankDelta < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`} title={`Posición ${currentRank + 1} (${rankDelta > 0 ? `↑${rankDelta}` : rankDelta < 0 ? `↓${Math.abs(rankDelta)}` : 'sin cambio'})`}>
                              {rankDelta > 0 ? '↑' : rankDelta < 0 ? '↓' : '•'}
                              {rankDelta === 0 ? '' : Math.abs(rankDelta)}
                            </span>
                          ) : null}
                          {showCompare ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                              {dir > 0 ? <TrendingUp size={14} /> : dir < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                              {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                            </span>
                          ) : null}
                          <Link href={ordersFilteredHref} className="text-xs underline opacity-70 hover:opacity-100">ver pedidos</Link>
                        </div>
                      </div>
                      {/* Barra de participación */}
                      <div className="mt-1 h-1.5 rounded bg-[var(--muted)]" role="progressbar" aria-label="Participación cliente" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(share.toFixed(1))}>
                        <div className="h-1.5 rounded bg-amber-500/70" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--muted-foreground)]">Top productos del {label}</div>
            <a href={`/api/export/monthly?type=top-products&from=${period.from}&to=${period.to}`} className="btn btn-sm btn-ghost" aria-label="Descargar CSV top productos">⬇️ CSV</a>
          </div>
          {shownProducts.length === 0 ? (
            <div className="text-sm text-gray-500">No hay ventas registradas este {label}.</div>
          ) : (
            <div className="mt-3 space-y-4">
              {/* Lista compacta con % de participación y tendencia (según métrica seleccionada) */}
              <ul className="space-y-1">
                {shownProducts.map((p) => {
                  const value = productsMetric === 'total' ? Number(p.total || 0) : Number(p.qty || 0);
                  const unit = productsMetric === 'total' ? '$' : 'u';
                  const share = totalProductsMetric > 0 ? (value / totalProductsMetric) * 100 : 0;
                  const prev = (shownCompareProducts || []).find((x) => x.key === p.key);
                  const prevValue = productsMetric === 'total' ? Number(prev?.total || 0) : Number(prev?.qty || 0);
                  const { dir, pct } = showCompare ? trend(value, prevValue) : { dir: 0, pct: 0 } as const;
                  const currentRank = (period.products || []).findIndex((x) => x.key === p.key);
                  const prevRank = prevProductRankMap.get(p.key);
                  const rankDelta = (typeof prevRank === 'number' && currentRank >= 0) ? (prevRank - currentRank) : 0;
                  const linkHref = p.key ? `/products/${p.key}` : `/products?q=${encodeURIComponent(p.nombre)}`;
                  const productsFilteredHref = `/products?q=${encodeURIComponent(p.nombre)}`;
                  return (
                    <li key={p.key} className="group rounded-md p-2 hover:bg-gradient-to-r from-indigo-500/10 to-transparent transition">
                      <div className="flex items-center justify-between gap-3">
                        <Link href={linkHref} className="font-medium hover:underline">
                          {p.nombre}
                        </Link>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="tabular-nums">
                            {productsMetric === 'total' ? `$${fmtMoney(value)}` : `${value} ${unit}`}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">{share.toFixed(1)}%</span>
                          {showCompare && typeof prevRank === 'number' ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] ${rankDelta > 0 ? 'text-emerald-600' : rankDelta < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`} title={`Posición ${currentRank + 1} (${rankDelta > 0 ? `↑${rankDelta}` : rankDelta < 0 ? `↓${Math.abs(rankDelta)}` : 'sin cambio'})`}>
                              {rankDelta > 0 ? '↑' : rankDelta < 0 ? '↓' : '•'}
                              {rankDelta === 0 ? '' : Math.abs(rankDelta)}
                            </span>
                          ) : null}
                          {showCompare ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${dir > 0 ? 'text-emerald-600' : dir < 0 ? 'text-rose-600' : 'text-[var(--muted-foreground)]'}`}>
                              {dir > 0 ? <TrendingUp size={14} /> : dir < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                              {`${dir === 0 ? '0.0' : Math.abs(pct).toFixed(1)}%`}
                            </span>
                          ) : null}
                          <Link href={productsFilteredHref} className="text-xs underline opacity-70 hover:opacity-100">ver listado</Link>
                        </div>
                      </div>
                      {/* Barra de participación */}
                      <div className="mt-1 h-1.5 rounded bg-[var(--muted)]" role="progressbar" aria-label="Participación producto" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(share.toFixed(1))}>
                        <div className="h-1.5 rounded bg-indigo-500/70" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}
