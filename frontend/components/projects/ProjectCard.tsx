"use client";

import Link from "next/link";
import {
  Archive,
  CalendarDays,
  FolderOpen,
  GitBranch,
  GitFork,
  Loader2,
  Network,
  ScanLine,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Project } from "@/types/project";

type ProjectCardProps = {
  project: Project;
  isScanning: boolean;
  isDeleting: boolean;
  isActive?: boolean;
  onScan: (project: Project) => void;
  onDelete: (project: Project) => void;
  onSelectActive?: (project: Project) => void;
};

function formatCreatedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Oct 03, 2026"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

const SOURCE = {
  github: { label: "GitHub Repository", icon: GitFork, tone: "text-violet-300", ring: "border-violet-400/25 bg-violet-400/[0.06]" },
  zip: { label: "ZIP Archive", icon: Archive, tone: "text-sky-300", ring: "border-sky-400/25 bg-sky-400/[0.06]" },
};

export function ProjectCard({
  project,
  isScanning,
  isDeleting,
  isActive = false,
  onScan,
  onDelete,
  onSelectActive,
}: ProjectCardProps) {
  const isGit = Boolean(project.github_url);
  const src = isGit ? SOURCE.github : SOURCE.zip;
  const isBusy = isScanning || isDeleting;
  const originText = isGit ? (project.github_url?.replace(/^https?:\/\//, "") ?? project.name) : "ZIP Archive Upload Source";

  return (
    <article
      className={cn(
        "group relative rounded-xl overflow-hidden flex flex-col reveal transition-all duration-300 hover:-translate-y-0.5",
        isActive
          ? "border border-primary/30 bg-gradient-to-b from-[#0b1424] to-[#080b14] shadow-[0_0_40px_-18px_rgba(0,229,255,0.45)]"
          : "border border-white/[0.07] bg-gradient-to-b from-[#0d1019]/80 to-[#090b12]/80 hover:border-white/[0.14]"
      )}
    >
      {/* Edge signal hairline */}
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          isActive
            ? "cg-hairline"
            : "bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        )}
      />

      {isScanning && (
        <span className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <span className="absolute inset-y-0 w-1/3 bg-primary cg-scanline" />
        </span>
      )}

      {/* Identity */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <span className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", src.ring)}>
            <src.icon className={cn("w-4 h-4", src.tone)} />
          </span>
          <span className={cn("font-mono text-[10px] tracking-[0.14em] uppercase", src.tone)}>
            {src.label}
          </span>
        </div>

        {isScanning ? (
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-primary px-2 py-1 rounded border border-primary/30 bg-primary/10">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            SCANNING
          </span>
        ) : isActive ? (
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-primary px-2 py-1 rounded border border-primary/30 bg-primary/10">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-primary cg-ring" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-primary" />
            </span>
            ACTIVE
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-emerald-300/90 px-2 py-1 rounded border border-emerald-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            READY
          </span>
        )}
      </div>

      {/* Information */}
      <div className="px-5 pt-5 pb-4">
        <h3 className={cn("text-[22px] font-semibold tracking-[-0.02em] break-all", isActive ? "text-white" : "text-white/90")}>
          {project.name}
        </h3>
        <p className="mt-1 font-mono text-[11.5px] text-muted-foreground truncate" title={originText}>
          {originText}
        </p>
      </div>

      {/* Metadata */}
      <dl className="mx-5 grid grid-cols-2 border-y border-white/[0.06] py-3">
        <div>
          <dt className="cg-label !text-[9.5px] flex items-center gap-1.5">
            <GitBranch className="w-3 h-3" />
            Default Branch
          </dt>
          <dd className="mt-1 font-mono text-[12.5px] text-foreground">
            {project.default_branch ?? "main"}
          </dd>
        </div>
        <div className="pl-4 border-l border-white/[0.06]">
          <dt className="cg-label !text-[9.5px] flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" />
            Created Date
          </dt>
          <dd className="mt-1 font-mono text-[12.5px] text-foreground">
            {formatCreatedDate(project.created_at)}
          </dd>
        </div>
      </dl>

      {/* Actions */}
      <div className="mt-auto p-3 flex items-center gap-1.5">
        <Link
          href={`/projects/${project.id}`}
          onClick={() => onSelectActive?.(project)}
          className={cn(
            "group/b flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium active:scale-[0.98] transition-all",
            isActive
              ? "bg-primary/10 border border-primary/30 text-primary hover:bg-primary/15"
              : "border border-white/[0.09] text-white hover:border-primary/40 hover:text-primary"
          )}
        >
          <FolderOpen className="w-3.5 h-3.5 transition-transform group-hover/b:translate-x-0.5" />
          Open
        </Link>

        <button
          type="button"
          onClick={() => onScan(project)}
          disabled={isBusy}
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.09] text-[13px] text-white hover:border-primary/40 hover:text-primary disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {isScanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : (
            <ScanLine className="w-3.5 h-3.5" />
          )}
          <span>{isScanning ? "Scanning" : "Scan"}</span>
        </button>

        <Link
          href={`/graph?projectId=${project.id}`}
          onClick={() => onSelectActive?.(project)}
          title="View relationships graph"
          aria-label="View relationships graph"
          className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-white/[0.09] text-muted-foreground hover:text-primary hover:border-primary/40 hover:shadow-[0_0_14px_-4px_rgba(0,229,255,0.5)] active:scale-[0.98] transition-all"
        >
          <Network className="w-3.5 h-3.5" />
        </Link>

        <button
          type="button"
          id={`delete-project-${project.id}`}
          onClick={() => onDelete(project)}
          disabled={isBusy}
          title={`Delete ${project.name}`}
          aria-label={`Delete ${project.name}`}
          className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-white/[0.09] text-muted-foreground hover:text-rose-300 hover:border-rose-400/40 hover:bg-rose-500/[0.06] active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </article>
  );
}


