import { useState } from 'react';

import { cn } from '../../utils/format.js';

// <img> wrapper that swaps to a branded initial placeholder on load failure,
// instead of the browser's broken-image icon.
export default function ProductImage({ src, alt, initial, className, imgClassName, ...rest }) {
  const [errored, setErrored] = useState(false);
  const letter = (initial ?? alt ?? '?').trim()[0]?.toUpperCase() ?? '?';

  if (errored || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-accent/10 text-accent font-display font-semibold',
          className,
        )}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(className, imgClassName)}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
