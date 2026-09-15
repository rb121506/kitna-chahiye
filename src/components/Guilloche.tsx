import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

/*
 * A banknote-style guilloché rosette. Its petal count and amplitude are derived from the salary,
 * and it re-weaves itself whenever the number changes.
 */
interface Params {
  petals: number;
  amp: number;
  twist: number;
}

function paramsFor(seed: number): Params {
  const lakhs = seed / 1e5;
  return {
    petals: 9 + (Math.round(lakhs) % 8),
    amp: 0.07 + ((lakhs * 7) % 10) / 180,
    twist: (lakhs % 13) / 13,
  };
}

export function Guilloche({ seed, className }: { seed: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Params>(paramsFor(seed));
  const raf = useRef(0);
  const reduce = useReducedMotion();

  const draw = (p: Params, spin: number) => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const color = getComputedStyle(canvas).getPropertyValue('--accent').trim() || '#c9953a';
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.7;
    const bands = [
      { r: 0.98, a: 1, copies: 26, alpha: 0.2 },
      { r: 0.74, a: 0.8, copies: 22, alpha: 0.15 },
      { r: 0.5, a: 0.6, copies: 18, alpha: 0.12 },
    ];
    const steps = 360;
    for (const b of bands) {
      ctx.globalAlpha = b.alpha;
      for (let k = 0; k < b.copies; k++) {
        const phase = (k / b.copies) * Math.PI * 2 + spin + p.twist * 2;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * Math.PI * 2;
          const r = R * b.r * (1 + p.amp * b.a * Math.sin(p.petals * t + phase) + p.amp * 0.35 * Math.sin((p.petals + 3) * t - phase));
          const x = cx + r * Math.cos(t);
          const y = cy + r * Math.sin(t);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  useEffect(() => {
    const target = paramsFor(seed);
    const from = { ...cur.current };
    cancelAnimationFrame(raf.current);
    if (reduce) {
      cur.current = target;
      draw(target, 0);
      return;
    }
    const start = performance.now();
    const dur = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const p = {
        petals: t < 0.5 ? from.petals : target.petals,
        amp: from.amp + (target.amp - from.amp) * e,
        twist: from.twist + (target.twist - from.twist) * e,
      };
      // petals can't interpolate smoothly, so dip the amplitude through the swap
      if (from.petals !== target.petals) p.amp *= Math.abs(Math.cos(t * Math.PI));
      cur.current = p;
      draw(p, e * 0.35);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else cur.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, reduce]);

  useEffect(() => {
    const redraw = () => draw(cur.current, 0.35);
    const ro = new ResizeObserver(redraw);
    if (ref.current) ro.observe(ref.current);
    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', redraw);
    return () => {
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener('change', redraw);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
