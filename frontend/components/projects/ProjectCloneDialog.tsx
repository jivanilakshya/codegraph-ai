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
      <button type="button" aria-label="Close clone dialog" onClick={onClose} disabled={isSubmitting} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-xl border border-slate-700 bg-[#101722] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3"><span className="grid size-10 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Github className="size-5" /></span><div><h2 id="clone-dialog-title" className="text-lg font-semibold text-slate-100">Clone GitHub repository</h2><p className="mt-1 text-sm text-slate-400">Add a repository to your workspace.</p></div></div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close"><X className="size-4" /></button>
        </div>
        <label className="mt-6 block text-sm font-medium text-slate-300">Repository URL
          <input autoFocus type="url" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="mt-2 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-500/70" />
        </label>
        {validationMessage && <p className="mt-2 text-sm text-rose-300">{validationMessage}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={isSubmitting} className="h-10 rounded-lg px-4 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100">Cancel</button><button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-70">{isSubmitting && <LoaderCircle className="size-4 animate-spin" />}{isSubmitting ? "Cloning..." : "Clone repository"}</button></div>
      </form>
    </div>
  );
}
