import { LIFESTYLE_META } from '../lib/constants';
import { household, setKidCount } from '../lib/engine';
import { LIFESTYLES } from '../lib/types';
import { CityPicker } from './CityPicker';
import { useStore } from './store';
import { Field, Segmented, Stepper } from './ui';

/**
 * The whole app in four fields. Sits where the full Sidebar normally would; one click reveals
 * every knob. This is the "quick estimate" entry point — city + lifestyle + household → instant CTC,
 * with the same live Hero number driving it underneath.
 */
export function QuickEstimate() {
  const { state: s, update, replace } = useStore();
  const hh = household(s);

  return (
    <div className="quick">
      <div className="quick-intro">
        <p className="eyebrow">Quick estimate</p>
        <h2>Four questions, one number</h2>
        <p className="muted">Answer these and the CTC on the right updates live. Personalize every expense whenever you're ready.</p>
      </div>

      <Field label="City you live in, or are moving to">
        <CityPicker id="quick-city" variant="field" value={s.cityId} onChange={(id) => update((d) => { d.cityId = id; })} ariaLabel="Choose your city" />
      </Field>

      <Field label="Lifestyle" hint={LIFESTYLE_META[s.lifestyle].blurb}>
        <Segmented
          id="quick-lifestyle"
          ariaLabel="Lifestyle"
          value={s.lifestyle}
          options={LIFESTYLES.map((l) => ({ value: l, label: LIFESTYLE_META[l].label, hint: LIFESTYLE_META[l].blurb }))}
          onChange={(v) => update((d) => { d.lifestyle = v; })}
        />
      </Field>

      <div className="grid-2">
        <Stepper id="quick-adults" label="Adults" value={s.adults} min={1} max={6} onChange={(v) => update((d) => { d.adults = v; }, { household: true })} />
        <Stepper id="quick-kids" label="Children" value={hh.kids} min={0} max={4} onChange={(v) => replace(setKidCount(s, v))} />
      </div>

      <button
        id="quick-expand"
        type="button"
        className="btn btn-primary quick-expand"
        onClick={() => update((d) => { d.quickMode = false; })}
      >
        Personalize every expense →
      </button>
      <p className="note">Rent, help, school fees, insurance, subscriptions, loans, savings goals — the full picture is one click away.</p>
    </div>
  );
}
