import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CITIES, CITY_BY_ID, STATES } from '../lib/cities';

export function CityPicker({
  id, value, onChange, exclude = [], variant = 'inline', placeholder = 'Add a city', ariaLabel,
}: {
  id: string;
  value: string | null;
  onChange: (id: string) => void;
  exclude?: string[];
  variant?: 'inline' | 'field' | 'add';
  placeholder?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CITIES.filter((c) => !exclude.includes(c.id))
      .filter((c) => !needle || c.name.toLowerCase().includes(needle) || STATES[c.state].name.toLowerCase().includes(needle))
      .sort((a, b) => (needle ? Number(!a.name.toLowerCase().startsWith(needle)) - Number(!b.name.toLowerCase().startsWith(needle)) : 0) || a.tier - b.tier || a.name.localeCompare(b.name));
  }, [q, exclude]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (cid: string) => {
    onChange(cid);
    setOpen(false);
    setQ('');
  };

  const city = value ? CITY_BY_ID[value] : null;

  return (
    <div className={`picker picker-${variant}`} ref={wrap}>
      <button
        id={id}
        type="button"
        className="picker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {variant === 'add' ? <><span className="plus">+</span>{placeholder}</> : <>{city?.name ?? placeholder}<span className="chev" aria-hidden="true">▾</span></>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="picker-pop"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <input
              id={`${id}-search`}
              className="picker-search"
              autoFocus
              placeholder="Search 62 cities or a state"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
                if (e.key === 'Enter' && results[active]) choose(results[active].id);
                if (e.key === 'Escape') setOpen(false);
              }}
              role="combobox"
              aria-controls={`${id}-list`}
              aria-expanded="true"
            />
            <ul className="picker-list" role="listbox" id={`${id}-list`} ref={listRef}>
              {results.map((c, i) => (
                <li
                  key={c.id}
                  data-i={i}
                  role="option"
                  aria-selected={c.id === value}
                  className={`${i === active ? 'is-active' : ''}${c.id === value ? ' is-current' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); choose(c.id); }}
                >
                  <span className="pl-name">{c.name}</span>
                  <span className="pl-meta">{STATES[c.state].name} · T{c.tier}</span>
                </li>
              ))}
              {results.length === 0 && <li className="pl-empty">No city matches “{q}”.</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
