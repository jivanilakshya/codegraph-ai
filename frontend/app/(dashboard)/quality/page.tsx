"use client";

import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Repeat,
  Gauge,
  ArrowRight,
  FileCode,
  Code2,
  Boxes,
  Variable,
  Layers,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useActiveProject } from "@/hooks/useActiveProject";
import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { getProjectCodeQuality } from "@/services/code_quality";
import type { CodeQualityResponse } from "@/types/code_quality";

export default function CodeQualityPage() {
  const { projects, activeProjectId, selectProject } = useActiveProject();
  const [data, setData] = useState<CodeQualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!activeProjectId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjectCodeQuality(activeProjectId);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load code quality analysis.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getGradeTheme = (grade: string) => {
    switch (grade.toUpperCase()) {
      case "A":
        return {
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
          bg: "bg-emerald-500/5",
          message: "Excellent code health with minimal quality concerns.",
        };
      case "B":
        return {
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
          text: "text-blue-400",
          border: "border-blue-500/30",
          bg: "bg-blue-500/5",
          message: "Good code health with minor issues detected.",
        };
      case "C":
        return {
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          text: "text-amber-400",
          border: "border-amber-500/30",
          bg: "bg-amber-500/5",
          message: "Moderate code health. Refactoring recommended.",
        };
      case "D":
        return {
          badge: "bg-orange-500/20 text-orange-300 border-orange-500/40",
          text: "text-orange-400",
          border: "border-orange-500/30",
          bg: "bg-orange-500/5",
          message: "Fair code health. Action required on high-severity findings.",
        };
      default:
        return {
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          text: "text-rose-400",
          border: "border-rose-500/30",
          bg: "bg-rose-500/5",
          message: "Critical quality issues present across workspace.",
        };
    }
  };

  const summary = data?.summary;
  const breakdown = data?.breakdown;
  const gradeTheme = summary ? getGradeTheme(summary.quality_grade) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">Code Quality Dashboard</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Unified health score, letter grade, and multi-domain architectural findings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ProjectSelector
            projects={projects}
            selectedProjectId={activeProjectId}
            onSelect={selectProject}
          />

          <button
            onClick={() => void loadData()}
            disabled={isLoading || !activeProjectId}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!activeProjectId ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
          <ShieldCheck className="mx-auto size-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-slate-200">No Active Project Selected</h3>
          <p className="mt-1 text-sm text-slate-400">Please select a project above to view its code quality score and findings.</p>
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <RefreshCw className="mx-auto size-8 animate-spin text-emerald-400 mb-3" />
          <p className="text-sm text-slate-300">Analyzing code quality across dead code, circular dependencies, and complexity...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-300 flex items-center gap-3">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <h4 className="font-semibold text-rose-200">Failed to Load Code Quality Data</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      ) : summary && breakdown && gradeTheme ? (
        <div className="space-y-6">
          {/* Hero Overall Quality Card */}
          <div className={`rounded-xl border ${gradeTheme.border} ${gradeTheme.bg} p-6 shadow-lg backdrop-blur-sm relative overflow-hidden`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Overall Project Health</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${gradeTheme.badge}`}>
                    Grade {summary.quality_grade}
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className={`text-5xl font-extrabold tracking-tight ${gradeTheme.text}`}>
                    {summary.overall_score}
                  </span>
                  <span className="text-lg font-medium text-slate-400">/ 100</span>
                </div>

                <p className="text-sm text-slate-300 font-medium pt-1">
                  {gradeTheme.message}
                </p>
              </div>

              {/* Quick Health Summary Grid */}
              <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Dead Code Items</span>
                  <span className="text-xl font-bold text-slate-200 mt-1 block">
                    {summary.dead_code_count}
                  </span>
                  <span className="text-[11px] text-amber-400/90 font-medium">
                    {summary.dead_code_high_confidence_count} High Conf.
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">Dependency Cycles</span>
                  <span className="text-xl font-bold text-slate-200 mt-1 block">
                    {summary.circular_dependency_count}
                  </span>
                  <span className="text-[11px] text-rose-400/90 font-medium">
                    {summary.high_circular_dependency_count} High Sev.
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block font-medium">High Complexity</span>
                  <span className="text-xl font-bold text-slate-200 mt-1 block">
                    {summary.high_complexity_count}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Avg Score: {summary.average_complexity}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Domain Link Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dead Code Feature Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Trash2 className="size-5" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Step 9.1
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                  Dead Code Detection
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Unreachable or unused files, functions, classes, and methods identified across project nodes.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Candidates</span>
                    <span className="font-semibold text-slate-200">{summary.dead_code_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">High Confidence</span>
                    <span className="font-semibold text-amber-400">{summary.dead_code_high_confidence_count}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/dead-code?projectId=${activeProjectId}`}
                className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors group-hover:translate-x-0.5 duration-200"
              >
                <span>View Dead Code Details</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Circular Dependencies Feature Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <Repeat className="size-5" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Step 9.2
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 group-hover:text-rose-300 transition-colors">
                  Circular Dependencies
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Module &amp; file import cycles detected via deterministic graph traversal.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Cycles</span>
                    <span className="font-semibold text-slate-200">{summary.circular_dependency_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">High Severity</span>
                    <span className="font-semibold text-rose-400">{summary.high_circular_dependency_count}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/circular-dependencies?projectId=${activeProjectId}`}
                className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors group-hover:translate-x-0.5 duration-200"
              >
                <span>View Dependency Cycles</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Complexity Analysis Feature Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-colors group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Gauge className="size-5" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Step 9.3
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                  Complexity Analysis
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Cyclomatic complexity and oversized function metrics computed from Tree-sitter AST nodes.
                </p>

                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block">High Complexity</span>
                    <span className="font-semibold text-blue-400">{summary.high_complexity_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Max Complexity</span>
                    <span className="font-semibold text-slate-200">{summary.max_complexity}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/complexity?projectId=${activeProjectId}`}
                className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors group-hover:translate-x-0.5 duration-200"
              >
                <span>View Complexity Metrics</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Domain Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dead Code Entity Breakdown */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Trash2 className="size-4 text-amber-400" />
                Dead Code Candidates by Entity Type
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2">
                    <FileCode className="size-3.5 text-slate-500" /> Unused Files
                  </span>
                  <span className="font-semibold text-slate-200">{breakdown.dead_code.files}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Boxes className="size-3.5 text-slate-500" /> Unused Classes
                  </span>
                  <span className="font-semibold text-slate-200">{breakdown.dead_code.classes}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Code2 className="size-3.5 text-slate-500" /> Unused Functions
                  </span>
                  <span className="font-semibold text-slate-200">{breakdown.dead_code.functions}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Layers className="size-3.5 text-slate-500" /> Unused Methods
                  </span>
                  <span className="font-semibold text-slate-200">{breakdown.dead_code.methods}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Variable className="size-3.5 text-slate-500" /> Unused Variables
                  </span>
                  <span className="font-semibold text-slate-200">{breakdown.dead_code.variables}</span>
                </div>
              </div>
            </div>

            {/* Circular Dependency Severity Breakdown */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Repeat className="size-4 text-rose-400" />
                Circular Dependencies by Severity
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">High Severity (Length &ge; 4)</span>
                  <span className="font-semibold text-rose-400">{breakdown.circular_dependency.high_severity}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Medium Severity (Length 3)</span>
                  <span className="font-semibold text-amber-400">{breakdown.circular_dependency.medium_severity}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Low Severity (Length 2)</span>
                  <span className="font-semibold text-blue-400">{breakdown.circular_dependency.low_severity}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-400">Max Cycle Length</span>
                  <span className="font-semibold text-slate-200">{breakdown.circular_dependency.max_cycle_length} files</span>
                </div>
              </div>
            </div>

            {/* Complexity Tier Breakdown */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Gauge className="size-4 text-blue-400" />
                Complexity Distribution
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">High Complexity (&gt; 10)</span>
                  <span className="font-semibold text-rose-400">{breakdown.complexity.high_complexity}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Medium Complexity (6 - 10)</span>
                  <span className="font-semibold text-amber-400">{breakdown.complexity.medium_complexity}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Low Complexity (1 - 5)</span>
                  <span className="font-semibold text-emerald-400">{breakdown.complexity.low_complexity}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1.5">
                  <span className="text-slate-400">Average Complexity</span>
                  <span className="font-semibold text-slate-200">{breakdown.complexity.average_complexity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
