/** Formats a number with sensible significant digits for engineering display. */
export function fmt(n: number, digits?: number): string {
  if (!Number.isFinite(n)) return '—'
  const d = digits ?? (Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 1 ? 2 : Math.abs(n) >= 0.01 ? 4 : 5)
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d })
}
