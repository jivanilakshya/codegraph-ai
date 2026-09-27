"use client";

import Link from "next/link";
import { ExternalLink, FileArchive, FolderOpen, Github, GitBranch, LoaderCircle, Play, Trash2, GitGraph } from "lucide-react";
import { useRef } from "react";

import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
  isScanning: boolean;
  isDeleting: boolean;
  isActive?: boolean;
  onScan: (project: Project) => void;
  onDelete: (project: Project) => void;
};

function formatCreatedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function ProjectCard({ project, isScanning, isDeleting, isActive = false, onScan, onDelete }: ProjectCardProps) {
  const isGitHubProject = Boolean(project.github_url);
  const isBusy = isScanning || isDeleting;

  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`group relative flex min-h-[290px] flex-col justify-between overflow-hidden rounded-xl p-6 shadow-xl transition-all duration-250 ease-out hover:-translate-y-1 ${
        isActive
          ? "border border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.035)] shadow-[inset_4px_0_0_0_#ffffff]"
          : "border border-[#242424] bg-[#080808] hover:border-[#3A3A3A] hover:bg-[#0D0D0D] hover:shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
      }`}
    >
      {/* Dynamic Cursor Light Spotlight */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(260px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.05), transparent 75%)`,
        }}
      />

      {/* Top-Left Ambient Highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.05),transparent_45%)]" />

      {/* Light Sweep Line */}
      <div className="pointer-events-none absolute -left-full top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.05)] to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-full group-hover:opacity-100" />

      <div className="relative z-10">
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg border border-[#252525] bg-[#0A0A0A] text-white transition-all group-hover:border-[#555555]">
              {isGitHubProject ? <Github className="size-4 text-white" /> : <FileArchive className="size-4 text-white" />}
            </span>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3] bg-[#121212] border border-[#252525] px-2.5 py-1 rounded">
              {isGitHubProject ? "GitHub Repository" : "ZIP Archive"}
            </span>
          </div>

          {/* Status Indicator */}
          {isScanning ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-white bg-[#151515] border border-[#303030] px-2 py-0.5 rounded">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              Scanning
            </span>
          ) : isActive ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold text-black bg-white px-2 py-0.5 rounded uppercase">
              <span className="size-1.5 rounded-full bg-black animate-pulse" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-[#A3A3A3]">
              <span className="size-1.5 rounded-full bg-[#555555]" />
              Ready
            </span>
          )}
        </div>

        {/* Project Title & Link */}
        <div className="mt-5 min-w-0">
          <h2 className="truncate font-sans text-lg font-bold text-white transition-transform group-hover:translate-x-0.5" title={project.name}>
            {project.name}
          </h2>
          {project.github_url ? (
            <a
              href={project.github_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 truncate font-mono text-xs text-[#A3A3A3] hover:text-white hover:underline transition-colors"
              title={project.github_url}
            >
              <ExternalLink className="size-3 shrink-0 text-[#737373]" />
              <span className="truncate">{project.github_url.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : (
            <p className="mt-1.5 font-mono text-xs text-[#737373]">ZIP Upload Archive Source</p>
          )}
        </div>

        {/* Metadata Details */}
        <dl className="mt-5 space-y-2 border-t border-[#202020] pt-4 font-mono text-xs">
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-[#737373]">
              <GitBranch className="size-3 text-[#A3A3A3]" />
              Default Branch
            </dt>
            <dd className="truncate text-white bg-[#101010] px-2 py-0.5 rounded border border-[#222222]">
              {project.default_branch ?? "main"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-[#737373]">Created Date</dt>
            <dd className="text-[#A3A3A3]">{formatCreatedDate(project.created_at)}</dd>
          </div>
        </dl>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-6 flex items-center gap-2 border-t border-[#202020] pt-4">
        {/* Open Project Workspace */}
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#252525] bg-[#0A0A0A] font-mono text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#555555] hover:bg-[#151515] hover:shadow-[0_4px_16px_rgba(255,255,255,0.06)]"
        >
          <FolderOpen className="size-3.5 text-[#A3A3A3]" />
          <span>Open</span>
        </Link>

        {/* Scan Action Button (Primary) */}
        <button
          type="button"
          onClick={() => onScan(project)}
          disabled={isBusy}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 font-mono text-xs font-bold text-black shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E5E5E5] hover:shadow-[0_4px_16px_rgba(255,255,255,0.15)] disabled:cursor-wait disabled:opacity-60"
        >
          {isScanning ? <LoaderCircle className="size-3.5 animate-spin text-black" /> : <Play className="size-3.5 text-black" />}
          <span>{isScanning ? "Scanning" : "Scan"}</span>
        </button>

        {/* Open Graph Action Button */}
        <Link
          href={`/graph?projectId=${project.id}`}
          className="grid size-9 place-items-center rounded-lg border border-[#252525] bg-[#0A0A0A] text-[#A3A3A3] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#555555] hover:bg-[#151515] hover:text-white"
          title="Open Graph Visualization"
        >
          <GitGraph className="size-3.5" />
        </Link>

        {/* Delete Project Action */}
        <button
          type="button"
          id={`delete-project-${project.id}`}
          onClick={() => onDelete(project)}
          disabled={isBusy}
          title={`Delete ${project.name}`}
          aria-label={`Delete ${project.name}`}
          className="grid size-9 place-items-center rounded-lg border border-[#252525] bg-[#0A0A0A] text-[#737373] transition-all duration-200 hover:border-rose-900/50 hover:bg-rose-950/20 hover:text-rose-300 disabled:cursor-wait disabled:opacity-40"
        >
          {isDeleting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </button>
      </div>
    </article>
  );
}

