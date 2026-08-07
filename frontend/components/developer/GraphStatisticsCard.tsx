import { Boxes, Code2, File, GitBranch, RefreshCw } from "lucide-react";

import type { GraphStatsResponse } from "@/types/developer";

type GraphStatisticsCardProps = {
  error: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  projectName: string | null;
  stats: GraphStatsResponse | null;
};

const metrics = [
  { key: "nodes", label: "Nodes", icon: Boxes },
  { key: "edges", label: "Edges", icon: GitBranch },
  { key: "files", label: "Files", icon: File },
  { key: "functions", label: "Functions", icon: Code2 },
  { key: "classes", label: "Classes", icon: Boxes },
] as const;

export function GraphStatisticsCard({ error, isLoading, onRefresh, projectName, stats }: GraphStatisticsCardProps) {
  return (
    <section aria-labelledby="graph-statistics" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="graph-statistics" className="text-base font-semibold text-slate-100">Graph Statistics</h2>
          <p className="mt-1 text-xs text-slate-500">
            {projectName ? `Live graph data for ${projectName}.` : "Select a project to load graph data."}
          </p>
        </div>
        <button
          type="button"
          disabled={!projectName || isLoading}
          onClick={onRefresh}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      {isLoading && !stats ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-800/70" />)}</div> : null}
      {!isLoading && !error && !stats ? <p className="mt-4 text-sm text-slate-500">Graph statistics will appear here after selecting a project.</p> : null}
      {stats ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(({ key, label, icon: Icon }) => <article key={key} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{label}</span><Icon className="size-3.5 text-cyan-300" /></div><p className="mt-3 text-xl font-semibold text-slate-100">{stats[key]}</p></article>)}</div> : null}
    </section>
  );
}
