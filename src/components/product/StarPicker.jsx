import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../utils/format.js';

export default function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              n <= (hovered || value) ? 'fill-accent text-accent' : 'text-border',
            )}
          />
        </button>
      ))}
    </div>
  );
}
