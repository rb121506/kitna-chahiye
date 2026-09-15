import { defaultState } from './engine';
import type { AppState } from './types';

const KEY = 'kitna-chahiye:state:v2';
const SCENARIOS = 'kitna-chahiye:scenarios:v2';

export interface Scenario {
  id: string;
  name: string;
  savedAt: number;
  state: AppState;
}

function merge(parsed: Partial<AppState>): AppState {
  const d = defaultState();
  return {
    ...d,
    ...parsed,
    housing: { ...d.housing, ...parsed.housing },
    bills: { ...d.bills, ...parsed.bills },
    help: { ...d.help, ...parsed.help },
    transport: { ...d.transport, ...parsed.transport },
    health: { ...d.health, ...parsed.health },
    savings: { ...d.savings, ...parsed.savings },
    salary: { ...d.salary, ...parsed.salary },
    amounts: { ...parsed.amounts },
    rentOverrides: { ...parsed.rentOverrides },
    touched: { ...parsed.touched },
    v: 2,
  };
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.v === 2 ? merge(parsed) : null;
  } catch {
    return null;
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — the app still works, it just won't remember */
  }
}

export function loadScenarios(): Scenario[] {
  try {
    const raw = localStorage.getItem(SCENARIOS);
    const list = raw ? (JSON.parse(raw) as Scenario[]) : [];
    return list.filter((x) => x?.state?.v === 2).map((x) => ({ ...x, state: merge(x.state) }));
  } catch {
    return [];
  }
}

export function saveScenarios(list: Scenario[]) {
  try {
    localStorage.setItem(SCENARIOS, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
