"use client";

import { ShieldAlert, RefreshCw, Filter, Search, FileCode, Code2, Boxes, Variable, FolderOpen, GitGraph, AlertTriangle, CheckCircle2, ChevronDown, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { StatCard } from "@/components/ui/StatCard";
import { useActiveProject } from "@/hooks/useActiveProject";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { getProjectDeadCode } from "@/services/dead_code";
import { buildSourceLocationUrl } from "@/lib/navigation";
import type { DeadCodeItem, DeadCodeResponse } from "@/types/dead_code";

type FilterOption = {
  value: string;
  label: string;
};

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (val: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {Icon && <Icon className="size-3.5 text-slate-400" />}
      <span className="text-xs font-medium text-slate-400 select-none">{label}</span>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            } else if (e.key === "ArrowDown" && !isOpen) {
              setIsOpen(true);
            }
          }}
          className={`relative overflow-hidden flex h-8 items-center justify-between gap-2 rounded-lg border border-[#242424] bg-[#080808] px-2.5 text-xs font-medium text-slate-100 transition-all duration-200 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#0D0D0D] focus:border-[rgba(255,255,255,0.3)] focus:outline-none ${
            isOpen ? "border-[rgba(255,255,255,0.3)] bg-[#0D0D0D] shadow-[0_0_12px_rgba(255,255,255,0.06)]" : ""
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_50%)]"
            aria-hidden="true"
          />
          <span className="relative z-10 truncate">{selectedOption.label}</span>
          <ChevronDown
            className={`relative z-10 size-3 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-white" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            tabIndex={-1}
            className="absolute right-0 top-full z-50 mt-1 min-w-[140px] w-max overflow-hidden rounded-xl border border-[#242424] bg-[#0A0A0A] p-1 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-150"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_40%)]"
              aria-hidden="true"
            />
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`relative z-10 flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#141414] text-white font-medium border border-[#2A2A2A]"
                      : "text-slate-300 hover:bg-[#121212] hover:text-white"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="size-3 text-cyan-400 shrink-0" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeadCodePage() {
  const { projects, activeProjectId, selectProject } = useActiveProject();
  const [data, setData] = useState<DeadCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectDeadCode(activeProjectId);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform dead code analysis.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      if (typeFilter !== "all" && item.entity_type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (confidenceFilter !== "all" && item.confidence.toLowerCase() !== confidenceFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchPath = item.file_path.toLowerCase().includes(query);
        const matchReason = item.reason.toLowerCase().includes(query);
        if (!matchName && !matchPath && !matchReason) return false;
      }
      return true;
    });
  }, [data, typeFilter, confidenceFilter, searchQuery]);

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-500/20">
            <AlertTriangle className="size-3" /> High Confidence
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/20">
            Medium Confidence
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#151515] px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-[#242424]">
            Low Confidence
          </span>
        );
    }
  };

  const getTypeBadge = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case "file":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/20">
            <FileCode className="size-3" /> File
          </span>
        );
      case "class":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/20">
            <Boxes className="size-3" /> Class
          </span>
        );
      case "function":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/20">
            <Code2 className="size-3" /> Function
          </span>
        );
      case "method":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/20">
            <Code2 className="size-3" /> Method
          </span>
        );
      case "variable":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-300 border border-orange-500/20">
            <Variable className="size-3" /> Variable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-[#151515] border border-[#242424] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            {entityType}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in bg-[#000000] text-slate-100 min-h-full">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 250ms ease-out forwards;
        }
      `}</style>

      {/* Header section */}
      <div className="flex items-center justify-between gap-4 border-b border-[#242424] pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
            <ShieldAlert className="size-7 text-rose-400" /> Dead Code Detection
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Identify potential unreachable files, classes, functions, methods, and variables using knowledge-graph analysis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="relative overflow-hidden flex h-9 items-center gap-2 rounded-lg border border-[#242424] bg-[#080808] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#0D0D0D] hover:text-white transition-all duration-200 disabled:opacity-50 shadow-sm"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_50%)]"
            aria-hidden="true"
          />
          <RefreshCw className={`relative z-10 size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span className="relative z-10">Refresh</span>
        </button>
      </div>

      {/* Project Selector */}
      <ProjectSelector
        onSelect={selectProject}
        projects={projects}
        selectedProjectId={activeProjectId}
      />

      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 text-sm text-rose-200">
          <p className="font-semibold text-rose-100">Failed to analyze dead code</p>
          <p className="mt-1 text-slate-400">{error}</p>
        </div>
      )}

      {/* Summary Cards Section */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Potential Dead Items"
          value={isLoading ? "..." : String(data?.total_candidates ?? 0)}
          icon={ShieldAlert}
        />
        <StatCard
          label="Unused Files"
          value={isLoading ? "..." : String(data?.summary.files ?? 0)}
          icon={FileCode}
        />
        <StatCard
          label="Unused Functions / Methods"
          value={isLoading ? "..." : String((data?.summary.functions ?? 0) + (data?.summary.methods ?? 0))}
          icon={Code2}
        />
        <StatCard
          label="Unused Classes"
          value={isLoading ? "..." : String(data?.summary.classes ?? 0)}
          icon={Boxes}
        />
        <StatCard
          label="Unused Variables"
          value={isLoading ? "..." : String(data?.summary.variables ?? 0)}
          icon={Variable}
        />
      </section>

      {/* Filters Bar with StatCard-matched ambient shading */}
      <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-xl border border-[#242424] bg-[#080808] p-4 shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.035),transparent_40%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1 rounded-lg border border-[#242424] bg-[#0D0D0D] px-3 py-1.5 focus-within:border-[rgba(255,255,255,0.25)] focus-within:bg-[#121212] transition-colors">
          <Search className="size-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search candidates by name, path, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0 border-t sm:border-t-0 border-[#242424] pt-3 sm:pt-0">
          <FilterDropdown
            label="Type:"
            value={typeFilter}
            options={[
              { value: "all", label: "All Types" },
              { value: "file", label: "Files" },
              { value: "function", label: "Functions" },
              { value: "method", label: "Methods" },
              { value: "class", label: "Classes" },
              { value: "variable", label: "Variables" },
            ]}
            onChange={setTypeFilter}
            icon={Filter}
          />

          <FilterDropdown
            label="Confidence:"
            value={confidenceFilter}
            options={[
              { value: "all", label: "All Confidence" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            onChange={setConfidenceFilter}
          />
        </div>
      </div>

      {/* Results Candidates List */}
      <section className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-20 animate-pulse rounded-xl bg-[#080808] border border-[#242424]" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#242424] rounded-xl bg-[#080808]/60">
            <CheckCircle2 className="size-10 mx-auto text-emerald-500/60 mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">No Potential Dead Code Found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || typeFilter !== "all" || confidenceFilter !== "all"
                ? "No dead code candidates match your selected filter criteria."
                : "The knowledge graph analysis found no unreferenced symbols or dead files for this project."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
              <span>Showing {filteredItems.length} candidate{filteredItems.length === 1 ? "" : "s"}</span>
              <span className="text-[11px] text-slate-500">Conservative deterministic analysis</span>
            </div>

            {filteredItems.map((item: DeadCodeItem) => (
              <div
                key={item.id}
                className="group relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-xl border border-[#242424] bg-[#080808] hover:border-[rgba(255,255,255,0.22)] hover:bg-[#0D0D0D] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 gap-4"
              >
                {/* Subtle Top-Left Ambient Highlight matching StatCard */}
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_45%)]"
                  aria-hidden="true"
                />

                <div className="relative z-10 min-w-0 space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(item.entity_type)}
                    <h3 className="text-sm font-bold text-slate-100 font-mono truncate">
                      {item.name}
                    </h3>
                    {getConfidenceBadge(item.confidence)}
                  </div>

                  <p className="text-xs text-slate-400 font-mono truncate">
                    {item.file_path}
                    {item.start_line != null && item.end_line != null && (
                      <span className="text-slate-500"> (L{item.start_line}-L{item.end_line})</span>
                    )}
                  </p>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.reason}
                  </p>
                </div>

                <div className="relative z-10 flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Link
                    href={buildSourceLocationUrl({
                      projectId: activeProjectId,
                      fileId: item.file_id,
                      filePath: item.file_path,
                      startLine: item.start_line,
                      endLine: item.end_line,
                    })}
                    className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#242424] bg-[#0A0A0A] text-xs font-semibold text-slate-300 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#121212] hover:text-white transition-all duration-200"
                    title="View in Repository"
                  >
                    <FolderOpen className="size-3.5" /> View File
                  </Link>

                  <Link
                    href={
                      item.entity_type === "file"
                        ? `/graph?projectId=${activeProjectId}&fileId=${item.file_id}`
                        : `/graph?projectId=${activeProjectId}&entityId=${item.id.replace("entity_", "")}`
                    }
                    className="relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#242424] bg-[#0A0A0A] text-xs font-semibold text-slate-300 hover:border-[rgba(255,255,255,0.25)] hover:bg-[#121212] hover:text-white transition-all duration-200"
                    title="Explore Knowledge Graph"
                  >
                    <GitGraph className="size-3.5" /> Explore Graph
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
