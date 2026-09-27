"use client";

import { Github, LoaderCircle, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type ProjectCloneDialogProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (githubUrl: string) => void;
};

export function ProjectCloneDialog({ isOpen, isSubmitting, onClose, onSubmit }: ProjectCloneDialogProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGithubUrl("");
      setValidationMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const url = new URL(githubUrl);
      if (url.protocol !== "https:" || url.hostname !== "github.com" || url.pathname.split("/").filter(Boolean).length < 2) {
        throw new Error();
      }
    } catch {
      setValidationMessage("Enter a valid HTTPS GitHub repository URL.");
      return;
    }
    setValidationMessage(null);
    onSubmit(githubUrl.trim());
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="clone-dialog-title">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close clone dialog"
        onClick={onClose}
        disabled={isSubmitting}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-[#303030] bg-[#080808] p-6 shadow-2xl transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3.5 items-center">
            <span className="grid size-10 place-items-center rounded-lg border border-[#252525] bg-[#0A0A0A] text-white">
              <Github className="size-5 text-white" />
            </span>
            <div>
              <h2 id="clone-dialog-title" className="font-sans text-lg font-bold text-white">
                Clone GitHub Repository
              </h2>
              <p className="mt-0.5 font-mono text-xs text-[#A3A3A3]">Add a repository to your workspace.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="grid size-8 place-items-center rounded-md text-[#737373] transition-colors hover:bg-[#151515] hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mt-6 block font-mono text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Repository URL
          <input
            autoFocus
            type="url"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            placeholder="https://github.com/owner/repository"
            className="mt-2 h-10 w-full rounded-lg border border-[#292929] bg-[#050505] px-3 font-mono text-xs text-white outline-none placeholder:text-[#737373] focus:border-[rgba(255,255,255,0.4)] focus:shadow-[inset_0_0_12px_rgba(255,255,255,0.03)]"
          />
        </label>

        {validationMessage && <p className="mt-2 text-xs font-mono text-rose-300">{validationMessage}</p>}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#202020] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 rounded-lg border border-[#303030] bg-[#080808] px-4 font-mono text-xs font-semibold text-white transition-all hover:bg-[#151515] hover:border-[#555555]"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-4 font-mono text-xs font-bold text-black shadow-md transition-all hover:bg-[#E5E5E5] disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting && <LoaderCircle className="size-4 animate-spin text-black" />}
            <span>{isSubmitting ? "Cloning..." : "Clone Repository"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

