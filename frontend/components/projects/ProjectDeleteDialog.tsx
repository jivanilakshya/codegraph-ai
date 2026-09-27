"use client";

import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close delete dialog"
        onClick={onClose}
        disabled={isDeleting}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Panel Container */}
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#303030] bg-[#080808] p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-rose-900/50 bg-rose-950/30 text-rose-300">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2
                id="delete-dialog-title"
                className="font-sans text-lg font-bold text-white"
              >
                Delete Project
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[#A3A3A3]">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="grid size-8 place-items-center rounded-md text-[#737373] transition-colors hover:bg-[#151515] hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 rounded-lg border border-[#242424] bg-[#050505] p-4 font-mono text-xs text-[#A3A3A3]">
          <p className="text-white">
            You are about to permanently delete{" "}
            <span className="font-bold underline text-white">
              &ldquo;{projectName}&rdquo;
            </span>
            . The following will be removed:
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex items-center gap-2 text-[#A3A3A3]">
              <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
              All scanned files and metadata
            </li>
            <li className="flex items-center gap-2 text-[#A3A3A3]">
              <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
              Code entities, relationships, and the graph
            </li>
            <li className="flex items-center gap-2 text-[#A3A3A3]">
              <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
              Local repository files on disk
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#202020] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-9 rounded-lg border border-[#303030] bg-[#080808] px-4 font-mono text-xs font-semibold text-white transition-all hover:bg-[#151515] hover:border-[#555555] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            id={`delete-confirm-${projectName.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-900/60 bg-rose-950/40 px-4 font-mono text-xs font-bold text-rose-200 transition-all hover:bg-rose-900/60 hover:text-white disabled:cursor-wait disabled:opacity-70"
          >
            {isDeleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            <span>{isDeleting ? "Deleting…" : "Delete Project"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

