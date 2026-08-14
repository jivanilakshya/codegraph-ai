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
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-[#101722] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2
                id="delete-dialog-title"
                className="text-lg font-semibold text-slate-100"
              >
                Delete project
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="grid size-8 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
          <p className="text-sm text-slate-300">
            You are about to permanently delete{" "}
            <span className="font-semibold text-slate-100">
              &ldquo;{projectName}&rdquo;
            </span>
            . The following will be removed:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
              All scanned files and metadata
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
              Code entities, relationships, and the graph
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-full bg-rose-400" />
              Local repository files on disk
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-10 rounded-lg px-4 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            id={`delete-confirm-${projectName.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-400 disabled:cursor-wait disabled:opacity-70"
          >
            {isDeleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {isDeleting ? "Deleting…" : "Delete project"}
          </button>
        </div>
      </div>
    </div>
  );
}
