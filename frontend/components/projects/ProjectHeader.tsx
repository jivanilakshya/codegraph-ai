"use client";

import { Download, Github, LoaderCircle } from "lucide-react";
import { type ChangeEvent, useRef } from "react";

type ProjectHeaderProps = {
  isUploading: boolean;
  uploadProgress: number;
  onUpload: (file: File) => void;
  onOpenCloneDialog: () => void;
};

export function ProjectHeader({ isUploading, uploadProgress, onUpload, onOpenCloneDialog }: ProjectHeaderProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    if (file) onUpload(file);
    event.target.value = "";
  };

  return (
    <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">Workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Projects</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Manage the repositories and ZIP uploads available to your codebase graph.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input ref={uploadInputRef} type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={handleFileChange} className="sr-only" />
        <button type="button" disabled={isUploading} onClick={() => uploadInputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70">
          {isUploading ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
          {isUploading ? `Uploading ${uploadProgress}%` : "Upload ZIP"}
        </button>
        <button type="button" onClick={onOpenCloneDialog} className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300">
          <Github className="size-4" />
          Clone GitHub
        </button>
      </div>
    </header>
  );
}
