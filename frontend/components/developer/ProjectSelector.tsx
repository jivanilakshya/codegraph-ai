import type { Project } from "@/types/project";

type ProjectSelectorProps = {
  onSelect: (projectId: number) => void;
  projects: Project[];
  selectedProjectId: number | null;
};

export function ProjectSelector({ onSelect, projects, selectedProjectId }: ProjectSelectorProps) {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/65 px-4 py-3 text-sm">
      <span className="shrink-0 font-medium text-slate-300">Active project</span>
      <select
        aria-label="Active project"
        className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none"
        disabled={!projects.length}
        onChange={(event) => onSelect(Number(event.target.value))}
        value={selectedProjectId ?? ""}
      >
        <option value="" disabled>{projects.length ? "Select a project" : "No projects available"}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id} className="bg-slate-950">
            {project.name} (#{project.id})
          </option>
        ))}
      </select>
    </label>
  );
}
