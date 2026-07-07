export const formatCurrency = (amount, currency = 'GHS') => {
  const value = Number(amount) || 0;
  // Use a custom symbol since some browsers render "GHS" instead of the ₵ glyph.
  try {
    const formatted = new Intl.NumberFormat('en-GH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `GH₵ ${formatted}`;
  } catch {
    return `GH₵ ${value.toFixed(2)}`;
  }
};

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatRelativeDate = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
};

export const cn = (...args) => args.filter(Boolean).join(' ');

export const pluralize = (count, singular, plural = `${singular}s`) =>
  Number(count) === 1 ? singular : plural;

// Formats a Ghanaian phone number for display, e.g. "0244123456" -> "+233 24 412 3456".
export const formatPhone = (raw) => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('233')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 9) return raw;
  return `+233 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
};

// Strips whitespace/dashes from phone input as the user types or pastes.
export const sanitizePhone = (raw) => String(raw ?? '').replace(/[\s-]/g, '');
