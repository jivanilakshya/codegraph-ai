import { FolderPlus } from "lucide-react";

type ProjectEmptyProps = { hasSearch: boolean };

export function ProjectEmpty({ hasSearch }: ProjectEmptyProps) {
  return (
    <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[#242424] bg-[#050505] p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-[#252525] bg-[#0A0A0A] text-white">
          <FolderPlus className="size-6 text-white" />
        </span>
        <h2 className="mt-5 font-sans text-lg font-bold text-white">
          {hasSearch ? "No matching projects" : "No projects yet"}
        </h2>
        <p className="mt-2 max-w-sm font-mono text-xs text-[#A3A3A3]">
          {hasSearch
            ? "Try a different project name or repository URL."
            : "Add a repository or upload a ZIP archive to start building your codebase graph."}
        </p>
      </div>
    </section>
  );
}

