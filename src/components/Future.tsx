import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { project, type ProjectionPoint } from '../lib/engine';
import { compact, lpa, pct } from '../lib/format';
import { niceTicks, useWidth } from './chart';
import { useStore } from './store';
import { AnimatedNumber, Segmented, Slider } from './ui';

const START_YEAR = 2026;

function Chart({ pts, yours }: { pts: ProjectionPoint[]; yours: number[] | null }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const h = 300;
  const m = { l: 58, r: w < 520 ? 16 : 104, t: 18, b: 34 };
  const iw = Math.max(10, w - m.l - m.r);
  const ih = h - m.t - m.b;
  const maxV = Math.max(...pts.map((p) => p.ctc), ...(yours ?? [0]));
  const { hi, ticks } = niceTicks(0, maxV, 4);
  const n = pts.length;
  const x = (i: number) => m.l + (i / (n - 1)) * iw;
  const y = (v: number) => m.t + ih - (v / hi) * ih;
  const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const req = line(pts.map((p) => p.ctc));
  const area = `${req}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const you = yours ? line(yours) : null;
  const endReq = y(pts[n - 1].ctc);
  const endYou = yours ? y(yours[n - 1]) : 0;
  const clash = yours && Math.abs(endReq - endYou) < 30;
  const labelStep = n > 8 ? 2 : 1;

  return (
    <div className="chart" ref={ref}>
      {w > 0 && (
        <svg
          width={w}
          height={h}
          role="img"
          aria-label="Required CTC over the coming years"
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const i = Math.round(((e.clientX - rect.left - m.l) / iw) * (n - 1));
            setHover(i >= 0 && i < n ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="req-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={m.l - 10} y={y(t)} className="tick" textAnchor="end" dominantBaseline="middle">{t === 0 ? '0' : compact(t, 1)}</text>
            </g>
          ))}
          {pts.map((p, i) => (i % labelStep === 0 || i === n - 1) && (
            <text key={p.year} x={x(i)} y={h - 10} className="tick" textAnchor="middle">{START_YEAR + p.year}</text>
          ))}
          <motion.path initial={false} animate={{ d: area }} transition={{ duration: 0.5 }} style={{ fill: 'url(#req-fill)' }} />
          <motion.path initial={false} animate={{ d: req }} transition={{ duration: 0.5 }} className="line-req" />
          {you && <motion.path initial={false} animate={{ d: you }} transition={{ duration: 0.5 }} className="line-you" />}
          {w >= 520 && (
            <>
              <text x={x(n - 1) + 10} y={endReq + (clash && endReq < endYou ? -8 : clash ? 8 : 0)} className="end-label req" dominantBaseline="middle">₹{lpa(pts[n - 1].ctc)} L needed</text>
              {yours && <text x={x(n - 1) + 10} y={endYou + (clash && endYou <= endReq ? -8 : clash ? 8 : 0)} className="end-label you" dominantBaseline="middle">₹{lpa(yours[n - 1])} L yours</text>}
            </>
          )}
          <circle cx={x(n - 1)} cy={endReq} r={4.5} className="end-dot req" />
          {yours && <circle cx={x(n - 1)} cy={endYou} r={4.5} className="end-dot you" />}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={h - m.b} className="crosshair" />
              <circle cx={x(hover)} cy={y(pts[hover].ctc)} r={5} className="end-dot req" />
              {yours && <circle cx={x(hover)} cy={y(yours[hover])} r={5} className="end-dot you" />}
            </g>
          )}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <div className="chart-tip" style={{ left: Math.min(Math.max(x(hover), 90), w - 90), top: 8 }}>
          <b>{START_YEAR + pts[hover].year}</b>
          <span><i className="sw req" />Needed ₹{lpa(pts[hover].ctc)} L</span>
          {yours && <span><i className="sw you" />Yours ₹{lpa(yours[hover])} L</span>}
          <small>{compact(pts[hover].need)}/mo take-home</small>
        </div>
      )}
    </div>
  );
}

const ASSUMPTIONS: [string, number][] = [
  ['School & coaching fees', 0.1],
  ['Health insurance premiums', 0.12],
  ['Doctor visits & medicines', 0.1],
  ['Domestic help wages', 0.08],
  ['Rent', 0.07],
  ['Eating out & delivery', 0.07],
  ['Groceries', 0.06],
  ['Fuel & transport', 0.04],
  ['EMIs & term premiums', 0],
];

export function Future() {
  const { state: s, update, calc, home } = useStore();
  const [years, setYears] = useState<5 | 10>(10);
  const pts = useMemo(() => project(s, calc, years), [s, calc, years]);
  const current = s.offerLpa ? s.offerLpa * 1e5 : null;
  const yours = current ? pts.map((p) => current * Math.pow(1 + s.hikePct, p.year)) : null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const needCagr = Math.pow(last.need / first.need, 1 / years) - 1;
  const ctcCagr = Math.pow(last.ctc / first.ctc, 1 / years) - 1;
  const gapYear = yours ? pts.findIndex((p, i) => yours[i] < p.ctc) : -1;

  return (
    <div className="fut">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">What this life will cost in {START_YEAR + years}</h3>
            <p className="card-sub">Same household and choices in {home.name}, with each cost rising at its own 2026 inflation rate</p>
          </div>
          <Segmented<5 | 10> id="horizon" size="sm" stretch={false} ariaLabel="Horizon" value={years} options={[{ value: 5, label: '5 years' }, { value: 10, label: '10 years' }]} onChange={setYears} />
        </header>
        <div className="legend">
          <span><i className="sw req" />CTC needed</span>
          {yours && <span><i className="sw you" />Your CTC with {Math.round(s.hikePct * 100)}% yearly raises</span>}
        </div>
        <Chart pts={pts} yours={yours} />
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Needed in {START_YEAR + years}</span>
            <AnimatedNumber className="stat-val" value={last.ctc} format={(v) => `₹${lpa(v)} L`} />
            <span className="stat-sub">{compact(last.need)}/mo take-home</span>
          </div>
          <div className="stat">
            <span className="stat-label">Your lifestyle inflation</span>
            <span className="stat-val">{pct(needCagr, 1)}</span>
            <span className="stat-sub">a year, vs 4.8% CPI (Aug 2026)</span>
          </div>
          <div className="stat">
            <span className="stat-label">Raise needed to keep up</span>
            <span className="stat-val">{pct(ctcCagr, 1)}</span>
            <span className="stat-sub">a year, after tax slabs bite harder</span>
          </div>
        </div>
      </article>

      <div className="fut-row">
        <article className="card">
          <h3 className="card-title">Plot your own pay</h3>
          <p className="card-sub">{yours ? (gapYear === -1 ? `Your pay stays ahead of this lifestyle through ${START_YEAR + years}.` : gapYear === 0 ? 'Your pay is below what this lifestyle needs today.' : `Your pay falls behind in ${START_YEAR + pts[gapYear].year}.`) : 'Add your current CTC to see when raises stop keeping up.'}</p>
          <Slider id="fut-ctc" label="Your current CTC" value={s.offerLpa ?? 0} max={300} step={0.5} unit="lakh" curve={2} onChange={(v) => update((d) => { d.offerLpa = v > 0 ? v : null; })} />
          <Slider id="fut-hike" label="Average yearly raise" value={Math.round(s.hikePct * 100)} max={25} step={1} unit="pct" onChange={(v) => update((d) => { d.hikePct = v / 100; })} />
        </article>
        <article className="card">
          <h3 className="card-title">Inflation assumed</h3>
          <p className="card-sub">Private healthcare and school fees are rising 2–3× faster than CPI</p>
          <ul className="assume">
            {ASSUMPTIONS.map(([label, r]) => (
              <li key={label}>
                <span>{label}</span>
                <span className="assume-bar" aria-hidden="true"><span style={{ width: `${(r / 0.13) * 100}%` }} /></span>
                <span className="num">{pct(r)}</span>
              </li>
            ))}
          </ul>
          <p className="note">Tax slabs are held at 2026-27 levels, so bracket creep is included.</p>
        </article>
      </div>
    </div>
  );
}
