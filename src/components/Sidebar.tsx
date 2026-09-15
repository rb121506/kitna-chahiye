import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { LPG_DELHI, STATES } from '../lib/cities';
import {
  AGE_BANDS, AMOUNTS, LIFESTYLE_META, LOCALITY, SCHOOL_TYPES, SUBSCRIPTIONS, SUB_BY_ID, VEHICLES, pick,
} from '../lib/constants';
import { amountHome, applyPreset, estRent, helpEstimate, household, lvl } from '../lib/engine';
import { compact, roundTo, rupees } from '../lib/format';
import {
  LIFESTYLES, type AgeBand, type AmountId, type Group, type HousingType, type Locality, type SchoolType, type Vehicle,
} from '../lib/types';
import { CityPicker } from './CityPicker';
import { useStore } from './store';
import { AnimatedNumber, Field, InfoTip, Segmented, Slider, Stepper, Toggle } from './ui';

const IDS = {
  home: ['rent', 'pg', 'homeLoanEmi', 'familyContribution', 'maintenance', 'propertyTax', 'moveIn'],
  bills: ['electricity', 'cookingGas', 'water', 'broadband', 'mobile'],
  food: ['groceries', 'dining', 'delivery'],
  help: ['cleaning', 'cook', 'fullTime', 'nanny', 'driver', 'elderCare', 'laundry'],
  transport: ['fuel', 'vehicleUpkeep', 'parking', 'cabs', 'transit'],
  kids: ['schoolFees', 'schoolBus', 'daycare', 'babyEssentials', 'coaching', 'activities', 'college', 'collegeLiving'],
  health: ['healthInsurance', 'parentsInsurance', 'termInsurance', 'medicines', 'gym'],
  subs: ['subscriptions', 'otherSubs'],
  life: ['shopping', 'personalCare', 'entertainment', 'travel', 'festivals', 'gadgets', 'pets'],
  dues: ['carEmi', 'personalEmi', 'educationEmi', 'ccRepay', 'bnpl', 'familySupport', 'donations'],
  save: ['buffer', 'nps', 'emergencyFund', 'savingsGoal', 'sip'],
};

const EXCLUSIVE = new Set(['Netflix', 'JioHotstar', 'YouTube Premium', 'ChatGPT']);

function Section({
  id, title, group, total, summary, children, defaultOpen = false,
}: {
  id: string;
  title: string;
  group?: Group;
  total?: number;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`sec${open ? ' is-open' : ''}`}>
      <button id={`sec-${id}-head`} type="button" className="sec-head" aria-expanded={open} aria-controls={`sec-${id}`} onClick={() => setOpen((o) => !o)}>
        <span className="sec-dot" style={{ background: group ? `var(--g-${group})` : 'transparent', borderColor: group ? 'transparent' : 'var(--line-2)' }} />
        <span className="sec-text">
          <span className="sec-title">{title}</span>
          {summary && <span className="sec-summary">{summary}</span>}
        </span>
        {total !== undefined && <AnimatedNumber className="sec-total" value={total} format={(v) => compact(v)} />}
        <motion.span className="sec-chev" aria-hidden="true" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>⌄</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`sec-${id}`}
            className="sec-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="sec-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Readout({ label, children, tip }: { label: string; children: ReactNode; tip?: ReactNode }) {
  return (
    <div className="readout">
      <span className="readout-label">{label}{tip && <InfoTip>{tip}</InfoTip>}</span>
      <span className="readout-val">{children}</span>
    </div>
  );
}

function useAmountSlider() {
  const { state: s, update, home } = useStore();
  return (id: AmountId, extra: { label?: string; hint?: ReactNode; detail?: ReactNode } = {}) => {
    const def = AMOUNTS[id];
    return (
      <Slider
        key={id}
        id={`amt-${id}`}
        label={extra.label ?? def.label}
        hint={extra.hint ?? def.hint}
        detail={extra.detail}
        max={def.max}
        step={def.step}
        unit={def.yearly ? 'year' : def.count ? 'count' : 'month'}
        value={amountHome(id, s, home)}
        edited={s.amounts[id] !== undefined}
        onReset={() => update((d) => { delete d.amounts[id]; })}
        onChange={(v) => update((d) => { d.amounts[id] = v; })}
      />
    );
  };
}

function ChildrenEditor() {
  const { state: s, update } = useStore();
  const add = () =>
    update((d) => {
      d.children.push({ id: `k${Date.now().toString(36)}`, age: 'school', school: pick(lvl(d), ['budget', 'mid', 'premium', 'intl']) });
    }, { household: true });
  return (
    <div className="kids">
      <div className="kids-head">
        <span className="field-label"><span>Children</span>{s.children.length === 0 && <small>None added</small>}</span>
        <button id="add-child" type="button" className="btn btn-sm" onClick={add} disabled={s.children.length >= 4}>+ Add child</button>
      </div>
      <AnimatePresence initial={false}>
        {s.children.map((k, i) => (
          <motion.div
            key={k.id}
            className="child-row"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="child-inner">
              <div className="child-top">
                <span className="child-name">Child {i + 1}</span>
                <select
                  id={`school-${k.id}`}
                  className="select"
                  aria-label={`Child ${i + 1} ${k.age === 'infant' ? 'daycare' : k.age === 'college' ? 'college' : 'school'} type`}
                  value={k.school}
                  onChange={(e) => update((d) => { d.children[i].school = e.target.value as SchoolType; }, { touch: `child.${k.id}` })}
                >
                  {(Object.keys(SCHOOL_TYPES) as SchoolType[]).map((t) => (
                    <option key={t} value={t}>
                      {k.age === 'college' ? SCHOOL_TYPES[t].college : k.age === 'infant' ? `Daycare · ${SCHOOL_TYPES[t].label}` : SCHOOL_TYPES[t].label}
                    </option>
                  ))}
                </select>
                <button type="button" className="link-btn" onClick={() => update((d) => { d.children.splice(i, 1); }, { household: true })} aria-label={`Remove child ${i + 1}`}>
                  Remove
                </button>
              </div>
              <Segmented<AgeBand>
                id={`age-${k.id}`}
                size="sm"
                ariaLabel={`Child ${i + 1} age`}
                value={k.age}
                options={(Object.keys(AGE_BANDS) as AgeBand[]).map((a) => ({ value: a, label: AGE_BANDS[a] }))}
                onChange={(v) => update((d) => { d.children[i].age = v; }, { household: true })}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function SubChips() {
  const { state: s, update } = useStore();
  const toggle = (id: string) =>
    update((d) => {
      const item = SUB_BY_ID[id];
      if (d.subs.includes(id)) d.subs = d.subs.filter((x) => x !== id);
      else {
        if (EXCLUSIVE.has(item.name)) d.subs = d.subs.filter((x) => SUB_BY_ID[x]?.name !== item.name);
        d.subs.push(id);
      }
    }, { touch: 'subs' });
  return (
    <div className="chips">
      {SUBSCRIPTIONS.map((x) => {
        const on = s.subs.includes(x.id);
        return (
          <motion.button
            key={x.id}
            id={`sub-${x.id}`}
            type="button"
            className={`chip-sub${on ? ' is-on' : ''}`}
            aria-pressed={on}
            onClick={() => toggle(x.id)}
            whileTap={{ scale: 0.95 }}
          >
            <span className="cs-name">{x.name}</span>
            <span className="cs-plan">{x.plan}</span>
            <span className="cs-price">₹{x.monthly}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function EmiCalc() {
  const { state: s, update } = useStore();
  const [amt, setAmt] = useState(800000);
  const [rate, setRate] = useState(9.5);
  const [yrs, setYrs] = useState(5);
  const r = rate / 1200;
  const n = yrs * 12;
  const emi = r ? (amt * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : amt / n;
  const use = (id: AmountId | 'home') =>
    update((d) => {
      if (id === 'home') d.housing.homeLoanEmi = Math.round(emi);
      else d.amounts[id] = Math.round(emi / 100) * 100;
    });
  return (
    <div className="emi">
      <p className="emi-title">Don’t know your EMI? Work it out</p>
      <Slider id="emi-amt" label="Loan amount" value={amt} max={30000000} step={10000} unit="rupee" curve={2.4} onChange={setAmt} />
      <Slider id="emi-rate" label="Interest rate" hint="Sep 2026: home 7.25–8.5% · car 8.7%+ · personal 10–24%" value={rate} min={6} max={24} step={0.25} unit="rate" onChange={setRate} />
      <Slider id="emi-yrs" label="Tenure" value={yrs} min={1} max={30} step={1} unit="years" onChange={setYrs} />
      <div className="emi-out">
        <span>EMI <b>{rupees(emi)}</b>/mo</span>
        <span className="emi-use">
          Use for
          <button type="button" className="btn btn-sm" onClick={() => use('carEmi')}>Car</button>
          <button type="button" className="btn btn-sm" onClick={() => use('personalEmi')}>Personal</button>
          <button type="button" className="btn btn-sm" onClick={() => use('educationEmi')}>Education</button>
          {s.housing.type === 'ownLoan' && <button type="button" className="btn btn-sm" onClick={() => use('home')}>Home</button>}
        </span>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { state: s, update, replace, calc, home } = useStore();
  const amount = useAmountSlider();
  const lineVal = (id: string) => calc.lines.find((l) => l.id === id)?.value ?? 0;
  const sum = (ids: string[]) => ids.reduce((t, id) => t + lineVal(id), 0);
  const hh = household(s);
  const L = lvl(s);
  const H = s.housing;
  const help = helpEstimate(s, home);
  const st = STATES[home.state];
  const edits = Object.keys(s.amounts).length + Object.keys(s.touched).length + (H.customRent != null ? 1 : 0);
  const spec = VEHICLES[s.transport.vehicle];
  const pg = H.type === 'pg';

  const homeSummary = pg ? 'PG / shared room'
    : H.type === 'rent' ? `${H.bhk} BHK · ${LOCALITY[H.locality].label} · renting`
    : H.type === 'ownLoan' ? `${H.bhk} BHK · own, paying EMI`
    : H.type === 'own' ? `${H.bhk} BHK · own home`
    : 'Living with family';

  const subsidyLabel = st.subsidy === 'DL' ? 'Delhi power subsidy' : st.subsidy === 'PB' ? 'Punjab 300 free units' : 'Gruha Jyothi (Karnataka)';
  const fuelUnit = spec.fuel === 'cng' ? 'kg' : spec.fuel === 'electric' ? 'kWh' : 'L';
  const fuelPrice = spec.fuel === 'cng' ? home.cng : home.petrol;

  return (
    <div className="side">
      <div className="household">
        <div className="side-intro">
          <p className="eyebrow">Your life, itemised</p>
          <h2>Tell it how you live</h2>
          <p className="muted">
            Every change re-prices your salary instantly. Numbers start from a typical {LIFESTYLE_META[s.lifestyle].label.toLowerCase()} household. Drag anything to make it yours.
          </p>
          {edits > 0 && (
            <button type="button" className="link-btn" onClick={() => replace(applyPreset(s, s.lifestyle, true))}>
              Undo my {edits} tweak{edits > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <Field label="City you live in, or are moving to">
          <CityPicker id="home-city" variant="field" value={s.cityId} onChange={(id) => update((d) => { d.cityId = id; })} ariaLabel="Choose your city" />
        </Field>

        <Field label="Lifestyle" hint={LIFESTYLE_META[s.lifestyle].blurb}>
          <Segmented
            id="lifestyle"
            size="sm"
            ariaLabel="Lifestyle"
            value={s.lifestyle}
            options={LIFESTYLES.map((l) => ({ value: l, label: LIFESTYLE_META[l].label, hint: LIFESTYLE_META[l].blurb }))}
            onChange={(v) => replace(applyPreset(s, v, true))}
          />
        </Field>

        <div className="grid-2">
          <Stepper id="adults" label="Adults" hint="Earning or not" value={s.adults} min={1} max={6} onChange={(v) => update((d) => { d.adults = v; }, { household: true })} />
          <Stepper id="seniors" label="Parents 60+" hint="Living with you" value={s.seniors} min={0} max={4} onChange={(v) => update((d) => { d.seniors = v; }, { household: true })} />
        </div>
        <ChildrenEditor />
        {hh.kids > 0 && s.adults >= 2 && (
          <Toggle id="both-work" label="Both parents work" hint="Adds daycare for little ones" checked={s.bothWork} onChange={(v) => update((d) => { d.bothWork = v; }, { household: true })} />
        )}
        <div className="grid-2">
          <Stepper id="pets" label="Pets" value={s.pets} min={0} max={4} onChange={(v) => update((d) => { d.pets = v; })} />
          <Stepper id="age" label="Your age" hint="Prices insurance" value={s.age} min={21} max={60} onChange={(v) => update((d) => { d.age = v; })} />
        </div>
      </div>

      <div className="sections">
        <Section id="home" group="home" title="Home" summary={homeSummary} total={sum(IDS.home)} defaultOpen>
          <Field label="Living arrangement">
            <Segmented<HousingType>
              id="housing-type"
              size="sm"
              ariaLabel="Living arrangement"
              value={H.type}
              options={[
                { value: 'rent', label: 'Rent' },
                { value: 'pg', label: 'PG' },
                { value: 'ownLoan', label: 'Own + EMI' },
                { value: 'own', label: 'Own' },
                { value: 'family', label: 'Family' },
              ]}
              onChange={(v) => update((d) => { d.housing.type = v; d.housing.customRent = null; }, { touch: 'housing.type' })}
            />
          </Field>
          {!pg && H.type !== 'family' && (
            <Field label="Flat size">
              <Segmented<1 | 2 | 3 | 4>
                id="bhk"
                size="sm"
                ariaLabel="Flat size"
                value={H.bhk}
                options={[1, 2, 3, 4].map((b) => ({ value: b as 1 | 2 | 3 | 4, label: `${b} BHK` }))}
                onChange={(v) => update((d) => { d.housing.bhk = v; }, { touch: 'housing.bhk' })}
              />
            </Field>
          )}
          {H.type !== 'family' && (
            <Field label="Locality">
              <Segmented<Locality>
                id="locality"
                size="sm"
                ariaLabel="Locality"
                value={H.locality}
                options={[
                  { value: 'budget', label: 'Budget', hint: 'Outskirts or older buildings · ~0.7× rent' },
                  { value: 'standard', label: 'Standard', hint: 'Decent residential area · typical rent' },
                  { value: 'prime', label: 'Prime', hint: 'Central, near tech parks · ~1.5× rent' },
                  { value: 'luxury', label: 'Luxury', hint: 'Gated high-rise with amenities · ~2.3× rent' },
                ]}
                onChange={(v) => update((d) => { d.housing.locality = v; }, { touch: 'housing.locality' })}
              />
            </Field>
          )}
          {H.type === 'rent' && (
            <Field label="Furnishing">
              <Segmented
                id="furnish"
                size="sm"
                ariaLabel="Furnishing"
                value={H.furnish}
                options={[
                  { value: 'unfurnished', label: 'Unfurnished' },
                  { value: 'semi', label: 'Semi' },
                  { value: 'full', label: 'Fully' },
                ]}
                onChange={(v) => update((d) => { d.housing.furnish = v; }, { touch: 'housing.furnish' })}
              />
            </Field>
          )}
          {(H.type === 'rent' || pg) && (
            <Slider
              id="rent"
              label={pg ? 'PG rent' : 'Monthly rent'}
              hint={pg ? 'Double sharing with meals & Wi-Fi, per adult' : undefined}
              value={calc.rent}
              max={500000}
              step={500}
              edited={H.customRent != null}
              onReset={() => update((d) => { d.housing.customRent = null; })}
              onChange={(v) => update((d) => { d.housing.customRent = v; })}
              detail={H.customRent != null
                ? `Typical here: ${rupees(roundTo(estRent(s, home), 500))}. Other cities scale from your figure.`
                : `Typical for this ${pg ? 'PG' : 'flat'} in ${home.name}. Know your rent? Drag or type it.`}
            />
          )}
          {H.type === 'ownLoan' && (
            <Slider id="home-emi" label="Home loan EMI" value={H.homeLoanEmi} max={400000} step={500} onChange={(v) => update((d) => { d.housing.homeLoanEmi = v; })} />
          )}
          {H.type === 'family' && amount('familyContribution')}
          {!pg && H.type !== 'family' && (
            <Slider
              id="maintenance"
              label="Society maintenance"
              hint={H.type === 'rent' && home.maintInRent ? `Usually included in ${home.name} rents` : undefined}
              value={Math.round(calc.amounts.maintenance ?? 0)}
              max={AMOUNTS.maintenance.max}
              step={100}
              edited={s.amounts.maintenance !== undefined}
              onReset={() => update((d) => { delete d.amounts.maintenance; })}
              onChange={(v) => update((d) => { d.amounts.maintenance = v; })}
            />
          )}
          {(H.type === 'rent' || pg) && (
            <Toggle
              id="move-in"
              label="Spread brokerage & shifting"
              hint="One-time costs over an 11-month lease"
              checked={H.moveIn}
              onChange={(v) => update((d) => { d.housing.moveIn = v; })}
              detail={H.moveIn ? `${rupees(lineVal('moveIn'))}/mo` : undefined}
            />
          )}
          {calc.upfront > 0 && (
            <Readout label="Upfront to move in" tip={`${home.name} landlords typically ask ${home.deposit} month${home.deposit > 1 ? 's' : ''} of rent as deposit${home.tier === 1 ? ', and brokers charge about a month’s rent' : ''}. Not part of the monthly total.`}>
              <b>{rupees(calc.upfront)}</b>
            </Readout>
          )}
        </Section>

        <Section id="bills" group="home" title="Bills & utilities" summary={pg ? 'Included with PG' : `${Math.round(calc.electricityUnits)} units of power a month`} total={sum(IDS.bills)}>
          {!pg && (
            <>
              <div className="grid-2">
                <Stepper id="acs" label="ACs" value={s.bills.acs} min={0} max={6} onChange={(v) => update((d) => { d.bills.acs = v; }, { touch: 'bills.acs' })} />
                <Stepper id="ac-hours" label="AC hours/day" hint="In season" value={s.bills.acHours} min={0} max={24} onChange={(v) => update((d) => { d.bills.acHours = v; }, { touch: 'bills.acHours' })} />
              </div>
              <Toggle id="wfh" label="Work from home" hint="About 60 extra units a month" checked={s.bills.wfh} onChange={(v) => update((d) => { d.bills.wfh = v; })} />
              <Readout
                label="Electricity"
                tip={`${st.name} domestic tariff at your estimated usage, including fixed charges and ~10% duty. AC use is weighted by ${home.name}'s climate.`}
              >
                ≈ {Math.round(calc.electricityUnits)} units → <b>{rupees(lineVal('electricity'))}</b>/mo
              </Readout>
              {st.subsidy && (
                <Toggle id="subsidy" label={`Apply ${subsidyLabel}`} hint="If your connection is registered for it" checked={s.bills.subsidy} onChange={(v) => update((d) => { d.bills.subsidy = v; })} />
              )}
              <Readout label="Cooking gas" tip="14.2 kg domestic LPG cylinder price for this city, September 2026.">
                ₹{Math.round(LPG_DELHI + home.lpgOff)}/cylinder → <b>{rupees(lineVal('cookingGas'))}</b>/mo
              </Readout>
              {amount('water')}
              {amount('broadband')}
            </>
          )}
          {amount('mobile')}
        </Section>

        <Section id="food" group="food" title="Food" summary={`${amountHome('deliveryOrders', s, home)} delivery orders a month`} total={sum(IDS.food)}>
          {amount('groceries', { hint: `For ${hh.people} at home${pg ? ' · PG covers most meals' : ''}` })}
          {amount('dining', { hint: 'Restaurants, cafés, office lunches' })}
          {amount('deliveryOrders', { detail: `≈ ${rupees(lineVal('delivery'))}/mo incl. platform & delivery fees` })}
        </Section>

        <Section id="help" group="help" title="Help at home" summary={pg ? 'Included with PG' : `${IDS.help.filter((id) => lineVal(id) > 0).length} helpers`} total={sum(IDS.help)}>
          {pg ? (
            <p className="note">Cleaning is part of your PG rent.</p>
          ) : (
            <>
              <Toggle id="help-cleaning" label="Maid" hint="Sweeping, mopping, dishes · daily" checked={s.help.cleaning} detail={rupees(help.cleaning)} onChange={(v) => update((d) => { d.help.cleaning = v; }, { touch: 'help.cleaning' })} />
              <Field label="Cook" hint={s.help.cook ? `${rupees(help.cook(s.help.cook))}/mo for ${hh.people}` : `From ${rupees(help.cook(1))}/mo`}>
                <Segmented<0 | 1 | 2 | 3>
                  id="cook"
                  size="sm"
                  ariaLabel="Cook"
                  value={s.help.cook}
                  options={[{ value: 0, label: 'No cook' }, { value: 1, label: '1 meal' }, { value: 2, label: '2 meals' }, { value: 3, label: '3 meals' }]}
                  onChange={(v) => update((d) => { d.help.cook = v; }, { touch: 'help.cook' })}
                />
              </Field>
              <Toggle id="help-fulltime" label="Full-time help" hint="8–10 hours" checked={s.help.fullTime} detail={rupees(help.fullTime)} onChange={(v) => update((d) => { d.help.fullTime = v; }, { touch: 'help.fullTime' })} />
              <Toggle id="help-nanny" label="Nanny" hint="Replaces daycare" checked={s.help.nanny} detail={rupees(help.nanny)} onChange={(v) => update((d) => { d.help.nanny = v; }, { touch: 'help.nanny' })} />
              <Toggle id="help-driver" label="Driver" checked={s.help.driver} detail={rupees(help.driver)} onChange={(v) => update((d) => { d.help.driver = v; }, { touch: 'help.driver' })} />
              <Toggle id="help-laundry" label="Laundry & ironing" checked={s.help.laundry} detail={rupees(help.laundry)} onChange={(v) => update((d) => { d.help.laundry = v; }, { touch: 'help.laundry' })} />
              {s.seniors > 0 && (
                <Toggle id="help-elder" label="Elder-care attendant" checked={s.help.elderCare} detail={rupees(help.elderCare)} onChange={(v) => update((d) => { d.help.elderCare = v; })} />
              )}
              <p className="note">{home.name} rates, September 2026.</p>
            </>
          )}
        </Section>

        <Section id="transport" group="transport" title="Getting around" summary={spec.label} total={sum(IDS.transport)}>
          <Field label="Vehicle you run">
            <Segmented<Vehicle>
              id="vehicle"
              size="sm"
              ariaLabel="Vehicle"
              value={s.transport.vehicle}
              options={[
                { value: 'none', label: 'None' },
                { value: 'bike', label: 'Bike' },
                { value: 'hatch', label: 'Hatch' },
                { value: 'suv', label: 'SUV' },
                { value: 'cng', label: 'CNG' },
                { value: 'ev', label: 'EV' },
              ]}
              onChange={(v) => update((d) => {
                d.transport.vehicle = v;
                if (!d.touched['transport.km']) d.transport.km = VEHICLES[v].km[L];
              }, { touch: 'transport.vehicle' })}
            />
          </Field>
          {s.transport.vehicle !== 'none' && (
            <>
              <Slider
                id="km"
                label="Distance a month"
                value={s.transport.km}
                max={5000}
                step={50}
                unit="km"
                curve={1.4}
                onChange={(v) => update((d) => { d.transport.km = v; }, { touch: 'transport.km' })}
                detail={spec.fuel === 'electric'
                  ? `Mostly home charging at ${st.name} tariffs → ${rupees(lineVal('fuel'))}/mo`
                  : `${spec.fuel === 'cng' ? 'CNG' : 'Petrol'} ₹${fuelPrice.toFixed(2)}/${fuelUnit} in ${home.name} · ${spec.eff} km/${fuelUnit} → ${rupees(lineVal('fuel'))}/mo`}
              />
              <Readout label="Insurance, service & cleaning" tip="Annual insurance and servicing spread monthly, plus a car cleaner where relevant.">
                <b>{rupees(lineVal('vehicleUpkeep'))}</b>/mo
              </Readout>
              <Slider
                id="parking"
                label="Parking & tolls"
                value={Math.round(calc.amounts.parking ?? 0)}
                max={AMOUNTS.parking.max}
                step={100}
                edited={s.amounts.parking !== undefined}
                onReset={() => update((d) => { delete d.amounts.parking; })}
                onChange={(v) => update((d) => { d.amounts.parking = v; })}
              />
            </>
          )}
          {amount('cabs')}
          {amount('transit', { hint: home.metro ? `${home.name} has a metro` : 'Buses & local transport' })}
        </Section>

        {hh.kids > 0 && (
          <Section id="kids" group="kids" title="Children" summary={`${hh.kids} child${hh.kids > 1 ? 'ren' : ''} · fees re-priced per city`} total={sum(IDS.kids)}>
            <Readout label="School & preschool fees" tip="All-in yearly fees (tuition, annual charges, books, uniform) for the school type you picked, scaled to this city. Private fees have risen 10–15% a year recently.">
              <b>{rupees(lineVal('schoolFees'))}</b>/mo
            </Readout>
            {lineVal('schoolBus') > 0 && <Readout label="School bus / van"><b>{rupees(lineVal('schoolBus'))}</b>/mo</Readout>}
            {lineVal('daycare') > 0 && <Readout label="Daycare / creche"><b>{rupees(lineVal('daycare'))}</b>/mo</Readout>}
            {lineVal('babyEssentials') > 0 && <Readout label="Diapers, formula & baby care"><b>{rupees(lineVal('babyEssentials'))}</b>/mo</Readout>}
            {lineVal('college') > 0 && <Readout label="College fees + hostel & pocket money"><b>{rupees(lineVal('college') + lineVal('collegeLiving'))}</b>/mo</Readout>}
            {hh.school + hh.teen > 0 && amount('coaching')}
            {hh.pre + hh.school + hh.teen > 0 && amount('activities')}
            <p className="note">Change age and school type under Children at the top.</p>
          </Section>
        )}

        <Section id="health" group="health" title="Health & insurance" summary={s.health.termCr ? `₹${s.health.termCr} Cr term cover` : 'No term cover'} total={sum(IDS.health)}>
          <Toggle id="employer-cover" label="Employer group health cover" hint="Ends when you change jobs" checked={s.health.employerCover} onChange={(v) => update((d) => { d.health.employerCover = v; })} />
          <Field label="Your own family floater" hint={lineVal('healthInsurance') ? `${rupees(lineVal('healthInsurance') * 12)}/yr at age ${s.age}, ${home.zone === 'A' ? 'Zone A' : home.zone === 'B' ? 'Zone B' : 'Zone C'} pricing` : 'Relying on employer cover only'}>
            <Segmented<number>
              id="cover"
              size="sm"
              ariaLabel="Personal health cover"
              value={s.health.cover}
              options={[{ value: 0, label: 'None' }, { value: 5, label: '₹5 L' }, { value: 10, label: '₹10 L' }, { value: 25, label: '₹25 L' }, { value: 100, label: '₹1 Cr' }]}
              onChange={(v) => update((d) => { d.health.cover = v; }, { touch: 'health.cover' })}
            />
          </Field>
          {s.seniors > 0 && (
            <Field label="Parents’ cover" hint={lineVal('parentsInsurance') ? `${rupees(lineVal('parentsInsurance') * 12)}/yr · senior plans carry co-pays` : undefined}>
              <Segmented<number>
                id="parents-cover"
                size="sm"
                ariaLabel="Parents health cover"
                value={s.health.parentsCover}
                options={[{ value: 0, label: 'None' }, { value: 5, label: '₹5 L' }, { value: 10, label: '₹10 L' }, { value: 25, label: '₹25 L' }]}
                onChange={(v) => update((d) => { d.health.parentsCover = v; }, { touch: 'health.parentsCover' })}
              />
            </Field>
          )}
          <Field label="Term life cover" hint={s.health.termCr ? `${rupees(lineVal('termInsurance') * 12)}/yr, non-smoker, to age 60` : 'Aim for 10–15× income if anyone depends on you'}>
            <Segmented<number>
              id="term"
              size="sm"
              ariaLabel="Term life cover"
              value={s.health.termCr}
              options={[{ value: 0, label: 'None' }, { value: 0.5, label: '50 L' }, { value: 1, label: '1 Cr' }, { value: 2, label: '2 Cr' }, { value: 3, label: '3 Cr' }, { value: 5, label: '5 Cr' }]}
              onChange={(v) => update((d) => { d.health.termCr = v; }, { touch: 'health.termCr' })}
            />
          </Field>
          {amount('medicines')}
          {amount('gym')}
        </Section>

        <Section id="subs" group="lifestyle" title="Subscriptions" summary={`${s.subs.length} active · India prices, Sep 2026`} total={sum(IDS.subs)}>
          <SubChips />
          {amount('otherSubs', { hint: 'Swiggy One, Zomato Gold, Kindle, software…' })}
        </Section>

        <Section id="life" group="lifestyle" title="Lifestyle" summary="Shopping, outings, travel, gifts" total={sum(IDS.life)}>
          {amount('shopping')}
          {amount('personalCare')}
          {amount('entertainment')}
          {amount('travelYear', { hint: 'Per year' })}
          {amount('festivalsYear', { hint: 'Diwali, weddings, birthdays · per year' })}
          {amount('gadgetsYear', { hint: 'Per year' })}
          {s.pets > 0 && <Readout label={`Pets · ${s.pets}`} tip="Food, vet, grooming and boarding, scaled to city prices."><b>{rupees(lineVal('pets'))}</b>/mo</Readout>}
        </Section>

        <Section id="dues" group="dues" title="Loans & family" summary={calc.emis > 0 ? `${compact(calc.emis)} in EMIs & dues` : 'No EMIs yet'} total={sum(IDS.dues)}>
          {amount('carEmi')}
          {amount('personalEmi')}
          {amount('educationEmi')}
          {amount('ccRepay', { hint: 'Only card debt not already counted above' })}
          {amount('bnpl')}
          {amount('familySupport')}
          {amount('donations')}
          <EmiCalc />
        </Section>

        <Section id="save" group="savings" title="Savings & safety net" summary={s.savings.mode === 'rate' ? `Saving ${Math.round(s.savings.rate * 100)}% of take-home` : 'Fixed monthly investing'} total={sum(IDS.save)}>
          <Segmented
            id="save-mode"
            size="sm"
            ariaLabel="How you save"
            value={s.savings.mode}
            options={[{ value: 'rate', label: '% of take-home' }, { value: 'fixed', label: 'Fixed ₹ amount' }]}
            onChange={(v) => update((d) => { d.savings.mode = v; })}
          />
          {s.savings.mode === 'rate'
            ? <Slider id="save-rate" label="Save this share of take-home" hint="20%+ builds real wealth" value={Math.round(s.savings.rate * 100)} max={60} step={1} unit="pct" onChange={(v) => update((d) => { d.savings.rate = v / 100; }, { touch: 'savings.rate' })} />
            : amount('sip')}
          <Slider id="buffer" label="Buffer for surprises" hint="Repairs, medical bills, price rises" value={Math.round(s.savings.buffer * 100)} max={25} step={1} unit="pct" onChange={(v) => update((d) => { d.savings.buffer = v / 100; }, { touch: 'savings.buffer' })} />
          <Toggle id="ef" label="Build an emergency fund" hint={`${s.savings.efMonths} months of expenses in ${s.savings.efYears} year${s.savings.efYears > 1 ? 's' : ''}`} checked={s.savings.efOn} onChange={(v) => update((d) => { d.savings.efOn = v; })} detail={s.savings.efOn ? `${rupees(lineVal('emergencyFund'))}/mo` : undefined} />
          {s.savings.efOn && (
            <div className="grid-2">
              <Stepper id="ef-months" label="Months" value={s.savings.efMonths} min={3} max={12} onChange={(v) => update((d) => { d.savings.efMonths = v; })} />
              <Stepper id="ef-years" label="Years to build" value={s.savings.efYears} min={1} max={5} onChange={(v) => update((d) => { d.savings.efYears = v; })} />
            </div>
          )}
        </Section>

        <Section id="salary" title="Salary structure & tax" summary={`${s.salary.regime === 'auto' ? 'Best regime' : s.salary.regime === 'new' ? 'New regime' : 'Old regime'} · basic ${Math.round(s.salary.basicPct * 100)}%`}>
          <Field label="Tax regime">
            <Segmented
              id="regime"
              size="sm"
              ariaLabel="Tax regime"
              value={s.salary.regime}
              options={[{ value: 'auto', label: 'Best for me' }, { value: 'new', label: 'New' }, { value: 'old', label: 'Old' }]}
              onChange={(v) => update((d) => { d.salary.regime = v; })}
            />
          </Field>
          <Slider id="basic" label="Basic pay" hint="Labour codes require at least 50% of CTC" value={Math.round(s.salary.basicPct * 100)} min={30} max={70} step={1} unit="pct" onChange={(v) => update((d) => { d.salary.basicPct = v / 100; })} />
          <Field label="Provident fund" hint="Employee and employer each contribute">
            <Segmented
              id="pf"
              size="sm"
              ariaLabel="Provident fund"
              value={s.salary.pf}
              options={[{ value: 'full', label: '12% of basic' }, { value: 'capped', label: '₹1,800 cap' }, { value: 'none', label: 'No PF' }]}
              onChange={(v) => update((d) => { d.salary.pf = v; })}
            />
          </Field>
          <Toggle id="gratuity" label="Gratuity is inside CTC" hint="4.81% of basic, paid when you leave" checked={s.salary.gratuity} onChange={(v) => update((d) => { d.salary.gratuity = v; })} />
          <Slider id="variable" label="Variable / bonus pay" hint="Paid yearly, so not counted for monthly bills" value={Math.round(s.salary.variablePct * 100)} max={40} step={1} unit="pct" onChange={(v) => update((d) => { d.salary.variablePct = v / 100; })} />
          <Slider id="nps" label="Employer NPS" hint="Tax-free up to 14% of basic (new regime)" value={Math.round(s.salary.npsPct * 100)} max={14} step={1} unit="pct" onChange={(v) => update((d) => { d.salary.npsPct = v / 100; })} />
          <Toggle id="ccd1b" label="Invest ₹50,000 a year in NPS" hint="Extra 80CCD(1B) deduction, old regime" checked={s.salary.nps80ccd1b} onChange={(v) => update((d) => { d.salary.nps80ccd1b = v; })} />
          <p className="note">
            {st.pt ? `${st.name} professional tax: ₹${st.pt.toLocaleString('en-IN')}/yr.` : `${st.name} levies no professional tax.`}{' '}
            {home.hraMetro ? `${home.name} gets the 50% HRA metro rate.` : `HRA exemption at 40% of basic here.`}
          </p>
        </Section>
      </div>
    </div>
  );
}
