import type { Project } from "@/types/project";
import { useState, useEffect, useRef } from "react";

type ProjectSelectorProps = {
  onSelect: (projectId: number) => void;
  projects: Project[];
  selectedProjectId: number | null;
};

export function ProjectSelector({ onSelect, projects, selectedProjectId }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for button and list
  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      const startIdx = e.key === 'ArrowDown' ? 0 : projects.length - 1;
      setHighlightedIdx(startIdx);
    }
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % projects.length;
      setHighlightedIdx(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + projects.length) % projects.length;
      setHighlightedIdx(prev);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const proj = projects[idx];
      onSelect(proj.id);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const buttonLabel = selectedProject ? `${selectedProject.name} (#${selectedProject.id})` : (projects.length ? 'Select a project…' : 'No projects available');

  return (
    <label className="flex min-w-0 items-center justify-between gap-4 rounded-xl border border-[#292929] bg-[#080808] px-5 py-3.5 text-xs font-mono">
      <span className="shrink-0 font-semibold uppercase tracking-wider text-[#A3A3A3]">Active Project Context</span>
      <div className="relative inline-block min-w-0 flex-1 max-w-xs">
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between rounded-lg border border-[#2A2A2A] bg-[#080808] px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:border-[#444444]"
          onClick={() => setIsOpen(prev => !prev)}
          onKeyDown={handleButtonKeyDown}
        >
          <span className="truncate" title={buttonLabel}>{buttonLabel}</span>
          <svg className="ml-2 h-3 w-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 8l4 4 4-4" /></svg>
        </button>
        {isOpen && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-[#303030] bg-[#080808] py-1 shadow-lg"
            tabIndex={-1}
          >
            {projects.map((project, idx) => {
              const isSelected = project.id === selectedProjectId;
              const isHighlighted = idx === highlightedIdx;
              return (
                <li
                  key={project.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs ${isHighlighted ? 'bg-[#151515] text-white' : 'bg-transparent text-[#E5E5E5]'} ${isSelected ? 'bg-[#1A1A1A] text-white' : ''}`}
                  onClick={() => { onSelect(project.id); setIsOpen(false); }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  onKeyDown={(e) => handleOptionKeyDown(e, idx)}
                >
                  <span>{project.name} (#{project.id})</span>
                  {isSelected && <span className="ml-2 h-full w-1.5 bg-[#A3A3A3]" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </label>
  );
}

