import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, MapPin, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/index.jsx';
import SEO from '../../components/SEO.jsx';
import { useSetting } from '../../stores/settingsStore.js';

const SUBJECTS = [
  'Order question',
  'Returns & refunds',
  'Wholesale inquiry',
  'Press',
  'Other',
];

// Fallback only; the live value comes from Admin → Settings (support_email).
const FALLBACK_EMAIL = 'noreply.urbanpulse0@gmail.com';

export default function Contact() {
  const supportEmail = useSetting('support_email', FALLBACK_EMAIL) || FALLBACK_EMAIL;
  const whatsapp = String(useSetting('support_whatsapp', '') || '').replace(/[^\d]/g, '');
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const messageRef = useRef(null);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())    e.name    = 'Name is required.';
    if (!form.email.trim())   e.email   = 'Email is required.';
    if (!form.message.trim()) e.message = 'Message is required.';
    return e;
  }

  function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      (errs.name ? nameRef : errs.email ? emailRef : messageRef).current?.focus();
      return;
    }
    // There is no contact endpoint, and this form used to show "Message
    // received" without sending anything. It now opens the customer's own
    // email app with the message filled in, and says exactly that.
    const subject = `${form.subject} · ${form.name}`;
    const body = `${form.message}

${form.name}
${form.email}`;
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  }

  // Only real, configured channels. The WhatsApp, phone and Instagram
  // entries used to be "+233 XX XXX XXXX" placeholders and a dead link.
  const contactMethods = [
    { icon: Mail, label: 'Email', value: supportEmail, href: `mailto:${supportEmail}` },
    ...(whatsapp
      ? [{ icon: MessageSquare, label: 'WhatsApp', value: `+${whatsapp}`, href: `https://wa.me/${whatsapp}` }]
      : []),
  ];

  return (
    <>
      <SEO
        title="Contact"
        description="Get in touch with the UrbanPulse team · order questions, returns, or anything else."
        url="/contact"
      />

      <div className="container-site" style={{ paddingBlock: 'var(--space-section)' }}>
        <div className="grid gap-16 lg:grid-cols-2">

          {/* Left · contact info */}
          <div>
            <p className="eyebrow mb-3">Get in touch</p>
            <h1 className="font-display text-h1 font-bold">We're here to help.</h1>
            <p className="mt-4 text-muted leading-relaxed max-w-md">
              Questions about your order, a return, or anything else? Get in touch and
              you'll hear back from the founder directly.
            </p>

            {/* Contact method cards */}
            <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {contactMethods.map(({ icon: Icon, label, value, href }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="card p-4 flex items-start gap-3 hover:border-accent transition-colors group"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent-text mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="eyebrow mb-0.5">{label}</p>
                    <p className="text-sm text-text group-hover:text-accent-text transition-colors">{value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Address */}
            <div className="mt-8 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-accent-text mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Accra, Ghana</p>
                {/* TODO: Add physical address when confirmed */}
                <p className="text-xs text-muted mt-0.5">Physical address coming soon</p>
              </div>
            </div>
          </div>

          {/* Right · contact form */}
          <div>
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card p-8 flex flex-col items-center text-center gap-4 h-full justify-center"
                >
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                    <CheckCircle className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-display text-h3 font-semibold">Your email is ready to send.</p>
                    <p className="mt-2 text-sm text-muted">
                      Your email app should have opened with your message filled in. Press send there.
                      If nothing opened, email us at{' '}
                      <a className="text-accent-text underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={submit}
                  noValidate
                  className="card p-8 space-y-5"
                >
                  <h2 className="font-display text-h3 font-semibold">Send a message</h2>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Name <span className="text-error">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      type="text"
                      required
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      className={`input ${errors.name ? 'border-error' : ''}`}
                      placeholder="Your name"
                    />
                    <div className="mt-1 min-h-[1rem] text-xs text-error">{errors.name}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Email <span className="text-error">*</span>
                    </label>
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      className={`input ${errors.email ? 'border-error' : ''}`}
                      placeholder="you@email.com"
                    />
                    <div className="mt-1 min-h-[1rem] text-xs text-error">{errors.email}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setField('subject', e.target.value)}
                      className="select"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Message <span className="text-error">*</span>
                    </label>
                    <textarea
                      ref={messageRef}
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setField('message', e.target.value)}
                      className={`textarea resize-none ${errors.message ? 'border-error' : ''}`}
                      placeholder="How can we help?"
                    />
                    <div className="mt-1 min-h-[1rem] text-xs text-error">{errors.message}</div>
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    Continue in my email app
                  </Button>

                  <p className="text-xs text-muted text-center">
                    We typically reply within one business day.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </>
  );
}
