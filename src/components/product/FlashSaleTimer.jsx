import { useEffect, useState } from 'react';

function getTimeLeft(endsAt) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export default function FlashSaleTimer({ endsAt, onExpire, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endsAt));

  useEffect(() => {
    if (!timeLeft) return;
    const id = setInterval(() => {
      const next = getTimeLeft(endsAt);
      setTimeLeft(next);
      if (!next && onExpire) onExpire();
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt, onExpire]);

  if (!timeLeft) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const display = timeLeft.days > 0
    ? `${timeLeft.days}d ${pad(timeLeft.hours)}h`
    : `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white tabular-nums ${className}`}
    >
      ⚡ {display}
    </span>
  );
}
