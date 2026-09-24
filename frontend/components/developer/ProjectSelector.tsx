import type { Project } from "@/types/project";

type ProjectSelectorProps = {
  onSelect: (projectId: number) => void;
  projects: Project[];
  selectedProjectId: number | null;
};

export function ProjectSelector({ onSelect, projects, selectedProjectId }: ProjectSelectorProps) {
  return (
    <label className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-[#292929] bg-[#080808] px-5 py-3.5 text-xs font-mono">
      <span className="shrink-0 font-semibold uppercase tracking-wider text-[#A3A3A3]">Active Project Context</span>
      <select
        aria-label="Active project"
        className="min-w-0 flex-1 max-w-xs rounded-lg border border-[#252525] bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white outline-none transition-colors focus:border-[#444444]"
        disabled={!projects.length}
        onChange={(event) => onSelect(Number(event.target.value))}
        value={selectedProjectId ?? ""}
      >
        <option value="" disabled className="bg-[#0A0A0A] text-[#737373]">{projects.length ? "Select a project..." : "No projects available"}</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id} className="bg-[#0A0A0A] text-white">
            {project.name} (#{project.id})
          </option>
        ))}
      </select>
    </label>
  );
}
