// TODO: Have a Ghana-licensed lawyer review before launch.
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-display text-h3 font-semibold mb-3">{title}</h2>
      <div className="space-y-3 text-muted leading-relaxed">{children}</div>
    </section>
  );
}

export default function Terms() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Terms of Service — UrbanPulse</title>
        <meta name="description" content="Terms and conditions governing use of UrbanPulse, a Ghanaian online streetwear retailer." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container-site" style={{ maxWidth: '48rem' }}>
        <div style={{ paddingBlock: 'var(--space-section)' }}>
          <p className="eyebrow mb-3">Policies</p>
          <h1 className="font-display text-h1 font-bold">Terms of Service</h1>
          <p className="mt-2 text-small text-muted">Last updated: 1 June 2026</p>

          <div className="mt-12 space-y-10">

            <Section title="1. Acceptance of terms">
              <p>
                By accessing or using urbanpulse.com.gh (the "Site"), creating an account, or
                placing an order, you agree to be bound by these Terms of Service. If you do not
                agree, please do not use our services.
              </p>
            </Section>

            <Section title="2. About us">
              <p>
                UrbanPulse is an online streetwear and accessories retailer operating in Ghana.
              </p>
              <p>
                {/* TODO: insert business registration number when registered */}
                Business registration number: [TODO — insert on registration]
                <br />
                Contact:{' '}
                <a href="mailto:support@urbanpulse.com.gh" className="text-accent hover:text-accent-hover">
                  support@urbanpulse.com.gh
                </a>
              </p>
            </Section>

            <Section title="3. Your account">
              <p>
                When you create an account, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>Provide accurate, current, and complete registration information</li>
                <li>Maintain one account per person — multiple accounts are not permitted</li>
                <li>Keep your password secure and not share it with others</li>
                <li>
                  Notify us immediately at{' '}
                  <a href="mailto:support@urbanpulse.com.gh" className="text-accent hover:text-accent-hover">
                    support@urbanpulse.com.gh
                  </a>{' '}
                  if you believe your account has been accessed without authorisation
                </li>
              </ul>
              <p>
                You are responsible for all activity that occurs under your account.
              </p>
            </Section>

            <Section title="4. Orders and pricing">
              <p>
                All prices are in Ghana Cedis (GH₵) and include 12.5% VAT unless otherwise
                stated. We reserve the right to correct pricing errors before an order is
                fulfilled — in that case, we will contact you before proceeding.
              </p>
              <p>
                We reserve the right to refuse or cancel any order at our discretion, including
                where items are out of stock, where we suspect fraud, or where an order contains
                an error. Stock availability is not guaranteed until checkout is complete and
                payment is confirmed.
              </p>
            </Section>

            <Section title="5. Payment">
              <p>
                We accept payment via Paystack (card, mobile money, and bank transfer) and Cash
                on Delivery (COD). All Paystack transactions are subject to Paystack's terms and
                security requirements. COD orders require phone confirmation before dispatch.
              </p>
              <p>
                By placing an order, you authorise us to charge the total amount to your chosen
                payment method.
              </p>
            </Section>

            <Section title="6. Shipping and delivery">
              <p>
                Delivery methods, costs, and timelines are described in our{' '}
                <Link to="/shipping" className="text-accent hover:text-accent-hover">
                  Shipping Info
                </Link>{' '}
                page, which forms part of these terms.
              </p>
            </Section>

            <Section title="7. Returns and refunds">
              <p>
                Our returns and refund process is described in our{' '}
                <Link to="/returns-policy" className="text-accent hover:text-accent-hover">
                  Returns Policy
                </Link>
                , which forms part of these terms.
              </p>
            </Section>

            <Section title="8. Intellectual property">
              <p>
                All content on the Site — including text, product images, graphics, logos, and
                the UrbanPulse brand — is owned by or licensed to UrbanPulse. Purchasing a
                product does not transfer any intellectual property rights to you. You may not
                reproduce, distribute, or create derivative works from our content without prior
                written consent.
              </p>
            </Section>

            <Section title="9. User-generated content">
              <p>
                By submitting a product review or other content on the Site, you grant UrbanPulse
                a non-exclusive, royalty-free, perpetual licence to display, reproduce, and
                distribute that content in connection with our products and services. You confirm
                that you own the rights to any content you submit and that it does not infringe
                any third-party rights.
              </p>
              <p>
                We reserve the right to remove any user-submitted content that violates these
                terms, is abusive, false, or otherwise inappropriate.
              </p>
            </Section>

            <Section title="10. Prohibited uses">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>Use the Site for any unlawful purpose</li>
                <li>Commit or facilitate fraud, including chargeback fraud</li>
                <li>Use automated tools to scrape, crawl, or harvest data from the Site</li>
                <li>Attempt to reverse-engineer, decompile, or interfere with any part of the Site</li>
                <li>Harass, impersonate, or threaten other users or our staff</li>
                <li>Submit false reviews or ratings</li>
              </ul>
            </Section>

            <Section title="11. Limitation of liability">
              <p>
                To the maximum extent permitted by Ghanaian law, UrbanPulse is not liable for
                any indirect, incidental, special, or consequential damages arising from your use
                of the Site or our products. Our total liability for any claim arising out of
                these terms shall not exceed the amount you paid for the relevant order.
              </p>
              <p>
                Nothing in these terms limits our liability for death or personal injury caused
                by our negligence, or for fraudulent misrepresentation, as required by Ghanaian
                law.
              </p>
            </Section>

            <Section title="12. Account suspension and termination">
              <p>
                We may suspend or terminate your account at any time, without prior notice, if we
                believe you have violated these terms or if required by law. On termination, your
                right to use the Site ceases immediately. Provisions of these terms that by their
                nature should survive termination will do so.
              </p>
            </Section>

            <Section title="13. Governing law">
              <p>
                These terms are governed by and construed in accordance with the laws of Ghana.
                Any dispute arising out of or in connection with these terms shall be subject to
                the exclusive jurisdiction of the courts of Accra, Ghana.
              </p>
            </Section>

            <Section title="14. Changes to these terms">
              <p>
                We may update these terms from time to time. If we make material changes, we will
                notify registered users by email at least 14 days before the changes take effect
                and update the "Last updated" date above. Continued use of the Site after changes
                take effect constitutes acceptance of the revised terms.
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
