"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  z: number;
  hub: boolean;
}
interface Pulse {
  i: number;
  t0: number;
}

const TAUPE = "59,175,214";
const BEIGE = "99,217,255";

/**
 * Decorative canvas particle field for the home page background.
 * Pure visual — no backend dependency.
 */
export default function HomeIntelligenceField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !reduced;
    let W = 0,
      H = 0,
      dots: Dot[] = [],
      raf = 0,
      last = 0,
      linkDist = 130;
    const pulses: Pulse[] = [];
    let nextPulse = 1200;
    const pointer = { x: -9999, y: -9999, sx: 0, sy: 0, tx: 0, ty: 0 };

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = W < 720;
      const count = small
        ? 22
        : Math.min(60, Math.max(28, Math.round((W * H) / 24000)));
      linkDist = small ? 105 : 140;
      dots = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 9,
        r: 1 + Math.random() * 1.2,
        z: 0.45 + Math.random() * 0.55,
        hub: i % 9 === 0,
      }));
    };

    const draw = (now: number, dt: number) => {
      ctx.clearRect(0, 0, W, H);
      const scrollY = reduced ? 0 : window.scrollY;
      pointer.sx += (pointer.tx - pointer.sx) * Math.min(1, dt * 3);
      pointer.sy += (pointer.ty - pointer.sy) * Math.min(1, dt * 3);

      const lx = W * (0.5 + 0.28 * Math.sin(now / 21000)),
        ly = H * (0.32 + 0.14 * Math.cos(now / 17000));
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 340);
      glow.addColorStop(0, `rgba(${BEIGE},0.075)`);
      glow.addColorStop(1, `rgba(${BEIGE},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      const pos = dots.map((d) => {
        if (!reduced) {
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          if (d.x < -20) d.x = W + 20;
          else if (d.x > W + 20) d.x = -20;
          if (d.y < -20) d.y = H + 20;
          else if (d.y > H + 20) d.y = -20;
        }
        let x = d.x + pointer.sx * 6 * d.z;
        let y = (((d.y - scrollY * 0.14 * d.z + pointer.sy * 6 * d.z) % H) + H) % H;
        const dx = x - pointer.x,
          dy = y - pointer.y,
          dist = Math.hypot(dx, dy);
        if (dist < 170 && dist > 0.1) {
          const push = (1 - dist / 170) * 10;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }
        return { x, y };
      });

      while (pulses.length && now - pulses[0].t0 > 2200) pulses.shift();
      if (!reduced && now > nextPulse) {
        pulses.push({ i: Math.floor(Math.random() * dots.length), t0: now });
        nextPulse = now + 1800 + Math.random() * 1800;
      }
      const pulsing = new Map(pulses.map((p) => [p.i, (now - p.t0) / 2200]));

      ctx.lineWidth = 1;
      for (let a = 0; a < dots.length; a++) {
        for (let b = a + 1; b < dots.length; b++) {
          const d = Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y);
          if (d > linkDist) continue;
          const fade = 1 - d / linkDist;
          const hot = Math.max(
            1 - (pulsing.get(a) ?? 1),
            1 - (pulsing.get(b) ?? 1)
          );
          ctx.strokeStyle =
            hot > 0
              ? `rgba(${BEIGE},${0.1 + fade * 0.38 * hot})`
              : `rgba(${TAUPE},${
                  fade * (dots[a].hub || dots[b].hub ? 0.2 : 0.12)
                })`;
          ctx.beginPath();
          ctx.moveTo(pos[a].x, pos[a].y);
          ctx.lineTo(pos[b].x, pos[b].y);
          ctx.stroke();
        }
      }

      dots.forEach((d, i) => {
        const { x, y } = pos[i];
        const p = pulsing.get(i);
        ctx.fillStyle = `rgba(${TAUPE},${d.hub ? 0.7 : 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, d.hub ? d.r + 1.4 : d.r, 0, Math.PI * 2);
        ctx.fill();
        if (d.hub) {
          ctx.strokeStyle = `rgba(${TAUPE},0.22)`;
          ctx.beginPath();
          ctx.arc(x, y, d.r + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (p !== undefined) {
          const k = 1 - p;
          ctx.fillStyle = `rgba(${BEIGE},${0.9 * k})`;
          ctx.beginPath();
          ctx.arc(x, y, d.r + 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(${BEIGE},${0.4 * k})`;
          ctx.beginPath();
          ctx.arc(x, y, 4 + p * 22, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      draw(t, dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => {
      build();
      if (reduced) draw(0, 0.016);
    };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.tx = e.clientX / W - 0.5;
      pointer.ty = e.clientY / H - 0.5;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
      pointer.tx = pointer.ty = 0;
    };

    build();
    if (reduced) draw(0, 0.016);
    else start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="home-intelligence-field"
      aria-hidden="true"
    />
  );
}
