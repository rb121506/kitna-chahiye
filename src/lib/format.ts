const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹1,23,456 */
export function rupees(n: number): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}₹${inr.format(Math.round(Math.abs(n)))}`;
}

/** Compact Indian notation: ₹8,500 · ₹1.25 L · ₹2.4 Cr */
export function compact(n: number, digits = 2): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${trim((a / 1e7).toFixed(digits))} Cr`;
  if (a >= 1e5) return `${sign}₹${trim((a / 1e5).toFixed(digits))} L`;
  return `${sign}₹${inr.format(Math.round(a))}`;
}

/** Annual amount in lakhs per annum: 24.6 */
export function lpa(n: number): string {
  if (n >= 1e7) return trim((n / 1e7).toFixed(2));
  return trim((n / 1e5).toFixed(n >= 1e6 ? 1 : 2));
}

export function lpaUnit(n: number): string {
  return n >= 1e7 ? 'Cr' : 'L';
}

function trim(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const roundTo = (v: number, step: number) => Math.round(v / step) * step;
