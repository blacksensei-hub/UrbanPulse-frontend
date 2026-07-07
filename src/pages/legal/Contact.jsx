import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MessageSquare, MapPin, CheckCircle, Instagram } from 'lucide-react';
import { Button } from '../../components/ui/index.jsx';
import SEO from '../../components/SEO.jsx';

const SUBJECTS = [
  'Order question',
  'Returns & refunds',
  'Wholesale inquiry',
  'Press',
  'Other',
];

export default function Contact() {
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
    // TODO: Wire to POST /api/contact when backend endpoint is built — for now shows success without sending.
    setSubmitted(true);
  }

  const contactMethods = [
    {
      icon: Mail,
      label: 'Email',
      value: 'support@urbanpulse.com.gh',
      href: 'mailto:support@urbanpulse.com.gh',
    },
    {
      icon: MessageSquare,
      label: 'WhatsApp',
      // TODO: Replace with real WhatsApp number
      value: '+233 XX XXX XXXX',
      href: 'https://wa.me/233XXXXXXXXX',
    },
    {
      icon: Instagram,
      label: 'Instagram',
      // TODO: Replace with real Instagram profile link
      value: '@urbanpulse.gh',
      href: '#',
    },
    {
      icon: Phone,
      label: 'Phone',
      // TODO: Replace with real phone number
      value: '+233 XX XXX XXXX',
      href: 'tel:+233XXXXXXXXX',
    },
  ];

  return (
    <>
      <SEO
        title="Contact"
        description="Get in touch with the UrbanPulse team — order questions, returns, or anything else."
        url="/contact"
      />

      <div className="container-site" style={{ paddingBlock: 'var(--space-section)' }}>
        <div className="grid gap-16 lg:grid-cols-2">

          {/* Left — contact info */}
          <div>
            <p className="eyebrow mb-3">Get in touch</p>
            <h1 className="font-display text-h1 font-bold">We're here to help.</h1>
            <p className="mt-4 text-muted leading-relaxed max-w-md">
              Questions about your order, a return, or anything else — our team is available
              Monday to Friday and most Saturday mornings.
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
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="eyebrow mb-0.5">{label}</p>
                    <p className="text-sm text-text group-hover:text-accent transition-colors">{value}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Business hours */}
            <div className="mt-10">
              <p className="eyebrow mb-3">Business hours</p>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between max-w-xs">
                  <dt className="text-muted">Monday – Friday</dt>
                  <dd className="text-text font-medium">9am – 6pm GMT</dd>
                </div>
                <div className="flex justify-between max-w-xs">
                  <dt className="text-muted">Saturday</dt>
                  <dd className="text-text font-medium">10am – 4pm GMT</dd>
                </div>
                <div className="flex justify-between max-w-xs">
                  <dt className="text-muted">Sunday</dt>
                  <dd className="text-muted">Closed</dd>
                </div>
              </dl>
            </div>

            {/* Address */}
            <div className="mt-8 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Accra, Ghana</p>
                {/* TODO: Add physical address when confirmed */}
                <p className="text-xs text-muted mt-0.5">Physical address coming soon</p>
              </div>
            </div>
          </div>

          {/* Right — contact form */}
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
                    <p className="font-display text-h3 font-semibold">Message received.</p>
                    <p className="mt-2 text-sm text-muted">
                      Thanks — we'll reply within one business day.
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
                    Send message
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
