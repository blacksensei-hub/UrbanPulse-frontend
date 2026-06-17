import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getRecentIds } from '../../utils/recentlyViewed.js';
import { productService } from '../../services/index.js';
import ProductCard from './ProductCard.jsx';
import { staggerContainer } from '../../lib/motion.js';

export default function RecentlyViewed({ excludeId = null }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const ids = getRecentIds()
      .filter((id) => id !== excludeId)
      .slice(0, 8);
    if (ids.length === 0) return;
    productService.byIds(ids)
      .then((data) => {
        const items = data.items ?? data;
        // Preserve the localStorage order (most-recent-first)
        const ordered = ids
          .map((id) => items.find((p) => p.id === id))
          .filter(Boolean);
        setProducts(ordered);
      })
      .catch(() => {});
  }, [excludeId]);

  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <p className="eyebrow">Your history</p>
      <h2 className="mt-2 font-display text-h3 font-bold">Recently viewed</h2>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
      >
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </motion.div>
    </section>
  );
}
