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

export default function ReturnsPolicy() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <SEO
        title="Returns Policy"
        description="How to return an UrbanPulse order, what's eligible, and how refunds are processed."
        url="/returns-policy"
      />

      <div className="container-site" style={{ maxWidth: '48rem' }}>
        <div style={{ paddingBlock: 'var(--space-section)' }}>
          <p className="eyebrow mb-3">Policies</p>
          <h1 className="font-display text-h1 font-bold">Returns Policy</h1>
          <p className="mt-2 text-small text-muted">Last updated: 1 June 2026</p>

          <div className="mt-12 space-y-10">

            <Section title="1. Return eligibility">
              <p>
                We accept returns on items that meet all of the following conditions:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>Unworn and unwashed — in the same condition as received</li>
                <li>Original hang tags still attached</li>
                <li>Original packaging included where possible</li>
                <li>Return requested within 30 days of the delivery date</li>
              </ul>
            </Section>

            <Section title="2. Non-returnable items">
              <p>The following items cannot be returned under any circumstances:</p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>Items marked as Final Sale at the time of purchase</li>
                <li>Undergarments and swimwear (for hygiene reasons)</li>
                <li>Customised or personalised pieces</li>
                <li>Items that have been worn, washed, or altered</li>
              </ul>
            </Section>

            <Section title="3. How to request a return">
              <p>
                Returns are initiated through your account — there is no need to contact support
                first for standard returns:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 mt-2">
                <li>Log in to your account at urbanpulse.com.gh</li>
                <li>Go to <strong className="text-text">Orders</strong> and find the relevant delivered order</li>
                <li>Click <strong className="text-text">Request return</strong></li>
                <li>Select the items you wish to return, the reason, and your preferred resolution (refund or exchange)</li>
                <li>Submit — you will receive a confirmation email</li>
              </ol>
              <p>
                Returns can only be requested within 30 days of the delivery date.
              </p>
            </Section>

            <Section title="4. What happens next">
              <p>
                Our team reviews all return requests within 2 business days. If approved, you
                will receive an email with return shipping instructions and the address to send
                your item to.
              </p>
              <p>
                Unless the item is defective or we sent the wrong item (see section 7), the cost
                of return postage is the customer's responsibility. We recommend using a tracked
                service — we cannot process refunds for items that do not arrive.
              </p>
            </Section>

            <Section title="5. Inspection and refunds">
              <p>
                Once we receive your return, we inspect it within 2 business days. Refunds are
                processed within 5 business days of a successful inspection.
              </p>
              <p>Refund options:</p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>
                  <strong className="text-text">Original payment method</strong> (card or mobile
                  money via Paystack) — refund typically appears in your account within
                  5–10 business days after processing
                </li>
                <li>
                  <strong className="text-text">Store credit</strong> — issued instantly to your
                  UrbanPulse account balance; no transaction fee deducted; can be used on any
                  future order
                </li>
              </ul>
            </Section>

            <Section title="6. Exchanges">
              <p>
                Exchanges follow the same return process — simply select "Exchange" as your
                resolution type when submitting the request. Exchanges are subject to the
                availability of the requested item at the time your return is processed.
              </p>
              <p>
                If the requested exchange item is unavailable, we will issue a refund instead.
              </p>
            </Section>

            <Section title="7. Defective or incorrect items">
              <p>
                If you received a defective item or we sent you the wrong item, please contact
                our support team immediately with photos of the issue. In these cases:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>We will cover the full cost of return shipping</li>
                <li>Your return will be prioritised</li>
                <li>You may request a full refund, exchange, or store credit</li>
              </ul>
              <p>
                Contact:{' '}
                <a href="mailto:support@urbanpulse.com.gh" className="text-accent hover:text-accent-hover">
                  support@urbanpulse.com.gh
                </a>{' '}
                or via our{' '}
                <Link to="/contact" className="text-accent hover:text-accent-hover">
                  contact page
                </Link>
                .
              </p>
            </Section>

            <Section title="8. Refund timing">
              <p>
                Paystack refunds to the original card or mobile money account typically appear
                within 5–10 business days after we initiate them, depending on your bank or
                mobile money provider.
              </p>
              <p>
                Store credit is added to your account balance instantly once the return is
                approved.
              </p>
            </Section>

            <Section title="9. Order cancellations">
              <p>
                Orders can be cancelled before they are dispatched. Contact us as soon as
                possible at{' '}
                <a href="mailto:support@urbanpulse.com.gh" className="text-accent hover:text-accent-hover">
                  support@urbanpulse.com.gh
                </a>{' '}
                or via{' '}
                <Link to="/contact" className="text-accent hover:text-accent-hover">
                  our contact page
                </Link>
                . Once an order has been dispatched, it cannot be cancelled — please use the
                returns process instead.
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
