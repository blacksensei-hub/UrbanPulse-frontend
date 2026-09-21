import { Link } from 'react-router-dom';
import { Label } from '../ui/Instrument.jsx';
import { useSetting } from '../../stores/settingsStore.js';
import { formatCurrency } from '../../utils/format.js';

/**
 * The thinnest band on the page.
 *
 * The references use this strip for build metadata. A store has
 * something better to put there: the two facts a first-time visitor
 * in Accra actually wants before they scroll, which is where we ship
 * from and what gets them free delivery.
 */
export default function TopHud() {
  const threshold = useSetting('free_shipping_threshold_ghs', '1000');

  return (
    <div className="hud-strip fixed inset-x-0 top-0 z-[55]">
      <div className="container-site flex h-[var(--hud-h)] items-center justify-between gap-4">
        {/* Below 480px there is not room for both, and the delivery
            threshold is the one that changes a decision, so the place
            label drops rather than truncating mid-word. */}
        <Label className="hidden min-w-0 items-center gap-2 sm:flex">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="truncate">Accra, Ghana</span>
          <span aria-hidden className="opacity-40">/</span>
          <span className="truncate">Spring &apos;26 in rotation</span>
        </Label>
        <Link to="/shipping" className="mx-auto shrink-0 sm:mx-0">
          <Label className="flex items-center gap-2 whitespace-nowrap underline-offset-4 hover:underline">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent sm:hidden" />
            Free delivery over {formatCurrency(threshold)}
          </Label>
        </Link>
      </div>
    </div>
  );
}
