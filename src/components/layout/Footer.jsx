import { Link } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Instagram, Twitter, Youtube } from 'lucide-react';
import { Button } from '../ui/index.jsx';
import { useCookieConsent } from '../../lib/CookieConsentContext.jsx';
import toast from 'react-hot-toast';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { to: '/shop', label: 'All Products' },
      { to: '/shop?category=Outerwear', label: 'Outerwear' },
      { to: '/shop?category=Pants', label: 'Pants' },
      { to: '/shop?category=Accessories', label: 'Accessories' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/faq',            label: 'FAQ' },
      { to: '/shipping',       label: 'Shipping info' },
      { to: '/returns-policy', label: 'Returns' },
      { to: '/contact',        label: 'Contact us' },
      { to: '/account',        label: 'My Orders' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'Our Story' },
      { to: '/lookbook', label: 'Lookbook' },
      { to: '/sustainability', label: 'Sustainability' },
      { to: '/careers', label: 'Careers' },
    ],
  },
];

function MobileColumn({ col }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 font-display font-semibold"
      >
        {col.title}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {col.links.map((l) => (
              <li key={l.to} className="pb-3">
                <Link to={l.to} className="text-muted hover:text-accent transition-colors">{l.label}</Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Footer() {
  const { openCustomize } = useCookieConsent();
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="container-site py-[var(--space-section)]">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Newsletter */}
          <div className="lg:col-span-2">
            <p className="eyebrow mb-3">Stay in the loop</p>
            <h3 className="text-h2 font-display mb-3">Get first dibs on drops.</h3>
            <p className="text-muted mb-6 max-w-md text-small">
              First access to new releases, restocks, and members-only essays. No spam — ever.
            </p>
            <form
              className="flex gap-2 max-w-md"
              onSubmit={(e) => { e.preventDefault(); toast.success('Subscribed!'); }}
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                className="input flex-1"
              />
              <Button type="submit">Subscribe</Button>
            </form>
            <div className="flex gap-3 mt-6">
              <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-highlight hover:border-accent transition-colors">
                <Instagram size={16} />
              </a>
              <a href="#" aria-label="Twitter / X" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-highlight hover:border-accent transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" aria-label="YouTube" className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-highlight hover:border-accent transition-colors">
                <Youtube size={16} />
              </a>
            </div>
          </div>

          {/* Desktop columns */}
          <div className="hidden md:grid md:grid-cols-3 gap-8 lg:col-span-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="font-display font-semibold mb-4">{col.title}</h4>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="text-muted hover:text-accent transition-colors text-small">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile accordions */}
          <div className="md:hidden">
            {COLUMNS.map((c) => <MobileColumn key={c.title} col={c} />)}
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-12 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-small text-muted">
          <span>© {new Date().getFullYear()} UrbanPulse · Made in Ghana</span>
          <div className="flex flex-wrap gap-5">
            <Link to="/privacy"        className="hover:text-accent transition-colors">Privacy</Link>
            <Link to="/terms"          className="hover:text-accent transition-colors">Terms</Link>
            <Link to="/returns-policy" className="hover:text-accent transition-colors">Returns</Link>
            <Link to="/shipping"       className="hover:text-accent transition-colors">Shipping</Link>
            <Link to="/contact"        className="hover:text-accent transition-colors">Contact</Link>
            <button type="button" onClick={openCustomize} className="hover:text-accent transition-colors">Cookie settings</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
