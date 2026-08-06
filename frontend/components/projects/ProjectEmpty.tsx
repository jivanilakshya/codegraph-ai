import { FolderPlus } from "lucide-react";

type ProjectEmptyProps = { hasSearch: boolean };

export function ProjectEmpty({ hasSearch }: ProjectEmptyProps) {
  return (
    <section className="grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-8 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-cyan-300"><FolderPlus className="size-6" /></span>
        <h2 className="mt-5 text-lg font-semibold text-slate-100">{hasSearch ? "No matching projects" : "No projects yet"}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
          {hasSearch ? "Try a different project name or repository URL." : "Add a repository or upload a ZIP archive to start building your codebase graph."}
        </p>
      </div>
    </section>
  );
}
