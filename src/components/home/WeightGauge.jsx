import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Label } from '../ui/Instrument.jsx';

const FACTS = [
  '320 grams per square metre. Nearly double a fast fashion tee.',
  'Ring-spun, not open-end. Softer, and it keeps its face.',
  'It holds its shape through the wash. That is what the weight buys you.',
];

/**
 * The one thing a visitor performs rather than reads.
 *
 * Hold the button and 180gsm becomes 320: the readout climbs, the slab
 * thickens, the scale draws. Release early and it eases back down rather
 * than snapping. Completing it lights the three facts in sequence, so the
 * interaction rewards rather than gates.
 *
 * The facts are legible before anyone touches it. Dimming them to the
 * point of illegibility would hide the three best claims about the product
 * behind an optional game, and would fail contrast besides.
 */
export default function WeightGauge() {
  const prefersReduced = useReducedMotion();
  const [gsm, setGsm] = useState(180);
  const [lit, setLit] = useState(prefersReduced ? FACTS.length : 0);
  const btnRef = useRef(null);
  const slabRef = useRef(null);
  const holding = useRef(false);
  const raf = useRef(null);
  const progress = useRef(0);
  const last = useRef(0);
  const doneOnce = useRef(false);
  const lastWrite = useRef(0);

  useEffect(() => {
    if (!prefersReduced) return;
    progress.current = 1;
    setGsm(320);
    setLit(FACTS.length);
    btnRef.current?.style.setProperty('--hold', 1);
    slabRef.current?.style.setProperty('--slab', '60px');
  }, [prefersReduced]);

  useEffect(() => {
    const frame = (now) => {
      const dt = Math.min(100, now - (last.current || now));
      last.current = now;
      progress.current += holding.current ? dt / 1100 : -dt / 900;
      progress.current = Math.min(1, Math.max(0, progress.current));

      btnRef.current?.style.setProperty('--hold', progress.current);
      slabRef.current?.style.setProperty('--slab', `${26 + progress.current * 34}px`);

      // ~10Hz, and only when the string actually changed.
      const value = Math.round(180 + progress.current * 140);
      if (now - lastWrite.current > 90) {
        lastWrite.current = now;
        setGsm((prev) => (prev === value ? prev : value));
      }

      if (progress.current >= 1 && !doneOnce.current) {
        doneOnce.current = true;
        FACTS.forEach((_, i) => setTimeout(() => setLit((n) => Math.max(n, i + 1)), i * 220));
      }

      if ((holding.current && progress.current < 1) || (!holding.current && progress.current > 0)) {
        raf.current = requestAnimationFrame(frame);
      } else {
        raf.current = null;
        last.current = 0;
      }
    };

    const start = (e) => {
      if (prefersReduced) return;
      e.preventDefault();
      holding.current = true;
      if (raf.current === null) raf.current = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (prefersReduced) return;
      holding.current = false;
      if (raf.current === null) raf.current = requestAnimationFrame(frame);
    };
    const key = (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.type === 'keydown') start(e);
      else stop();
    };

    const btn = btnRef.current;
    btn?.addEventListener('pointerdown', start);
    btn?.addEventListener('keydown', key);
    btn?.addEventListener('keyup', key);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      btn?.removeEventListener('pointerdown', start);
      btn?.removeEventListener('keydown', key);
      btn?.removeEventListener('keyup', key);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [prefersReduced]);

  const scaleLen = 304;
  const scaleOff = scaleLen * (1 - (320 - 140) / 200);

  return (
    <div className="grid items-center gap-8 md:gap-12 lg:grid-cols-[1.05fr_.95fr]">
      <div>
        <h2 className="font-display text-h1 font-bold tracking-tight">Feel the difference.</h2>
        <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted">
          Most tees on the street are 180gsm. Hold the button and watch what 320 looks like.
        </p>
        <ul className="mt-7 grid list-none gap-3.5 p-0">
          {FACTS.map((fact, i) => (
            <li key={fact} className="flex items-start gap-3.5">
              <Label className="shrink-0 pt-[.3em] !text-accent-text tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </Label>
              <span
                className="transition-colors duration-500"
                style={{ color: i < lit ? 'var(--color-text)' : 'var(--color-muted)' }}
              >
                {fact}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card overflow-hidden p-6 md:p-8">
        <Label className="block">Fabric weight</Label>
        <div className="mt-3 font-mono text-[clamp(3rem,9vw,5rem)] font-medium leading-none tabular-nums">
          {gsm}
          <span className="ml-2 text-[.28em] tracking-[.14em] text-muted">GSM</span>
        </div>
        <div ref={slabRef} className="gauge-slab" />
        <svg className="mt-4 w-full" viewBox="0 0 320 44" aria-hidden="true">
          <line x1="8" y1="30" x2="312" y2="30" stroke="var(--color-border-strong)" strokeWidth="1" />
          <line
            className="gauge-fill"
            x1="8"
            y1="30"
            x2="312"
            y2="30"
            stroke="var(--color-accent)"
            strokeWidth="2"
            style={{ '--len': scaleLen, '--off': scaleOff, strokeDasharray: scaleLen }}
          />
          <text x="8" y="18" className="gauge-tick">140</text>
          <text x="286" y="18" className="gauge-tick">340</text>
        </svg>
        <button ref={btnRef} type="button" className="gauge-hold" aria-describedby="gauge-hint">
          <span className="relative font-medium">Press and hold</span>
        </button>
        <Label id="gauge-hint" className="mt-3 block">
          {prefersReduced ? 'Shown at full weight' : 'Hold to add weight'}
        </Label>
      </div>
    </div>
  );
}
