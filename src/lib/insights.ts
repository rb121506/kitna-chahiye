import type { City } from './cities';
import { STATES } from './cities';
import { LOCALITY, SUB_BY_ID } from './constants';
import { amountHome, computeCity, type CityCalc, type Line } from './engine';
import { compact, lpaFull, pct } from './format';
import type { AmountId, AppState } from './types';

export interface Lever {
  id: string;
  label: string;
  cutLabel: string;
  monthlySave: number;
  ctcDrop: number;
}

function cutAmount(id: AmountId, pct = 0.2) {
  return (s: AppState, _l: Line, home: City): AppState => {
    const n = structuredClone(s);
    const cur = amountHome(id, s, home);
    n.amounts[id] = Math.max(0, Math.round(cur * (1 - pct)));
    return n;
  };
}

const LEVER_CUT: Record<string, (s: AppState, l: Line, home: City) => AppState | null> = {
  rent: (s, l) => {
    if (s.housing.type !== 'rent' && s.housing.type !== 'pg') return null;
    const n = structuredClone(s);
    n.housing.customRent = Math.round((l.value * 0.85) / 500) * 500;
    return n;
  },
  maintenance: (s, l) => {
    const n = structuredClone(s);
    n.amounts.maintenance = Math.round((l.value * 0.8) / 100) * 100;
    return n;
  },
  groceries: cutAmount('groceries'),
  dining: cutAmount('dining'),
  shopping: cutAmount('shopping'),
  personalCare: cutAmount('personalCare'),
  entertainment: cutAmount('entertainment'),
  cabs: cutAmount('cabs'),
  transit: cutAmount('transit'),
  coaching: cutAmount('coaching'),
  activities: cutAmount('activities'),
  otherSubs: cutAmount('otherSubs'),
  medicines: cutAmount('medicines'),
  gym: cutAmount('gym'),
  delivery: (s, _l, home) => {
    const n = structuredClone(s);
    const cur = amountHome('deliveryOrders', s, home);
    n.amounts.deliveryOrders = Math.max(0, Math.round(cur * 0.75));
    return n;
  },
  travel: cutAmount('travelYear', 0.25),
  festivals: cutAmount('festivalsYear', 0.2),
  gadgets: cutAmount('gadgetsYear', 0.3),
  subscriptions: (s) => {
    if (s.subs.length === 0) return null;
    const priciest = [...s.subs].sort((a, b) => (SUB_BY_ID[b]?.monthly ?? 0) - (SUB_BY_ID[a]?.monthly ?? 0))[0];
    const n = structuredClone(s);
    n.subs = s.subs.filter((x) => x !== priciest);
    return n;
  },
};

const LEVER_VERB: Record<string, string> = {
  rent: 'Move to a slightly cheaper flat', maintenance: 'A lower-maintenance building', groceries: 'Trim groceries a fifth',
  dining: 'Eat out a little less', shopping: 'Cut shopping back', personalCare: 'Trim salon & personal care',
  entertainment: 'Fewer nights out', cabs: 'Take fewer cabs', transit: 'Cut transit spend', coaching: 'Trim tuition spend',
  activities: 'Cut one activity', otherSubs: 'Drop an app or two', medicines: 'Trim the health & wellness budget',
  gym: 'A cheaper gym', delivery: "Cut delivery orders by a quarter", travel: 'A lighter travel budget',
  festivals: 'Trim festival spending', gadgets: 'Space out gadget upgrades', subscriptions: 'Drop your priciest subscription',
};

/** The single largest recurring cost, excluding savings. */
export function biggestExpense(calc: CityCalc): Line | null {
  const lines = calc.lines.filter((l) => l.group !== 'savings');
  return lines.length ? [...lines].sort((a, b) => b.value - a.value)[0] : null;
}

/** What trimming your biggest costs would actually save on the required CTC — computed, not guessed. */
export function biggestLevers(s: AppState, calc: CityCalc, home: City, n = 2): Lever[] {
  const candidates = calc.lines
    .filter((l) => l.group !== 'savings' && LEVER_CUT[l.id] && l.value > 300)
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
  const out: Lever[] = [];
  for (const l of candidates) {
    const mutated = LEVER_CUT[l.id](s, l, home);
    if (!mutated) continue;
    const next = computeCity(mutated, home, home);
    const ctcDrop = calc.solved.best.ctc - next.solved.best.ctc;
    if (ctcDrop < 1500) continue;
    const monthlySave = l.value - (next.lines.find((x) => x.id === l.id)?.value ?? 0);
    out.push({ id: l.id, label: l.label, cutLabel: LEVER_VERB[l.id] ?? `Trim ${l.label.toLowerCase()}`, monthlySave, ctcDrop });
  }
  return out.sort((a, b) => b.ctcDrop - a.ctcDrop).slice(0, n);
}

export type Tone = 'high' | 'watch' | 'good' | 'info';

export interface Insight {
  id: string;
  tone: Tone;
  title: string;
  body: string;
}

const RANK: Record<Tone, number> = { high: 0, watch: 1, good: 2, info: 3 };

export function buildInsights(s: AppState, calc: CityCalc, all: CityCalc[] | null): Insight[] {
  const out: Insight[] = [];
  const { need, solved, city } = calc;
  const H = s.housing;

  const housing = calc.rent + (H.type === 'ownLoan' ? H.homeLoanEmi : 0);
  if (housing > 0) {
    const share = housing / need;
    const tone: Tone = share <= 0.25 ? 'good' : share <= 0.35 ? 'watch' : 'high';
    out.push({
      id: 'housing',
      tone,
      title: `Housing takes ${pct(share)} of take-home`,
      body: tone === 'good'
        ? 'Comfortably under the 30% rule of thumb.'
        : tone === 'watch'
          ? 'Just over the 30% comfort line. A cheaper locality would ease it.'
          : 'Well past the 30% line. A smaller flat or a cheaper locality would free up a lot.',
    });
  }

  const nonHomeEmis = calc.emis - (H.type === 'ownLoan' ? H.homeLoanEmi : 0);
  if (calc.emis > 0) {
    const share = calc.emis / need;
    if (share > 0.25) {
      out.push({
        id: 'emi',
        tone: share > 0.4 ? 'high' : 'watch',
        title: `EMIs & card dues are ${pct(share)} of take-home`,
        body: share > 0.4
          ? 'Banks look for total EMIs under ~50% of income, and above 40% a new loan gets hard. Clear the costliest debt first.'
          : `Manageable, but prepaying the ${nonHomeEmis > 0 ? 'personal or card debt' : 'loan'} would free cash fastest.`,
      });
    }
  }

  const saved = calc.savings - calc.buffer;
  const rate = saved / need;
  out.push(rate >= 0.2
    ? { id: 'save', tone: 'good', title: `You're saving ${pct(rate)} of take-home`, body: `That's ${compact(saved * 12)} a year, plus ${compact(solved.best.employeePF * 2)} into EPF.` }
    : { id: 'save', tone: 'watch', title: `Savings are ${pct(rate)} of take-home`, body: 'Aim for at least 20%. Your EPF alone won’t fund retirement or a home down payment.' });

  const diff = solved.oldSlip.ctc - solved.newSlip.ctc;
  if (Math.abs(diff) >= 5000) {
    out.push(diff > 0
      ? { id: 'regime', tone: 'info', title: `New regime needs ${compact(diff)} less CTC`, body: 'Lower slabs and the ₹12 L rebate beat your old-regime deductions at this income.' }
      : { id: 'regime', tone: 'info', title: `Old regime saves ${compact(-diff)} of CTC`, body: 'Your HRA, 80C and 80D deductions outweigh the new regime’s lower slabs. Declare it to your employer.' });
  }

  if (H.type === 'rent' && (H.locality === 'prime' || H.locality === 'luxury')) {
    const standard = calc.rent / LOCALITY[H.locality].rent;
    out.push({
      id: 'locality',
      tone: 'info',
      title: `A Standard locality saves ${compact(calc.rent - standard)}/month`,
      body: `Same flat size, a few kilometres out. That's roughly ${compact((calc.rent - standard) * 12 * 1.3)} less CTC a year.`,
    });
  }

  const dependents = s.adults > 1 || s.children.length > 0 || s.seniors > 0;
  if (dependents) {
    const target = Math.max(solved.best.ctc * 10, 5e6);
    if (s.health.termCr === 0) {
      out.push({ id: 'term', tone: 'high', title: 'No term life cover', body: `People depend on your income. Cover of ~${compact(target)} costs about ${compact(target / 1e7 * 10000 / 12)}/month at 30.` });
    } else if (s.health.termCr * 1e7 < target * 0.8) {
      out.push({ id: 'term', tone: 'watch', title: `Term cover is below 10× your CTC`, body: `₹${s.health.termCr} Cr today; planners suggest about ${compact(target)}.` });
    }
  }

  if (s.health.cover === 0) {
    out.push({
      id: 'health',
      tone: 'watch',
      title: s.health.employerCover ? 'Only employer health cover' : 'No health insurance',
      body: s.health.employerCover
        ? 'Group cover ends the day you switch jobs. A personal ₹10 L floater is cheap insurance.'
        : 'One hospital stay can cost ₹3–8 L in a private hospital. Private medical costs are rising 12–14% a year.',
    });
  }

  const st = STATES[city.state];
  if (s.bills.subsidy && st.subsidy && (calc.lines.find((l) => l.id === 'electricity')?.value ?? 0) < 900) {
    const label = st.subsidy === 'DL' ? 'Delhi’s 200 free units (50% off up to 400)' : st.subsidy === 'PB' ? 'Punjab’s 300 free units' : 'Karnataka’s Gruha Jyothi (up to 200 free units)';
    out.push({ id: 'subsidy', tone: 'info', title: 'Electricity subsidy applied', body: `At ~${Math.round(calc.electricityUnits)} units a month you fall within ${label}.` });
  }

  if (all && all.length) {
    const peers = all.filter((c) => c.city.id !== city.id && c.city.tier <= city.tier);
    const cheapest = peers.sort((a, b) => a.solved.best.ctc - b.solved.best.ctc)[0];
    if (cheapest && cheapest.solved.best.ctc < solved.best.ctc * 0.88) {
      const saving = solved.best.ctc - cheapest.solved.best.ctc;
      out.push({
        id: 'move',
        tone: 'info',
        title: `${cheapest.city.name} needs ₹${lpaFull(saving)} less`,
        body: `Same lifestyle, ${pct(saving / solved.best.ctc)} lower CTC. It's the cheapest tier-${cheapest.city.tier} city for how you live.`,
      });
    }
  }

  if (calc.upfront > 0) {
    out.push({
      id: 'upfront',
      tone: 'info',
      title: `${compact(calc.upfront)} upfront to move in`,
      body: `${city.name} landlords usually ask ${city.deposit} month${city.deposit > 1 ? 's' : ''} of deposit${city.tier === 1 ? ', plus a month’s brokerage' : ''}.`,
    });
  }

  out.push({
    id: 'ef',
    tone: 'info',
    title: `Emergency fund target: ${compact((calc.spend + calc.buffer) * 6)}`,
    body: 'Six months of expenses in a liquid fund or sweep FD.',
  });

  return out.sort((a, b) => RANK[a.tone] - RANK[b.tone]).slice(0, 6);
}
