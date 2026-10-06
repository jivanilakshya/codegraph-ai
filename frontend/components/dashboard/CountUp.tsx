"use client";

import { useEffect, useState } from "react";

export function CountUp({
  end,
  duration = 1200,
  from = 0,
}: {
  end: number;
  duration?: number;
  from?: number;
}) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(from + e * (end - from)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, from]);

  return <span className="tabular-nums">{count}</span>;
}
