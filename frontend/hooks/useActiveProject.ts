"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getProjects } from "@/services/projects";
import type { Project } from "@/types/project";

export function useActiveProject(explicitRouteProjectId?: number | null) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProjects();
      setProjects(response.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  // Resolve the active project ID based on priority rules
  useEffect(() => {
    if (isLoading || projects.length === 0) return;

    let resolvedId: number | null = null;

    // 1. Priority: Explicit route parameter passed in (e.g. from `/projects/[id]`)
    if (explicitRouteProjectId !== undefined && explicitRouteProjectId !== null) {
      resolvedId = explicitRouteProjectId;
    }

    // 2. Priority: URL Search/Query parameters
    if (resolvedId === null) {
      const urlProjectId = searchParams.get("projectId");
      if (urlProjectId) {
        const parsed = Number(urlProjectId);
        if (Number.isInteger(parsed)) {
          resolvedId = parsed;
        }
      }
    }

    // 3. Priority: localStorage fallback
    if (resolvedId === null) {
      const localId = localStorage.getItem("activeProjectId");
      if (localId) {
        const parsed = Number(localId);
        if (Number.isInteger(parsed)) {
          resolvedId = parsed;
        }
      }
    }

    // Verify if resolved project ID actually exists in the fetched projects list
    if (resolvedId !== null && projects.some((p) => p.id === resolvedId)) {
      setActiveProjectId(resolvedId);
      // Sync with localStorage
      localStorage.setItem("activeProjectId", String(resolvedId));
      const name = projects.find((p) => p.id === resolvedId)?.name;
      if (name) {
        localStorage.setItem("activeProjectName", name);
      }
    } else {
      setActiveProjectId(null);
    }
  }, [projects, searchParams, explicitRouteProjectId, isLoading]);

  const selectProject = useCallback(
    (projectId: number) => {
      const targetProject = projects.find((p) => p.id === projectId);
      if (!targetProject) return;

      setActiveProjectId(projectId);
      localStorage.setItem("activeProjectId", String(projectId));
      localStorage.setItem("activeProjectName", targetProject.name);

      // Update URL query parameters
      const params = new URLSearchParams(searchParams.toString());
      params.set("projectId", String(projectId));
      router.push(`${pathname}?${params.toString()}`);
    },
    [projects, pathname, router, searchParams]
  );

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  return {
    projects,
    activeProjectId,
    activeProject,
    isLoadingProjects: isLoading,
    errorLoadingProjects: error,
    selectProject,
    refreshProjects: fetchProjects,
  };
}
