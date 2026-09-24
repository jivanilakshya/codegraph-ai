"use client";

import React, { useRef } from "react";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  style?: React.CSSProperties;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, style, className = "" }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      style={style}
      className={`group relative overflow-hidden rounded-xl border border-[#242424] bg-[#080808] p-5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#0D0D0D] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_36px_rgba(0,0,0,0.5)] ${className}`}
    >
      {/* Dynamic Cursor Light Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(220px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.06), transparent 75%)`,
        }}
      />

      {/* Subtle Top-Left Ambient Highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035),transparent_40%)]" />

      {/* Light Sweep Reflection Line */}
      <div className="pointer-events-none absolute -left-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.05)] to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-full group-hover:opacity-100" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] transition-colors group-hover:text-white">
          {label}
        </p>
        <span className="grid size-8.5 place-items-center rounded-lg border border-[#252525] bg-[#0A0A0A] text-white transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:rotate-3 group-hover:border-[#555555] group-hover:bg-[#121212] group-hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]">
          <Icon aria-hidden="true" className="size-4 text-white transition-transform duration-300" />
        </span>
      </div>

      <p className="relative z-10 mt-4 font-sans text-2xl font-extrabold tracking-tight text-white transition-transform duration-300 group-hover:translate-x-0.5">
        {value}
      </p>
    </article>
  );
}
