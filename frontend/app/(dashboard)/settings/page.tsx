"use client";

import { Key, Settings, Sliders, ToggleLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
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
        title="Settings"
        description="Configure your CodeGraph AI workspace, exclusions, and credentials."
        showStatusBadge={false}
      />

      {/* Planned Feature Banner */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-blue-950/20 p-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.04),transparent_60%)]" aria-hidden="true" />
        <div className="flex items-start gap-4 relative z-10">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
            <Settings className="size-5" />
          </span>
          <div>
            <span className="rounded bg-cyan-950/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 border border-cyan-850">
              Planned Feature
            </span>
            <h2 className="mt-2 text-base font-bold text-slate-100">Workspace Customization</h2>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl leading-relaxed">
              Custom settings will support configurable Tree-sitter parsers, database connection configurations, GitHub API credentials, and directory exclusions to customize scanned workspaces.
            </p>
          </div>
        </div>
      </div>

      {/* Wireframe Mock Settings Fields (Muted and disabled) */}
      <div className="space-y-6 opacity-30 select-none pointer-events-none">
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-cyan-400 border border-slate-800">
            <Sliders className="size-3.5" /> General
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500">
            <Key className="size-3.5" /> API Tokens
          </span>
        </div>

        <div className="max-w-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Default Directory Exclusions
            </label>
            <input
              type="text"
              readOnly
              value="**/node_modules/**, **/dist/**, **/.git/**"
              className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 text-xs text-slate-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Parser Engine
            </label>
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-300">Tree-sitter WASM Engine</span>
              <ToggleLeft className="size-6 text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
