import { motion } from 'motion/react';
import { useMemo } from 'react';
import { CITY_BY_ID } from '../lib/cities';
import { LIFESTYLE_META } from '../lib/constants';
import { applyPreset, computeCity, salaryCfg } from '../lib/engine';
import { compact, lpaFull, pct, rupees } from '../lib/format';
import { solveBoth, takeHome } from '../lib/tax';
import { LIFESTYLES } from '../lib/types';
import { useStore } from './store';
import { AnimatedNumber, Slider } from './ui';

export function Offer() {
  const { state: s, update, calc, all, home } = useStore();
  const cfg = salaryCfg(s);
  const lpaVal = s.offerLpa ?? Math.round(calc.solved.best.ctc / 1e5);
  const ctc = lpaVal * 1e5;
  const th = takeHome(ctc, cfg, calc.ctx, s.salary.regime);
  const inHand = th.best.inHandMonthly;
  const spend = calc.spend + calc.buffer;
  const surplus = inHand - calc.need;
  const leftAfterSpend = inHand - spend;
  const saveRate = inHand > 0 ? leftAfterSpend / inHand : 0;
  const verdict = surplus >= 0
    ? { tone: 'good', title: 'Covers your life and your savings goal', body: `${compact(surplus)} a month to spare after saving ${Math.round(s.savings.rate * 100)}%.` }
    : leftAfterSpend >= 0
      ? { tone: 'watch', title: 'Covers expenses, not the full savings goal', body: `You'd save ${pct(saveRate)} of take-home instead of your target. You're ${compact(-surplus)}/month short.` }
      : { tone: 'high', title: 'Falls short of your expenses', body: `${compact(-leftAfterSpend)} a month more going out than coming in. Negotiate, or trim the biggest categories.` };

  const scale = Math.max(inHand, calc.need, 1);
  const bars = [
    { key: 'spend', label: 'Spending', v: Math.min(spend, inHand), cls: 'is-spend' },
    { key: 'save', label: 'Saving', v: Math.max(0, Math.min(inHand - spend, calc.need - spend)), cls: 'is-save' },
    { key: 'spare', label: surplus >= 0 ? 'Spare' : 'Short', v: Math.abs(surplus), cls: surplus >= 0 ? 'is-spare' : 'is-short' },
  ];

  const byCity = useMemo(() => all.map((c) => ({ c, left: takeHome(ctc, cfg, c.ctx, s.salary.regime).best.inHandMonthly - c.need }))
    .sort((a, b) => b.left - a.left), [all, ctc, cfg, s.salary.regime]);
  const lifestyleFit = useMemo(
    () => LIFESTYLES.map((l) => {
      const presetState = applyPreset(s, l, true);
      const presetCalc = computeCity(presetState, home, home);
      return { lifestyle: l, ctc: presetCalc.solved.best.ctc, fits: presetCalc.solved.best.ctc <= ctc };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.cityId, s.adults, s.seniors, s.children, s.age, home, ctc],
  );

  const equivalents = useMemo(() => {
    const ratio = inHand / calc.need;
    return s.compare.filter((id) => id !== home.id && CITY_BY_ID[id]).slice(0, 3).map((id) => {
      const c = computeCity(s, CITY_BY_ID[id], home);
      return { city: c.city, ctc: solveBoth(c.need * ratio, cfg, c.ctx, s.salary.regime).best.ctc };
    });
  }, [s, home, calc.need, inHand, cfg]);

  return (
    <div className="off">
      <article className="card off-main">
        <header className="card-head">
          <div>
            <h3 className="card-title">Check an offer against your life</h3>
            <p className="card-sub">Uses your salary structure settings, {home.name} taxes and your expenses</p>
          </div>
        </header>
        <div className="off-input">
          <label htmlFor="offer-lpa" className="off-field">
            <span>₹</span>
            <input
              id="offer-lpa"
              inputMode="decimal"
              value={String(lpaVal)}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^\d.]/g, ''));
                update((d) => { d.offerLpa = Number.isFinite(n) && n > 0 ? n : null; });
              }}
            />
            <span>lakh CTC</span>
          </label>
          <Slider id="offer-slider" label="Drag to try other offers" value={lpaVal} min={1} max={300} step={0.5} unit="lakh" curve={2} onChange={(v) => update((d) => { d.offerLpa = v; })} />
        </div>

        <div className={`verdict tone-${verdict.tone}`}>
          <p className="verdict-title">{verdict.title}</p>
          <p className="verdict-body">{verdict.body}</p>
        </div>

        <div className="off-numbers">
          <div className="stat">
            <span className="stat-label">Take-home</span>
            <AnimatedNumber className="stat-val" value={inHand} format={rupees} />
            <span className="stat-sub">a month · {th.best.regime} regime</span>
          </div>
          <div className="stat">
            <span className="stat-label">You need</span>
            <AnimatedNumber className="stat-val" value={calc.need} format={rupees} />
            <span className="stat-sub">incl. {Math.round(s.savings.rate * 100)}% savings</span>
          </div>
          <div className="stat">
            <span className="stat-label">Covers</span>
            <span className="stat-val">{pct(inHand / calc.need)}</span>
            <span className="stat-sub">of your full plan</span>
          </div>
        </div>

        <div className="split" aria-label="How the take-home splits">
          {bars.filter((b) => b.v > 0).map((b) => (
            <motion.span key={b.key} className={`split-seg ${b.cls}`} initial={false} animate={{ width: `${(b.v / scale) * 100}%` }} transition={{ duration: 0.5 }}>
              <span className="split-label">{b.label} {compact(b.v)}</span>
            </motion.span>
          ))}
        </div>

        <table className="regimes">
          <thead>
            <tr><th scope="col" /><th scope="col">New regime</th><th scope="col">Old regime</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Taxable income</th><td>{compact(th.newSlip.taxable)}</td><td>{compact(th.oldSlip.taxable)}</td></tr>
            <tr><th scope="row">Income tax</th><td>{compact(th.newSlip.tax)}</td><td>{compact(th.oldSlip.tax)}</td></tr>
            <tr><th scope="row">Take-home / month</th><td className={th.best.regime === 'new' ? 'is-best' : ''}>{rupees(th.newSlip.inHandMonthly)}</td><td className={th.best.regime === 'old' ? 'is-best' : ''}>{rupees(th.oldSlip.inHandMonthly)}</td></tr>
          </tbody>
        </table>

        <div className="fit-block">
          <h4 className="fit-title">Which lifestyle does ₹{lpaVal} L buy in {home.name}?</h4>
          <ul className="fit-list">
            {lifestyleFit.map((f) => (
              <li key={f.lifestyle} className={f.fits ? 'is-fit' : 'is-short'}>
                <span className="fit-tag">{f.fits ? '✓' : '−'}</span>
                <span className="fit-name">{LIFESTYLE_META[f.lifestyle].label}</span>
                <span className="fit-need">needs ₹{lpaFull(f.ctc)}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>

      <div className="off-side">
        <article className="card">
          <h3 className="card-title">Where ₹{lpaVal} L goes furthest</h3>
          <p className="card-sub">Left over each month after your full plan</p>
          <ol className="far">
            {byCity.slice(0, 5).map(({ c, left }) => (
              <li key={c.city.id}><span>{c.city.name}</span><span className={`num ${left >= 0 ? 'is-pos' : 'is-neg'}`}>{left >= 0 ? '+' : '−'}{compact(Math.abs(left))}</span></li>
            ))}
          </ol>
          <p className="card-sub far-sub">Tightest</p>
          <ol className="far" start={all.length - 2}>
            {byCity.slice(-3).map(({ c, left }) => (
              <li key={c.city.id}><span>{c.city.name}</span><span className={`num ${left >= 0 ? 'is-pos' : 'is-neg'}`}>{left >= 0 ? '+' : '−'}{compact(Math.abs(left))}</span></li>
            ))}
          </ol>
        </article>
        {equivalents.length > 0 && (
          <article className="card">
            <h3 className="card-title">The same offer, elsewhere</h3>
            <p className="card-sub">CTC that leaves you equally well off</p>
            <ul className="equiv">
              <li><span>{home.name}</span><b>₹{lpaVal} L</b></li>
              {equivalents.map((e) => (
                <li key={e.city.id}><span>{e.city.name}</span><b>₹{lpaFull(e.ctc)}</b></li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </div>
  );
}
