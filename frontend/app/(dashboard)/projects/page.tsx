"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectEmpty } from "@/components/projects/ProjectEmpty";
import { ProjectCloneDialog } from "@/components/projects/ProjectCloneDialog";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectSearch } from "@/components/projects/ProjectSearch";
import { ProjectStats } from "@/components/projects/ProjectStats";
import { cloneGitHubProject, getProjects, scanProject, uploadProject } from "@/services/projects";
import type { Project } from "@/types/project";

function ProjectSkeleton() {
  return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />)}</div>;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningProjectId, setScanningProjectId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjects();
      setProjects(response.projects);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load projects.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => `${project.name} ${project.github_url ?? ""}`.toLowerCase().includes(query));
  }, [projects, search]);

  const handleScan = async (project: Project) => {
    setScanningProjectId(project.id);
    setToast(null);
    try {
      await scanProject(project.id);
      setToast({ message: `${project.name} was scanned successfully.`, tone: "success" });
    } catch (requestError) {
      setToast({ message: requestError instanceof Error ? requestError.message : "Could not scan this project.", tone: "error" });
    } finally {
      setScanningProjectId(null);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setToast({ message: "Select a ZIP archive to upload.", tone: "error" });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setToast(null);
    try {
      const response = await uploadProject(file, setUploadProgress);
      setToast({ message: response.message || `${response.project_name} was uploaded successfully.`, tone: "success" });
      await loadProjects();
    } catch (requestError) {
      setToast({ message: requestError instanceof Error ? requestError.message : "Could not upload the ZIP file.", tone: "error" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClone = async (githubUrl: string) => {
    setIsCloning(true);
    setToast(null);
    try {
      const response = await cloneGitHubProject(githubUrl);
      setIsCloneDialogOpen(false);
      setToast({ message: response.message || `${response.project_name} was cloned successfully.`, tone: "success" });
      await loadProjects();
    } catch (requestError) {
      setToast({ message: requestError instanceof Error ? requestError.message : "Could not clone the repository.", tone: "error" });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="space-y-8">
      <ProjectHeader isUploading={isUploading} uploadProgress={uploadProgress} onUpload={(file) => void handleUpload(file)} onOpenCloneDialog={() => setIsCloneDialogOpen(true)} />
      <ProjectStats projects={projects} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><ProjectSearch value={search} onChange={setSearch} /><p className="text-sm text-slate-500">{filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}</p></div>
      {isLoading ? <ProjectSkeleton /> : error ? <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6"><div className="flex gap-3"><AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-300" /><div><h2 className="font-semibold text-rose-100">Projects could not be loaded</h2><p className="mt-1 text-sm text-rose-200/80">{error}</p><button type="button" onClick={() => void loadProjects()} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-rose-100 hover:text-white"><RefreshCw className="size-4" /> Try again</button></div></div></section> : filteredProjects.length ? <ProjectGrid projects={filteredProjects} scanningProjectId={scanningProjectId} onScan={handleScan} /> : <ProjectEmpty hasSearch={Boolean(search)} />}
      <ProjectCloneDialog isOpen={isCloneDialogOpen} isSubmitting={isCloning} onClose={() => setIsCloneDialogOpen(false)} onSubmit={(githubUrl) => void handleClone(githubUrl)} />
      {toast && <div role="status" className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-xl ${toast.tone === "success" ? "border-cyan-400/25 bg-[#10232c] text-cyan-100" : "border-rose-400/25 bg-[#2a151c] text-rose-100"}`}>{toast.message}</div>}
    </div>
  );
}
