/*
 * Salary structure, income tax (tax year 2026-27) and the CTC solver.
 *
 * New regime: 0–4 L nil · 4–8 L 5% · 8–12 L 10% · 12–16 L 15% · 16–20 L 20% · 20–24 L 25% · 24 L+ 30%
 *             standard deduction ₹75,000 · s.87A rebate up to ₹60,000 (taxable ≤ ₹12 L) with marginal relief
 *             employer NPS deductible up to 14% of basic · surcharge 10/15/25% (capped at 25%)
 * Old regime: 0–2.5 L nil · 2.5–5 L 5% · 5–10 L 20% · 10 L+ 30% · standard deduction ₹50,000
 *             rebate up to ₹12,500 (taxable ≤ ₹5 L) · HRA, 80C, 80D, 24(b), 80CCD(1B), PT deductions
 *             surcharge 10/15/25/37%
 * Both: 4% health & education cess, marginal relief on surcharge.
 */
import type { PfMode, Regime } from './types';

export interface SalaryCfg {
  basicPct: number;
  pf: PfMode;
  gratuity: boolean;
  variablePct: number;
  npsPct: number;
  nps80ccd1b: boolean;
}

export interface TaxCtx {
  ptAnnual: number;
  hraMetro: boolean;
  rentMonthly: number;
  homeLoanEmi: number;
  health80dSelf: number;
  health80dParents: number;
  termPremium: number;
  tuition: number;
}

export interface Slip {
  regime: Regime;
  ctc: number;
  variable: number;
  basic: number;
  hra: number;
  special: number;
  employerPF: number;
  gratuity: number;
  employerNPS: number;
  grossCash: number;
  employeePF: number;
  pt: number;
  taxable: number;
  tax: number;
  deductions: number;
  inHandAnnual: number;
  inHandMonthly: number;
}

const NEW_SLABS: [number, number][] = [
  [400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3],
];
const OLD_SLABS: [number, number][] = [[250000, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]];

function slabTax(income: number, slabs: [number, number][]): number {
  let tax = 0;
  let prev = 0;
  for (const [upto, rate] of slabs) {
    if (income <= prev) break;
    tax += (Math.min(income, upto) - prev) * rate;
    prev = upto;
  }
  return tax;
}

function withSurcharge(taxable: number, base: (x: number) => number, regime: Regime): number {
  const bands: [number, number][] = regime === 'new'
    ? [[5e7, 0.25], [2e7, 0.25], [1e7, 0.15], [5e6, 0.1]]
    : [[5e7, 0.37], [2e7, 0.25], [1e7, 0.15], [5e6, 0.1]];
  const t = base(taxable);
  for (const [threshold, rate] of bands) {
    if (taxable > threshold) {
      const withS = t * (1 + rate);
      // marginal relief: extra tax can't exceed the income above the threshold
      const lowerRate = bands.find(([th]) => th < threshold)?.[1] ?? 0;
      const atThreshold = base(threshold) * (1 + (threshold === 5e6 ? 0 : lowerRate));
      return Math.min(withS, atThreshold + (taxable - threshold));
    }
  }
  return t;
}

export function incomeTax(taxable: number, regime: Regime): number {
  if (taxable <= 0) return 0;
  const base = (x: number) => {
    if (regime === 'new') {
      const t = slabTax(x, NEW_SLABS);
      if (x <= 1200000) return 0;
      return Math.min(t, x - 1200000);
    }
    const t = slabTax(x, OLD_SLABS);
    return x <= 500000 ? 0 : t;
  };
  return withSurcharge(taxable, base, regime) * 1.04;
}

export function salarySlip(ctc: number, cfg: SalaryCfg, ctx: TaxCtx, regime: Regime): Slip {
  const variable = ctc * cfg.variablePct;
  const fixed = ctc - variable;
  const basic = fixed * cfg.basicPct;
  const pfWage = cfg.pf === 'capped' ? Math.min(basic, 180000) : basic;
  const employerPF = cfg.pf === 'none' ? 0 : pfWage * 0.12;
  const gratuity = cfg.gratuity ? basic * 0.0481 : 0;
  const employerNPS = basic * cfg.npsPct;
  const grossCash = Math.max(0, ctc - employerPF - gratuity - employerNPS);
  const fixedCash = Math.max(0, grossCash - variable);
  const hra = Math.min(basic * (ctx.hraMetro ? 0.5 : 0.4), Math.max(0, fixedCash - basic));
  const special = Math.max(0, fixedCash - basic - hra);
  const employeePF = employerPF;
  const pt = grossCash / 12 > 25000 ? ctx.ptAnnual : 0;

  // employer PF + NPS above ₹7.5 L a year is taxable in the employee's hands
  const excessRetirement = Math.max(0, employerPF + employerNPS - 750000);
  let taxable: number;
  let deductions: number;
  if (regime === 'new') {
    const npsExcess = Math.max(0, employerNPS - 0.14 * basic);
    deductions = 75000;
    taxable = grossCash + npsExcess + excessRetirement - 75000;
  } else {
    const npsExcess = Math.max(0, employerNPS - 0.1 * basic);
    const hraExempt = ctx.rentMonthly > 0
      ? Math.max(0, Math.min(hra, ctx.rentMonthly * 12 - 0.1 * basic, basic * (ctx.hraMetro ? 0.5 : 0.4)))
      : 0;
    const c80 = Math.min(150000, employeePF + ctx.termPremium + ctx.tuition + ctx.homeLoanEmi * 12 * 0.35);
    const d80 = Math.min(25000, ctx.health80dSelf) + Math.min(50000, ctx.health80dParents);
    const b24 = Math.min(200000, ctx.homeLoanEmi * 12 * 0.65);
    const ccd1b = cfg.nps80ccd1b ? 50000 : 0;
    deductions = 50000 + pt + hraExempt + c80 + d80 + b24 + ccd1b;
    taxable = grossCash + npsExcess + excessRetirement - deductions;
  }
  const tax = incomeTax(Math.max(0, taxable), regime);
  const inHandAnnual = grossCash - employeePF - pt - tax;
  const share = grossCash > 0 ? fixedCash / grossCash : 1;
  const inHandMonthly = (fixedCash - employeePF - pt - tax * share) / 12;
  return {
    regime, ctc, variable, basic, hra, special, employerPF, gratuity, employerNPS, grossCash,
    employeePF, pt, taxable: Math.max(0, taxable), tax, deductions, inHandAnnual, inHandMonthly,
  };
}

/** Smallest CTC whose fixed monthly take-home covers `need`. In-hand is non-decreasing in CTC, so bisect. */
export function solveCtc(need: number, cfg: SalaryCfg, ctx: TaxCtx, regime: Regime): Slip {
  if (need <= 0) return salarySlip(0, cfg, ctx, regime);
  let lo = 0;
  let hi = 2e6;
  while (salarySlip(hi, cfg, ctx, regime).inHandMonthly < need && hi < 1e10) hi *= 2;
  for (let i = 0; i < 44; i++) {
    const mid = (lo + hi) / 2;
    if (salarySlip(mid, cfg, ctx, regime).inHandMonthly >= need) hi = mid;
    else lo = mid;
  }
  return salarySlip(Math.ceil(hi / 1000) * 1000, cfg, ctx, regime);
}

export interface Solved {
  best: Slip;
  newSlip: Slip;
  oldSlip: Slip;
}

export function solveBoth(need: number, cfg: SalaryCfg, ctx: TaxCtx, mode: 'auto' | Regime): Solved {
  const newSlip = solveCtc(need, cfg, ctx, 'new');
  const oldSlip = solveCtc(need, cfg, ctx, 'old');
  const best = mode === 'new' ? newSlip : mode === 'old' ? oldSlip : oldSlip.ctc < newSlip.ctc ? oldSlip : newSlip;
  return { best, newSlip, oldSlip };
}

/** Take-home for a given CTC under the better regime (or a forced one). */
export function takeHome(ctc: number, cfg: SalaryCfg, ctx: TaxCtx, mode: 'auto' | Regime): { best: Slip; newSlip: Slip; oldSlip: Slip } {
  const newSlip = salarySlip(ctc, cfg, ctx, 'new');
  const oldSlip = salarySlip(ctc, cfg, ctx, 'old');
  const best = mode === 'new' ? newSlip : mode === 'old' ? oldSlip : oldSlip.inHandMonthly > newSlip.inHandMonthly ? oldSlip : newSlip;
  return { best, newSlip, oldSlip };
}
