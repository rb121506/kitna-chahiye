import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { DEBT_STRATEGY_META, type DebtStrategy } from '../lib/constants';
import { compact, rupees } from '../lib/format';
import { newDebt, simulatePayoff, type Debt } from '../lib/tools';
import { loadDebts, saveDebts } from '../lib/toolsStorage';
import { AnimatedNumber, Segmented, Slider } from './ui';

function years(months: number): string {
  if (months <= 0) return 'paid off';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || '< 1 mo';
}

export function DebtPayoff() {
  const [debts, setDebts] = useState<Debt[]>(loadDebts);
  const [strategy, setStrategy] = useState<DebtStrategy>('avalanche');
  const [extra, setExtra] = useState(0);

  const persist = (next: Debt[]) => {
    setDebts(next);
    saveDebts(next);
  };
  const update = (id: string, patch: Partial<Debt>) => persist(debts.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const withExtra = useMemo(() => simulatePayoff(debts, strategy, extra), [debts, strategy, extra]);
  const noExtra = useMemo(() => simulatePayoff(debts, strategy, 0), [debts, strategy]);
  const monthsSaved = noExtra.months - withExtra.months;
  const interestSaved = noExtra.totalInterest - withExtra.totalInterest;
  const totalEmi = debts.reduce((t, d) => t + (d.principal > 0 ? d.emi : 0), 0);

  return (
    <div className="tool">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Your debts</h3>
            <p className="card-sub">Add every loan and card balance you're carrying</p>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => persist([...debts, newDebt()])}>+ Add debt</button>
        </header>
        <AnimatePresence initial={false}>
          {debts.map((d) => (
            <motion.div key={d.id} className="debt-row" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
              <div className="debt-inner">
                <div className="debt-top">
                  <input
                    id={`debt-name-${d.id}`}
                    className="debt-name"
                    value={d.name}
                    onChange={(e) => update(d.id, { name: e.target.value })}
                    aria-label="Debt name"
                  />
                  <button type="button" className="icon-x" aria-label={`Remove ${d.name}`} onClick={() => persist(debts.filter((x) => x.id !== d.id))}>×</button>
                </div>
                <div className="grid-3">
                  <Slider id={`debt-principal-${d.id}`} label="Balance owed" value={d.principal} max={20000000} step={5000} unit="rupee" curve={2.2} onChange={(v) => update(d.id, { principal: v })} />
                  <Slider id={`debt-rate-${d.id}`} label="Interest rate" value={d.ratePct} min={0} max={42} step={0.25} unit="rate" onChange={(v) => update(d.id, { ratePct: v })} />
                  <Slider id={`debt-emi-${d.id}`} label="EMI you pay" value={d.emi} max={500000} step={500} unit="rupee" onChange={(v) => update(d.id, { emi: v })} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {debts.length === 0 && <p className="note">No debts added — you're clear!</p>}
      </article>

      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="card-title">Pay it off faster</h3>
            <p className="card-sub">Every EMI keeps running as normal — extra money rolls onto one debt at a time</p>
          </div>
        </header>
        <Segmented<DebtStrategy>
          id="strategy"
          ariaLabel="Payoff strategy"
          value={strategy}
          options={(['avalanche', 'snowball'] as DebtStrategy[]).map((k) => ({ value: k, label: DEBT_STRATEGY_META[k].label, hint: DEBT_STRATEGY_META[k].blurb }))}
          onChange={setStrategy}
        />
        <Slider id="extra" label="Extra you can put in each month" value={extra} max={200000} step={500} unit="rupee" curve={1.6} onChange={setExtra} />
        <div className="grid-3">
          <div className="stat">
            <span className="stat-label">Debt-free in</span>
            <span className="stat-val">{years(withExtra.months)}</span>
            {monthsSaved > 0 && <span className="stat-sub is-pos">{years(monthsSaved)} sooner</span>}
          </div>
          <div className="stat">
            <span className="stat-label">Total interest</span>
            <AnimatedNumber className="stat-val" value={withExtra.totalInterest} format={compact} />
            {interestSaved > 500 && <span className="stat-sub is-pos">{compact(interestSaved)} saved</span>}
          </div>
          <div className="stat">
            <span className="stat-label">EMIs today</span>
            <AnimatedNumber className="stat-val" value={totalEmi} format={rupees} />
            <span className="stat-sub">/month, before any extra</span>
          </div>
        </div>
        {withExtra.rows.length > 0 && (
          <ol className="payoff-order">
            {[...withExtra.rows].sort((a, b) => a.months - b.months).map((r, i) => (
              <li key={r.id}><span>{i + 1}. {r.name}</span><span>gone in {years(r.months)}</span></li>
            ))}
          </ol>
        )}
      </article>
    </div>
  );
}
