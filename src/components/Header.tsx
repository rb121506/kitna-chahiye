import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CITY_BY_ID, GROUP_META, GROUP_ORDER } from '../lib/cities';
import { LIFESTYLE_META } from '../lib/constants';
import { defaultState } from '../lib/engine';
import { compact, lpa, rupees } from '../lib/format';
import { loadScenarios, saveScenarios, type Scenario } from '../lib/storage';
import { useStore } from './store';

export const THEME_KEY = 'kitna-chahiye:theme';

function resolveTheme(): 'light' | 'dark' {
  const a = document.documentElement.dataset.theme;
  if (a === 'light' || a === 'dark') return a;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(resolveTheme);
  useEffect(() => {
    const on = () => setTheme(resolveTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', on);
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq.removeEventListener('change', on); mo.disconnect(); };
  }, []);
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };
  return (
    <button id="theme-toggle" type="button" className="btn btn-icon" onClick={flip} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={theme}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          initial={{ rotate: -60, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ fill: 'none', stroke: 'currentColor' }}
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          {theme === 'dark' ? (
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}

function Scenarios() {
  const { state, replace } = useStore();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Scenario[]>(loadScenarios);
  const [name, setName] = useState('');
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const persist = (next: Scenario[]) => { setList(next); saveScenarios(next); };
  const save = () => {
    const fallback = `${CITY_BY_ID[state.cityId]?.name ?? 'City'} · ${LIFESTYLE_META[state.lifestyle].label}`;
    persist([{ id: Date.now().toString(36), name: name.trim() || fallback, savedAt: Date.now(), state }, ...list].slice(0, 12));
    setName('');
  };

  return (
    <div className="menu" ref={wrap}>
      <button id="scenarios-btn" type="button" className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Scenarios{list.length > 0 && <span className="count">{list.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="menu-pop" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <p className="menu-title">Save this setup to compare later</p>
            <form className="scn-save" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <input id="scenario-name" placeholder="e.g. Pune offer, with a car" value={name} onChange={(e) => setName(e.target.value)} aria-label="Scenario name" />
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
            </form>
            {list.length === 0 ? (
              <p className="note">Nothing saved yet. Saved setups stay in this browser.</p>
            ) : (
              <ul className="scn-list">
                {list.map((sc) => (
                  <li key={sc.id}>
                    <button type="button" className="scn-load" onClick={() => { replace(sc.state); setOpen(false); }}>
                      <b>{sc.name}</b>
                      <small>{new Date(sc.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>
                    </button>
                    <button type="button" className="icon-x" aria-label={`Delete ${sc.name}`} onClick={() => persist(list.filter((x) => x.id !== sc.id))}>×</button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="link-btn" onClick={() => { replace(defaultState()); setOpen(false); }}>Start over with the example household</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CopySummary() {
  const { state: s, calc, all, home } = useStore();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const best = calc.solved.best;
    const kids = s.children.length ? `, ${s.children.length} child${s.children.length > 1 ? 'ren' : ''}` : '';
    const groups = GROUP_ORDER.filter((g) => g !== 'savings' && calc.groups[g] > 0)
      .sort((a, b) => calc.groups[b] - calc.groups[a]).slice(0, 5)
      .map((g) => `${GROUP_META[g].label} ${rupees(calc.groups[g])}`).join(' · ');
    const cmp = s.compare.map((id) => all.find((c) => c.city.id === id)).filter(Boolean)
      .map((c) => `${c!.city.name} ₹${lpa(c!.solved.best.ctc)} L`).join(' · ');
    const text = [
      `Kitna Chahiye: ${home.name}, ${LIFESTYLE_META[s.lifestyle].label.toLowerCase()} lifestyle`,
      `Household: ${s.adults} adult${s.adults > 1 ? 's' : ''}${kids}${s.seniors ? `, ${s.seniors} parent${s.seniors > 1 ? 's' : ''}` : ''}`,
      `Monthly spend: ${rupees(calc.spend + calc.buffer)}`,
      `Take-home needed: ${rupees(calc.need)}/month`,
      `Required CTC: ₹${lpa(best.ctc)} L a year (${best.regime} regime, tax ${compact(best.tax)})`,
      `Biggest costs: ${groups}`,
      cmp ? `Same life elsewhere: ${cmp}` : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button id="copy-summary" type="button" className="btn" onClick={copy} aria-live="polite">
      {copied ? 'Copied ✓' : 'Copy summary'}
    </button>
  );
}

export function Header() {
  return (
    <header className="hdr">
      <a className="brand" href="#hero" aria-label="Kitna Chahiye, back to top">
        <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="18.5" style={{ fill: 'none', stroke: 'var(--accent)' }} strokeWidth="1" strokeDasharray="1.6 1.6" />
          <circle cx="20" cy="20" r="14" style={{ fill: 'var(--accent)' }} />
          <text x="20" y="21" textAnchor="middle" dominantBaseline="middle" style={{ fill: 'var(--accent-ink)', font: '700 17px var(--font-display)' }}>₹</text>
        </svg>
        <span className="brand-text">
          <span className="brand-name">Kitna Chahiye</span>
          <span className="brand-tag">The salary your life actually needs</span>
        </span>
      </a>
      <div className="hdr-actions">
        <Scenarios />
        <CopySummary />
        <ThemeToggle />
      </div>
    </header>
  );
}
