import { Boxes, Code2, FileCode2, GitBranch, Network } from "lucide-react";

import type { GraphStats } from "@/types/graph";

type GraphStatsBarProps = { isLoading: boolean; stats: GraphStats | null };

const metrics = [
  ["nodes", "Nodes", Boxes],
  ["edges", "Edges", GitBranch],
  ["files", "Files", FileCode2],
  ["functions", "Functions", Code2],
  ["classes", "Classes", Network],
] as const;

export function GraphStatsBar({ isLoading, stats }: GraphStatsBarProps) {
  return <section aria-label="Graph statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([key, label, Icon]) => <article key={key} className="rounded-xl border border-slate-800 bg-slate-950/65 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-slate-400">{label}</span><Icon className="size-4 text-cyan-300" /></div><p className="mt-4 text-2xl font-semibold text-slate-100">{isLoading ? <span className="inline-block h-7 w-14 animate-pulse rounded bg-slate-800" /> : stats?.[key] ?? "—"}</p></article>)}</section>;
}
