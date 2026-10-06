"use client";

import { LoaderCircle, Plus, Upload } from "lucide-react";

type ProjectHeaderProps = {
  isUploading: boolean;
  uploadProgress: number;
  onOpenUploadDialog: () => void;
  onOpenCloneDialog: () => void;
};

export function ProjectHeader({ isUploading, uploadProgress, onOpenUploadDialog, onOpenCloneDialog }: ProjectHeaderProps) {
  return (
    <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 reveal">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#00e5ff]" />
          <span className="cg-label">Workspace Context</span>
        </div>
        <h1 className="text-4xl md:text-[56px] leading-[1] font-bold tracking-[-0.035em] text-white">
          Projects
        </h1>
        <p className="text-muted-foreground text-[15px] mt-3">
          Manage and analyze your codebases.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Secondary Action: Upload ZIP */}
        <button
          type="button"
          disabled={isUploading}
          onClick={onOpenUploadDialog}
          className="group flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-white/[0.12] bg-white/[0.03] text-white text-sm font-medium hover:border-primary/50 hover:bg-primary/[0.06] hover:shadow-[0_0_20px_-6px_rgba(0,229,255,0.5)] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isUploading ? (
            <LoaderCircle className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Upload className="w-4 h-4 text-primary transition-transform group-hover:-translate-y-0.5" />
          )}
          <span>{isUploading ? `Uploading ${uploadProgress}%` : "Upload ZIP"}</span>
        </button>

        {/* Primary Action: New Project */}
        <button
          type="button"
          onClick={onOpenCloneDialog}
          className="group flex-1 md:flex-none inline-flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-[#00c4dc] text-primary-foreground text-sm font-semibold shadow-[0_0_18px_-6px_rgba(0,229,255,0.4)] hover:bg-[#00d4ec] hover:shadow-[0_0_26px_-4px_rgba(0,229,255,0.5)] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
          <span>New Project</span>
        </button>
      </div>
    </section>
  );
}


