"use client";

import { Archive, Boxes, Clock, GitFork } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Project } from "@/types/project";

type ProjectStatsProps = { projects: Project[] };

export function ProjectStats({ projects }: ProjectStatsProps) {
  const githubProjects = projects.filter((project) => Boolean(project.github_url)).length;
  const zipProjects = projects.filter((project) => !project.github_url).length;
  const recentProjects = projects.filter(
    (project) => Date.now() - new Date(project.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  const stats = [
    { label: "Total Projects", val: projects.length, icon: Boxes },
    { label: "GitHub Projects", val: githubProjects, icon: GitFork },
    { label: "ZIP Projects", val: zipProjects, icon: Archive },
    { label: "Recently Scanned", val: recentProjects, icon: Clock },
  ];

  return (
    <section className="mt-10" aria-label="Project statistics">
      <div className="flex items-center gap-3 mb-4 reveal" style={{ ["--d" as string]: "180ms" }}>
        <span className="font-mono text-[10.5px] text-primary/70">01</span>
        <span className="cg-label">Project Statistics</span>
        <span className="flex-1 h-px bg-gradient-to-r from-white/[0.07] to-transparent" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-white/[0.06]">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "group relative px-2 sm:px-5 py-6 reveal transition-colors hover:bg-white/[0.015]",
              i % 2 === 1 && "border-l border-white/[0.06]",
              i >= 2 && "border-t lg:border-t-0 border-white/[0.06]",
              i === 2 && "lg:border-l"
            )}
            style={{ ["--d" as string]: `${240 + i * 70}ms` }}
          >
            <span className="absolute inset-x-0 top-0 h-px bg-primary scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
              <span className="cg-label">{s.label}</span>
            </div>
            <div className="mt-4 text-5xl font-semibold tracking-[-0.04em] text-white leading-none tabular-nums">
              {s.val}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


