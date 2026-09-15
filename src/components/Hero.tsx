import { compact, lpa, lpaUnit, rupees } from '../lib/format';
import { LIFESTYLE_META } from '../lib/constants';
import { CityPicker } from './CityPicker';
import { Guilloche } from './Guilloche';
import { useStore } from './store';
import { AnimatedNumber } from './ui';

export function Hero() {
  const { state: s, update, calc } = useStore();
  const best = calc.solved.best;
  const other = best.regime === 'new' ? calc.solved.oldSlip : calc.solved.newSlip;
  const regimeGap = other.ctc - best.ctc;
  const bare = calc.bare?.best ?? best;
  const unit = lpaUnit(best.ctc);

  return (
    <section className="hero" id="hero" aria-labelledby="hero-title">
      <div className="hero-art" aria-hidden="true">
        <Guilloche seed={best.ctc} className="hero-rosette" />
      </div>
      <div className="hero-copy">
        <p className="eyebrow">Tax year 2026-27 · prices checked Sep 2026</p>
        <div id="hero-title" className="hero-q" role="heading" aria-level={1}>
          To live {s.lifestyle === 'essentials' ? 'simply' : `a ${LIFESTYLE_META[s.lifestyle].label.toLowerCase()} life`} in{' '}
          <CityPicker id="hero-city" variant="inline" value={s.cityId} onChange={(id) => update((d) => { d.cityId = id; })} ariaLabel="Change city" />{' '}
          you need a CTC of
        </div>
        <div className="hero-num" aria-live="polite">
          <span className="rupee">₹</span>
          <AnimatedNumber key={unit} className="big" value={best.ctc} format={lpa} />
          <span className="hero-unit">
            {unit === 'Cr' ? 'Cr' : 'lakh'}
            <small>a year</small>
          </span>
        </div>
        <p className="hero-sub">
          <AnimatedNumber className="strong" value={best.inHandMonthly} format={rupees} /> in hand every month
          <span className="regime-chip">
            {best.regime === 'new' ? 'New regime' : 'Old regime'}
            {s.salary.regime === 'auto' && regimeGap >= 5000 && <em> · {compact(regimeGap)} less CTC than {other.regime}</em>}
          </span>
        </p>
        <dl className="hero-stats">
          <div>
            <dt>Just to cover expenses</dt>
            <dd><AnimatedNumber key={lpaUnit(bare.ctc)} value={bare.ctc} format={(v) => `₹${lpa(v)} ${lpaUnit(v)}`} /></dd>
          </div>
          <div>
            <dt>You spend</dt>
            <dd><AnimatedNumber value={calc.spend + calc.buffer} format={compact} /><small>/mo</small></dd>
          </div>
          <div>
            <dt>Income tax</dt>
            <dd><AnimatedNumber value={best.tax} format={compact} /><small>/yr</small></dd>
          </div>
          <div>
            <dt>Into your EPF</dt>
            <dd><AnimatedNumber value={best.employeePF + best.employerPF} format={compact} /><small>/yr</small></dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
