"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useEffect } from "react";

type ProjectDeleteDialogProps = {
  projectName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ProjectDeleteDialog({
  projectName,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: ProjectDeleteDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 reveal" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#03040a]/80 backdrop-blur-md"
        onClick={() => !isDeleting && onClose()}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080a12]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-30px_rgba(244,63,94,0.3)] cg-pop">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <span className="w-11 h-11 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="delete-dialog-title" className="text-[19px] font-semibold tracking-tight text-white">
              Delete Project
            </h2>
            <p className="text-[13.5px] text-rose-300/80 mt-0.5">This action cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-2">
          <p className="text-[14px] text-foreground/90">
            You are about to permanently delete <strong className="text-white break-all">&ldquo;{projectName}&rdquo;</strong>.
          </p>
          <div className="mt-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] font-mono text-[11.5px] text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              All scanned AST nodes, symbols & code entities
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Graph relationships, dependencies & dead code stats
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Local project workspace data from database
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-white/[0.06] mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-10 px-4 rounded-lg border border-white/[0.1] text-sm text-white hover:border-white/25 hover:bg-white/[0.03] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            id={`delete-confirm-${projectName.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={onConfirm}
            disabled={isDeleting}
            className="h-10 px-5 rounded-lg bg-rose-500 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-[0_0_20px_-4px_rgba(244,63,94,0.5)] hover:bg-rose-600 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>{isDeleting ? "Deleting…" : "Delete Project"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}


