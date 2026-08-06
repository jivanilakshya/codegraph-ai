import type { Project } from "@/types/project";

import { ProjectCard } from "./ProjectCard";

type ProjectGridProps = {
  projects: Project[];
  scanningProjectId: number | null;
  onScan: (project: Project) => void;
};

export function ProjectGrid({ projects, scanningProjectId, onScan }: ProjectGridProps) {
  return <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{projects.map((project) => <ProjectCard key={project.id} project={project} isScanning={scanningProjectId === project.id} onScan={onScan} />)}</section>;
}
