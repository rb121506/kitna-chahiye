import type { Debt, NetWorthSnapshot } from './tools';
import { newDebt } from './tools';

const DEBTS_KEY = 'kitna-chahiye:debts:v1';
const NW_KEY = 'kitna-chahiye:networth:v1';

export function loadDebts(): Debt[] {
  try {
    const raw = localStorage.getItem(DEBTS_KEY);
    const list = raw ? (JSON.parse(raw) as Debt[]) : null;
    return list && list.length ? list : [newDebt()];
  } catch {
    return [newDebt()];
  }
}

export function saveDebts(debts: Debt[]) {
  try {
    localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
  } catch {
    /* ignore */
  }
}

export function loadNetWorthHistory(): NetWorthSnapshot[] {
  try {
    const raw = localStorage.getItem(NW_KEY);
    return raw ? (JSON.parse(raw) as NetWorthSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveNetWorthHistory(list: NetWorthSnapshot[]) {
  try {
    localStorage.setItem(NW_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
