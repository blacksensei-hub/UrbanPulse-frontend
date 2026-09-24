// Right-sized image URLs. On a slow connection the photo is most of the page:
// a product upload can be 1.8MB when the phone needs about 40KB.
//
// - Cloudinary product photos get an on-the-fly transformation: best format
//   the browser accepts (f_auto), sensible compression (q_auto), and a width
//   cap that never upscales (c_limit).
// - The site's own /media photos have pre-built WebP versions next to them:
//   name-800.webp (800px wide) and name.webp (full size). See
//   scripts/build-media.ps1.
// - Anything else is returned untouched.

const CLOUDINARY = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;
const TRANSFORMED = /^[a-z]{1,3}_[^/]*\//;          // e.g. "w_400,f_auto/..."
const MEDIA = /^\/media\/([\w-]+)\.jpg$/;

export function imageUrl(src, width = 800) {
  if (!src || typeof src !== 'string') return src;
  const c = src.match(CLOUDINARY);
  if (c) {
    if (TRANSFORMED.test(c[2])) return src;
    return `${c[1]}f_auto,q_auto,c_limit,w_${Math.round(width)}/${c[2]}`;
  }
  const m = src.match(MEDIA);
  if (m) return width <= 800 ? `/media/${m[1]}-800.webp` : `/media/${m[1]}.webp`;
  return src;
}

// srcset for the same image at several widths, so a phone picks a small file
// and a wide desktop a larger one. Undefined for images we can't resize.
export function imageSrcSet(src, widths = [400, 800, 1200]) {
  if (!src || typeof src !== 'string') return undefined;
  if (CLOUDINARY.test(src) && !TRANSFORMED.test(src.match(CLOUDINARY)[2])) {
    return widths.map((w) => `${imageUrl(src, w)} ${w}w`).join(', ');
  }
  const m = src.match(MEDIA);
  if (m) return `/media/${m[1]}-800.webp 800w, /media/${m[1]}.webp 1600w`;
  return undefined;
}

// Props for an <img>: src (a sensible default), srcSet and sizes.
export function imageProps(src, sizes, fallbackWidth = 800) {
  const srcSet = imageSrcSet(src);
  return {
    src: imageUrl(src, fallbackWidth),
    ...(srcSet && sizes ? { srcSet, sizes } : {}),
  };
}
