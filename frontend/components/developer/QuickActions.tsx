import { HeartPulse, Network, RefreshCw } from "lucide-react";

import type { QuickAction } from "@/types/developer";

type QuickActionsProps = {
  onAction: (action: QuickAction) => void;
  pendingAction: QuickAction | null;
  projectId: number | null;
  result: { action: QuickAction; message: string; tone: "success" | "error" | "info" } | null;
};

const actions: { id: QuickAction; label: string; icon: typeof RefreshCw; requiresProject?: boolean }[] = [
  { id: "refresh-graph", label: "Refresh Graph", icon: Network, requiresProject: true },
  { id: "refresh-repository", label: "Refresh Repository", icon: RefreshCw, requiresProject: true },
  { id: "refresh-health", label: "Refresh Health", icon: HeartPulse },
];

export function QuickActions({ onAction, pendingAction, projectId, result }: QuickActionsProps) {
  return (
    <section aria-labelledby="quick-actions" className="rounded-xl border border-slate-800 bg-slate-950/65 p-4">
      <div className="mb-4">
        <h2 id="quick-actions" className="text-base font-semibold text-slate-100">Quick Developer Actions</h2>
        <p className="mt-1 text-xs text-slate-500">Refresh live backend data without leaving the workspace.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.map(({ id, label, icon: Icon, requiresProject }) => (
          <button
            key={id}
            type="button"
            disabled={pendingAction !== null || (requiresProject && !projectId)}
            onClick={() => onAction(id)}
            className="flex min-h-16 items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 text-left text-sm font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="rounded-md border border-slate-700 bg-slate-950 p-2 text-cyan-300">
              <Icon className={`size-4 ${pendingAction === id ? "animate-spin" : ""}`} />
            </span>
            <span>{pendingAction === id ? "Refreshing…" : label}</span>
          </button>
        ))}
      </div>
      {result ? <div role="status" className={`mt-4 rounded-lg border px-3 py-2.5 text-sm ${result.tone === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : result.tone === "error" ? "border-rose-400/20 bg-rose-400/10 text-rose-200" : "border-amber-400/20 bg-amber-400/10 text-amber-200"}`}>{result.message}</div> : null}
    </section>
  );
}
