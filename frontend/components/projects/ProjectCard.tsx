"use client";

import Link from "next/link";
import { ExternalLink, FileArchive, FolderOpen, Github, GitBranch, LoaderCircle, Play, Trash2 } from "lucide-react";

import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
  isScanning: boolean;
  isDeleting: boolean;
  onScan: (project: Project) => void;
  onDelete: (project: Project) => void;
};

function formatCreatedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function ProjectCard({ project, isScanning, isDeleting, onScan, onDelete }: ProjectCardProps) {
  const isGitHubProject = Boolean(project.github_url);
  const isBusy = isScanning || isDeleting;

  return (
    <article className="group flex min-h-72 flex-col rounded-xl border border-slate-800 bg-slate-950/50 p-5 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-slate-950/80 hover:shadow-[0_20px_50px_-25px_rgba(34,211,238,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <span className={`grid size-10 place-items-center rounded-lg border ${isGitHubProject ? "border-violet-500/20 bg-violet-500/10 text-violet-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>
          {isGitHubProject ? <Github className="size-5" /> : <FileArchive className="size-5" />}
        </span>
        <span className="rounded-md border border-slate-800/80 bg-slate-900/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-slate-400">
          ID #{project.id}
        </span>
      </div>

      <div className="mt-5 min-w-0 flex-1">
        <h2 className="truncate text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors" title={project.name}>
          {project.name}
        </h2>
        {project.github_url ? (
          <a
            href={project.github_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 truncate text-xs text-slate-400 hover:text-cyan-300 hover:underline"
            title={project.github_url}
          >
            <ExternalLink className="size-3 shrink-0" />
            <span className="truncate">{project.github_url.replace(/^https?:\/\//, "")}</span>
          </a>
        ) : (
          <p className="mt-2 text-xs text-slate-500 font-medium">ZIP Archive Upload</p>
        )}
      </div>

      <dl className="mt-5 space-y-2.5 border-t border-slate-800/60 pt-4 text-xs">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-1.5 text-slate-500">
            <GitBranch className="size-3.5" />
            Default Branch
          </dt>
          <dd className="truncate font-mono text-slate-300 bg-slate-900/40 px-2 py-0.5 rounded border border-slate-800/40">{project.default_branch ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-slate-500">Created At</dt>
          <dd className="text-slate-300">{formatCreatedDate(project.created_at)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-2 border-t border-slate-800/60 pt-4">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/80 px-3 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-100"
        >
          <FolderOpen className="size-3.5" /> Open
        </Link>
        <button
          type="button"
          onClick={() => onScan(project)}
          disabled={isBusy}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
        >
          {isScanning ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          {isScanning ? "Scanning" : "Scan"}
        </button>
        <button
          type="button"
          id={`delete-project-${project.id}`}
          onClick={() => onDelete(project)}
          disabled={isBusy}
          title={`Delete ${project.name}`}
          aria-label={`Delete ${project.name}`}
          className="grid size-9 place-items-center rounded-lg border border-slate-800 text-slate-500 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:cursor-wait disabled:opacity-40"
        >
          {isDeleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </button>
      </div>
    </article>
  );
}
