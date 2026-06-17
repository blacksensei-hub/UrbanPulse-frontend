import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestFlags } from '../../stores/customerFlagStore.js';

export default function CustomerLink({ customerId, name, email, className = '' }) {
  const label = name || email || 'Customer';
  const [flags, setFlags] = useState([]);

  useEffect(() => {
    if (!customerId) return;
    requestFlags(Number(customerId), setFlags);
  }, [customerId]);

  if (!customerId) return <span className={className}>{label}</span>;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <Link
        to={`/admin/customers/${customerId}`}
        className={`hover:text-accent hover:underline underline-offset-2 transition-colors ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </Link>
      {flags.map(f => (
        <span
          key={f.id}
          style={{ background: f.color ?? '#6366f1' }}
          className="inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white leading-none align-middle"
        >
          {f.label ?? f.flag}
        </span>
      ))}
    </span>
  );
}
