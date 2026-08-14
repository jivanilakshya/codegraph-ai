import type { Project } from "@/types/project";

import { ProjectCard } from "./ProjectCard";

type ProjectGridProps = {
  projects: Project[];
  scanningProjectId: number | null;
  deletingProjectId: number | null;
  onScan: (project: Project) => void;
  onDelete: (project: Project) => void;
};

export function ProjectGrid({ projects, scanningProjectId, deletingProjectId, onScan, onDelete }: ProjectGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isScanning={scanningProjectId === project.id}
          isDeleting={deletingProjectId === project.id}
          onScan={onScan}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}
