"use client";

import { AlertCircle, Copy, ExternalLink, FileCode2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type DataColumn } from "@/components/developer/DataTable";
import type { DatabaseTab } from "@/types/developer";
import type { Project } from "@/types/project";
import type { RepositoryFile, RepositoryWorkspace } from "@/types/workspace";

type DatabaseExplorerProps = {
  isLoadingFiles: boolean;
  isLoadingProjects: boolean;
  onProjectSelect: (projectId: number) => void;
  onRefresh: () => void;
  onSelectFile: (file: RepositoryFile) => void;
  projects: Project[];
  selectedProjectId: number | null;
  workspace: RepositoryWorkspace | null;
};

const tabs: { id: DatabaseTab; label: string }[] = [{ id: "projects", label: "Projects" }, { id: "files", label: "Files" }, { id: "symbols", label: "Symbols" }, { id: "relationships", label: "Relationships" }];

function CopyId({ value }: { value: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(String(value)); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  return <button type="button" title="Copy ID" onClick={() => void copy()} className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-xs text-slate-400 hover:bg-slate-800 hover:text-cyan-300"><span>{value}</span><Copy className="size-3" />{copied && <span className="font-sans text-cyan-300">Copied</span>}</button>;
}

export function DatabaseExplorer({ isLoadingFiles, isLoadingProjects, onProjectSelect, onRefresh, onSelectFile, projects, selectedProjectId, workspace }: DatabaseExplorerProps) {
  const [activeTab, setActiveTab] = useState<DatabaseTab>("projects");
  const [query, setQuery] = useState("");
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const filteredProjects = useMemo(() => { const normalized = query.trim().toLowerCase(); return normalized ? projects.filter((project) => `${project.id} ${project.name} ${project.default_branch ?? ""} ${project.github_url ?? ""}`.toLowerCase().includes(normalized)) : projects; }, [projects, query]);
  const filteredFiles = useMemo(() => { const normalized = query.trim().toLowerCase(); const files = workspace?.files ?? []; return normalized ? files.filter((file) => `${file.id} ${file.path} ${file.language ?? ""}`.toLowerCase().includes(normalized)) : files; }, [query, workspace]);
  const projectColumns: DataColumn<Project>[] = [
    { key: "id", label: "ID", value: (project) => project.id, render: (project) => <CopyId value={project.id} /> },
    { key: "name", label: "Name", value: (project) => project.name, render: (project) => <span className="font-medium text-slate-100">{project.name}</span> },
    { key: "branch", label: "Branch", value: (project) => project.default_branch, render: (project) => <span>{project.default_branch ?? "—"}</span> },
    { key: "created", label: "Created", value: (project) => project.created_at, render: (project) => <span>{new Date(project.created_at).toLocaleDateString()}</span> },
    { key: "open", label: "Open", value: (project) => project.id, render: (project) => <button type="button" onClick={() => onProjectSelect(project.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-100">{selectedProjectId === project.id ? "Selected" : "Inspect"}<ExternalLink className="size-3" /></button> },
  ];
  const fileColumns: DataColumn<RepositoryFile>[] = [
    { key: "id", label: "ID", value: (file) => file.id, render: (file) => <CopyId value={file.id} /> },
    { key: "path", label: "Path", value: (file) => file.path, render: (file) => <span className="inline-flex max-w-72 items-center gap-2 truncate font-mono text-xs text-slate-200"><FileCode2 className="size-3.5 shrink-0 text-cyan-400" />{file.path}</span> },
    { key: "language", label: "Language", value: (file) => file.language, render: (file) => <span>{file.language ?? "Unknown"}</span> },
    { key: "size", label: "Size", value: (file) => file.size, render: (file) => <span>{file.size.toLocaleString()} B</span> },
    { key: "view", label: "View", value: (file) => file.id, render: (file) => <button type="button" onClick={() => onSelectFile(file)} className="text-xs font-semibold text-cyan-300 hover:text-cyan-100">Use in API tester</button> },
  ];
  const isLoading = activeTab === "projects" ? isLoadingProjects : isLoadingFiles;
  const unavailable = activeTab === "symbols" || activeTab === "relationships";

  return <section aria-labelledby="database-explorer" className="rounded-xl border border-slate-800 bg-slate-950/65"><div className="flex flex-col gap-4 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 id="database-explorer" className="text-base font-semibold text-slate-100">Database Explorer</h2><p className="mt-1 text-xs text-slate-500">Live inventory exposed by the backend.</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeTab}…`} className="h-9 w-48 rounded-lg border border-slate-800 bg-slate-900 pl-8 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/70" /></label><button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm text-slate-300 hover:border-cyan-500/60 hover:text-cyan-200"><RefreshCw className="size-3.5" />Refresh</button></div></div><div className="flex overflow-x-auto border-b border-slate-800 px-3">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setQuery(""); }} className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-200"}`}>{tab.label}</button>)}</div>{activeTab === "files" && <div className="border-b border-slate-800 px-4 py-2.5 text-xs text-slate-500">{selectedProject ? `Inventory for ${selectedProject.name}` : "Select a project from the Projects tab to load files."}</div>}<div className="min-h-52">{isLoading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-slate-800/70" />)}</div> : unavailable ? <div className="grid min-h-52 place-items-center p-6 text-center"><div><AlertCircle className="mx-auto size-5 text-amber-300" /><p className="mt-3 font-medium text-slate-200">Backend endpoint not implemented</p><p className="mt-1 text-sm text-slate-500">A global {activeTab} inventory API is required to display this data.</p></div></div> : activeTab === "projects" ? <DataTable rows={filteredProjects} columns={projectColumns} getRowKey={(project) => project.id} emptyMessage="No projects match the current search." /> : <DataTable rows={filteredFiles} columns={fileColumns} getRowKey={(file) => file.id} emptyMessage={selectedProject ? "No scanned files match the current search." : "Select a project to inspect its scanned files."} />}</div></section>;
}
