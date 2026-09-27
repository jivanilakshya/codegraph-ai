import { Archive, CalendarDays, Github, Layers3 } from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";
import type { Project } from "@/types/project";

type ProjectStatsProps = { projects: Project[] };

export function ProjectStats({ projects }: ProjectStatsProps) {
  const githubProjects = projects.filter((project) => project.github_url).length;
  const zipProjects = projects.length - githubProjects;
  const recentProjects = projects.filter(
    (project) => Date.now() - new Date(project.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Project statistics">
      <StatCard
        label="Total Projects"
        value={String(projects.length)}
        icon={Layers3}
        className="dash-stagger"
        style={{ animationDelay: "100ms" }}
      />
      <StatCard
        label="GitHub Projects"
        value={String(githubProjects)}
        icon={Github}
        className="dash-stagger"
        style={{ animationDelay: "160ms" }}
      />
      <StatCard
        label="ZIP Projects"
        value={String(zipProjects)}
        icon={Archive}
        className="dash-stagger"
        style={{ animationDelay: "220ms" }}
      />
      <StatCard
        label="Recently Scanned"
        value={String(recentProjects)}
        icon={CalendarDays}
        className="dash-stagger"
        style={{ animationDelay: "280ms" }}
      />
    </section>
  );
}

