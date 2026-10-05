"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/types/project";

type ProjectSelectorProps = {
  onSelect: (projectId: number) => void;
  projects: Project[];
  selectedProjectId: number | null;
  className?: string;
};

export function ProjectSelector({
  onSelect,
  projects,
  selectedProjectId,
  className,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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

  // Keyboard navigation for button and list
  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      const startIdx = e.key === "ArrowDown" ? 0 : projects.length - 1;
      setHighlightedIdx(startIdx);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (idx + 1) % projects.length;
      setHighlightedIdx(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (idx - 1 + projects.length) % projects.length;
      setHighlightedIdx(prev);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const proj = projects[idx];
      if (proj) {
        onSelect(proj.id);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const buttonLabel = selectedProject
    ? `${selectedProject.name} (#${selectedProject.id})`
    : projects.length
      ? "Select a project…"
      : "No projects available";

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Active Project Context"
      className={`relative flex min-w-0 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-[#111111] px-3.5 py-2 text-xs font-mono shadow-sm ${
        className ?? ""
      }`}
    >
      <span className="shrink-0 font-semibold uppercase tracking-wider text-zinc-400 hidden sm:inline">
        Active Project Context
      </span>
      <div className="relative inline-block min-w-0 flex-1 max-w-xs">
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-700/70 bg-[#18181b] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-zinc-500 focus:border-cyan-500/60 focus:outline-none"
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleButtonKeyDown}
        >
          <span className="truncate whitespace-nowrap text-left" title={buttonLabel}>
            {buttonLabel}
          </span>
          <ChevronDown
            className={`size-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-cyan-400" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {isOpen && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute right-0 top-full z-[100] mt-1.5 max-h-72 min-w-[260px] sm:min-w-[300px] w-max max-w-[calc(100vw-32px)] overflow-y-auto rounded-xl border border-zinc-700/80 bg-[#161616] p-1.5 shadow-2xl shadow-black/90 backdrop-blur-md"
            tabIndex={-1}
          >
            {projects.length === 0 ? (
              <li className="px-3 py-2 text-xs text-zinc-500 italic">No projects available</li>
            ) : (
              projects.map((project, idx) => {
                const isSelected = project.id === selectedProjectId;
                const isHighlighted = idx === highlightedIdx;
                return (
                  <li
                    key={project.id}
                    role="option"
                    aria-selected={isSelected}
                    className={`group flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                      isSelected
                        ? "bg-zinc-800 text-white font-medium shadow-sm"
                        : isHighlighted
                          ? "bg-zinc-800/60 text-zinc-100"
                          : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                    }`}
                    onClick={() => {
                      onSelect(project.id);
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onKeyDown={(e) => handleOptionKeyDown(e, idx)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate whitespace-nowrap text-zinc-100 font-medium">
                        {project.name}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400 group-hover:text-zinc-300 shrink-0">
                        (#{project.id})
                      </span>
                    </div>
                    {isSelected ? (
                      <Check className="size-3.5 shrink-0 text-cyan-400" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
