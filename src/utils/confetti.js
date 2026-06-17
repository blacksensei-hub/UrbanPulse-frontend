const COLORS = ['#D85A30', '#F8F6F2', '#C24D2A', '#E5E5E0', '#FCD34D'];
const SESSION_KEY = 'urbanpulse-first-wishlist';

export function triggerWishlistConfetti(anchorEl, prefersReduced) {
  if (prefersReduced) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch { return; }

  const rect = anchorEl?.getBoundingClientRect();
  const ox = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const oy = rect ? rect.top + rect.height / 2 : 120;

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9999',
  });
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const DURATION = 1500;
  const start = performance.now();

  const particles = Array.from({ length: 30 }, () => ({
    x: ox, y: oy,
    vx: (Math.random() - 0.5) * 9,
    vy: Math.random() * -7 - 2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 5 + 3,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.22,
    isRect: Math.random() > 0.5,
  }));

  function frame(now) {
    const elapsed = now - start;
    if (elapsed >= DURATION) {
      if (canvas.parentNode) document.body.removeChild(canvas);
      return;
    }
    const t = elapsed / DURATION;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.angle += p.spin;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.isRect) {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
