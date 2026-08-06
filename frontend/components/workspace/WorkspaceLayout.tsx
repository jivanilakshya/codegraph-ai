import type { ReactNode } from "react";

type WorkspaceLayoutProps = { projectName: string; currentFile: string | null; onRefresh: () => void; tree: ReactNode; viewer: ReactNode; analysis: ReactNode; console: ReactNode };

export function WorkspaceLayout({ projectName, currentFile, onRefresh, tree, viewer, analysis, console }: WorkspaceLayoutProps) {
  return <div className="flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#080d14]"><header className="flex min-h-12 items-center gap-3 border-b border-slate-800 bg-[#0b111b] px-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-100">{projectName}</p><p className="truncate text-xs text-slate-500">{currentFile ?? "No file selected"}</p></div><button type="button" onClick={onRefresh} className="ml-auto rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800">Refresh</button></header><div className="grid flex-1 lg:min-h-0 lg:grid-cols-[260px_minmax(0,1fr)_300px]">{tree}<div className="min-w-0 lg:min-h-0">{viewer}</div>{analysis}</div>{console}</div>;
}
