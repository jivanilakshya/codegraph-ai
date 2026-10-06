"use client";

import { AlertCircle, CloudUpload, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProjectCloneDialog } from "@/components/projects/ProjectCloneDialog";
import { ProjectDeleteDialog } from "@/components/projects/ProjectDeleteDialog";
import { ProjectEmpty } from "@/components/projects/ProjectEmpty";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectSearch } from "@/components/projects/ProjectSearch";
import { ProjectStats } from "@/components/projects/ProjectStats";
import { ProjectUploadDialog } from "@/components/projects/ProjectUploadDialog";
import { useActiveProject } from "@/hooks/useActiveProject";
import { cloneGitHubProject, deleteProject, getProjects, scanProject, uploadProject } from "@/services/projects";
import type { Project } from "@/types/project";

function ProjectSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-[280px] animate-pulse rounded-xl border border-white/[0.07] bg-white/[0.015]"
        />
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const { activeProjectId, selectProject } = useActiveProject();
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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [pageDrag, setPageDrag] = useState(false);

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
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
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
      setToast({ message: `${project.name} scanned successfully · knowledge graph updated`, tone: "success" });
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
      setToast({ message: `"${target.name}" was removed from workspace`, tone: "success" });
    } catch (requestError) {
      setToast({ message: requestError instanceof Error ? requestError.message : "Could not delete this project.", tone: "error" });
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setToast({ message: "Only .zip archives are supported.", tone: "error" });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setToast(null);
    try {
      const response = await uploadProject(file, setUploadProgress);
      setIsUploadDialogOpen(false);
      setDroppedFile(null);
      setToast({ message: response.message || `${response.project_name} added to workspace`, tone: "success" });
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
      setToast({ message: response.message || `${response.project_name} added to workspace`, tone: "success" });
      await loadProjects();
    } catch (requestError) {
      setToast({ message: requestError instanceof Error ? requestError.message : "Could not clone the repository.", tone: "error" });
    } finally {
      setIsCloning(false);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setPageDrag(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setDroppedFile(dropped);
      setIsUploadDialogOpen(true);
    }
  };

  return (
    <div
      className="relative max-w-[1280px] mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-10 text-white selection:bg-primary/25 selection:text-white"
      onDragEnter={(e) => {
        if (!isUploadDialogOpen && e.dataTransfer.types.includes("Files")) setPageDrag(true);
      }}
    >
      {/* Full Page Drag & Drop Overlay Target */}
      {pageDrag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#03040a]/75 backdrop-blur-sm animate-fade-in"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setPageDrag(false);
          }}
          onDrop={handleDropFile}
        >
          <div className="pointer-events-none m-6 w-full max-w-xl rounded-2xl border border-dashed border-primary/60 bg-primary/[0.05] py-16 text-center shadow-[inset_0_0_60px_-15px_rgba(0,229,255,0.4)]">
            <CloudUpload className="mx-auto w-10 h-10 text-primary" strokeWidth={1.5} />
            <p className="mt-4 text-lg text-white font-medium">Drop .zip to create a project</p>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">
              archive will be uploaded and indexed into the workspace
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <ProjectHeader
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onOpenUploadDialog={() => setIsUploadDialogOpen(true)}
        onOpenCloneDialog={() => setIsCloneDialogOpen(true)}
      />

      {/* Project Statistics */}
      <ProjectStats projects={projects} />

      {/* Search & Count Bar */}
      <section className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 reveal" style={{ ["--d" as string]: "520ms" }}>
        <ProjectSearch value={search} onChange={setSearch} />
        <span className="font-mono text-[12px] text-muted-foreground whitespace-nowrap">
          <span className="text-white">{filteredProjects.length}</span> project {filteredProjects.length === 1 ? "workspace" : "workspaces"}
        </span>
      </section>

      {/* Main Grid Content */}
      <section className="mt-6">
        {isLoading ? (
          <ProjectSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-6 reveal">
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
          </div>
        ) : filteredProjects.length ? (
          <ProjectGrid
            projects={filteredProjects}
            activeProjectId={activeProjectId}
            scanningProjectId={scanningProjectId}
            deletingProjectId={deletingProjectId}
            onScan={handleScan}
            onDelete={handleDeleteRequest}
            onSelectActive={(p) => selectProject(p.id)}
          />
        ) : (
          <ProjectEmpty hasSearch={Boolean(search)} />
        )}
      </section>

      {/* Dialog Modals */}
      <ProjectUploadDialog
        isOpen={isUploadDialogOpen}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        initialFile={droppedFile}
        onClose={() => {
          setIsUploadDialogOpen(false);
          setDroppedFile(null);
        }}
        onUpload={(file) => void handleUpload(file)}
      />

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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-primary/20 bg-[#0a0d16]/90 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(0,229,255,0.4)] font-mono text-[12px] text-foreground cg-pop"
        >
          <span
            className={
              toast.tone === "success"
                ? "w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]"
                : "w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]"
            }
          />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}


