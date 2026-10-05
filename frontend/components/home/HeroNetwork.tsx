"use client";

import { useEffect, useRef } from "react";

interface P {
  x: number;
  y: number;
  z: number;
  r: number;
  hub: boolean;
}

export default function HeroNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let size = 0,
      raf = 0,
      visible = true;
    const t0 = performance.now();
    let pts: P[] = [],
      edges: [number, number][] = [];

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      size = Math.max(240, Math.round(rect.width));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = size < 420 ? 44 : 78;
      pts = [{ x: 0, y: 0, z: 0, r: 5.5, hub: true }];
      const g = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2,
          rad = Math.sqrt(1 - y * y),
          th = i * g;
        const shell = 0.78 + ((i * 37) % 10) / 45;
        pts.push({
          x: Math.cos(th) * rad * shell,
          y: y * shell,
          z: Math.sin(th) * rad * shell,
          r: i % 11 === 0 ? 3.2 : 1.3 + (i % 4) * 0.35,
          hub: i % 11 === 0,
        });
      }
      edges = [];
      pts.forEach((a, i) => {
        const near = pts
          .map((b, j) => ({
            j,
            d: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
          }))
          .filter((o) => o.j > i && o.d > 0)
          .sort((p, q) => p.d - q.d)
          .slice(0, i === 0 ? 0 : 2);
        near.forEach((o) => {
          if (o.d < 0.62) edges.push([i, o.j]);
        });
      });
      pts.forEach((p, i) => {
        if (p.hub && i > 0 && i % 2 === 1) edges.push([0, i]);
      });
    };

    const draw = (now: number) => {
      const t = reduced ? 0 : (now - t0) / 1000;
      const c = size / 2,
        R = size * 0.37;
      ctx.clearRect(0, 0, size, size);

      const halo = ctx.createRadialGradient(c, c, 0, c, c, size * 0.52);
      halo.addColorStop(0, "rgba(99,217,255,0.16)");
      halo.addColorStop(0.4, "rgba(99,217,255,0.06)");
      halo.addColorStop(1, "rgba(99,217,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);

      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(0.5 + k * 1.05 + t * 0.03 * (k % 2 ? -1 : 1));
        ctx.strokeStyle = `rgba(99,217,255,${0.1 + k * 0.03})`;
        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          R * (1.12 + k * 0.1),
          R * (0.34 + k * 0.1),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        const a = t * 0.25 * (k % 2 ? -1 : 1) + k * 2;
        ctx.fillStyle = "rgba(215,248,255,0.9)";
        ctx.beginPath();
        ctx.arc(
          Math.cos(a) * R * (1.12 + k * 0.1),
          Math.sin(a) * R * (0.34 + k * 0.1),
          1.8,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      const ry = t * 0.12 + 0.6,
        rx = -0.28,
        cy = Math.cos(ry),
        sy = Math.sin(ry),
        cx = Math.cos(rx),
        sx = Math.sin(rx);
      const pr = pts.map((p) => {
        const x1 = p.x * cy + p.z * sy,
          z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx,
          z2 = p.y * sx + z1 * cx;
        const s = 1 / (1 - z2 * 0.35);
        return { x: c + x1 * R * s, y: c + y2 * R * s, d: (z2 + 1) / 2, s };
      });

      edges.forEach(([a, b]) => {
        const A = pr[a],
          B = pr[b],
          d = (A.d + B.d) / 2;
        const pulse = reduced
          ? 0
          : Math.max(0, Math.sin(t * 0.9 + a * 0.7)) ** 6;
        ctx.strokeStyle = `rgba(99,217,255,${0.07 + d * 0.3 + pulse * 0.35})`;
        ctx.lineWidth = 0.6 + d * 0.6;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      });

      [...pr.keys()]
        .sort((a, b) => pr[a].d - pr[b].d)
        .forEach((i) => {
          const p = pts[i],
            q = pr[i],
            r = p.r * q.s * (0.7 + q.d * 0.6);
          const centre = i === 0;
          const glowR = r * (centre ? 9 : p.hub ? 5 : 3);
          const grd = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, glowR);
          grd.addColorStop(
            0,
            centre
              ? "rgba(99,217,255,0.65)"
              : `rgba(99,217,255,${0.18 + q.d * 0.3})`
          );
          grd.addColorStop(1, "rgba(99,217,255,0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(q.x, q.y, glowR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = centre
            ? "#d7f8ff"
            : p.hub
            ? "#63d9ff"
            : `rgba(59,175,214,${0.45 + q.d * 0.55})`;
          ctx.beginPath();
          ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
          ctx.fill();
          if (p.hub || centre) {
            ctx.strokeStyle = `rgba(99,217,255,${centre ? 0.5 : 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(q.x, q.y, r + (centre ? 6 : 3.5), 0, Math.PI * 2);
            ctx.stroke();
          }
        });
    };

    const loop = (now: number) => {
      if (visible) draw(now);
      raf = requestAnimationFrame(loop);
    };

    build();
    if (reduced) draw(performance.now());
    else raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      build();
      if (reduced) draw(performance.now());
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="hero-network hero-network-canvas"
      role="img"
      aria-label="Animated network of code entities connected around a central node"
    />
  );
}
