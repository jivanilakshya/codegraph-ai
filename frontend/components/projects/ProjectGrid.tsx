"use client";

import type { Project } from "@/types/project";
import { ProjectCard } from "./ProjectCard";

type ProjectGridProps = {
  projects: Project[];
  activeProjectId?: number | null;
  scanningProjectId: number | null;
  deletingProjectId: number | null;
  onScan: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelectActive?: (project: Project) => void;
};

export function ProjectGrid({
  projects,
  activeProjectId,
  scanningProjectId,
  deletingProjectId,
  onScan,
  onDelete,
  onSelectActive,
}: ProjectGridProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isActive={activeProjectId === project.id}
          isScanning={scanningProjectId === project.id}
          isDeleting={deletingProjectId === project.id}
          onScan={onScan}
          onDelete={onDelete}
          onSelectActive={onSelectActive}
        />
      ))}
    </section>
  );
}


