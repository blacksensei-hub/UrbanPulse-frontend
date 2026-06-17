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

export default function PrivacyPolicy() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>Privacy Policy — UrbanPulse</title>
        <meta name="description" content="How UrbanPulse collects, uses, and protects your personal data under Ghana's Data Protection Act." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container-site" style={{ maxWidth: '48rem' }}>
        <div style={{ paddingBlock: 'var(--space-section)' }}>
          <p className="eyebrow mb-3">Policies</p>
          <h1 className="font-display text-h1 font-bold">Privacy Policy</h1>
          <p className="mt-2 text-small text-muted">Last updated: 1 June 2026</p>

          <div className="mt-12 space-y-10">

            <Section title="1. Introduction">
              <p>
                UrbanPulse is an online streetwear and accessories retailer based in Accra, Ghana.
                This Privacy Policy explains what personal data we collect when you use our website
                and services, why we collect it, how we use and protect it, and what rights you
                have over it.
              </p>
              <p>
                By creating an account or placing an order, you acknowledge that you have read this
                policy. If you do not agree with how we handle personal data, please do not use our
                services.
              </p>
            </Section>

            <Section title="2. Data we collect">
              <p>We collect the following categories of personal data:</p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>
                  <strong className="text-text">Account data</strong> — your name, email address,
                  phone number, and hashed password when you register.
                </li>
                <li>
                  <strong className="text-text">Order data</strong> — shipping address, items
                  purchased, order history, and payment status.
                </li>
                <li>
                  <strong className="text-text">Payment data</strong> — all payment processing is
                  handled by Paystack. We never see or store your card details, mobile money PIN,
                  or bank credentials. Paystack is PCI-DSS certified.
                </li>
                <li>
                  <strong className="text-text">Browsing data</strong> — pages you view, items
                  added to your cart or wishlist, and session information for authentication.
                </li>
                <li>
                  <strong className="text-text">Communications</strong> — emails, SMS messages, and
                  WhatsApp messages you exchange with our support team.
                </li>
              </ul>
            </Section>

            <Section title="3. How we use your data">
              <p>We use personal data only for the purposes described below:</p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>Fulfilling and delivering your orders</li>
                <li>Sending order confirmations, shipping updates, and delivery notifications</li>
                <li>Responding to support requests and returns</li>
                <li>Detecting and preventing fraud or abuse</li>
                <li>Improving the website and shopping experience</li>
                <li>
                  Sending marketing communications — only if you have opted in; you can
                  unsubscribe at any time
                </li>
              </ul>
              <p>We do not use automated decision-making that has legal effects on you.</p>
            </Section>

            <Section title="4. Who we share data with">
              <p>
                We share personal data only with the third parties necessary to operate our
                service:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>
                  <strong className="text-text">Paystack</strong> — payment processing (card,
                  mobile money, bank transfer)
                </li>
                <li>
                  <strong className="text-text">Shipping partners</strong> — your name and
                  delivery address are shared with the courier handling your order
                </li>
                <li>
                  <strong className="text-text">Email and SMS providers</strong> — for order
                  notifications and transactional messages
                </li>
              </ul>
              <p>
                We do not sell, rent, or trade your personal data to advertisers or any other
                third parties for their own marketing purposes.
              </p>
            </Section>

            <Section title="5. Cookies and tracking">
              <p>
                We use session cookies to keep you logged in during your visit. These are
                strictly necessary and cannot be turned off without breaking authentication.
              </p>
              <p>
                We do not currently use any third-party analytics trackers or advertising pixels.
                If this changes, we will update this policy and notify registered users.
              </p>
            </Section>

            <Section title="6. Your rights under Ghana's Data Protection Act">
              <p>
                Under the Data Protection Act, 2012 (Act 843), you have the following rights
                regarding the personal data we hold about you:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>
                  <strong className="text-text">Access</strong> — request a copy of the personal
                  data we hold about you
                </li>
                <li>
                  <strong className="text-text">Correction</strong> — ask us to correct inaccurate
                  or incomplete data
                </li>
                <li>
                  <strong className="text-text">Deletion</strong> — request that we delete your
                  account and associated data, subject to legal retention obligations
                </li>
                <li>
                  <strong className="text-text">Objection</strong> — object to processing of your
                  data for marketing purposes at any time
                </li>
                <li>
                  <strong className="text-text">Complaint</strong> — lodge a complaint with
                  Ghana's{' '}
                  <a
                    href="https://dataprotection.org.gh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                  >
                    Data Protection Commission
                  </a>
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:support@urbanpulse.com.gh" className="text-accent hover:text-accent-hover">
                  support@urbanpulse.com.gh
                </a>
                . We will respond within 30 days.
              </p>
            </Section>

            <Section title="7. Data retention">
              <p>
                We retain order records for 7 years to comply with Ghanaian tax and commercial law.
                If you request deletion of your account, we will delete or anonymise all personal
                data not subject to legal retention obligations within 30 days.
              </p>
              <p>
                Session data and cart contents are cleared when you log out or after a period of
                inactivity.
              </p>
            </Section>

            <Section title="8. Security">
              <p>
                We take reasonable technical and organisational measures to protect your personal
                data:
              </p>
              <ul className="list-disc list-inside space-y-1.5 mt-2">
                <li>Passwords are hashed using industry-standard algorithms; we cannot retrieve them</li>
                <li>All data transmitted to and from our website uses HTTPS encryption</li>
                <li>Two-factor authentication (2FA) is available for your account</li>
                <li>No payment card data is ever stored on our servers (handled by Paystack)</li>
              </ul>
              <p>
                No system is completely secure. If you believe your account has been compromised,
                contact us immediately.
              </p>
            </Section>

            <Section title="9. Children">
              <p>
                Our services are not directed at persons under 18 years of age. We do not
                knowingly collect personal data from minors. If you believe a child has provided
                us with personal data, please contact us so we can delete it.
              </p>
            </Section>

            <Section title="10. International data transfers">
              <p>
                Paystack and our email and SMS service providers may process your data on servers
                located outside Ghana. Where this occurs, we take steps to ensure your data is
                handled with an equivalent level of protection, including reviewing the data
                protection practices of our providers.
              </p>
            </Section>

            <Section title="11. Changes to this policy">
              <p>
                If we make material changes to this policy, we will notify registered users by
                email at least 14 days before the changes take effect. We will also update the
                "Last updated" date at the top of this page. Continued use of the service after
                changes take effect constitutes acceptance of the revised policy.
              </p>
            </Section>

            <Section title="12. Contact">
              <p>
                Questions about this policy or your personal data? Reach us at{' '}
                <a href="mailto:support@urbanpulse.com.gh" className="text-accent hover:text-accent-hover">
                  support@urbanpulse.com.gh
                </a>{' '}
                or through our{' '}
                <Link to="/contact" className="text-accent hover:text-accent-hover">
                  contact page
                </Link>
                .
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
