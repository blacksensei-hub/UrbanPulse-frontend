import { useEffect } from 'react';

/**
 * The Harmattan layer · the site's signature element.
 *
 * One fixed body of drifting dust behind every page, so scrolling
 * reads as moving through a place rather than past stacked sections.
 * It is decorative: no content, no focus, no screen-reader presence.
 *
 * All motion lives in CSS (.harmattan in globals.css). The only job
 * here is pausing the loops when the tab is hidden, which CSS cannot
 * see on its own.
 */
export default function Harmattan() {
  useEffect(() => {
    const sync = () => {
      document.body.classList.toggle('paused', document.hidden);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      document.body.classList.remove('paused');
    };
  }, []);

  return (
    <div className="harmattan" aria-hidden="true">
      <div className="harmattan__haze" />
      <div className="harmattan__haze harmattan__haze--b" />
      <div className="harmattan__grain" />
    </div>
  );
}
