"use client";

import { Check, GitFork, Loader2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type ProjectCloneDialogProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (githubUrl: string) => void;
};

const GITHUB_RE = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

export function ProjectCloneDialog({ isOpen, isSubmitting, onClose, onSubmit }: ProjectCloneDialogProps) {
  const [githubUrl, setGithubUrl] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setGithubUrl("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const match = githubUrl.trim().match(GITHUB_RE);
  const invalid = githubUrl.trim().length > 0 && !match;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!match) return;
    onSubmit(githubUrl.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 reveal">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#03040a]/80 backdrop-blur-md"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Clone GitHub Repository"
        className="relative w-full max-w-[540px] rounded-2xl border border-white/[0.08] bg-[#080a12]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-30px_rgba(0,229,255,0.5)] cg-pop overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px cg-hairline" />
        
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-5">
          <span className="w-11 h-11 rounded-xl border border-white/[0.09] bg-white/[0.03] flex items-center justify-center flex-shrink-0">
            <GitFork className="w-5 h-5 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-semibold tracking-tight text-white">Clone GitHub Repository</h2>
            <p className="text-[13.5px] text-muted-foreground mt-0.5">Add a repository to your workspace.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6">
            <label htmlFor="repo-url" className="cg-label">Repository URL</label>
            <div
              className={cn(
                "mt-2 flex items-center gap-2.5 h-11 px-3.5 rounded-xl border bg-white/[0.02] transition-all duration-300",
                invalid
                  ? "border-rose-400/40"
                  : "border-white/[0.09] focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(0,229,255,0.06),0_0_24px_-8px_rgba(0,229,255,0.4)]"
              )}
            >
              <GitFork className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                id="repo-url"
                autoFocus
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[13px] text-white placeholder:text-muted-foreground/60"
              />
              {match && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            </div>
            <p className={cn("mt-2 font-mono text-[11px]", invalid ? "text-rose-300" : "text-muted-foreground")}>
              {invalid
                ? "Enter a valid GitHub repository URL."
                : match
                ? `Will clone ${match[1]}/${match[2]} · default branch main`
                : "Public repositories are cloned from the default branch."}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-white/[0.06] mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-lg border border-white/[0.1] text-sm text-white hover:border-white/25 hover:bg-white/[0.03] active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!match || isSubmitting}
              className="h-10 px-5 rounded-lg bg-[#00c4dc] text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 shadow-[0_0_18px_-6px_rgba(0,229,255,0.4)] hover:bg-[#00d4ec] disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition-all"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Cloning…" : "Clone Repository"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


