import { useMemo, useState } from 'react';
import { compact, pct } from '../lib/format';
import { emergencyFundPlan } from '../lib/tools';
import { useStore } from './store';
import { AnimatedNumber, Slider, Stepper } from './ui';

export function EmergencyFund() {
  const { calc } = useStore();
  const essentialDefault = Math.round(calc.needBare);
  const [essential, setEssential] = useState(essentialDefault);
  const [months, setMonths] = useState(6);
  const [current, setCurrent] = useState(0);
  const [monthly, setMonthly] = useState(Math.round(essentialDefault * 0.1));

  const result = useMemo(() => emergencyFundPlan(essential, months, current, monthly), [essential, months, current, monthly]);
  const progress = result.target > 0 ? Math.min(1, current / result.target) : 0;

  return (
    <div className="tool">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Your safety net</h3>
            <p className="card-sub">Enough to cover a job loss, a medical bill or a broken car — without touching a credit card</p>
          </div>
        </header>
        <div className="ef-hero">
          <span className="ef-label">Target</span>
          <AnimatedNumber className="ef-num" value={result.target} format={compact} />
          <span className="ef-sub">{months} months of essential spending</span>
        </div>
        <div className="ef-bar" aria-label="Progress toward emergency fund target">
          <div className="ef-bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="note">{compact(current)} saved so far · {pct(progress)} of target</p>

        <Slider id="ef-essential" label="Essential monthly spending" hint="Rent, food, bills, EMIs, insurance — prefilled from your plan" value={essential} max={essentialDefault * 3 || 200000} step={500} unit="rupee" onChange={setEssential} />
        <Stepper id="ef-months" label="Months of cover you want" value={months} min={3} max={12} onChange={setMonths} />
        <Slider id="ef-current" label="Already saved for this" value={current} max={Math.max(result.target * 1.5, 500000)} step={1000} unit="rupee" curve={1.6} onChange={setCurrent} />
        <Slider id="ef-monthly" label="You can add, per month" value={monthly} max={200000} step={500} unit="rupee" onChange={setMonthly} />

        <div className="verdict tone-info">
          <p className="verdict-title">
            {result.shortfall === 0
              ? "You're fully covered"
              : result.monthsToTarget === null
                ? 'Add a monthly contribution to see when you\'ll get there'
                : `${compact(result.shortfall)} short · ${result.monthsToTarget} month${result.monthsToTarget === 1 ? '' : 's'} to close it`}
          </p>
          <p className="verdict-body">Keep this in a liquid fund or a sweep-in FD — instant access matters more than the last bit of return.</p>
        </div>
      </article>
    </div>
  );
}
