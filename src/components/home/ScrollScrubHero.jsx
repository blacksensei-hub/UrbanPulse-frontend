import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * The scroll-scrubbed hero.
 *
 * A tall pinned region holds a sticky full-viewport stage. Scroll progress
 * through that region maps 0 to 1 and drives the video's time, so the page
 * settles exactly when the footage reaches its composed resting frame.
 *
 * Every rule below either created the polish or prevented a bug:
 *
 * - The video is fetched as a Blob. Many hosts lack partial-download (HTTP
 *   Range) support, and without it every seek clamps to zero: scrubbing
 *   works locally and does nothing live. A Blob works everywhere.
 * - The displayed time is lerped in a rAF loop that rests when converged
 *   and when the hero is off-screen, normalised by dt so a 120Hz screen
 *   converges at the same speed as a 60Hz one.
 * - Seeks are gated. Un-gated seeks pile up and that is the whole
 *   difference between smooth and choppy in Chrome. The busy flag resets
 *   on error so the gate can never deadlock.
 * - DOM writes are delta-gated. Per-frame writes are the other half.
 * - Five gates decide static-versus-scrub, and they are live: a tablet
 *   rotating or a window being maximised re-arms or disarms the scrub,
 *   rather than leaving a blank stage.
 * - Phones and reduced-motion visitors never download the video at all.
 * - The page is complete if the video never loads.
 */

const GATES = [
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)',
];

// A sixth gate, read once on arrival: a connection too slow for the film.
// At under 1 Mbps the 1.37MB video takes 11s or more, and until it lands a
// desktop visitor scrolls through seven screens of a frozen frame; the static
// hero is the better page. Chromium browsers report this (Network Information
// API); elsewhere it's unknown and the gate stays open. Deliberately not live,
// so a connection that speeds up never swaps the layout under someone reading.
function connectionTooSlow() {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (!c) return false;
  if (c.saveData) return true;
  if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g') return true;
  return typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 1;
}

const smoothstep = (p, e0, e1) => {
  const t = Math.min(1, Math.max(0, (p - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Seeded, so the per-word jitter is identical on every load. */
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/**
 * Split a line into word spans for the entrance. The full sentence rides
 * along in a visually hidden span, because the visual break is a design
 * choice and a screen reader should not inherit it.
 */
function SplitLine({ text, seed = 97, className = '' }) {
  const words = useMemo(() => {
    const r = rng(seed);
    const parts = text.split(' ');
    return parts.map((w, i) => ({
      w,
      th: (i / Math.max(1, parts.length)) * 0.5 + r() * 0.06,
    }));
  }, [text, seed]);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={className}>
        {words.map(({ w, th }, i) => (
          <span key={`${w}-${i}`} className="ssh-w" style={{ '--th': th }}>
            {i ? ` ${w}` : w}
          </span>
        ))}
      </span>
    </>
  );
}

export default function ScrollScrubHero({
  videoSrc,
  posterSrc,
  staticSrc,
  videoBytes,
  heroVh = 620,
  bands = [],
  staticHero,
  children,
}) {
  const heroRef = useRef(null);
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const ringRef = useRef(null);
  const bandRefs = useRef([]);
  const cacheRef = useRef(bands.map(() => ({ op: -1, k: -1 })));

  const [slowLink] = useState(connectionTooSlow);
  const [useStatic, setUseStatic] = useState(() =>
    typeof window === 'undefined' ? true : slowLink || GATES.some((q) => window.matchMedia(q).matches)
  );
  const [videoFailed, setVideoFailed] = useState(false);

  // ── the scrub, armed and disarmed by the five gates ───────────────────
  useEffect(() => {
    const mqls = GATES.map((q) => window.matchMedia(q));
    const apply = () => setUseStatic(slowLink || mqls.some((m) => m.matches));
    mqls.forEach((m) => (m.addEventListener ? m.addEventListener('change', apply) : m.addListener(apply)));
    apply();
    return () =>
      mqls.forEach((m) =>
        m.removeEventListener ? m.removeEventListener('change', apply) : m.removeListener(apply)
      );
  }, [slowLink]);

  useEffect(() => {
    if (useStatic) return undefined;
    const hero = heroRef.current;
    const stage = stageRef.current;
    const video = videoRef.current;
    const ring = ringRef.current;
    if (!hero || !video) return undefined;

    let cancelled = false;
    let rafId = null;
    let lastTick = 0;
    let target = 0;
    let shown = 0;
    let seekBusy = false;
    let pendingTime = null;
    let heroOnScreen = true;
    let loadK = 0;
    let ctrl = null;
    let watchdog = null;

    const heroProgress = () => {
      const range = hero.offsetHeight - window.innerHeight;
      if (range <= 0) return 0;
      return Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / range));
    };

    const requestSeek = (t) => {
      if (!video.duration) return;
      if (seekBusy) {
        pendingTime = t;
        return;
      }
      seekBusy = true;
      video.currentTime = t;
    };
    const onSeeked = () => {
      seekBusy = false;
      if (pendingTime !== null) {
        const t = pendingTime;
        pendingTime = null;
        requestSeek(t);
      }
    };
    const onError = () => {
      // The deadlock escape: a seek that errors never fires `seeked`.
      seekBusy = false;
      pendingTime = null;
      setVideoFailed(true);
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    const updateCaptions = (p) => {
      for (let i = 0; i < bands.length; i += 1) {
        const el = bandRefs.current[i];
        if (!el) continue;
        const { a, b } = bands[i];
        const f = Math.min(0.02, (b - a) / 3);
        const fadeIn = i === 0 ? 1 : smoothstep(p, a, a + f);
        const fadeOut = i === bands.length - 1 ? 1 : 1 - smoothstep(p, b - f, b);
        const ramp = Math.min(0.025, (b - a) * 0.35);
        let k = Math.min(1, Math.max(0, (p - a) / ramp));
        if (i === 0) k = Math.max(k, loadK);

        const opR = Math.round(fadeIn * fadeOut * 100) / 100;
        const kR = Math.round(k * 1000) / 1000;
        const cache = cacheRef.current[i];
        if (opR !== cache.op) {
          cache.op = opR;
          el.style.opacity = opR;
        }
        if (kR !== cache.k) {
          cache.k = kR;
          el.style.setProperty('--k', kR);
        }
      }
    };

    const tick = (now) => {
      const dt = Math.min(100, now - (lastTick || now));
      lastTick = now;
      const k = 0.16;
      shown += (target - shown) * (1 - (1 - k) ** (dt / 16.667));
      if (Math.abs(target - shown) < 0.0005) {
        shown = target;
        rafId = null;
        lastTick = 0;
      } else {
        rafId = requestAnimationFrame(tick);
      }
      requestSeek(shown * (video.duration || 0));
      updateCaptions(shown);
    };

    const onScroll = () => {
      target = heroProgress();
      if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      heroOnScreen = e.isIntersecting;
      if (heroOnScreen) onScroll();
    });
    io.observe(hero);

    // Band one opens settled rather than waiting for a scroll.
    const t0 = performance.now();
    const ramp = (now) => {
      if (cancelled) return;
      loadK = Math.min(1, (now - t0) / 900);
      updateCaptions(shown);
      if (loadK < 1) requestAnimationFrame(ramp);
    };
    requestAnimationFrame(ramp);

    // The poster wins the bandwidth race by design, then the Blob streams.
    let started = false;
    const startFetch = () => {
      if (started || cancelled) return;
      started = true;
      ctrl = new AbortController();
      watchdog = setTimeout(() => ctrl.abort(), 20000);
      fetch(videoSrc, { signal: ctrl.signal })
        .then(async (res) => {
          const total = Number(res.headers.get('Content-Length')) || videoBytes;
          const reader = res.body.getReader();
          const chunks = [];
          let got = 0;
          let lastRing = 0;
          for (;;) {
            // eslint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read();
            if (done) break;
            clearTimeout(watchdog);
            watchdog = setTimeout(() => ctrl.abort(), 20000);
            chunks.push(value);
            got += value.length;
            const frac = Math.min(1, got / total);
            const now = performance.now();
            if (now - lastRing > 100 || frac === 1) {
              lastRing = now;
              if (ring) ring.style.setProperty('--ld', Math.round(126 * (1 - frac)));
            }
          }
          clearTimeout(watchdog);
          if (cancelled) return;
          if (ring) ring.style.setProperty('--ld', 0);
          video.src = URL.createObjectURL(new Blob(chunks));
          video.load();
          video.addEventListener(
            'canplay',
            () => {
              requestSeek(heroProgress() * video.duration);
              stage?.classList.add('ssh-ready');
              onScroll();
            },
            { once: true }
          );
        })
        .catch(() => {
          if (!cancelled) setVideoFailed(true);
        });
    };

    const img = new Image();
    img.onload = startFetch;
    img.onerror = startFetch;
    img.src = posterSrc;
    const safety = setTimeout(startFetch, 4000);

    window.addEventListener('scroll', onScroll, { passive: true });
    cacheRef.current = bands.map(() => ({ op: -1, k: -1 }));
    updateCaptions(heroProgress());
    onScroll();

    return () => {
      cancelled = true;
      clearTimeout(safety);
      clearTimeout(watchdog);
      if (ctrl) ctrl.abort();
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      io.disconnect();
    };
  }, [useStatic, videoSrc, posterSrc, videoBytes, bands]);

  // ── the static hero: a designed layout, not a fallback apology ─────────
  if (useStatic) {
    return (
      <header className="ssh-static" style={{ backgroundImage: `url(${staticSrc})` }}>
        <div className="ssh-scrim-static" aria-hidden />
        <div className="container-site relative z-10 flex min-h-[calc(100svh-5rem-var(--hud-h))] flex-col justify-end pb-24 md:pb-20">
          {staticHero}
        </div>
      </header>
    );
  }

  return (
    <div ref={heroRef} className="ssh" style={{ height: `${heroVh}vh` }}>
      <div ref={stageRef} className="ssh-stage">
        <div className="ssh-poster" style={{ backgroundImage: `url(${posterSrc})` }} aria-hidden />
        {!videoFailed && (
          <video ref={videoRef} preload="none" muted playsInline aria-hidden="true" tabIndex={-1} />
        )}
        <div className="ssh-scrim" aria-hidden />
        <div className="ssh-bands container-site">
          {bands.map((band, i) => (
            <div
              key={band.id}
              ref={(el) => {
                bandRefs.current[i] = el;
              }}
              id={band.id}
              className="ssh-band"
              /* the band's scroll range, in the DOM so the page can be
                 audited and debugged without reading the source */
              data-range={`${band.a},${band.b}`}
            >
              <div className="relative">{band.render(SplitLine)}</div>
            </div>
          ))}
        </div>
        {!videoFailed ? (
          <svg ref={ringRef} className="ssh-ring" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="126"
              style={{ strokeDashoffset: 'var(--ld, 126)' }}
            />
          </svg>
        ) : (
          <span className="ssh-cue eyebrow">Scroll</span>
        )}
        {children}
      </div>
    </div>
  );
}
