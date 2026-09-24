import { useState } from 'react';

import { cn } from '../../utils/format.js';
import { imageProps } from '../../utils/image.js';

// <img> wrapper that swaps to a branded initial placeholder on load failure,
// instead of the browser's broken-image icon.
//
// `displayWidth` is roughly how wide the image is drawn, in CSS pixels. The
// file is fetched at about twice that for sharp phone screens, never the 1-2MB
// original. Pass `sizes` as well when the image scales with the layout.
export default function ProductImage({ src, alt, initial, className, imgClassName, displayWidth = 400, sizes, ...rest }) {
  const [errored, setErrored] = useState(false);
  const letter = (initial ?? alt ?? '?').trim()[0]?.toUpperCase() ?? '?';

  if (errored || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-accent/10 text-accent-text font-display font-semibold',
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
      {...imageProps(src, sizes, displayWidth * 2)}
      alt={alt}
      className={cn(className, imgClassName)}
      onError={() => setErrored(true)}
      {...rest}
    />
  );
}
