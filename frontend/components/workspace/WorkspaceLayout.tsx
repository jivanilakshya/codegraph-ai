import type { ReactNode } from "react";

type WorkspaceLayoutProps = {
  projectName: string;
  currentFile: string | null;
  onRefresh: () => void;
  tree: ReactNode;
  viewer: ReactNode;
  analysis: ReactNode;
  console: ReactNode;
};

export function WorkspaceLayout({
  projectName,
  currentFile,
  onRefresh,
  tree,
  viewer,
  analysis,
  console,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-[#242424] bg-[#080808] shadow-2xl">
      <header className="flex min-h-12 items-center justify-between gap-4 border-b border-[#202020] bg-[#0A0A0A] px-4 py-2 select-none">
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-bold text-white">{projectName}</p>
          <p className="truncate font-mono text-xs text-[#A3A3A3]">{currentFile ?? "No file selected"}</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-[#303030] bg-[#080808] px-3 py-1.5 font-mono text-xs font-semibold text-white transition-all duration-200 hover:bg-[#151515] hover:border-[#555555]"
        >
          Refresh Workspace
        </button>
      </header>
      <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
        {tree}
        <div className="min-w-0 lg:min-h-0 bg-[#050505]">{viewer}</div>
        {analysis}
      </div>
      {console}
    </div>
  );
}

