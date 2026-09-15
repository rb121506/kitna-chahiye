import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { CITY_BY_ID, GROUP_META, GROUP_ORDER, STATES } from '../lib/cities';
import { computeCity, estRent } from '../lib/engine';
import { compact, lpa, lpaUnit, pct, roundTo, rupees } from '../lib/format';
import { CityPicker } from './CityPicker';
import { useStore } from './store';
import { AnimatedNumber } from './ui';

export function Compare() {
  const { state: s, update, calc, home } = useStore();
  const others = s.compare.filter((id) => id !== home.id && CITY_BY_ID[id]).slice(0, 3);
  const key = others.join(',');
  const calcs = useMemo(
    () => [calc, ...others.map((id) => computeCity(s, CITY_BY_ID[id], home))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, calc, home, key],
  );
  const base = calc.solved.best.ctc;
  const maxGroup = Math.max(...calcs.flatMap((c) => GROUP_ORDER.map((g) => c.groups[g])));
  const renting = s.housing.type === 'rent' || s.housing.type === 'pg';

  return (
    <div className="cmp">
      <div className="cmp-bar">
        <p className="card-sub">Same life, re-priced. Rent, help wages, school fees, fuel, power tariffs and taxes change; EMIs, subscriptions and your insurance stay put.</p>
        {others.length < 3 && (
          <CityPicker
            id="cmp-add"
            variant="add"
            value={null}
            placeholder="Add a city"
            exclude={[home.id, ...others]}
            onChange={(id) => update((d) => { d.compare = [...d.compare.filter((x) => x !== id), id]; })}
            ariaLabel="Add a city to compare"
          />
        )}
      </div>
      <div className="cmp-grid" style={{ ['--cols' as string]: calcs.length }}>
        <AnimatePresence initial={false} mode="popLayout">
          {calcs.map((c, i) => {
            const isHome = i === 0;
            const ctc = c.solved.best.ctc;
            const delta = (ctc - base) / base;
            const st = STATES[c.city.state];
            const override = isHome ? s.housing.customRent : s.rentOverrides[c.city.id];
            return (
              <motion.article
                key={c.city.id}
                layout
                className={`card cmp-col${isHome ? ' is-home' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
              >
                <header className="cmp-head">
                  <div>
                    <p className="eyebrow">{isHome ? 'Your city' : `Tier ${c.city.tier} · ${c.city.region}`}</p>
                    <h3 className="cmp-name">{c.city.name}</h3>
                    <p className="card-sub">{st.name}</p>
                  </div>
                  {!isHome && (
                    <button type="button" className="icon-x" aria-label={`Remove ${c.city.name}`} onClick={() => update((d) => { d.compare = d.compare.filter((x) => x !== c.city.id); })}>×</button>
                  )}
                </header>
                <div className="cmp-lpa">
                  <AnimatedNumber key={lpaUnit(ctc)} value={ctc} format={(v) => `₹${lpa(v)}`} className="cmp-big" />
                  <span className="cmp-unit">{lpaUnit(ctc) === 'Cr' ? 'Cr' : 'L'} / yr</span>
                </div>
                <p className="cmp-sub">
                  {rupees(c.need)}/mo in hand
                  {!isHome && (
                    <span className={`delta ${delta <= 0 ? 'is-down' : 'is-up'}`}>
                      {delta <= 0 ? '▼' : '▲'} {pct(Math.abs(delta))} · {compact(Math.abs(ctc - base))}
                    </span>
                  )}
                </p>
                <ul className="cmp-rows">
                  {GROUP_ORDER.filter((g) => calcs.some((x) => x.groups[g] > 0.5)).map((g) => {
                    const v = c.groups[g];
                    const d = v - calc.groups[g];
                    return (
                      <li key={g} className="cmp-row">
                        <span className="cmp-label"><i className={`bd-swatch${g === 'savings' ? ' is-hatch' : ''}`} style={{ background: g === 'savings' ? undefined : `var(--g-${g})` }} />{GROUP_META[g].short}</span>
                        <span className="cmp-track" aria-hidden="true">
                          <motion.span className={g === 'savings' ? 'is-hatch' : ''} style={{ background: g === 'savings' ? undefined : `var(--g-${g})` }} initial={false} animate={{ width: `${(v / maxGroup) * 100}%` }} transition={{ duration: 0.5 }} />
                        </span>
                        <span className="num">{compact(v)}</span>
                        {!isHome && <span className={`num cmp-d ${Math.abs(d) < 250 ? '' : d < 0 ? 'is-down' : 'is-up'}`}>{Math.abs(d) < 250 ? '—' : `${d < 0 ? '−' : '+'}${compact(Math.abs(d), 1).replace('₹', '')}`}</span>}
                      </li>
                    );
                  })}
                </ul>
                {renting && (
                  <label className="rent-edit" htmlFor={`rent-${c.city.id}`}>
                    <span>Rent you found</span>
                    <span className="rent-input">
                      <span>₹</span>
                      <input
                        id={`rent-${c.city.id}`}
                        inputMode="numeric"
                        placeholder={roundTo(estRent(s, c.city), 500).toLocaleString('en-IN')}
                        value={override != null ? String(override) : ''}
                        onChange={(e) => {
                          const n = Number(e.target.value.replace(/\D/g, ''));
                          update((d) => {
                            if (isHome) d.housing.customRent = n || null;
                            else if (n) d.rentOverrides[c.city.id] = n;
                            else delete d.rentOverrides[c.city.id];
                          });
                        }}
                      />
                    </span>
                  </label>
                )}
                <dl className="cmp-facts">
                  <div><dt>Rent</dt><dd>{rupees(c.rent)}</dd></div>
                  {c.upfront > 0 && <div><dt>Upfront to move in</dt><dd>{compact(c.upfront)}</dd></div>}
                  <div><dt>Deposit norm</dt><dd>{c.city.deposit} mo</dd></div>
                  <div><dt>Petrol</dt><dd>₹{c.city.petrol.toFixed(2)}</dd></div>
                  <div><dt>Prof. tax</dt><dd>{st.pt ? `₹${st.pt.toLocaleString('en-IN')}/yr` : 'None'}</dd></div>
                  <div><dt>HRA rate</dt><dd>{c.city.hraMetro ? '50% metro' : '40%'}</dd></div>
                  <div><dt>Data</dt><dd>{c.city.quality === 'survey' ? 'Surveyed' : 'Modelled'}</dd></div>
                </dl>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
