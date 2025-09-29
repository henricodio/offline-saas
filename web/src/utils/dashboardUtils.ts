export function pctChange(curr: number, prev: number): { label: string; cls: string } {
  if (!Number.isFinite(prev) || prev === 0) return { label: '—', cls: 'text-[var(--muted-foreground)]' };
  const pct = ((curr - prev) / prev) * 100;
  const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  const cls = pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-600' : 'text-[var(--muted-foreground)]';
  return { label, cls };
}

export function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
