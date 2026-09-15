import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { STATES, type Region } from '../lib/cities';
import type { CityCalc } from '../lib/engine';
import { salaryCfg } from '../lib/engine';
import { compact, lpaFull, rupees } from '../lib/format';
import { takeHome } from '../lib/tax';
import { niceTicks, useWidth } from './chart';
import { useStore } from './store';
import { Segmented } from './ui';

const REGIONS: Region[] = ['North', 'West', 'Central', 'South', 'East', 'Northeast'];

function StripPlot({ ranked, homeId, compare, visible, onPick }: {
  ranked: CityCalc[];
  homeId: string;
  compare: string[];
  visible: Set<string>;
  onPick: (id: string) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const rowH = 30;
  const m = { l: 84, r: 20, t: 10, b: 28 };
  const h = m.t + m.b + rowH * REGIONS.length;
  const vals = ranked.map((c) => c.solved.best.ctc);
  const { lo, hi, ticks } = niceTicks(Math.min(...vals) * 0.96, Math.max(...vals) * 1.02, w < 500 ? 3 : 6);
  const iw = Math.max(10, w - m.l - m.r);
  const x = (v: number) => m.l + ((v - lo) / (hi - lo)) * iw;
  const counts: Record<string, number> = {};
  const dots = ranked.map((c) => {
    const n = (counts[c.city.region] = (counts[c.city.region] ?? 0) + 1);
    const jitter = ((n % 3) - 1) * 6;
    return { c, cx: x(c.solved.best.ctc), cy: m.t + REGIONS.indexOf(c.city.region) * rowH + rowH / 2 + jitter };
  });
  const home = dots.find((d) => d.c.city.id === homeId);
  const hov = dots.find((d) => d.c.city.id === hover);

  return (
    <div className="strip" ref={ref}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label="Required CTC for every city, grouped by region">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={m.t} y2={h - m.b} className="grid" />
              <text x={x(t)} y={h - 8} className="tick" textAnchor="middle">{compact(t, 1)}</text>
            </g>
          ))}
          {REGIONS.map((r, i) => (
            <text key={r} x={0} y={m.t + i * rowH + rowH / 2} className="tick region" dominantBaseline="middle">{r}</text>
          ))}
          {dots.filter((d) => d.c.city.id !== homeId).map(({ c, cx, cy }) => {
            const isCmp = compare.includes(c.city.id);
            return (
              <motion.circle
                key={c.city.id}
                initial={false}
                animate={{ cx, cy, opacity: visible.has(c.city.id) ? 1 : 0.18 }}
                transition={{ duration: 0.5 }}
                r={isCmp ? 6 : 5}
                className={`dot${isCmp ? ' is-cmp' : ''}${hover === c.city.id ? ' is-hover' : ''}`}
              />
            );
          })}
          {home && (
            <g>
              <motion.circle initial={false} animate={{ cx: home.cx, cy: home.cy }} transition={{ duration: 0.5 }} r={8} className="dot is-home" />
              <motion.text initial={false} animate={{ x: home.cx, y: home.cy - 13 }} transition={{ duration: 0.5 }} className="dot-label" textAnchor="middle">{home.c.city.name}</motion.text>
            </g>
          )}
          {dots.map(({ c, cx, cy }) => (
            <circle
              key={`hit-${c.city.id}`}
              cx={cx}
              cy={cy}
              r={10}
              className="hit"
              onMouseEnter={() => setHover(c.city.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onPick(c.city.id)}
            />
          ))}
        </svg>
      )}
      {hov && (
        <div className="strip-tip" style={{ left: Math.min(Math.max(hov.cx, 90), w - 90), top: hov.cy - 12 }}>
          <b>{hov.c.city.name}</b>
          <span>₹{lpaFull(hov.c.solved.best.ctc)} · {rupees(hov.c.need)}/mo</span>
          <small>{hov.c.city.id === homeId ? 'Your city' : compare.includes(hov.c.city.id) ? 'In your comparison · click to remove' : 'Click to compare'}</small>
        </div>
      )}
    </div>
  );
}

export function IndiaRank() {
  const { state: s, update, all, home, household } = useStore();
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<0 | 1 | 2 | 3>(0);
  const [region, setRegion] = useState<'all' | Region>('all');
  const [sort, setSort] = useState<'asc' | 'desc' | 'az'>('asc');
  const [showAll, setShowAll] = useState(false);

  const ranked = useMemo(() => [...all].sort((a, b) => a.solved.best.ctc - b.solved.best.ctc), [all]);
  const rankOf = useMemo(() => new Map(ranked.map((c, i) => [c.city.id, i + 1])), [ranked]);
  const needle = q.trim().toLowerCase();
  const rows = ranked.filter((c) =>
    (!needle || c.city.name.toLowerCase().includes(needle) || STATES[c.city.state].name.toLowerCase().includes(needle)) &&
    (!tier || c.city.tier === tier) &&
    (region === 'all' || c.city.region === region));
  if (sort === 'desc') rows.reverse();
  if (sort === 'az') rows.sort((a, b) => a.city.name.localeCompare(b.city.name));
  const visibleSet = new Set(rows.map((r) => r.city.id));
  const shown = showAll || needle ? rows : rows.slice(0, 15);
  const maxCtc = ranked[ranked.length - 1]?.solved.best.ctc ?? 1;
  const offer = s.offerLpa ? s.offerLpa * 1e5 : null;
  const cfg = salaryCfg(s);

  const toggleCompare = (id: string) => {
    if (id === home.id) return;
    update((d) => {
      d.compare = d.compare.includes(id) ? d.compare.filter((x) => x !== id) : [...d.compare.filter((x) => x !== home.id), id].slice(-3);
    });
  };

  const cheapest = ranked[0];
  const priciest = ranked[ranked.length - 1];

  return (
    <div className="ind">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Your life, priced across India</h3>
            <p className="card-sub">
              From ₹{lpaFull(cheapest.solved.best.ctc)} in {cheapest.city.name} to ₹{lpaFull(priciest.solved.best.ctc)} in {priciest.city.name}.
              {' '}Your city ranks #{rankOf.get(home.id)} of {ranked.length}.
              {household.dual && ' Figures here assume one earner — your combined household number is on the Breakdown tab.'}
            </p>
          </div>
        </header>
        <StripPlot ranked={ranked} homeId={home.id} compare={s.compare} visible={visibleSet} onPick={toggleCompare} />
      </article>

      <div className="ind-controls">
        <input id="city-search" className="search" placeholder="Search city or state" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cities" />
        <Segmented<0 | 1 | 2 | 3> id="tier" size="sm" stretch={false} ariaLabel="Tier" value={tier} options={[{ value: 0, label: 'All' }, { value: 1, label: 'Tier 1' }, { value: 2, label: 'Tier 2' }, { value: 3, label: 'Tier 3' }]} onChange={setTier} />
        <select id="region" className="select" value={region} onChange={(e) => setRegion(e.target.value as 'all' | Region)} aria-label="Region">
          <option value="all">All regions</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <Segmented id="sort" size="sm" stretch={false} ariaLabel="Sort" value={sort} options={[{ value: 'asc', label: 'Cheapest' }, { value: 'desc', label: 'Costliest' }, { value: 'az', label: 'A–Z' }]} onChange={setSort} />
      </div>

      <div className={`rank-wrap${offer ? ' has-offer' : ''}`}>
      <div className="rank-head" aria-hidden="true">
        <span>#</span><span>City</span><span>Required CTC</span><span className="hide-sm">Take-home</span><span className="hide-sm">Rent</span>{offer && <span>₹{s.offerLpa} L leaves</span>}<span />
      </div>
      <ul className="rank">
        <AnimatePresence initial={false}>
          {shown.map((c) => {
            const ctc = c.solved.best.ctc;
            const isHome = c.city.id === home.id;
            const inCmp = s.compare.includes(c.city.id);
            const surplus = offer ? takeHome(offer, cfg, c.ctx, s.salary.regime).best.inHandMonthly - c.need : null;
            return (
              <motion.li
                key={c.city.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }, opacity: { duration: 0.2 } }}
                className={`rank-row${isHome ? ' is-home' : ''}`}
              >
                <span className="rank-num num">{rankOf.get(c.city.id)}</span>
                <span className="rank-city">
                  <b>{c.city.name}</b>
                  <small>{STATES[c.city.state].name} · T{c.city.tier}{c.city.quality === 'modelled' ? ' · modelled' : ''}</small>
                </span>
                <span className="rank-val">
                  <span className="rank-bar" aria-hidden="true"><motion.span initial={false} animate={{ width: `${(ctc / maxCtc) * 100}%` }} transition={{ duration: 0.5 }} /></span>
                  <b className="num">₹{lpaFull(ctc)}</b>
                </span>
                <span className="num hide-sm">{compact(c.need)}</span>
                <span className="num hide-sm">{compact(c.rent)}</span>
                {surplus !== null && (
                  <span className={`num surplus ${surplus >= 0 ? 'is-pos' : 'is-neg'}`}>{surplus >= 0 ? '+' : '−'}{compact(Math.abs(surplus))}/mo</span>
                )}
                <span className="rank-actions">
                  {isHome ? (
                    <span className="tag">Your city</span>
                  ) : (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => update((d) => { d.cityId = c.city.id; })}>Make mine</button>
                      <button type="button" className={`btn btn-sm${inCmp ? ' is-on' : ''}`} aria-pressed={inCmp} onClick={() => toggleCompare(c.city.id)}>{inCmp ? '✓ Comparing' : '+ Compare'}</button>
                    </>
                  )}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      </div>
      {!needle && rows.length > 15 && (
        <button type="button" className="btn show-all" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show top 15' : `Show all ${rows.length} cities`}
        </button>
      )}
      {rows.length === 0 && <p className="note">No city matches those filters.</p>}
    </div>
  );
}
