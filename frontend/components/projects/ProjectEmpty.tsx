"use client";

import { FolderPlus } from "lucide-react";

type ProjectEmptyProps = { hasSearch: boolean };

export function ProjectEmpty({ hasSearch }: ProjectEmptyProps) {
  return (
    <section className="col-span-full py-16 text-center border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
      <span className="w-10 h-10 mx-auto rounded-xl border border-white/[0.09] bg-white/[0.03] flex items-center justify-center mb-3">
        <FolderPlus className="w-5 h-5 text-primary" />
      </span>
      <p className="text-white font-medium text-[15px]">
        {hasSearch ? "No projects match your search query" : "No project workspaces yet"}
      </p>
      <p className="mt-1 font-mono text-[12px] text-muted-foreground max-w-sm mx-auto">
        {hasSearch
          ? "Try searching by project name or repository URL."
          : "Connect a GitHub repository or upload a ZIP archive to build your knowledge graph."}
      </p>
    </section>
  );
}


