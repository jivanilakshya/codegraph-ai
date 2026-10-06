"use client";

import { Archive, CloudUpload, FileArchive, Loader2, X } from "lucide-react";
import { type DragEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type ProjectUploadDialogProps = {
  isOpen: boolean;
  isUploading: boolean;
  uploadProgress: number;
  initialFile?: File | null;
  onClose: () => void;
  onUpload: (file: File) => void;
};

export function ProjectUploadDialog({
  isOpen,
  isUploading,
  uploadProgress,
  initialFile,
  onClose,
  onUpload,
}: ProjectUploadDialogProps) {
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) {
      if (initialFile.name.toLowerCase().endsWith(".zip")) {
        setFile(initialFile);
        setError("");
      } else {
        setError("Only .zip archives are supported.");
        setFile(null);
      }
    }
  }, [initialFile]);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setError("");
      setDrag(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUploading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  if (!isOpen) return null;

  const accept = (f?: File) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".zip")) {
      setError("Only .zip archives are supported.");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDrag(false);
    const dropped = e.dataTransfer.files?.[0];
    accept(dropped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isUploading) return;
    onUpload(file);
  };

  const fileSizeStr = file
    ? file.size > 1048576
      ? `${(file.size / 1048576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 reveal">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#03040a]/80 backdrop-blur-md"
        onClick={() => !isUploading && onClose()}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload ZIP Archive"
        className="relative w-full max-w-[540px] rounded-2xl border border-white/[0.08] bg-[#080a12]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9),0_0_60px_-30px_rgba(0,229,255,0.5)] cg-pop overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-px cg-hairline" />

        {/* Modal Header */}
        <div className="flex items-start gap-4 p-6 pb-5">
          <span className="w-11 h-11 rounded-xl border border-white/[0.09] bg-white/[0.03] flex items-center justify-center flex-shrink-0">
            <FileArchive className="w-5 h-5 text-primary" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[19px] font-semibold tracking-tight text-white">Upload ZIP Archive</h2>
            <p className="text-[13.5px] text-muted-foreground mt-0.5">Import a zipped codebase into your workspace.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form & Drag Zone */}
        <form onSubmit={handleSubmit}>
          <div className="px-6">
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => accept(e.target.files?.[0])}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => !isUploading && inputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !isUploading && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleDrop}
              className={cn(
                "relative rounded-xl border border-dashed px-6 py-9 text-center cursor-pointer transition-all duration-300 overflow-hidden",
                drag
                  ? "border-primary/70 bg-primary/[0.07] shadow-[inset_0_0_40px_-10px_rgba(0,229,255,0.35)]"
                  : error
                  ? "border-rose-400/40 bg-rose-500/[0.03]"
                  : "border-white/[0.14] bg-white/[0.015] hover:border-primary/40 hover:bg-primary/[0.03]"
              )}
            >
              {drag && <span className="absolute inset-x-0 top-0 h-px cg-hairline" />}
              <CloudUpload
                className={cn(
                  "mx-auto w-8 h-8 transition-all duration-300",
                  drag ? "text-primary -translate-y-1 scale-110" : "text-muted-foreground"
                )}
                strokeWidth={1.5}
              />
              <p className="mt-3 text-[14px] text-white font-medium">
                {drag ? "Release to upload archive" : "Drag & drop your .zip here"}
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                or <span className="text-primary underline-offset-2 hover:underline">browse files</span>
              </p>
              <p className="mt-3 font-mono text-[10.5px] text-white/30">.zip only</p>
            </div>

            {error && <p className="mt-2 font-mono text-[11px] text-rose-300">{error}</p>}

            {/* Selected File Preview & Progress */}
            {file && (
              <div className="mt-3 flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] cg-pop">
                <span className="w-9 h-9 rounded-lg border border-sky-400/25 bg-sky-400/[0.06] flex items-center justify-center shrink-0">
                  <Archive className="w-4 h-4 text-sky-300" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-mono text-[12.5px] text-white truncate">{file.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {isUploading ? `${Math.round(uploadProgress)}%` : fileSizeStr}
                    </span>
                  </div>
                  <div className="mt-2 h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary/40 to-primary shadow-[0_0_10px_rgba(0,229,255,0.5)] transition-[width] duration-150"
                      style={{ width: `${isUploading ? uploadProgress : 100}%` }}
                    />
                  </div>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-1 rounded text-muted-foreground hover:text-white transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-white/[0.06] mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="h-10 px-4 rounded-lg border border-white/[0.1] text-sm text-white hover:border-white/25 hover:bg-white/[0.03] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isUploading}
              className="h-10 px-5 rounded-lg bg-[#00c4dc] text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 shadow-[0_0_18px_-6px_rgba(0,229,255,0.4)] hover:bg-[#00d4ec] disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition-all"
            >
              {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUploading ? "Uploading…" : "Upload Archive"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
