import { MessageCircle, ChevronRight } from 'lucide-react';
import { useWhatsAppLink } from '../../lib/whatsapp.js';
import { SITE_URL } from '../../lib/seoSchema.js';
import { cn } from '../../utils/format.js';

/**
 * "Questions? Chat on WhatsApp": opens a chat with the store with the product
 * (and size, once chosen) already written in. Shows nothing until a WhatsApp
 * number is set in Admin → Settings.
 */
export default function WhatsAppAsk({ product, size, className }) {
  const text = `Hi UrbanPulse, I have a question about the ${product.name}${size ? ` (size ${size})` : ''}: ${SITE_URL}/products/${product.slug}`;
  const href = useWhatsAppLink(text);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('press flex items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:border-text', className)}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-white" aria-hidden="true">
        <MessageCircle className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Questions? Chat on WhatsApp</span>
        <span className="block text-xs text-muted">Ask about sizing, delivery or this piece before you buy.</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
    </a>
  );
}
