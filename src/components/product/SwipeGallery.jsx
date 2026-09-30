import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useSwipe } from '../../hooks/useSwipe.js';
import { imageProps } from '../../utils/image.js';
import { spring, springFlick } from '../../lib/motion.js';

/**
 * A phone photo strip that behaves like Photos: the pictures move with the
 * finger, the first and last resist softly at the edges, and on release the
 * throw is projected so a flick lands on the neighbouring photo (one per
 * flick, never skipping) at the finger's speed. Dots and thumbnails still
 * drive it through `index`.
 */
export default function SwipeGallery({ images, index, onIndexChange, alt, layoutId, reduced, onImageError }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const [width, setWidth] = useState(0);
  const fromGesture = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const w = ref.current?.offsetWidth || 0;
      setWidth(w);
      x.jump(-index * w);   // reposition without inventing a velocity
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dots and thumbnails move it too; a gesture has already animated itself.
  useEffect(() => {
    if (!width) return undefined;
    if (fromGesture.current) { fromGesture.current = false; return undefined; }
    const a = animate(x, -index * width, reduced ? { duration: 0 } : spring);
    return () => a.stop();
  }, [index, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const last = images.length - 1;
  const swipe = useSwipe({
    axis: 'x',
    value: x,
    min: -last * width,
    max: 0,
    dimension: width,
    enabled: images.length > 1 && width > 0,
    onRelease: ({ projected, velocity }) => {
      const nearestIdx = Math.round(-projected / width);
      const target = Math.max(0, Math.min(last, Math.max(index - 1, Math.min(index + 1, nearestIdx))));
      animate(x, -target * width, { ...springFlick, velocity });
      if (target !== index) {
        fromGesture.current = true;
        onIndexChange(target);
      }
    },
  });

  return (
    <div ref={ref} {...swipe} style={swipe.style} className="overflow-hidden" aria-roledescription="carousel">
      <motion.div className="flex" style={{ x }}>
        {images.map((src, i) => (
          <motion.img
            key={`${src}-${i}`}
            layoutId={i === 0 && index === 0 ? layoutId : undefined}
            {...imageProps(src, '100vw', 1200)}
            alt={i === index ? alt : ''}
            aria-hidden={i !== index}
            draggable={false}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchpriority={i === 0 ? 'high' : undefined}
            decoding="async"
            width={800}
            height={1000}
            onError={i === 0 ? onImageError : undefined}
            className="aspect-[4/5] w-full shrink-0 select-none object-cover"
          />
        ))}
      </motion.div>
    </div>
  );
}
