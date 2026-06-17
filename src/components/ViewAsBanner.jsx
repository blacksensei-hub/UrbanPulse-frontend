import { useState } from 'react';
import { Eye, X } from 'lucide-react';

export default function ViewAsBanner() {
  const [visible, setVisible] = useState(
    () => !!localStorage.getItem('urbanpulse-view-as-token')
  );

  if (!visible) return null;

  const customerName = localStorage.getItem('urbanpulse-view-as-name') ?? 'Customer';

  function exit() {
    localStorage.removeItem('urbanpulse-view-as-token');
    localStorage.removeItem('urbanpulse-view-as-name');
    setVisible(false);
    // If this was opened as a new tab just for view-as, close it; otherwise reload
    if (window.history.length <= 2) {
      window.close();
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[200] flex items-center justify-between gap-4 border-b-2 border-accent bg-accent/10 px-4 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          Viewing as <strong>{customerName}</strong> — read-only
        </span>
      </div>
      <button
        onClick={exit}
        className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
      >
        <X className="h-3 w-3" />
        Exit
      </button>
    </div>
  );
}
