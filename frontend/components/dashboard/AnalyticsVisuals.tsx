"use client";

import React, { useMemo } from "react";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function MiniNet({
  seed,
  accent = "#00e5ff",
}: {
  seed: number;
  accent?: string;
}) {
  const pts = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: 6 }, () => ({
      x: 6 + r() * 68,
      y: 6 + r() * 28,
    }));
  }, [seed]);

  return (
    <svg
      width="80"
      height="40"
      viewBox="0 0 80 40"
      className="opacity-60 group-hover:opacity-100 transition-opacity duration-500"
    >
      {pts.slice(1).map((p, i) => (
        <line
          key={i}
          x1={pts[i].x}
          y1={pts[i].y}
          x2={p.x}
          y2={p.y}
          stroke={accent}
          strokeOpacity="0.35"
          strokeWidth="0.8"
        />
      ))}
      {pts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === 0 ? 2.4 : 1.5}
          fill={accent}
          className="cg-node"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
    </svg>
  );
}

export function Spark({ values }: { values: number[] }) {
  const safeValues = values.length ? values : [0, 1];
  const max = Math.max(...safeValues, 1);
  const d = safeValues
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i / Math.max(safeValues.length - 1, 1)) * 80},${
          30 - (v / max) * 26
        }`
    )
    .join(" ");

  return (
    <svg
      width="80"
      height="32"
      viewBox="0 0 80 32"
      className="opacity-70 group-hover:opacity-100 transition-opacity"
    >
      <path d={`${d} L80,32 L0,32 Z`} fill="url(#spark-g)" />
      <path d={d} fill="none" stroke="#00e5ff" strokeWidth="1.2" />
      <defs>
        <linearGradient id="spark-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SourceRing({
  gitCount = 0,
  zipCount = 0,
}: {
  gitCount?: number;
  zipCount?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="font-mono text-[10px] leading-4 text-muted-foreground">
        <div>
          <span className="text-violet-300">●</span> {gitCount} git
        </div>
        <div>
          <span className="text-cyan-300">●</span> {zipCount} zip
        </div>
      </div>
    </div>
  );
}

export function Meter({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}33, ${color})`,
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      </div>
      <span className="font-mono text-[10.5px] text-muted-foreground w-9 text-right tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

export function SectionLabel({
  index,
  children,
  right,
}: {
  index: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-mono text-[10.5px] text-primary/70">{index}</span>
      <span className="cg-label">{children}</span>
      <span className="flex-1 h-px bg-gradient-to-r from-white/[0.07] to-transparent" />
      {right}
    </div>
  );
}
