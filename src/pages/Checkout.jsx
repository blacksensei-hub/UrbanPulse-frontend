import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, Lock, Phone, Truck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

import { Button, Input } from '../components/ui/index.jsx';
import { useCartStore } from '../stores/cartStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { orderService, loyaltyService } from '../services/index.js';
import { useViewAs } from '../hooks/useViewAs.js';
import { formatCurrency, cn } from '../utils/format.js';
import { fadeInUp } from '../lib/motion.js';
import { useFeature, useSetting } from '../stores/settingsStore.js';

const STEPS = ['Information', 'Shipping', 'Payment'];

export default function Checkout() {
  const navigate = useNavigate();
  const { cart }  = useCartStore();
  const user      = useAuthStore((s) => s.user);
  const items     = cart?.items ?? [];
  const prefersReduced = useReducedMotion();
  const { isViewAs } = useViewAs();
  const codEnabled      = useFeature('cod');
  const paystackEnabled = useFeature('paystack');
  const loyaltyEnabled  = useFeature('loyalty');
  const stdRate    = Number(useSetting('shipping_standard_ghs', '30'));
  const expRate    = Number(useSetting('shipping_express_ghs', '80'));
  const freeThresh = Number(useSetting('free_shipping_threshold_ghs', '1000'));

  const [step, setStep]                 = useState(0);
  const [justCompleted, setJustCompleted] = useState(null);
  const prevStepRef = useRef(0);
  const [submitting, setSubmitting]     = useState(false);
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError]   = useState('');
  const [applyCredit, setApplyCredit]   = useState(false);
  const [creditInput, setCreditInput]   = useState(0);
  const [loyalty, setLoyalty]           = useState(null);
  const [applyPoints, setApplyPoints]   = useState(false);
  const [pointsInput, setPointsInput]   = useState(0);
  const [form, setForm] = useState({
    email:         user?.email ?? '',
    firstName:     '',
    lastName:      '',
    address:       '',
    apartment:     '',
    city:          '',
    state:         '',
    zip:           '',
    country:       'Ghana',
    phone:         '',
    shipping:      'standard',
    coupon:        '',
    paymentMethod: 'mobile_money',
  });

  const subtotal         = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const shippingCost     = form.shipping === 'express' ? expRate : subtotal >= freeThresh ? 0 : stdRate;
  const discount         = couponPreview?.discount ?? 0;
  const effectiveShipping = couponPreview?.type === 'free_shipping' ? 0 : shippingCost;
  const availableCredit  = Number(user?.store_credit_ghs ?? 0);
  const preCreditTotal   = subtotal + effectiveShipping - discount;
  const creditUsed       = applyCredit
    ? Math.min(creditInput || availableCredit, availableCredit, preCreditTotal)
    : 0;
  // Stacking precedence: coupon → store credit → loyalty points (points applied last).
  const preLoyaltyTotal  = preCreditTotal - creditUsed;
  const redeemRate       = Number(loyalty?.redeem_rate_ghs ?? 0.1);
  const minRedeemPoints  = Number(loyalty?.min_redeem_points ?? 100);
  const pointsBalance    = Number(loyalty?.balance ?? 0);
  const maxEligiblePoints = Math.max(0, Math.min(pointsBalance, Math.floor(preLoyaltyTotal / redeemRate)));
  const pointsUsed        = applyPoints
    ? Math.min(pointsInput || maxEligiblePoints, maxEligiblePoints)
    : 0;
  const pointsCediUsed    = +(pointsUsed * redeemRate).toFixed(2);
  const total = preLoyaltyTotal - pointsCediUsed;

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleCouponBlur() {
    const code = form.coupon.trim();
    if (!code) { setCouponPreview(null); setCouponError(''); return; }
    setCouponLoading(true); setCouponError('');
    try {
      const result = await orderService.previewCoupon({ coupon_code: code, subtotal, shipping_method: form.shipping });
      setCouponPreview(result); setCouponError('');
    } catch (err) {
      setCouponPreview(null);
      setCouponError(err?.response?.data?.message ?? 'Invalid coupon code');
    } finally { setCouponLoading(false); }
  }

  useEffect(() => {
    if (!form.coupon) { setCouponPreview(null); setCouponError(''); }
  }, [form.coupon]);

  useEffect(() => {
    if (user && loyaltyEnabled) loyaltyService.me().then(setLoyalty).catch(() => {});
  }, [user, loyaltyEnabled]);

  useEffect(() => {
    if (step > prevStepRef.current) {
      setJustCompleted(prevStepRef.current);
      const t = setTimeout(() => setJustCompleted(null), 400);
      prevStepRef.current = step;
      return () => clearTimeout(t);
    }
    prevStepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!paystackEnabled && (form.paymentMethod === 'mobile_money' || form.paymentMethod === 'card')) {
      setField('paymentMethod', codEnabled ? 'cod' : '');
    }
    if (!codEnabled && form.paymentMethod === 'cod') {
      setField('paymentMethod', paystackEnabled ? 'mobile_money' : '');
    }
  }, [paystackEnabled, codEnabled]);

  async function placeOrder() {
    if (isViewAs) return toast.error('Checkout is disabled in view-as mode.');
    if (items.length === 0) return toast.error('Your cart is empty');
    if (form.paymentMethod === 'cod' && !form.phone.trim()) {
      return toast.error('Phone number is required for Cash on Delivery');
    }
    setSubmitting(true);
    try {
      const isCOD  = form.paymentMethod === 'cod';
      const order  = await orderService.create({
        email: form.email,
        shipping_address: {
          name:    `${form.firstName} ${form.lastName}`.trim(),
          line1:   form.address,
          line2:   form.apartment,
          city:    form.city,
          state:   form.state,
          zip:     form.zip,
          country: form.country,
          phone:   form.phone,
        },
        shipping_method:          form.shipping,
        coupon_code:              form.coupon || undefined,
        payment_method:           isCOD ? 'cod' : 'paystack',
        apply_store_credit_ghs:   creditUsed > 0 ? creditUsed : undefined,
        apply_loyalty_points:     pointsUsed > 0 ? pointsUsed : undefined,
      });
      if (isCOD) { navigate(`/order-success?id=${order.id}&cod=1`); return; }
      const session = await orderService.checkout(order.id, form.paymentMethod);
      if (session?.url) { window.location.href = session.url; }
      else { navigate(`/order-success?id=${order.id}`); }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not place order');
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-site py-24 text-center">
        <h1 className="font-display text-h2 font-bold">Your cart is empty</h1>
        <Link to="/shop" className="mt-4 inline-block text-accent">Browse the shop</Link>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Checkout — UrbanPulse</title></Helmet>

      <div className="container-site py-8 md:py-12">
        <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ChevronLeft className="h-4 w-4" /> Back to cart
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px]">
          <div>
            {/* Pill stepper */}
            <ol className="mb-10 flex items-center">
              {STEPS.map((s, i) => (
                <li key={s} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
                  <motion.button
                    type="button"
                    onClick={() => i < step && setStep(i)}
                    disabled={i > step}
                    animate={justCompleted === i && !prefersReduced ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-all',
                      i <= step ? 'bg-accent text-white' : 'bg-border text-muted cursor-default',
                      i < step && 'cursor-pointer hover:bg-accent-hover',
                    )}
                  >
                    {i < step && <Check className="h-3 w-3" />}
                    {i === step && !prefersReduced && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    )}
                    {s}
                  </motion.button>
                  {i < STEPS.length - 1 && (
                    <div className="mx-2 h-px flex-1 overflow-hidden bg-border relative">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-accent"
                        initial={{ width: 0 }}
                        animate={{ width: i < step ? '100%' : '0%' }}
                        transition={prefersReduced ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -10 }}
                className="card p-6 md:p-8"
              >
                {/* ── Step 0: Information ── */}
                {step === 0 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-h3 font-bold">Contact</h2>
                    <Input floating type="email" label="Email" value={form.email}
                      onChange={(e) => setField('email', e.target.value)} />
                    <h2 className="pt-2 font-display text-h3 font-bold">Shipping address</h2>
                    {/* TODO: Future enhancement — integrate GhanaPostGPS digital address (GA-123-4567 format) lookup */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input floating label="First name" value={form.firstName}
                        onChange={(e) => setField('firstName', e.target.value)} />
                      <Input floating label="Last name" value={form.lastName}
                        onChange={(e) => setField('lastName', e.target.value)} />
                    </div>
                    <Input floating label="Address" value={form.address}
                      onChange={(e) => setField('address', e.target.value)} />
                    <Input floating label="Apartment, suite, etc. (optional)" value={form.apartment}
                      onChange={(e) => setField('apartment', e.target.value)} />
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Input floating label="City"  value={form.city}  onChange={(e) => setField('city',  e.target.value)} />
                      <Input floating label="State" value={form.state} onChange={(e) => setField('state', e.target.value)} />
                      <Input floating label="ZIP"   value={form.zip}   onChange={(e) => setField('zip',   e.target.value)} />
                    </div>
                    <Input floating label="Phone" value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)} />
                  </div>
                )}

                {/* ── Step 1: Shipping ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="font-display text-h3 font-bold">Shipping method</h2>
                    {[
                      { id: 'standard', title: 'Standard', meta: '5–7 business days', cost: subtotal >= freeThresh ? 'Free' : formatCurrency(stdRate) },
                      { id: 'express',  title: 'Express',  meta: '2–3 business days', cost: formatCurrency(expRate) },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={cn(
                          'flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors',
                          form.shipping === opt.id ? 'border-accent bg-accent/5' : 'border-border hover:border-text',
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <input type="radio" name="shipping" value={opt.id}
                            checked={form.shipping === opt.id}
                            onChange={() => setField('shipping', opt.id)}
                            className="accent-accent" />
                          <div>
                            <div className="font-medium">{opt.title}</div>
                            <div className="text-xs text-muted">{opt.meta}</div>
                          </div>
                        </div>
                        <div className="font-mono font-semibold">{opt.cost}</div>
                      </label>
                    ))}
                  </div>
                )}

                {/* ── Step 2: Payment ── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-h3 font-bold">Payment</h2>
                    <p className="eyebrow">Payment method</p>
                    <div className="space-y-3">
                      {paystackEnabled && (
                        <>
                          {/* Mobile Money */}
                          <label className={cn(
                            'flex cursor-pointer items-start gap-4 rounded-xl border p-5 transition-colors',
                            form.paymentMethod === 'mobile_money' ? 'border-accent bg-accent/5' : 'border-border hover:border-text',
                          )}>
                            <input type="radio" name="paymentMethod" value="mobile_money"
                              checked={form.paymentMethod === 'mobile_money'}
                              onChange={() => setField('paymentMethod', 'mobile_money')}
                              className="accent-accent mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold">Mobile Money</div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {['MTN', 'Vodafone', 'AirtelTigo'].map((n) => (
                                  <span key={n} className="rounded-full bg-border px-2 py-0.5 text-xs text-muted">{n}</span>
                                ))}
                              </div>
                              {form.paymentMethod === 'mobile_money' && (
                                <p className="mt-2 text-xs text-muted">
                                  You&rsquo;ll be redirected to Paystack to complete payment via mobile money — securely.
                                </p>
                              )}
                            </div>
                          </label>

                          {/* Card */}
                          <label className={cn(
                            'flex cursor-pointer items-start gap-4 rounded-xl border p-5 transition-colors',
                            form.paymentMethod === 'card' ? 'border-accent bg-accent/5' : 'border-border hover:border-text',
                          )}>
                            <input type="radio" name="paymentMethod" value="card"
                              checked={form.paymentMethod === 'card'}
                              onChange={() => setField('paymentMethod', 'card')}
                              className="accent-accent mt-0.5" />
                            <div className="flex-1">
                              <div className="font-semibold">Card / Bank transfer</div>
                              {form.paymentMethod === 'card' && (
                                <p className="mt-2 text-xs text-muted">
                                  You&rsquo;ll be redirected to Paystack to complete payment via card or bank transfer — securely.
                                </p>
                              )}
                            </div>
                          </label>
                        </>
                      )}

                      {codEnabled && (
                        /* Cash on Delivery */
                        <label className={cn(
                          'flex cursor-pointer items-start gap-4 rounded-xl border p-5 transition-colors',
                          form.paymentMethod === 'cod' ? 'border-accent bg-accent/5' : 'border-border hover:border-text',
                        )}>
                          <input type="radio" name="paymentMethod" value="cod"
                            checked={form.paymentMethod === 'cod'}
                            onChange={() => setField('paymentMethod', 'cod')}
                            className="accent-accent mt-0.5" />
                          <div className="flex-1">
                            <div className="font-semibold">Cash on Delivery</div>
                            <div className="text-xs text-muted mt-0.5">Pay when your order arrives</div>
                            {form.paymentMethod === 'cod' && (
                              <div className="mt-3 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
                                We&rsquo;ll call or WhatsApp you on{' '}
                                <strong>{form.phone || 'your phone number'}</strong>{' '}
                                to confirm your order before dispatch.
                              </div>
                            )}
                          </div>
                        </label>
                      )}

                      {!paystackEnabled && !codEnabled && (
                        <div className="rounded-lg border border-border p-4 text-sm text-muted">
                          Online payments are currently unavailable. Please contact us to place an order.
                        </div>
                      )}
                    </div>

                    {/* Store credit */}
                    {availableCredit > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              Apply store credit — <span className="font-mono">{formatCurrency(availableCredit)}</span> available
                            </div>
                            {applyCredit && (
                              <div className="mt-2">
                                <input type="number" min={0.01} max={availableCredit} step={0.01}
                                  value={creditInput || availableCredit}
                                  onChange={(e) => setCreditInput(Math.min(Math.max(0, Number(e.target.value)), availableCredit))}
                                  className="w-32 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm font-mono"
                                />
                              </div>
                            )}
                          </div>
                          <input type="checkbox" checked={applyCredit}
                            onChange={(e) => setApplyCredit(e.target.checked)}
                            className="accent-accent h-4 w-4" />
                        </label>
                      </div>
                    )}

                    {/* Loyalty points */}
                    {loyaltyEnabled && loyalty && loyalty.balance >= minRedeemPoints && (
                      <div className="rounded-lg border border-border p-4">
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              Redeem loyalty points — <span className="font-mono">{loyalty.balance}</span> pts available
                            </div>
                            {applyPoints && (
                              <>
                                <div className="mt-2">
                                  <input type="number" min={minRedeemPoints} max={maxEligiblePoints} step={1}
                                    value={pointsInput || maxEligiblePoints}
                                    onChange={(e) => setPointsInput(Math.min(Math.max(0, Math.floor(Number(e.target.value))), maxEligiblePoints))}
                                    className="w-32 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm font-mono"
                                  />
                                </div>
                                <p className="mt-1.5 text-xs text-muted">
                                  Use {pointsUsed} points → {formatCurrency(pointsCediUsed)} off
                                </p>
                              </>
                            )}
                          </div>
                          <input type="checkbox" checked={applyPoints}
                            onChange={(e) => setApplyPoints(e.target.checked)}
                            className="accent-accent h-4 w-4" />
                        </label>
                      </div>
                    )}

                    {/* Promo code */}
                    <div>
                      <Input label="Promo code (optional)" placeholder="WELCOME10"
                        value={form.coupon}
                        onChange={(e) => setField('coupon', e.target.value.toUpperCase())}
                        onBlur={handleCouponBlur} />
                      {couponLoading && <p className="mt-1 text-xs text-muted">Checking…</p>}
                      {!couponLoading && couponError && <p className="mt-1 text-xs text-error">{couponError}</p>}
                      {!couponLoading && couponPreview && (
                        <p className="mt-1 text-sm font-medium text-success">✓ {couponPreview.label}</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-6 flex justify-between gap-3">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>
              ) : <span />}

              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
              ) : (
                <div className="flex flex-col items-stretch gap-3 flex-1 max-w-sm ml-auto">
                  {/* Trust row */}
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3 border-t border-border text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      <Lock size={11} /> Secure checkout
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Truck size={11} /> Free shipping on {formatCurrency(freeThresh)}+
                    </span>
                    <span className="flex items-center gap-1.5">
                      {/* TODO: add real WhatsApp number */}
                      <Phone size={11} /> WhatsApp +233 XX XXX XXXX
                    </span>
                  </div>
                  <Button size="lg" onClick={placeOrder} loading={submitting} className="w-full">
                    Place order · <span className="font-mono">{formatCurrency(total)}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sticky order summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-semibold">Order summary</h2>
              <ul className="mt-5 space-y-4">
                {items.map((it) => (
                  <li key={it.id} className="flex gap-3">
                    <div className="relative shrink-0">
                      <img src={it.image ?? 'https://placehold.co/64'} alt=""
                        className="h-16 w-14 rounded-md object-cover" loading="lazy" />
                      <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-text text-xs font-semibold text-bg">
                        {it.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="truncate font-medium">{it.name}</div>
                      <div className="text-xs text-muted">
                        {[it.size, it.color].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-semibold">
                      {formatCurrency(Number(it.price) * it.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="font-mono">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd>
                    {couponPreview?.type === 'free_shipping' ? (
                      <>
                        <span className="line-through text-muted font-mono">{formatCurrency(shippingCost)}</span>
                        <span className="ml-1 font-medium text-success">Free</span>
                      </>
                    ) : shippingCost === 0 ? 'Free' : <span className="font-mono">{formatCurrency(shippingCost)}</span>}
                  </dd>
                </div>
                {couponPreview && couponPreview.type !== 'free_shipping' && (
                  <div className="flex justify-between text-success">
                    <dt className="text-muted">Discount</dt>
                    <dd className="font-medium font-mono">− {formatCurrency(couponPreview.discount)}</dd>
                  </div>
                )}
                {creditUsed > 0 && (
                  <div className="flex justify-between text-success">
                    <dt className="text-muted">Store credit</dt>
                    <dd className="font-medium font-mono">− {formatCurrency(creditUsed)}</dd>
                  </div>
                )}
                {pointsCediUsed > 0 && (
                  <div className="flex justify-between text-success">
                    <dt className="text-muted">Points redeemed</dt>
                    <dd className="font-medium font-mono">− {formatCurrency(pointsCediUsed)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-3 text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-mono text-lg font-bold">{formatCurrency(total)}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
