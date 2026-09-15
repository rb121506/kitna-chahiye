import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CanIAfford } from './components/CanIAfford';
import { Compare } from './components/Compare';
import { DebtPayoff } from './components/DebtPayoff';
import { EmergencyFund } from './components/EmergencyFund';
import { FinancialFreedom } from './components/FinancialFreedom';
import { Future } from './components/Future';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { IndiaRank } from './components/IndiaRank';
import { NetWorth } from './components/NetWorth';
import { Offer } from './components/Offer';
import { Overview } from './components/Overview';
import { QuickEstimate } from './components/QuickEstimate';
import { Sidebar } from './components/Sidebar';
import { StoreCtx, useStore, type Store, type UpdateOpts } from './components/store';
import { Segmented, spring } from './components/ui';
import { CITIES, CITY_BY_ID } from './lib/cities';
import { TAX_SOURCES } from './lib/constants';
import { applyPreset, computeCity, defaultState, solveHousehold } from './lib/engine';
import { compact, lpaFull } from './lib/format';
import { loadState, saveState } from './lib/storage';
import type { AppState } from './lib/types';

const PLANNER_TABS = [
  { id: 'overview', label: 'Breakdown' },
  { id: 'compare', label: 'Compare cities' },
  { id: 'india', label: 'All 62 cities' },
  { id: 'future', label: 'Projections' },
  { id: 'offer', label: 'Check an offer' },
  { id: 'afford', label: 'Can I afford it?' },
] as const;
const TOOL_TABS = [
  { id: 'networth', label: 'Net worth' },
  { id: 'debt', label: 'Debt payoff' },
  { id: 'emergency', label: 'Emergency fund' },
  { id: 'freedom', label: 'Financial freedom' },
] as const;
type TabId = (typeof PLANNER_TABS)[number]['id'] | (typeof TOOL_TABS)[number]['id'];

const SOURCES = [
  'Numbeo India city indices and rents (1BR/3BR, centre & outskirts), Sep 2026',
  'Magicbricks, NoBroker & 99acres 2026 rent reports; costoflivingindia.com (May 2026)',
  'CarDekho petrol prices, 15 Sep 2026 · Goodreturns & DriveSpark LPG and CNG prices, Sep 2026',
  'State domestic electricity tariffs FY 2025-26 (adjusted for wheeling, FPPPA and bimonthly billing)',
  'Delhi, Punjab & Karnataka power subsidy rules as continued in 2026-27 budgets',
  'IndPayroll & Saral professional tax schedules 2026-27',
  'MoSPI CPI August 2026 (4.82%, food 5.95%); insurer medical-inflation reports (12–14%)',
  'LocalCircles 2026 school fee survey; Tutopiya & Skoodos 2026 fee guides; PolicyBazaar daycare costs 2026',
  'Official India prices for Netflix, JioHotstar, Prime, SonyLIV, ZEE5, YouTube, Spotify, Apple, ChatGPT (Sep 2026)',
  'Health & term premiums from 2026 retail quotes (NYVO, PolicyBazaar, Bajaj); RBI repo 5.25% and bank loan rates, Sep 2026',
  'Domestic help rates from 2026 agency price lists in Bengaluru, Mumbai, Pune and Hyderabad',
];

const ASSUMPTIONS = [
  'CTC splits into basic (50%), HRA (50% of basic in the 8 metros, 40% elsewhere) and special allowance. Employer PF (12% of basic) and gratuity (4.81% of basic) sit inside CTC.',
  'Required CTC is the smallest package whose fixed monthly take-home covers your spending plus savings. Variable pay is ignored for monthly bills.',
  'Other cities re-price rent, maintenance, power tariffs, LPG, fuel, domestic-help wages, school fees, groceries, eating out and local transport. EMIs, subscriptions, term cover and SIPs stay the same.',
  'Rent assumes a semi-furnished flat in a standard locality. Budget ≈ 0.7×, Prime ≈ 1.5×, Luxury ≈ 2.3×.',
  'Old regime uses HRA exemption on your rent, 80C (EPF, term premium, tuition fees, home-loan principal), 80D and home-loan interest.',
];

function initialState(): AppState {
  return loadState() ?? defaultState();
}

function MobileBar() {
  const { calc, household } = useStore();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0.1 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          className="mbar"
          initial={{ y: 90 }}
          animate={{ y: 0 }}
          exit={{ y: 90 }}
          transition={spring}
          onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="mbar-k">{household.dual ? 'Household needs' : 'You need'}</span>
          <b>₹{lpaFull(household.combinedCtc)}/yr</b>
          <span className="mbar-sub">{compact(calc.need)}/mo in hand</span>
          <span className="mbar-up" aria-hidden="true">↑</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [section, setSection] = useState<'planner' | 'tools'>('planner');
  const [tab, setTab] = useState<TabId>('overview');

  const update = useCallback((fn: (d: AppState) => void, opts?: UpdateOpts) => {
    setState((prev) => {
      let next = structuredClone(prev);
      fn(next);
      const touches = opts?.touch ? ([] as string[]).concat(opts.touch) : [];
      for (const t of touches) next.touched[t] = true;
      if (opts?.household) next = applyPreset(next, next.lifestyle, false);
      return next;
    });
  }, []);
  const replace = useCallback((s: AppState) => setState(structuredClone(s)), []);

  useEffect(() => {
    const t = setTimeout(() => saveState(state), 250);
    return () => clearTimeout(t);
  }, [state]);

  const home = CITY_BY_ID[state.cityId] ?? CITIES[0];
  const calc = useMemo(() => computeCity(state, home, home, { bare: true }), [state, home]);
  const household = useMemo(() => solveHousehold(state, calc, home), [state, calc, home]);
  const deferred = useDeferredValue(state);
  const all = useMemo(() => {
    const h = CITY_BY_ID[deferred.cityId] ?? CITIES[0];
    return CITIES.map((c) => computeCity(deferred, c, h));
  }, [deferred]);

  const store: Store = { state, update, replace, home, calc, all, household };

  return (
    <StoreCtx.Provider value={store}>
      <div className="app">
        <Header />
        <div className="section-switch">
          <Segmented
            id="section"
            ariaLabel="Salary planner or money tools"
            value={section}
            options={[
              { value: 'planner', label: 'Salary planner', hint: 'What CTC your life needs, city by city' },
              { value: 'tools', label: 'Money tools', hint: 'Net worth, debt payoff, emergency fund, financial freedom' },
            ]}
            onChange={(v) => { setSection(v); setTab(v === 'planner' ? 'overview' : 'networth'); }}
          />
        </div>
        <div className="layout">
          <div className="hero-slot"><Hero /></div>
          <aside className="sidebar" aria-label="Your expenses">
            {state.quickMode ? <QuickEstimate /> : <Sidebar />}
          </aside>
          <main className="content">
            <div className="tabs" role="tablist" aria-label="Results">
              {(section === 'planner' ? PLANNER_TABS : TOOL_TABS).map((t) => (
                <button key={t.id} id={`tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls="tab-panel" className={`tab${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
                  {t.label}
                  {tab === t.id && <motion.span layoutId="tab-ink" className="tab-ink" transition={spring} />}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.section
                key={tab}
                id="tab-panel"
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {tab === 'overview' && <Overview />}
                {tab === 'compare' && <Compare />}
                {tab === 'india' && <IndiaRank />}
                {tab === 'future' && <Future />}
                {tab === 'offer' && <Offer />}
                {tab === 'afford' && <CanIAfford />}
                {tab === 'networth' && <NetWorth />}
                {tab === 'debt' && <DebtPayoff />}
                {tab === 'emergency' && <EmergencyFund />}
                {tab === 'freedom' && <FinancialFreedom />}
              </motion.section>
            </AnimatePresence>
            <footer className="foot">
              <details>
                <summary>How the numbers are worked out, and sources</summary>
                <div className="foot-grid">
                  <div>
                    <h4>Tax & salary rules</h4>
                    <ul>{TAX_SOURCES.map((x) => <li key={x}>{x}</li>)}</ul>
                    <h4>Method</h4>
                    <ul>{ASSUMPTIONS.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                  <div>
                    <h4>Price data</h4>
                    <ul>{SOURCES.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                </div>
              </details>
              <p className="foot-note">Planning estimates, not tax or financial advice. Cities marked “modelled” are priced from surveyed peers in the same state and tier.</p>
            </footer>
          </main>
        </div>
        <MobileBar />
      </div>
    </StoreCtx.Provider>
  );
}
