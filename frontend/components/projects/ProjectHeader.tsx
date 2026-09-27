"use client";

import { Download, LoaderCircle, Plus } from "lucide-react";
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
    <header className="flex flex-col gap-6 border-b border-[#202020] pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3] bg-[#151515] border border-[#303030] px-2 py-0.5 rounded flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            Workspace Context
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          PROJECTS
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#A3A3A3]">
          Manage and analyze your codebases.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={uploadInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileChange}
          className="sr-only"
        />

        {/* Secondary Action Button: Upload ZIP */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => uploadInputRef.current?.click()}
          className="group relative overflow-hidden inline-flex h-10 items-center gap-2 rounded-lg border border-[#303030] bg-[#080808] px-4 py-2 font-mono text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#555555] hover:bg-[#151515] hover:shadow-[0_4px_16px_rgba(255,255,255,0.06)] disabled:cursor-wait disabled:opacity-50"
        >
          {isUploading ? (
            <LoaderCircle className="size-4 animate-spin text-white" />
          ) : (
            <Download className="size-4 text-[#A3A3A3] transition-colors group-hover:text-white" />
          )}
          <span>{isUploading ? `Uploading ${uploadProgress}%` : "Upload ZIP"}</span>
        </button>

        {/* Primary Action Button: New Project / Clone GitHub */}
        <button
          type="button"
          onClick={onOpenCloneDialog}
          className="group relative overflow-hidden inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 py-2 font-mono text-xs font-bold text-black shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#E5E5E5] hover:shadow-[0_4px_20px_rgba(255,255,255,0.18)] active:translate-y-0"
        >
          <Plus className="size-4 transition-transform group-hover:scale-110" />
          <span>+ New Project</span>
        </button>
      </div>
    </header>
  );
}

