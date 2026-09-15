import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { GROUP_META, GROUP_ORDER, STATES } from '../lib/cities';
import { compact, pct, rupees } from '../lib/format';
import { biggestExpense, biggestLevers, buildInsights, type Tone } from '../lib/insights';
import type { Slip } from '../lib/tax';
import type { Group } from '../lib/types';
import { useStore } from './store';
import { AnimatedNumber, Segmented } from './ui';

const TONE: Record<Tone, { label: string; icon: string }> = {
  high: { label: 'Stretch', icon: '▲' },
  watch: { label: 'Watch', icon: '!' },
  good: { label: 'Healthy', icon: '✓' },
  info: { label: 'Tip', icon: '→' },
};

function Donut({ groups, total, active, setActive, mult }: {
  groups: Record<Group, number>;
  total: number;
  active: Group | null;
  setActive: (g: Group | null) => void;
  mult: number;
}) {
  const size = 260;
  const r = 100;
  const sw = 30;
  const C = 2 * Math.PI * r;
  const gap = (2.5 / C) * 1000;
  let acc = 0;
  const segs = GROUP_ORDER.filter((g) => groups[g] > 0.5).map((g) => {
    const len = (groups[g] / total) * 1000;
    const seg = { g, dash: Math.max(0.1, len - gap), offset: -acc };
    acc += len;
    return seg;
  });
  const shown = active ? groups[active] : total;
  return (
    <div className="donut">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Where your take-home goes">
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" style={{ fill: 'var(--hatch-bg)' }} />
            <line x1="0" y1="0" x2="0" y2="7" style={{ stroke: 'var(--hatch-ink)' }} strokeWidth="3" />
          </pattern>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} style={{ fill: 'none', stroke: 'var(--surface-2)' }} strokeWidth={sw} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segs.map(({ g, dash, offset }) => (
            <motion.circle
              key={g}
              cx={size / 2}
              cy={size / 2}
              r={r}
              pathLength={1000}
              style={{ fill: 'none', stroke: g === 'savings' ? 'url(#hatch)' : `var(--g-${g})`, cursor: 'pointer' }}
              initial={false}
              animate={{
                strokeDasharray: `${dash} ${1000 - dash}`,
                strokeDashoffset: offset,
                strokeWidth: active === g ? sw + 8 : sw,
                opacity: active && active !== g ? 0.3 : 1,
              }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setActive(g)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </g>
      </svg>
      <div className="donut-center">
        <span className="dc-label">{active ? GROUP_META[active].label : mult === 1 ? 'Take-home needed' : 'Needed a year'}</span>
        <AnimatedNumber className="dc-val" value={shown * mult} format={compact} />
        <span className="dc-sub">{active ? pct(groups[active] / total) : mult === 1 ? 'every month' : 'after tax'}</span>
      </div>
    </div>
  );
}

function Payslip({ slips, cityName, recommended }: { slips: { new: Slip; old: Slip }; cityName: string; recommended: 'new' | 'old' }) {
  const [view, setView] = useState<'new' | 'old'>(recommended);
  const slip = slips[view];
  const m = (v: number) => rupees(v / 12);
  const gross = slip.basic + slip.hra + slip.special;
  return (
    <article className="card slip">
      <div className="slip-perf" aria-hidden="true" />
      <header className="slip-head">
        <div>
          <p className="eyebrow">Pay slip · illustrative</p>
          <h3 className="card-title">What your monthly slip would show</h3>
          <p className="card-sub">At the required CTC in {cityName}</p>
        </div>
        <Segmented
          id="slip-regime"
          size="sm"
          stretch={false}
          ariaLabel="Tax regime for slip"
          value={view}
          options={[
            { value: 'new', label: <>New{recommended === 'new' && <i className="rec-dot" aria-label="recommended" />}</> },
            { value: 'old', label: <>Old{recommended === 'old' && <i className="rec-dot" aria-label="recommended" />}</> },
          ]}
          onChange={setView}
        />
      </header>
      <div className="slip-cols">
        <div className="slip-col">
          <p className="slip-sec">Earnings</p>
          <Row label="Basic" value={m(slip.basic)} />
          <Row label="House rent allowance" value={m(slip.hra)} />
          <Row label="Special allowance" value={m(slip.special)} />
          <Row label="Gross pay" value={m(gross)} strong />
          {slip.variable > 0 && <Row label="Variable pay (yearly)" value={rupees(slip.variable)} muted />}
        </div>
        <div className="slip-col">
          <p className="slip-sec">Deductions</p>
          <Row label="Provident fund" value={m(slip.employeePF)} />
          <Row label="Professional tax" value={m(slip.pt)} />
          <Row label="Income tax (TDS)" value={m(slip.tax * (slip.grossCash ? (slip.grossCash - slip.variable) / slip.grossCash : 1))} />
          <Row label="Total deductions" value={m(slip.employeePF + slip.pt + slip.tax * (slip.grossCash ? (slip.grossCash - slip.variable) / slip.grossCash : 1))} strong />
        </div>
      </div>
      <div className="slip-net">
        <span>Net take-home</span>
        <AnimatedNumber value={slip.inHandMonthly} format={rupees} className="slip-net-val" />
      </div>
      <div className="slip-foot">
        <span>Employer also pays PF {m(slip.employerPF)}{slip.gratuity ? ` · gratuity ${m(slip.gratuity)}` : ''}{slip.employerNPS ? ` · NPS ${m(slip.employerNPS)}` : ''}</span>
        <span>CTC {rupees(slip.ctc)}/yr · taxable {compact(slip.taxable)}</span>
      </div>
    </article>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`slip-row${strong ? ' is-strong' : ''}${muted ? ' is-muted' : ''}`}>
      <span>{label}</span>
      <span className="leader" aria-hidden="true" />
      <span className="num">{value}</span>
    </div>
  );
}

export function Overview() {
  const { state: s, calc, all, home } = useStore();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [active, setActive] = useState<Group | null>(null);
  const [open, setOpen] = useState<Group | null>(null);
  const mult = period === 'month' ? 1 : 12;
  const total = calc.need;
  const groups = GROUP_ORDER.filter((g) => calc.groups[g] > 0.5);
  const maxG = Math.max(...groups.map((g) => calc.groups[g]));
  const insights = useMemo(() => buildInsights(s, calc, all), [s, calc, all]);
  const biggest = useMemo(() => biggestExpense(calc), [calc]);
  const levers = useMemo(() => biggestLevers(s, calc, home, 2), [s, calc, home]);

  return (
    <div className="ov">
      {(biggest || levers.length > 0) && (
        <div className="lever-row">
          {biggest && (
            <article className="card lever-card">
              <p className="eyebrow">Biggest expense</p>
              <p className="lever-title">{biggest.label}</p>
              <p className="lever-num">{rupees(biggest.value)}<small>/mo</small></p>
              <p className="lever-body">{pct(biggest.value / calc.need)} of your required take-home goes here.</p>
            </article>
          )}
          {levers.map((lv) => (
            <article key={lv.id} className="card lever-card is-action">
              <p className="eyebrow">Biggest lever</p>
              <p className="lever-title">{lv.cutLabel}</p>
              <p className="lever-num">−{compact(lv.ctcDrop)}<small>/yr CTC</small></p>
              <p className="lever-body">Cutting {lv.label.toLowerCase()} by {compact(lv.monthlySave)}/mo drops your required CTC by {compact(lv.ctcDrop)} a year.</p>
            </article>
          ))}
        </div>
      )}
      <article className="card bd-card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Where the money goes</h3>
            <p className="card-sub">{home.name} · {STATES[home.state].name} · tap a row to see every line</p>
          </div>
          <Segmented id="period" size="sm" stretch={false} ariaLabel="Period" value={period} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} onChange={setPeriod} />
        </header>
        <div className="bd-body">
          <Donut groups={calc.groups} total={total} active={active} setActive={setActive} mult={mult} />
          <ul className="bd-list">
            {groups.map((g) => {
              const v = calc.groups[g];
              const lines = calc.lines.filter((l) => l.group === g).sort((a, b) => b.value - a.value);
              return (
                <li key={g} className={active === g ? 'is-active' : ''} onMouseEnter={() => setActive(g)} onMouseLeave={() => setActive(null)}>
                  <button id={`bd-${g}`} type="button" className="bd-row" aria-expanded={open === g} onClick={() => setOpen(open === g ? null : g)} onFocus={() => setActive(g)} onBlur={() => setActive(null)}>
                    <span className={`bd-swatch${g === 'savings' ? ' is-hatch' : ''}`} style={{ background: g === 'savings' ? undefined : `var(--g-${g})` }} />
                    <span className="bd-name">{GROUP_META[g].label}</span>
                    <span className="bd-bar" aria-hidden="true">
                      <motion.span
                        className={g === 'savings' ? 'is-hatch' : ''}
                        style={{ background: g === 'savings' ? undefined : `var(--g-${g})` }}
                        initial={false}
                        animate={{ width: `${(v / maxG) * 100}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </span>
                    <span className="bd-pct">{pct(v / total)}</span>
                    <AnimatedNumber key={period} className="bd-val" value={v * mult} format={compact} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open === g && (
                      <motion.ul className="bd-lines" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                        {lines.map((l) => (
                          <li key={l.id}>
                            <span>{l.label}</span>
                            <span className="num">{rupees(l.value * mult)}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </article>

      <div className="ov-row">
        <article className="card ins-card">
          <header className="card-head">
            <div>
              <h3 className="card-title">What stands out</h3>
              <p className="card-sub">Updates as you change anything</p>
            </div>
          </header>
          <ul className="ins-list">
            <AnimatePresence initial={false} mode="popLayout">
              {insights.map((x) => (
                <motion.li
                  key={x.id}
                  layout
                  className={`ins tone-${x.tone}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="ins-tone"><i aria-hidden="true">{TONE[x.tone].icon}</i>{TONE[x.tone].label}</span>
                  <div>
                    <p className="ins-title">{x.title}</p>
                    <p className="ins-body">{x.body}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </article>
        <Payslip slips={{ new: calc.solved.newSlip, old: calc.solved.oldSlip }} cityName={home.name} recommended={calc.solved.newSlip.ctc <= calc.solved.oldSlip.ctc ? 'new' : 'old'} />
      </div>
    </div>
  );
}
