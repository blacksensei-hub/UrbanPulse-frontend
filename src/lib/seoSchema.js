export const SITE_URL = import.meta.env.VITE_APP_URL || 'https://urbanpulse.com';

export function buildOrganizationSchema() {
  // No `sameAs` — no social-link data exists anywhere in settings/DB yet. Add real
  // profile URLs here once a settings section for them exists; don't fabricate.
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'UrbanPulse',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`, // TODO: replace with a dedicated raster logo before launch
  };
}

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'UrbanPulse',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function computeAvailability(product) {
  const totalStock = (product.variants ?? []).reduce((s, v) => s + Number(v.stock ?? 0), 0);
  if (product.is_preorder) {
    const spotsLeft = product.preorder_limit
      ? Number(product.preorder_limit) - Number(product.preorder_count ?? 0)
      : null;
    return spotsLeft !== null && spotsLeft <= 0 ? 'https://schema.org/SoldOut' : 'https://schema.org/PreOrder';
  }
  return totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

export function buildProductSchema(product, canonicalUrl) {
  const sku = product.variants?.find((v) => v.sku)?.sku; // omit entirely if none — never fabricate
  const reviewCount = product.reviews?.length ?? 0; // capped at 20 server-side; accepted limitation
  const ratingValue = Number(product.rating);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images || [],
    description: product.description || '',
    brand: { '@type': 'Brand', name: 'UrbanPulse' },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'GHS',
      price: String(product.price),
      availability: computeAvailability(product),
    },
  };
  if (sku) schema.sku = sku;
  // Google disallows aggregateRating with zero underlying reviews — only emit when real.
  if (ratingValue > 0 && reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingValue.toFixed(1),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return schema;
}

export function buildBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildArticleSchema(lookbook, canonicalUrl) {
  // No `datePublished` — LOOKBOOKS entries carry no date field; omitted rather than fabricated.
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: lookbook.title,
    image: [lookbook.hero],
    author: { '@type': 'Organization', name: 'UrbanPulse' },
    publisher: { '@type': 'Organization', name: 'UrbanPulse', logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` } },
    url: canonicalUrl,
  };
}

export function buildFAQPageSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
