import { Archive, CalendarDays, Github, Layers3 } from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
import type { Project } from "@/types/project";

type ProjectStatsProps = { projects: Project[] };

export function ProjectStats({ projects }: ProjectStatsProps) {
  const githubProjects = projects.filter((project) => project.github_url).length;
  const zipProjects = projects.length - githubProjects;
  const recentProjects = projects.filter((project) => Date.now() - new Date(project.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Project statistics">
      <StatCard label="Total projects" value={String(projects.length)} icon={Layers3} />
      <StatCard label="GitHub repositories" value={String(githubProjects)} icon={Github} />
      <StatCard label="ZIP uploads" value={String(zipProjects)} icon={Archive} />
      <StatCard label="Added this week" value={String(recentProjects)} icon={CalendarDays} />
    </section>
  );
}
