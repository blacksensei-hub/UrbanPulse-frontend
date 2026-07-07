import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../lib/seoSchema.js';
import { useCartStore } from '../stores/cartStore.js';

const SITE_NAME = 'UrbanPulse';
const DEFAULT_SHARE_IMAGE = '/og-default.jpg';

export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
  suffix = true,
  jsonLd,
  children,
}) {
  const itemCount = useCartStore((s) => s.cart.items.reduce((n, it) => n + it.quantity, 0));
  const canonical = url
    ? (url.startsWith('http') ? url : `${SITE_URL}${url}`)
    : (typeof window !== 'undefined' ? `${SITE_URL}${window.location.pathname}` : SITE_URL);
  const baseTitle = suffix ? (title ? `${title} — ${SITE_NAME}` : SITE_NAME) : title;
  const fullTitle = itemCount > 0 ? `(${itemCount}) ${baseTitle}` : baseTitle;
  const resolvedImage = image
    ? (image.startsWith('http') ? image : `${SITE_URL}${image}`)
    : `${SITE_URL}${DEFAULT_SHARE_IMAGE}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_GH" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonical} />
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}
      <meta name="twitter:card" content={resolvedImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
      {Array.isArray(jsonLd) && jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
      {children}
    </Helmet>
  );
}
