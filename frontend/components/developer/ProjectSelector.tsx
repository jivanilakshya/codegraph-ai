"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Check, ChevronDown, GitFork as Github, Plus } from "lucide-react";
import type { Project } from "@/types/project";
import { cn } from "@/lib/cn";

type ProjectSelectorProps = {
  onSelect: (projectId: number) => void;
  projects: Project[];
  selectedProjectId: number | null;
  className?: string;
  showLabel?: boolean;
};

export function ProjectSelector({
  onSelect,
  projects,
  selectedProjectId,
  className,
  showLabel = true,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {showLabel && (
        <div className="cg-label mb-1.5">Active Project Context</div>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-3 justify-between w-full sm:w-64 h-10 pl-3 pr-2.5 rounded-lg border bg-white/[0.02] transition-all text-[13px] cursor-pointer",
          isOpen
            ? "border-primary/40 shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-6px_rgba(0,229,255,0.35)]"
            : "border-white/[0.08] hover:border-white/20"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-white font-medium truncate">
            {selectedProject ? selectedProject.name : "Select a project…"}
          </span>
          {selectedProject && (
            <span className="font-mono text-muted-foreground text-[11px] shrink-0">
              #{selectedProject.id}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300 shrink-0",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 sm:left-0 mt-2 w-72 sm:w-80 p-1.5 rounded-xl border border-cyan-300/15 bg-[#0a0d16]/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_-10px_rgba(0,229,255,0.25)] z-50 cg-pop">
          <div className="cg-label px-2.5 pt-1.5 pb-2 !text-[9.5px]">Switch project</div>
          {projects.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground font-mono text-center">
              No projects available.
            </div>
          ) : (
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {projects.map((p) => {
                const isActive = selectedProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelect(p.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer",
                      isActive ? "bg-primary/[0.07]" : "hover:bg-white/[0.04]"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" />
                    )}
                    {p.github_url ? (
                      <Github className="w-4 h-4 text-violet-300 shrink-0" />
                    ) : (
                      <Archive className="w-4 h-4 text-sky-300 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block text-[13px] truncate",
                          isActive ? "text-white font-medium" : "text-foreground/85"
                        )}
                      >
                        {p.name}{" "}
                        <span className="font-mono text-[11px] text-muted-foreground">
                          (#{p.id})
                        </span>
                      </span>
                      <span className="block font-mono text-[10.5px] text-muted-foreground truncate">
                        {p.github_url ? "GitHub" : "ZIP Archive"}
                      </span>
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-1 pt-1.5 border-t border-white/[0.06]">
            <Link
              href="/projects"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono text-muted-foreground hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Create or import project…</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
