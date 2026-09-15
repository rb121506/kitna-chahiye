import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { FI_DEFAULTS } from '../lib/constants';
import { compact, lpa, pct, rupees } from '../lib/format';
import { financialFreedom, recommendedSavingsRate } from '../lib/tools';
import { useWidth, niceTicks } from './chart';
import { useStore } from './store';
import { AnimatedNumber, Slider } from './ui';

function FiChart({ path, target }: { path: { year: number; corpus: number }[]; target: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const h = 260;
  const m = { l: 58, r: 16, t: 16, b: 30 };
  const iw = Math.max(10, w - m.l - m.r);
  const ih = h - m.t - m.b;
  const maxV = Math.max(target, ...path.map((p) => p.corpus)) * 1.05;
  const { hi, ticks } = niceTicks(0, maxV, 4);
  const n = path.length;
  const x = (i: number) => m.l + (i / Math.max(1, n - 1)) * iw;
  const y = (v: number) => m.t + ih - (v / hi) * ih;
  const line = path.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.corpus).toFixed(1)}`).join('');
  const targetY = y(target);
  const crossI = path.findIndex((p) => p.corpus >= target);

  return (
    <div className="chart" ref={ref}>
      {w > 0 && (
        <svg width={w} height={h} role="img" aria-label="Corpus growth toward your financial-freedom number">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={m.l - 10} y={y(t)} className="tick" textAnchor="end" dominantBaseline="middle">{compact(t, 1)}</text>
            </g>
          ))}
          {path.map((p, i) => (i % Math.ceil(n / 8) === 0 || i === n - 1) && (
            <text key={p.year} x={x(i)} y={h - 8} className="tick" textAnchor="middle">{p.year === 0 ? 'Now' : `Yr ${p.year}`}</text>
          ))}
          <line x1={m.l} x2={w - m.r} y1={targetY} y2={targetY} className="fi-target-line" />
          <text x={w - m.r} y={targetY - 6} className="tick" textAnchor="end">FI number · {compact(target)}</text>
          <path d={line} className="line-req" style={{ fill: 'none' }} />
          {crossI >= 0 && <circle cx={x(crossI)} cy={y(path[crossI].corpus)} r={5} className="end-dot req" />}
        </svg>
      )}
    </div>
  );
}

export function FinancialFreedom() {
  const { calc, state: s } = useStore();
  const [corpus, setCorpus] = useState(500000);
  const [withdrawalPct, setWithdrawalPct] = useState(FI_DEFAULTS.withdrawalPct);
  const [returnPct, setReturnPct] = useState(FI_DEFAULTS.returnPct);
  const [inflationPct, setInflationPct] = useState(FI_DEFAULTS.inflationPct);
  const savingsLine = calc.lines.find((l) => l.id === 'savingsGoal' || l.id === 'sip')?.value ?? 0;
  const [monthlySavings, setMonthlySavings] = useState(Math.round(savingsLine));
  const annualExpenses = Math.round((calc.spend + calc.buffer) * 12);

  const result = useMemo(
    () => financialFreedom({ annualExpenses, withdrawalPct, currentCorpus: corpus, monthlySavings, returnPct, inflationPct }),
    [annualExpenses, withdrawalPct, corpus, monthlySavings, returnPct, inflationPct],
  );
  const recRate = recommendedSavingsRate(s.age);
  const actualRate = calc.need > 0 ? monthlySavings / (calc.spend + calc.buffer + monthlySavings) : 0;

  return (
    <div className="tool">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Your financial-freedom number</h3>
            <p className="card-sub">The corpus that lets your investments cover your lifestyle forever, at a safe withdrawal rate</p>
          </div>
        </header>
        <div className="fi-hero">
          <span className="fi-label">You're financially free with</span>
          <AnimatedNumber className="fi-num" value={result.targetCorpus} format={(v) => `₹${lpa(v)} ${v >= 1e7 ? 'Cr' : 'L'}`} />
          <span className="fi-sub">
            {result.yearsToFi === null ? 'Not reachable within 60 years at this rate — raise savings or returns.' : result.yearsToFi === 0 ? "You're already there." : `≈ ${result.yearsToFi} years away at this savings rate`}
          </span>
        </div>
        <FiChart path={result.path} target={result.targetCorpus} />
        <div className="readout fi-readout">
          <span className="readout-label">Annual expenses, from your salary plan</span>
          <span className="readout-val"><b>{rupees(annualExpenses)}</b>/yr</span>
        </div>
        <div className="grid-2">
          <Slider id="fi-withdrawal" label="Safe withdrawal rate" hint="4% is the classic FIRE rule of thumb" value={withdrawalPct} min={2} max={6} step={0.25} unit="rate" onChange={setWithdrawalPct} />
          <Slider id="fi-corpus" label="Investments you already have" value={corpus} max={50000000} step={10000} unit="rupee" curve={2.2} onChange={setCorpus} />
          <Slider id="fi-savings" label="You can invest, per month" value={monthlySavings} max={500000} step={500} unit="rupee" curve={2} onChange={setMonthlySavings} />
          <Slider id="fi-return" label="Expected annual return" value={returnPct} min={4} max={14} step={0.5} unit="rate" onChange={setReturnPct} />
          <Slider id="fi-inflation" label="Inflation assumed" value={inflationPct} min={2} max={10} step={0.5} unit="rate" onChange={setInflationPct} />
        </div>
      </article>

      <article className="card">
        <h3 className="card-title">Savings-rate check</h3>
        <p className="card-sub">How your rate compares with a common by-decade guideline</p>
        <div className="sr-gauge">
          <div className="sr-track">
            <motion.div className="sr-fill" initial={false} animate={{ width: `${Math.min(100, actualRate * 200)}%` }} transition={{ duration: 0.5 }} />
            <div className="sr-marker" style={{ left: `${Math.min(100, recRate * 200)}%` }} />
          </div>
          <div className="sr-labels">
            <span>You save {pct(actualRate)}</span>
            <span>Guideline for your age: {pct(recRate)}+</span>
          </div>
        </div>
        <p className="note">
          {actualRate >= recRate
            ? 'You’re at or above the typical guideline for your age — keep it up.'
            : `Reaching ${pct(recRate)} would mean investing about ${compact((recRate - actualRate) * (calc.spend + calc.buffer) / (1 - recRate))} more a month.`}
        </p>
      </article>
    </div>
  );
}
