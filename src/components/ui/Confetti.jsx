import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

const COLORS = ['#f97316', '#eab308', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#D85A30', '#e8e0d0'];

export default function Confetti({ trigger }) {
  const canvasRef = useRef(null);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!trigger || prefersReduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 70 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 300,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -(Math.random() * 8 + 3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      w: Math.random() * 10 + 5,
      h: Math.random() * 5 + 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        alive = true;
        p.vy += 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.011;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [trigger, prefersReduced]);

  if (prefersReduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[200] pointer-events-none"
      aria-hidden="true"
    />
  );
}
