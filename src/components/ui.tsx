import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clamp, rupees } from '../lib/format';

export const spring = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 } as const;

/** Tweens between values without re-rendering on every frame. Remount (key) when the formatter changes. */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const mv = useMotionValue(value);
  const fmt = useRef(format);
  fmt.current = format;
  const text = useTransform(mv, (v) => fmt.current(v));
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}

export interface SegOption<T> {
  value: T;
  label: ReactNode;
  hint?: string;
}

export function Segmented<T extends string | number>({
  id, value, options, onChange, size = 'md', ariaLabel, stretch = true,
}: {
  id: string;
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  ariaLabel: string;
  stretch?: boolean;
}) {
  return (
    <div className={`seg seg-${size}${stretch ? ' seg-stretch' : ''}`} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            id={`${id}-${o.value}`}
            type="button"
            role="radio"
            aria-checked={active}
            className={`seg-btn${active ? ' is-active' : ''}`}
            onClick={() => onChange(o.value)}
            title={o.hint}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={spring} />}
            <span className="seg-label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  id, label, hint, value, min, max, onChange,
}: { id: string; label: ReactNode; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [dir, setDir] = useState(1);
  const set = (v: number) => {
    const n = clamp(v, min, max);
    if (n === value) return;
    setDir(n > value ? 1 : -1);
    onChange(n);
  };
  return (
    <div className="stepper-row">
      <div className="field-label">
        <span id={`${id}-label`}>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="stepper" role="group" aria-labelledby={`${id}-label`}>
        <button id={`${id}-dec`} type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Decrease">−</button>
        <span className="stepper-val" aria-live="polite">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={value}
              initial={{ y: dir * 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -dir * 10, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
        <button id={`${id}-inc`} type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Increase">+</button>
      </div>
    </div>
  );
}

export function Toggle({
  id, checked, onChange, label, hint, detail,
}: { id: string; checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; detail?: ReactNode }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      className={`toggle-row${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="field-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      {detail !== undefined && <span className="toggle-detail">{detail}</span>}
      <span className="switch" aria-hidden="true">
        <motion.span layout className="knob" transition={spring} />
      </span>
    </button>
  );
}

export type SliderUnit = 'month' | 'year' | 'count' | 'km' | 'pct' | 'hours' | 'plain' | 'rupee' | 'rate' | 'lakh' | 'years';

function fmtUnit(v: number, unit: SliderUnit): string {
  switch (unit) {
    case 'month':
    case 'year':
    case 'rupee': return rupees(v);
    case 'km': return `${Math.round(v).toLocaleString('en-IN')} km`;
    case 'pct': return `${Math.round(v)}%`;
    case 'rate': return `${v.toFixed(2)}%`;
    case 'lakh': return `₹${v} L`;
    case 'years': return `${v} yrs`;
    case 'hours': return `${v} h`;
    default: return Math.round(v).toLocaleString('en-IN');
  }
}

const UNIT_SUFFIX: Partial<Record<SliderUnit, string>> = { month: '/mo', year: '/yr' };

export function Slider({
  id, label, hint, value, min = 0, max, step, onChange, unit = 'month', curve, edited, onReset, detail,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  value: number;
  min?: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: SliderUnit;
  curve?: number;
  edited?: boolean;
  onReset?: () => void;
  detail?: ReactNode;
}) {
  const k = curve ?? (unit === 'month' || unit === 'year' ? 2 : 1);
  const toPos = (v: number) => Math.round(Math.pow(clamp((v - min) / (max - min), 0, 1), 1 / k) * 1000);
  const fromPos = (p: number) => {
    const raw = min + (max - min) * Math.pow(p / 1000, k);
    return clamp(Number((Math.round(raw / step) * step).toFixed(4)), min, max);
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const pos = toPos(value);

  const commit = () => {
    const n = Number(draft.replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && draft.trim() !== '') onChange(Math.max(min, Number((Math.round(n / step) * step).toFixed(4))));
    setEditing(false);
  };

  return (
    <div className={`slider${edited ? ' is-edited' : ''}`}>
      <div className="slider-head">
        <label htmlFor={id} className="field-label">
          <span>{label}</span>
          {hint && <small>{hint}</small>}
        </label>
        <div className="slider-value">
          {edited && onReset && (
            <button type="button" className="reset" onClick={onReset} title="Back to preset" aria-label="Reset to preset">↺</button>
          )}
          {editing ? (
            <input
              id={`${id}-exact`}
              className="exact"
              autoFocus
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          ) : (
            <button type="button" className="value-btn" onClick={() => { setDraft(String(Math.round(value))); setEditing(true); }} title="Type an exact amount">
              {fmtUnit(value, unit)}
              {UNIT_SUFFIX[unit] && <span className="unit">{UNIT_SUFFIX[unit]}</span>}
            </button>
          )}
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1000}
        step={1}
        value={pos}
        style={{ ['--p' as string]: `${pos / 10}%` }}
        onChange={(e) => onChange(fromPos(Number(e.target.value)))}
        aria-valuetext={fmtUnit(value, unit)}
      />
      {detail && <div className="slider-detail">{detail}</div>}
    </div>
  );
}

export function InfoTip({ children, label = 'How this is worked out' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="info" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="info-btn" aria-label={label} aria-expanded={open}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen((o) => !o)}>
        i
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            className="info-pop"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}
