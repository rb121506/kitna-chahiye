/*
 * Standalone money tools — independent of the salary-planner engine, but happy to borrow
 * sensible defaults (monthly expenses, savings rate) from it.
 */
import type { DebtStrategy } from './constants';

// ——— Debt payoff / prepayment ———

export interface Debt {
  id: string;
  name: string;
  principal: number;
  ratePct: number;
  emi: number;
}

export interface PayoffRow {
  id: string;
  name: string;
  months: number;
  interestPaid: number;
}

export interface PayoffResult {
  rows: PayoffRow[];
  months: number;
  totalInterest: number;
}

/** Simulates month-by-month amortisation with any spare EMI rolled onto the target debt (avalanche/snowball order). */
export function simulatePayoff(debts: Debt[], strategy: DebtStrategy, extra: number): PayoffResult {
  const live = debts.filter((d) => d.principal > 0).map((d) => ({ ...d, balance: d.principal, interestPaid: 0, months: 0, done: false }));
  if (live.length === 0) return { rows: [], months: 0, totalInterest: 0 };
  const order = () =>
    live
      .filter((d) => !d.done)
      .sort((a, b) => (strategy === 'avalanche' ? b.ratePct - a.ratePct : a.balance - b.balance));

  let month = 0;
  const maxMonths = 720; // 60 years — a hard stop against runaway loops (e.g. EMI below interest)
  while (live.some((d) => !d.done) && month < maxMonths) {
    month++;
    let freed = extra;
    for (const d of live) {
      if (d.done) continue;
      const interest = (d.balance * d.ratePct) / 1200;
      d.interestPaid += interest;
      d.balance += interest;
    }
    // regular EMIs first
    for (const d of live) {
      if (d.done) continue;
      const pay = Math.min(d.emi, d.balance);
      d.balance -= pay;
      if (d.balance <= 0.5) {
        d.done = true;
        d.months = month;
        freed += d.emi - pay; // any EMI slack from a debt that just finished
      }
    }
    // roll every rupee of slack + the prepayment budget onto the priority debt
    for (const d of order()) {
      if (freed <= 0) break;
      const pay = Math.min(freed, d.balance);
      d.balance -= pay;
      freed -= pay;
      if (d.balance <= 0.5) {
        d.done = true;
        d.months = month;
      }
    }
  }
  const rows: PayoffRow[] = live.map((d) => ({ id: d.id, name: d.name, months: d.done ? d.months : maxMonths, interestPaid: d.interestPaid }));
  return { rows, months: Math.max(...rows.map((r) => r.months), 0), totalInterest: rows.reduce((t, r) => t + r.interestPaid, 0) };
}

export function newDebt(): Debt {
  return { id: `d${Date.now().toString(36)}`, name: 'Loan', principal: 500000, ratePct: 10.5, emi: 12000 };
}

// ——— Net worth ———

export interface NetWorthEntry {
  assets: number[]; // aligned to NET_WORTH_ASSET_LABELS
  liabilities: number[]; // aligned to NET_WORTH_LIABILITY_LABELS
}

export interface NetWorthSnapshot extends NetWorthEntry {
  id: string;
  savedAt: number;
}

export function netWorthOf(e: NetWorthEntry): { assets: number; liabilities: number; net: number } {
  const assets = e.assets.reduce((t, v) => t + (v || 0), 0);
  const liabilities = e.liabilities.reduce((t, v) => t + (v || 0), 0);
  return { assets, liabilities, net: assets - liabilities };
}

// ——— Financial freedom ———

export interface FiInput {
  annualExpenses: number;
  withdrawalPct: number;
  currentCorpus: number;
  monthlySavings: number;
  returnPct: number;
  inflationPct: number;
}

export interface FiResult {
  targetCorpus: number;
  yearsToFi: number | null; // null = not reachable within 60 years at this rate
  path: { year: number; corpus: number }[];
}

/** Years to reach a real (inflation-adjusted) FI target, compounding monthly savings at a real rate of return. */
export function financialFreedom(inp: FiInput): FiResult {
  const targetCorpus = inp.annualExpenses / (inp.withdrawalPct / 100);
  const realReturn = (1 + inp.returnPct / 100) / (1 + inp.inflationPct / 100) - 1;
  const rMonthly = realReturn / 12;
  const path: { year: number; corpus: number }[] = [{ year: 0, corpus: inp.currentCorpus }];
  let corpus = inp.currentCorpus;
  let yearsToFi: number | null = corpus >= targetCorpus ? 0 : null;
  for (let m = 1; m <= 720; m++) {
    corpus = corpus * (1 + rMonthly) + inp.monthlySavings;
    if (m % 12 === 0) path.push({ year: m / 12, corpus });
    if (yearsToFi === null && corpus >= targetCorpus) yearsToFi = Math.ceil(m / 12);
  }
  return { targetCorpus, yearsToFi, path };
}

// ——— Emergency fund ———

export interface EfResult {
  target: number;
  shortfall: number;
  monthsToTarget: number | null;
}

export function emergencyFundPlan(essentialMonthly: number, months: number, current: number, monthlyContribution: number): EfResult {
  const target = essentialMonthly * months;
  const shortfall = Math.max(0, target - current);
  const monthsToTarget = monthlyContribution > 0 ? Math.ceil(shortfall / monthlyContribution) : shortfall > 0 ? null : 0;
  return { target, shortfall, monthsToTarget };
}

// ——— Savings-rate benchmark ———

/** A rough, widely-cited by-decade savings-rate guideline. */
export function recommendedSavingsRate(age: number): number {
  if (age < 30) return 0.15;
  if (age < 40) return 0.2;
  if (age < 50) return 0.25;
  return 0.3;
}
