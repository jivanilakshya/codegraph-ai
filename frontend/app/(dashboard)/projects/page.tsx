"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectEmpty } from "@/components/projects/ProjectEmpty";
import { ProjectCloneDialog } from "@/components/projects/ProjectCloneDialog";
import { ProjectDeleteDialog } from "@/components/projects/ProjectDeleteDialog";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectSearch } from "@/components/projects/ProjectSearch";
import { ProjectStats } from "@/components/projects/ProjectStats";
import { useActiveProject } from "@/hooks/useActiveProject";
import { cloneGitHubProject, deleteProject, getProjects, scanProject, uploadProject } from "@/services/projects";
import type { Project } from "@/types/project";

function ProjectSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-xl border border-[#202020] bg-[#080808]" />
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const { activeProjectId } = useActiveProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningProjectId, setScanningProjectId] = useState<number | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<Project | null>(null);
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

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

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

  const handleDeleteRequest = (project: Project) => {
    setPendingDeleteProject(project);
  };

  const handleDeleteCancel = () => {
    if (deletingProjectId === null) {
      setPendingDeleteProject(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteProject) return;
    const target = pendingDeleteProject;
    setDeletingProjectId(target.id);
    setToast(null);
    try {
      await deleteProject(target.id);
      setProjects((previous) => previous.filter((p) => p.id !== target.id));
      
      const activeId = localStorage.getItem("activeProjectId");
      if (activeId && Number(activeId) === target.id) {
        localStorage.removeItem("activeProjectId");
        localStorage.removeItem("activeProjectName");
      }
      
      setPendingDeleteProject(null);
      setToast({ message: `"${target.name}" was deleted successfully.`, tone: "success" });
    } catch (requestError) {
      setToast({ message: requestError instanceof Error ? requestError.message : "Could not delete this project.", tone: "error" });
    } finally {
      setDeletingProjectId(null);
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
    <div className="relative space-y-8 text-white selection:bg-white selection:text-black">
      {/* Subtle Ambient Background Light */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,255,255,0.035),transparent)]"
        aria-hidden="true"
      />

      <style>{`
        @keyframes dashEntrance {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dash-stagger {
          opacity: 0;
          animation: dashEntrance 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .dash-stagger {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Header (Stagger 0ms) */}
      <div className="dash-stagger relative z-10" style={{ animationDelay: "0ms" }}>
        <ProjectHeader
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUpload={(file) => void handleUpload(file)}
          onOpenCloneDialog={() => setIsCloneDialogOpen(true)}
        />
      </div>

      {/* Project Statistics (Stagger 60ms) */}
      <div className="dash-stagger relative z-10" style={{ animationDelay: "60ms" }}>
        <ProjectStats projects={projects} />
      </div>

      {/* Search & Count Row (Stagger 120ms) */}
      <div
        className="dash-stagger relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "120ms" }}
      >
        <ProjectSearch value={search} onChange={setSearch} />
        <p className="font-mono text-xs text-[#A3A3A3]">
          {filteredProjects.length} {filteredProjects.length === 1 ? "project workspace" : "project workspaces"}
        </p>
      </div>

      {/* Main Grid Content (Stagger 180ms) */}
      <div className="dash-stagger relative z-10" style={{ animationDelay: "180ms" }}>
        {isLoading ? (
          <ProjectSkeleton />
        ) : error ? (
          <section className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-6">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-300" />
              <div>
                <h2 className="font-sans font-bold text-rose-200">Projects could not be loaded</h2>
                <p className="mt-1 font-mono text-xs text-[#A3A3A3]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadProjects()}
                  className="mt-4 inline-flex items-center gap-2 font-mono text-xs font-semibold text-white underline hover:text-[#A3A3A3]"
                >
                  <RefreshCw className="size-3.5" /> Try again
                </button>
              </div>
            </div>
          </section>
        ) : filteredProjects.length ? (
          <ProjectGrid
            projects={filteredProjects}
            activeProjectId={activeProjectId}
            scanningProjectId={scanningProjectId}
            deletingProjectId={deletingProjectId}
            onScan={handleScan}
            onDelete={handleDeleteRequest}
          />
        ) : (
          <ProjectEmpty hasSearch={Boolean(search)} />
        )}
      </div>

      {/* Dialog Modals */}
      <ProjectCloneDialog
        isOpen={isCloneDialogOpen}
        isSubmitting={isCloning}
        onClose={() => setIsCloneDialogOpen(false)}
        onSubmit={(githubUrl) => void handleClone(githubUrl)}
      />

      <ProjectDeleteDialog
        projectName={pendingDeleteProject?.name ?? ""}
        isOpen={pendingDeleteProject !== null}
        isDeleting={deletingProjectId !== null}
        onClose={handleDeleteCancel}
        onConfirm={() => void handleDeleteConfirm()}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl border p-4 font-mono text-xs shadow-2xl backdrop-blur-md transition-all ${
            toast.tone === "success"
              ? "border-[#333333] bg-[#0E0E0E] text-white shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
              : "border-rose-900/60 bg-[#14080B] text-rose-200 shadow-[0_8px_30px_rgba(0,0,0,0.8)]"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

