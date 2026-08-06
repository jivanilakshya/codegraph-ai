import type { ProjectListResponse } from "@/types/project";

type ApiErrorResponse = { detail?: string };

export interface ProjectUploadResponse {
  message: string;
  project_name: string;
}

export interface GitHubCloneResponse {
  message: string;
  project_name: string;
}

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(payload?.detail ?? "Something went wrong. Please try again.");
  }

  return response.json() as Promise<T>;
}

export function getProjects(signal?: AbortSignal) {
  return request<ProjectListResponse>("/api/v1/projects", { signal });
}

export function scanProject(projectId: number) {
  return request(`/api/v1/projects/${projectId}/scan`, { method: "POST" });
}

export function cloneGitHubProject(githubUrl: string) {
  return request<GitHubCloneResponse>("/api/v1/projects/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_url: githubUrl }),
  });
}

export function uploadProject(file: File, onProgress: (progress: number) => void): Promise<ProjectUploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    request.open("POST", `${apiBaseUrl}/api/v1/projects/upload`);
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const response = request.response as ProjectUploadResponse & ApiErrorResponse;
      if (request.status >= 200 && request.status < 300) {
        resolve(response);
        return;
      }
      reject(new Error(response?.detail ?? "Could not upload the ZIP file."));
    });
    request.addEventListener("error", () => reject(new Error("Could not connect to the API.")));
    request.send(formData);
  });
}
