import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../../components/SEO.jsx';

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-display text-h3 font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function ShippingInfo() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <SEO
        title="Shipping Info"
        description="Shipping methods, costs, and delivery timelines for UrbanPulse orders in Ghana."
        url="/shipping"
      />

      <div className="container-site" style={{ maxWidth: '48rem' }}>
        <div style={{ paddingBlock: 'var(--space-section)' }}>
          <p className="eyebrow mb-3">Policies</p>
          <h1 className="font-display text-h1 font-bold">Shipping Info</h1>
          <p className="mt-2 text-small text-muted">Last updated: 1 June 2026</p>

          <div className="mt-12 space-y-10">

            <Section title="1. Where we ship">
              <p>
                We currently ship to addresses within Ghana only. International shipping is planned
                — sign up to our newsletter to be notified when it launches.
              </p>
            </Section>

            <Section title="2. Methods and costs">
              <p>We offer two shipping methods at checkout:</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 text-left font-semibold text-text">Method</th>
                      <th className="py-3 text-left font-semibold text-text">Cost</th>
                      <th className="py-3 text-left font-semibold text-text">Estimated delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-3">Standard</td>
                      <td className="py-3">GH₵ 30</td>
                      <td className="py-3">5–7 business days</td>
                    </tr>
                    <tr>
                      <td className="py-3">Express</td>
                      <td className="py-3">GH₵ 80</td>
                      <td className="py-3">2–3 business days</td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-text">Free standard shipping</td>
                      <td className="py-3 font-medium text-success">Free</td>
                      <td className="py-3">On orders over GH₵ 1,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Delivery estimates are from the dispatch date, not the order date. Estimates are
                not guarantees — delays can occur during public holidays or high-demand periods.
              </p>
            </Section>

            <Section title="3. Processing time">
              <p>
                All orders are processed within 1–2 business days of confirmed payment. Orders
                placed on weekends or public holidays are processed on the next business day.
                You will receive a dispatch confirmation with tracking details once your order
                leaves our warehouse.
              </p>
            </Section>

            <Section title="4. Order tracking">
              <p>
                Once your order is dispatched, you will receive a tracking number by email and
                SMS. You can also check the status of your order at any time by logging in to
                your account and going to <strong className="text-text">Orders</strong>.
              </p>
            </Section>

            <Section title="5. Pickup option">
              {/* TODO: update when in-store pickup is available */}
              <p>
                In-store pickup at our Accra location is coming soon. We will update this page
                and notify newsletter subscribers when it is available.
              </p>
            </Section>

            <Section title="6. Delivery address">
              <p>
                We ship to the exact address provided at checkout. Please double-check your
                address before placing your order — we cannot redirect shipments once they are
                dispatched.
              </p>
              <p>
                We recommend using a{' '}
                <strong className="text-text">GhanaPostGPS digital address</strong> (format:
                GA-123-4567) for the most accurate delivery, especially in areas where street
                addresses can be ambiguous.
              </p>
            </Section>

            <Section title="7. Failed deliveries">
              <p>
                If you are not available to receive your order, the courier will attempt delivery
                a second time. After two failed attempts, the package is returned to us and we
                will contact you to arrange redelivery. A redelivery fee may apply.
              </p>
            </Section>

            <Section title="8. Cash on Delivery">
              <p>
                Cash on Delivery (COD) is available across Ghana. After placing a COD order, a
                member of our team will call or WhatsApp you to confirm the order and delivery
                details before dispatching.
              </p>
              <p>
                Payment is made directly to the courier at the time of delivery. Please have the
                exact amount ready. COD orders that cannot be confirmed by phone within
                24 hours may be cancelled.
              </p>
            </Section>

            <Section title="9. International shipping (coming soon)">
              {/* TODO: update with rates and carriers when international shipping launches */}
              <p>
                We plan to ship internationally in the future. When international shipping
                launches, import duties, taxes, and customs fees for the destination country will
                be the recipient's responsibility. These are not included in the shipping fee
                charged at checkout.
              </p>
            </Section>

          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-6 lg:bottom-8 z-30 rounded-full bg-surface border border-border shadow-md px-4 py-2 text-xs font-medium hover:border-accent hover:text-accent transition-colors"
            aria-label="Back to top"
          >
            ↑ Top
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
