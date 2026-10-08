import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageSquare, Send, RotateCcw, Play, AlertTriangle, UserMinus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader.jsx';
import Sheet from '../../components/ui/Sheet.jsx';
import { Button, Input } from '../../components/ui/index.jsx';
import { adminService } from '../../services/index.js';
import { formatDate } from '../../utils/format.js';
import { spring } from '../../lib/motion.js';
import { cn } from '../../utils/format.js';
import { getServerMessage } from '../../utils/errors.js';

// ── SMS length, the way the network counts it ────────────────────────────
// Plain GSM characters fit 160 per text (153 each once split); a single
// character outside that set, like ₵ or an emoji, switches the whole message
// to 70 (67). Customers are charged per text, so the page shows the count.
const GSM = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/;
function smsParts(text) {
  if (GSM.test(text)) {
    const len = [...text].reduce((n, ch) => n + ('^{}\\[~]|€'.includes(ch) ? 2 : 1), 0);
    return { len, parts: len <= 160 ? 1 : Math.ceil(len / 153), unicode: false };
  }
  const len = [...text].length;
  return { len, parts: len <= 70 ? 1 : Math.ceil(len / 67), unicode: true };
}
// Mirrors the server's markdownToText, so the preview is the real text.
const plain = (s) => String(s ?? '')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '$1 ($2)')
  .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').trim();

const TEST_PHONE_KEY = 'up-admin-drop-test-phone';

function ChannelToggle({ on, onChange, icon: Icon, label, count, disabled }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        'press flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
        on ? 'tint-accent border-accent' : 'border-border hover:border-text',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className={cn('grid h-9 w-9 place-items-center rounded-full', on ? 'bg-accent text-on-accent' : 'bg-highlight text-muted')}>
        {on ? <Check className="h-4 w-4" strokeWidth={2.6} /> : <Icon className="h-4 w-4" />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{count} {count === 1 ? 'person' : 'people'}</span>
      </span>
    </button>
  );
}

export default function AdminDrops() {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [channels, setChannels] = useState({ email: true, sms: false });
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [productId, setProductId] = useState('');
  const [testPhone, setTestPhone] = useState(() => { try { return localStorage.getItem(TEST_PHONE_KEY) ?? ''; } catch { return ''; } });
  const [testing, setTesting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(null);   // { id, total, sent, failed, remaining, error? }
  const [welcomeCode, setWelcomeCode] = useState('');
  const [savingWelcome, setSavingWelcome] = useState(false);

  const load = useCallback(() => adminService.drops.overview().then((d) => {
    setData(d);
    if (d.enabled) setWelcomeCode(d.welcome_code ?? '');
  }).catch(() => setData({ enabled: false, failed: true })), []);

  useEffect(() => {
    load();
    adminService.products({ limit: 100 }).then((r) => setProducts((r.items ?? []).filter((p) => p.is_active))).catch(() => {});
    adminService.coupons().then((c) => setCoupons(Array.isArray(c) ? c : [])).catch(() => {});
  }, [load]);

  // Don't let a closed tab quietly stop a send (it can be resumed, but say so).
  useEffect(() => {
    if (!progress || progress.remaining === 0 || progress.error) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [progress]);

  const chosen = Object.keys(channels).filter((k) => channels[k]);
  const product = products.find((p) => String(p.id) === String(productId)) ?? null;
  const counts = data?.counts ?? { email: 0, sms: 0, joined_7d: 0 };
  const audience = (channels.email ? counts.email : 0) + (channels.sms ? counts.sms : 0);
  const origin = window.location.origin;
  const smsText = `UrbanPulse: ${plain(message) || 'Your message'} ${origin}/d${product ? `/${product.slug}` : ''} Stop: ${origin}/stop/xxxxxxxxxxx`;
  const sms = useMemo(() => smsParts(smsText), [smsText]);
  const draft = { channels: chosen, subject, message, product_id: product?.id ?? null };
  const sending = progress && progress.remaining > 0 && !progress.error;
  const ready = chosen.length > 0 && message.trim() && (!channels.email || subject.trim());

  async function sendTest() {
    setTesting(true);
    try {
      if (channels.sms) { try { localStorage.setItem(TEST_PHONE_KEY, testPhone); } catch { /* private window */ } }
      const r = await adminService.drops.test({ ...draft, test_phone: testPhone });
      if (r.sent_to?.length) toast.success(`Test sent to ${r.sent_to.join(' and ')}`);
      // A channel with no provider set up only writes to the server log; say so
      // rather than claiming it was sent.
      if (r.logged_only?.length) {
        toast.error(`Not sent to ${r.logged_only.join(' and ')}: that channel isn’t set up on the server, so it was only logged.`, { duration: 7000 });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'The test didn’t send.');
    } finally {
      setTesting(false);
    }
  }

  async function run(id, total) {
    setProgress({ id, total, sent: 0, failed: 0, remaining: total });
    let done = -1;
    for (;;) {
      try {
        const r = await adminService.drops.sendBatch(id);
        setProgress(r);
        if (r.remaining === 0) break;
        // Nothing moved: the rest are held by a batch that was cut off (the
        // server frees them after 5 minutes). Wait instead of asking again at
        // once, which would hit the admin rate limit and pause the send.
        if (r.sent + r.failed === done) await new Promise((ok) => setTimeout(ok, 5000));
        done = r.sent + r.failed;
      } catch (err) {
        setProgress((p) => ({ ...p, error: err?.response?.data?.error ?? 'Connection lost.' }));
        break;
      }
    }
    load();
  }

  async function start() {
    setConfirming(false);
    try {
      const { id, total } = await adminService.drops.start(draft);
      await run(id, total);
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Couldn’t start the send.');
    }
  }

  async function saveWelcome() {
    setSavingWelcome(true);
    try {
      const r = await adminService.drops.setWelcome(welcomeCode);
      setData((d) => ({ ...d, welcome_code: r.welcome_code, offer: r.offer }));
      toast.success(r.offer ? `The sign-up forms now offer: ${r.offer.label}` : 'No welcome offer on the sign-up forms');
    } catch (err) {
      toast.error(err?.response?.data?.error ?? 'Couldn’t save.');
    } finally {
      setSavingWelcome(false);
    }
  }

  async function remove(sub) {
    if (!window.confirm(`Take ${sub.channel === 'sms' ? `+${sub.address}` : sub.address} off the drop list?`)) return;
    try { await adminService.drops.remove(sub.id); load(); }
    catch (err) { toast.error(getServerMessage(err, 'Couldn’t remove them.')); }
  }

  async function retry(b) {
    try { await adminService.drops.retry(b.id); await run(b.id, b.total); }
    catch (err) { toast.error(getServerMessage(err, 'Couldn’t retry.')); }
  }

  if (!data) return <div className="space-y-6"><AdminPageHeader title="Drop list" /><p className="text-sm text-muted">Loading…</p></div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Drop list" subtitle="People who asked to hear about new drops, and the announcements you send them." />

      {!data.enabled ? (
        <div className="card p-6 text-sm text-muted">
          {data.failed
            ? 'Couldn’t load the drop list. Refresh to try again.'
            : <>The drop list starts working once <code className="font-mono">backend/sql/2026-10_drops.sql</code> has been run on the database.</>}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[['Email', counts.email], ['SMS', counts.sms], ['Joined this week', counts.joined_7d]].map(([k, v]) => (
              <div key={k} className="card p-5">
                <p className="text-xs uppercase tracking-wider text-muted">{k}</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{Number(v).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {(!data.email_ready || !data.sms_ready) && (
            <div className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                {!data.sms_ready && <>SMS isn’t set up on the server (<code className="font-mono">SMS_API_KEY</code>), so texts would only be written to the log, not sent. </>}
                {!data.email_ready && <>Email isn’t set up on the server (<code className="font-mono">SMTP_HOST</code>), so emails would only be written to the log. </>}
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* ── Compose ─────────────────────────────────────────────── */}
            <section className="card min-w-0 space-y-5 p-6">
              <h2 className="font-display text-lg font-semibold">New announcement</h2>

              <div className="flex flex-col gap-3 sm:flex-row">
                <ChannelToggle icon={Mail} label="Email" count={counts.email} on={channels.email} onChange={(v) => setChannels((c) => ({ ...c, email: v }))} disabled={sending} />
                <ChannelToggle icon={MessageSquare} label="SMS" count={counts.sms} on={channels.sms} onChange={(v) => setChannels((c) => ({ ...c, sms: v }))} disabled={sending} />
              </div>

              {channels.email && (
                <Input floating label="Email subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="drop-message">Message</label>
                <textarea id="drop-message" className="textarea" rows={5} maxLength={2000} value={message}
                  onChange={(e) => setMessage(e.target.value)} placeholder="The new Pulse Hoodie is live. Only 40 made." />
                <p className="mt-1 text-xs text-muted">In emails, **bold** and [a link](https://…) work. Texts get the plain words.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="drop-link">The button and link go to</label>
                <select id="drop-link" className="select" value={productId} onChange={(e) => setProductId(e.target.value)}>
                  <option value="">The shop</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Previews */}
              <div className="grid gap-4 md:grid-cols-2">
                {channels.email && (
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-medium text-muted">Email preview</p>
                    <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">New drop</p>
                      <p className="mt-1 font-display text-base font-semibold">{subject || 'Subject'}</p>
                      {product?.images?.[0] && <img src={product.images[0]} alt="" className="mt-3 aspect-[4/3] w-full rounded-xl object-cover" />}
                      <p className="mt-3 whitespace-pre-line text-muted">{plain(message) || 'Your message'}</p>
                      <span className="mt-3 inline-block rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent">{product ? 'Shop it now' : 'Shop the drop'}</span>
                    </div>
                  </div>
                )}
                {channels.sms && (
                  <div className="min-w-0">
                    <p className="mb-2 text-xs font-medium text-muted">SMS preview</p>
                    <div className="rounded-2xl bg-highlight p-4">
                      <div className="max-w-[85%] break-words rounded-[18px] rounded-bl-md bg-surface px-3.5 py-2 text-[13px] leading-snug shadow-sm">{smsText}</div>
                    </div>
                    <p className={cn('mt-2 text-xs', sms.parts > 2 ? 'text-warning' : 'text-muted')}>
                      {sms.len} characters · {sms.parts} {sms.parts === 1 ? 'text' : 'texts'} per person{sms.unicode ? ' (a character like ₵ or an emoji makes each text shorter)' : ''}
                    </p>
                  </div>
                )}
              </div>

              {channels.sms && (
                <Input floating label="Your phone, for the test SMS" type="tel" inputMode="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              )}

              <AnimatePresence initial={false}>
                {progress && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={spring} className="overflow-hidden"
                  >
                    <div className="rounded-2xl bg-highlight p-4" role="status" aria-live="polite">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold">
                          {progress.error ? 'Paused' : progress.remaining ? 'Sending…' : 'Sent'}
                        </span>
                        <span className="tabular-nums text-muted">{progress.sent} of {progress.total}{progress.failed ? ` · ${progress.failed} failed` : ''}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                        <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }} transition={spring} />
                      </div>
                      {progress.error && <p className="mt-2 text-xs text-muted">{progress.error} Nothing is lost: press Resume under Past announcements.</p>}
                      {!progress.error && progress.remaining > 0 && <p className="mt-2 text-xs text-muted">Keep this page open until it finishes.</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={sendTest} loading={testing} disabled={!ready || sending}>Send test to me</Button>
                <Button onClick={() => setConfirming(true)} disabled={!ready || sending || audience === 0}>
                  <Send className="h-4 w-4" /> Send to {audience.toLocaleString()} {audience === 1 ? 'person' : 'people'}
                </Button>
              </div>
            </section>

            {/* ── Side column ─────────────────────────────────────────── */}
            <div className="min-w-0 space-y-6">
              <section className="card p-6">
                <h2 className="font-display text-lg font-semibold">Welcome offer</h2>
                <p className="mt-1 text-sm text-muted">A coupon shown to people when they join. The sign-up forms only mention an offer if one is set here.</p>
                <select className="select mt-4" value={welcomeCode} onChange={(e) => setWelcomeCode(e.target.value)} aria-label="Welcome coupon">
                  <option value="">No offer</option>
                  {coupons.filter((c) => c.is_active || c.code === welcomeCode).map((c) => (
                    <option key={c.id} value={c.code}>{c.code}{c.first_order_only ? ' · first order' : ''}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-muted">
                  {data.offer ? <>Now showing: <span className="font-medium text-text">{data.offer.label}</span></> : 'Now showing: no offer.'}
                  {' '}Make codes in <Link to="/admin/coupons" className="underline underline-offset-2">Coupons</Link>.
                </p>
                <Button size="sm" className="mt-4" onClick={saveWelcome} loading={savingWelcome} disabled={welcomeCode === (data.welcome_code ?? '')}>Save</Button>
              </section>

              <section className="card p-6">
                <h2 className="font-display text-lg font-semibold">Recent sign-ups</h2>
                {data.recent.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Nobody yet. The forms are on the homepage and in the footer.</p>
                ) : (
                  <ul className="inset-group mt-4">
                    {data.recent.map((s) => (
                      <li key={s.id} className={cn('inset-row flex items-center gap-3', s.unsubscribed_at && 'opacity-50')}>
                        {s.channel === 'sms' ? <MessageSquare className="h-4 w-4 shrink-0 text-muted" /> : <Mail className="h-4 w-4 shrink-0 text-muted" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{s.channel === 'sms' ? `+${s.address}` : s.address}</span>
                          <span className="block text-xs text-muted">
                            {s.unsubscribed_at ? `Left ${formatDate(s.unsubscribed_at)}` : `${formatDate(s.created_at)}${s.source ? ` · ${s.source}` : ''}`}
                          </span>
                        </span>
                        {!s.unsubscribed_at && (
                          <button type="button" onClick={() => remove(s)} className="press rounded-full p-2 text-muted hover:bg-highlight hover:text-error" aria-label={`Remove ${s.address}`}>
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold">Past announcements</h2>
            {data.broadcasts.length === 0 ? (
              <p className="mt-3 text-sm text-muted">None sent yet.</p>
            ) : (
              <ul className="inset-group mt-4">
                {data.broadcasts.map((b) => (
                  <li key={b.id} className="inset-row flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{b.subject}</span>
                      <span className="block text-xs text-muted">
                        {formatDate(b.created_at)} · {b.channels.map((c) => (c === 'sms' ? 'SMS' : 'Email')).join(' + ')}{b.product_name ? ` · ${b.product_name}` : ''}
                      </span>
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {b.sent}/{b.total} sent{b.failed ? ` · ${b.failed} failed` : ''}
                    </span>
                    {b.remaining > 0 && !sending && (
                      <Button size="sm-dense" variant="outline" onClick={() => run(b.id, b.total)}><Play className="h-3.5 w-3.5" /> Resume</Button>
                    )}
                    {b.remaining === 0 && b.failed > 0 && !sending && (
                      <Button size="sm-dense" variant="outline" onClick={() => retry(b)}><RotateCcw className="h-3.5 w-3.5" /> Retry failed</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Sheet open={confirming} onClose={() => setConfirming(false)} title="Send this announcement?" maxWidth="420px">
        <p className="text-sm text-muted">
          {[channels.email && `Email to ${counts.email.toLocaleString()} ${counts.email === 1 ? 'person' : 'people'}`,
            channels.sms && `SMS to ${counts.sms.toLocaleString()} ${counts.sms === 1 ? 'person' : 'people'}${sms.parts > 1 ? ` (${sms.parts} texts each)` : ''}`]
            .filter(Boolean).join(', and ')}. Once it starts it can’t be taken back.
        </p>
        {channels.sms && !data.sms_ready && (
          <p className="mt-3 text-sm text-warning">SMS isn’t set up on the server, so the texts will only be logged.</p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button onClick={start}><Send className="h-4 w-4" /> Send now</Button>
        </div>
      </Sheet>
    </div>
  );
}
