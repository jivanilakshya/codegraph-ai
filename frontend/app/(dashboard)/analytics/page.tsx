"use client";

import { BarChart3, LineChart, PieChart, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 250ms ease-out forwards;
        }
      `}</style>

      <PageHeader
        title="Analytics"
        description="Track codebase health, complexity distribution, and visual dependency trends."
        showStatusBadge={false}
      />

      {/* Planned Feature Banner */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-blue-950/20 p-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.04),transparent_60%)]" aria-hidden="true" />
        <div className="flex items-start gap-4 relative z-10">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <span className="rounded bg-cyan-950/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-850">
              Planned Feature
            </span>
            <h2 className="mt-2 text-base font-bold text-slate-100">Codebase Telemetry Dashboard</h2>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl leading-relaxed">
              We are building advanced repository intelligence dashboards to scan architectural complexity, calculate dependency cycles, identify structural code clones, and track refactoring progress over time.
            </p>
          </div>
        </div>
      </div>

      {/* Wireframe Mock Metrics (Visual Mock only, styled beautifully and blurred slightly) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-40 select-none pointer-events-none">
        <article className="rounded-xl border border-slate-800 bg-slate-950/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cyclomatic Complexity</h3>
            <LineChart className="size-4 text-slate-600" />
          </div>
          <div className="h-28 rounded-lg border border-slate-800 bg-slate-950/40 grid place-items-center font-mono text-[10px] text-slate-600">
            [ MOCK_COMPLEXITY_TIMELINE ]
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Code Duplication</h3>
            <PieChart className="size-4 text-slate-600" />
          </div>
          <div className="h-28 rounded-lg border border-slate-800 bg-slate-950/40 grid place-items-center font-mono text-[10px] text-slate-600">
            [ MOCK_CLONES_DISTRIBUTION ]
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Liskov Violations</h3>
            <ShieldAlert className="size-4 text-slate-600" />
          </div>
          <div className="h-28 rounded-lg border border-slate-800 bg-slate-950/40 grid place-items-center font-mono text-[10px] text-slate-600">
            [ MOCK_VIOLATIONS_LOG ]
          </div>
        </article>
      </div>
    </div>
  );
}
