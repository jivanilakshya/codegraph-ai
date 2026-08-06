"use client";

import Link from "next/link";
import { ExternalLink, FileArchive, FolderOpen, Github, GitBranch, LoaderCircle, Play, Trash2 } from "lucide-react";

import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
  isScanning: boolean;
  onScan: (project: Project) => void;
};

function formatCreatedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function ProjectCard({ project, isScanning, onScan }: ProjectCardProps) {
  const isGitHubProject = Boolean(project.github_url);

  return (
    <article className="group flex min-h-72 flex-col rounded-xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.95)] transition hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <span className={`grid size-10 place-items-center rounded-lg border ${isGitHubProject ? "border-violet-400/20 bg-violet-400/10 text-violet-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
          {isGitHubProject ? <Github className="size-5" /> : <FileArchive className="size-5" />}
        </span>
        <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-400">#{project.id}</span>
      </div>

      <div className="mt-5 min-w-0">
        <h2 className="truncate text-lg font-semibold text-slate-100" title={project.name}>{project.name}</h2>
        {project.github_url ? (
          <a href={project.github_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 truncate text-sm text-cyan-400 hover:text-cyan-300" title={project.github_url}>
            <ExternalLink className="size-3.5 shrink-0" />
            <span className="truncate">{project.github_url.replace(/^https?:\/\//, "")}</span>
          </a>
        ) : <p className="mt-2 text-sm text-slate-500">ZIP Upload</p>}
      </div>

      <dl className="mt-5 space-y-3 border-y border-slate-800/80 py-4 text-sm">
        <div className="flex items-center justify-between gap-4"><dt className="flex items-center gap-2 text-slate-500"><GitBranch className="size-4" /> Default branch</dt><dd className="truncate font-mono text-slate-300">{project.default_branch ?? "—"}</dd></div>
        <div className="flex items-center justify-between gap-4"><dt className="text-slate-500">Created</dt><dd className="text-slate-300">{formatCreatedDate(project.created_at)}</dd></div>
      </dl>

      <div className="mt-auto flex gap-2 pt-5">
        <Link href={`/projects/${project.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"><FolderOpen className="size-4" /> Open</Link>
        <button type="button" onClick={() => onScan(project)} disabled={isScanning} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70">
          {isScanning ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}{isScanning ? "Scanning" : "Scan"}
        </button>
        <button type="button" disabled title="Project deletion is not available yet" className="grid size-9 place-items-center rounded-lg border border-slate-800 text-slate-600" aria-label={`Delete ${project.name} (not available yet)`}><Trash2 className="size-4" /></button>
      </div>
    </article>
  );
}
