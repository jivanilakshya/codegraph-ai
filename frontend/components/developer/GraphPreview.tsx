import Link from "next/link";
import { ArrowUpRight, Network } from "lucide-react";

import type { GraphStatsResponse } from "@/types/developer";

type GraphPreviewProps = {
  projectName: string | null;
  stats: GraphStatsResponse | null;
};

export function GraphPreview({ projectName, stats }: GraphPreviewProps) {
  return (
    <section aria-labelledby="graph-preview" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
      <div className="flex items-center gap-2">
        <Network className="size-4 text-cyan-300" />
        <h2 id="graph-preview" className="text-base font-semibold text-slate-100">Graph Preview</h2>
      </div>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Project</dt><dd className="truncate font-medium text-slate-200">{projectName ?? "No project selected"}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Node Count</dt><dd className="font-medium text-slate-200">{stats?.nodes ?? "—"}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Relationship Count</dt><dd className="font-medium text-slate-200">{stats?.edges ?? "—"}</dd></div>
      </dl>
      <Link href="/graph" className="mt-5 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-400/10 px-3 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/15">
        Open Graph Workspace <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
