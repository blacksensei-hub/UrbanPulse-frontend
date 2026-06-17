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
