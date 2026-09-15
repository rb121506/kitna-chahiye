import { useMemo, useState } from 'react';
import { salaryCfg } from '../lib/engine';
import { compact, pct, rupees } from '../lib/format';
import { solveBoth } from '../lib/tax';
import { useStore } from './store';
import { AnimatedNumber, Segmented, Slider } from './ui';

type Asset = 'house' | 'car' | 'other';
const ASSET_LABEL: Record<Asset, string> = { house: 'A house', car: 'A car', other: 'Something else' };
const ASSET_RATE: Record<Asset, number> = { house: 8.25, car: 9.5, other: 12 };
const ASSET_TENURE: Record<Asset, number> = { house: 20, car: 7, other: 5 };

export function CanIAfford() {
  const { state: s, calc, household } = useStore();
  const [asset, setAsset] = useState<Asset>('house');
  const [price, setPrice] = useState(6000000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(ASSET_RATE.house);
  const [tenure, setTenure] = useState(ASSET_TENURE.house);

  const pick = (a: Asset) => {
    setAsset(a);
    setRate(ASSET_RATE[a]);
    setTenure(ASSET_TENURE[a]);
    setDownPct(a === 'house' ? 20 : a === 'car' ? 15 : 30);
  };

  const loan = price * (1 - downPct / 100);
  const down = price - loan;
  const r = rate / 1200;
  const n = tenure * 12;
  const emi = r ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n;
  const totalPaid = emi * n;

  const takeHome = household.combinedTakeHome;
  const currentEmiRatio = takeHome > 0 ? calc.emis / takeHome : 0;
  const newEmiRatio = takeHome > 0 ? (calc.emis + emi) / takeHome : 0;

  const impact = useMemo(() => {
    const grossed = s.savings.mode === 'rate' ? emi / (1 - s.savings.rate) : emi;
    const newNeed = calc.need + grossed;
    const solved = solveBoth(newNeed, salaryCfg(s), calc.ctx, s.salary.regime);
    return solved.best.ctc - calc.solved.best.ctc;
  }, [s, calc, emi]);

  const verdict = newEmiRatio <= 0.35
    ? { tone: 'good', title: 'Comfortably affordable', body: 'Total EMIs would stay under 35% of take-home — the safe zone most planners recommend.' }
    : newEmiRatio <= 0.5
      ? { tone: 'watch', title: 'Doable, but tight', body: 'Total EMIs would sit between 35–50% of take-home. Banks will likely still approve it, but it leaves less room to save.' }
      : { tone: 'high', title: 'A stretch at your current income', body: 'Total EMIs would cross 50% of take-home — most lenders cap eligibility around here, and it would squeeze your other goals hard.' };

  return (
    <div className="tool">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Can you afford it?</h3>
            <p className="card-sub">Checks the EMI against your household's take-home and your salary plan</p>
          </div>
        </header>
        <Segmented<Asset> id="asset" ariaLabel="What you're buying" value={asset} options={(['house', 'car', 'other'] as Asset[]).map((a) => ({ value: a, label: ASSET_LABEL[a] }))} onChange={pick} />
        <div className="grid-2">
          <Slider id="afford-price" label="Price" value={price} max={100000000} step={10000} unit="rupee" curve={2.4} onChange={setPrice} />
          <Slider id="afford-down" label="Down payment" value={downPct} min={0} max={90} step={1} unit="pct" onChange={setDownPct} />
          <Slider id="afford-rate" label="Interest rate" value={rate} min={4} max={24} step={0.05} unit="rate" onChange={setRate} />
          <Slider id="afford-tenure" label="Loan tenure" value={tenure} min={1} max={30} step={1} unit="years" onChange={setTenure} />
        </div>

        <div className="off-numbers">
          <div className="stat">
            <span className="stat-label">Monthly EMI</span>
            <AnimatedNumber className="stat-val" value={emi} format={rupees} />
            <span className="stat-sub">for {tenure} years</span>
          </div>
          <div className="stat">
            <span className="stat-label">Down payment</span>
            <AnimatedNumber className="stat-val" value={down} format={compact} />
            <span className="stat-sub">of {compact(price)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total interest</span>
            <AnimatedNumber className="stat-val" value={Math.max(0, totalPaid - loan)} format={compact} />
            <span className="stat-sub">over the loan</span>
          </div>
        </div>

        <div className={`verdict tone-${verdict.tone}`}>
          <p className="verdict-title">{verdict.title}</p>
          <p className="verdict-body">{verdict.body}</p>
        </div>

        <div className="readout">
          <span className="readout-label">EMI load: today → with this loan</span>
          <span className="readout-val"><b>{pct(currentEmiRatio)}</b> → <b>{pct(newEmiRatio)}</b> of take-home</span>
        </div>
        <div className="readout">
          <span className="readout-label">Extra CTC you'd need to keep your plan whole</span>
          <span className="readout-val"><b>{compact(impact)}</b>/yr</span>
        </div>
      </article>
    </div>
  );
}
