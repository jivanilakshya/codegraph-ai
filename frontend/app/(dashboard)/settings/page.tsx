"use client";

import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  FolderGit2,
  Info,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProjectSelector } from "@/components/developer/ProjectSelector";
import { useActiveProject } from "@/hooks/useActiveProject";
import {
  getProjectSettings,
  resetProjectSettings,
  updateProjectSettings,
} from "@/services/settings";
import type { ProjectSettings } from "@/types/settings";

// ---------------------------------------------------------------------------
// Custom UI Controls
// ---------------------------------------------------------------------------

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-800/60 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? "bg-cyan-500" : "bg-slate-800"
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-cyan-400",
  children,
  badge,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/45 p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-cyan-400">
            <Icon className={`size-4 ${iconColor}`} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-100">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Page Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const {
    projects,
    activeProject,
    activeProjectId,
    isLoadingProjects,
    errorLoadingProjects,
    selectProject,
  } = useActiveProject();

  // Settings state
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Local form state for custom exclusion input
  const [newExclusionInput, setNewExclusionInput] = useState("");

  // Load project settings
  const loadSettings = useCallback(async (projectId: number) => {
    setIsLoadingSettings(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const data = await getProjectSettings(projectId);
      setSettings(data);
    } catch (err) {
      setSettings(null);
      setErrorMsg(err instanceof Error ? err.message : "Could not load project settings.");
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      void loadSettings(activeProjectId);
    } else {
      setSettings(null);
    }
  }, [activeProjectId, loadSettings]);

  // Handle Save
  const handleSave = async () => {
    if (!activeProjectId || !settings) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await updateProjectSettings(activeProjectId, {
        custom_exclusions: settings.custom_exclusions,
        max_file_size_mb: settings.max_file_size_mb,
        enable_complexity: settings.enable_complexity,
        enable_dead_code: settings.enable_dead_code,
        enable_circular_dependency: settings.enable_circular_dependency,
        ollama_model: settings.ollama_model,
        use_graph_context: settings.use_graph_context,
        use_search_context: settings.use_search_context,
      });
      setSettings(updated);
      setSuccessMsg("Settings saved successfully and applied to project.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset
  const handleReset = async () => {
    if (!activeProjectId) return;
    setIsResetting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const reset = await resetProjectSettings(activeProjectId);
      setSettings(reset);
      setSuccessMsg("Settings reset to system defaults.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not reset settings.");
    } finally {
      setIsResetting(false);
    }
  };

  // Add custom exclusion
  const handleAddExclusion = () => {
    const trimmed = newExclusionInput.trim();
    if (!trimmed || !settings) return;

    // Check if already in protected or custom exclusions
    if (
      settings.protected_exclusions.includes(trimmed) ||
      settings.custom_exclusions.includes(trimmed)
    ) {
      setNewExclusionInput("");
      return;
    }

    setSettings({
      ...settings,
      custom_exclusions: [...settings.custom_exclusions, trimmed],
    });
    setNewExclusionInput("");
  };

  // Remove custom exclusion
  const handleRemoveExclusion = (pattern: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      custom_exclusions: settings.custom_exclusions.filter((item) => item !== pattern),
    });
  };

  if (isLoadingProjects) {
    return (
      <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-400">
        <RefreshCw className="size-4 animate-spin text-cyan-400" />
        Loading project environment…
      </div>
    );
  }

  if (errorLoadingProjects) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200">
        <p className="font-semibold">Failed to load project configuration</p>
        <p className="mt-1 text-slate-400">{errorLoadingProjects}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 220ms ease-out forwards; }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* Page Header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-slate-800 pb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-400">
              CodeGraph AI
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Settings</h1>
              {activeProject && (
                <span className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-xs text-cyan-200">
                  {activeProject.name}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Configure per-project repository scan parameters, code analysis engines, and AI reasoning options.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:shrink-0">
            <ProjectSelector
              projects={projects}
              selectedProjectId={activeProjectId}
              onSelect={selectProject}
            />
            {activeProjectId && (
              <button
                type="button"
                onClick={() => void loadSettings(activeProjectId)}
                disabled={isLoadingSettings}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`size-4 ${isLoadingSettings ? "animate-spin" : ""}`} />
                Reload
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Status Notifications */}
      {successMsg && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-5 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Content State */}
      {!activeProjectId || !activeProject ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-14 text-center text-slate-400">
          Select a project to configure settings.
        </div>
      ) : isLoadingSettings || !settings ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-400">
          <RefreshCw className="size-5 animate-spin text-cyan-400" />
          Loading settings for {activeProject.name}…
        </div>
      ) : (
        <div className="space-y-6">
          {/* ------------------------------------------------------------------ */}
          {/* 1. SCAN SETTINGS                                                   */}
          {/* ------------------------------------------------------------------ */}
          <SectionCard
            title="Scan Settings"
            description="Control directory exclusions and file size limits for repository scanning."
            icon={FolderGit2}
          >
            <div className="space-y-6">
              {/* Max File Size */}
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Maximum File Size Limit (MB)
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Files larger than this limit will be skipped during repository indexing to ensure scanner performance.
                </p>
                <div className="mt-2.5 flex items-center gap-3 max-w-xs">
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.5"
                    value={settings.max_file_size_mb}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        max_file_size_mb: Math.max(0.1, Number(e.target.value) || 0.1),
                      })
                    }
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="text-sm font-medium text-slate-400">MB</span>
                </div>
              </div>

              {/* Exclusions */}
              <div className="space-y-3 border-t border-slate-800/80 pt-5">
                <div>
                  <h3 className="text-sm font-medium text-slate-200">
                    Protected System Exclusions
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Built-in protected defaults enforced by the backend repository scanner engine.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {settings.protected_exclusions.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 font-mono text-xs text-slate-400"
                      >
                        <Lock className="size-3 text-slate-500" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <h3 className="text-sm font-medium text-slate-200">
                    Custom Project Exclusions
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Add custom directory patterns to exclude from this project's scan inventory.
                  </p>

                  {/* Add Input */}
                  <div className="mt-3 flex gap-2 max-w-md">
                    <input
                      type="text"
                      placeholder="e.g. coverage, my_temp_folder"
                      value={newExclusionInput}
                      onChange={(e) => setNewExclusionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddExclusion();
                        }
                      }}
                      className="h-10 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddExclusion}
                      disabled={!newExclusionInput.trim()}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-4 text-xs font-semibold text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="size-4" />
                      Add Pattern
                    </button>
                  </div>

                  {/* Custom List */}
                  <div className="mt-3">
                    {settings.custom_exclusions.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">
                        No custom directory exclusion patterns added.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {settings.custom_exclusions.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 font-mono text-xs text-cyan-200"
                          >
                            {item}
                            <button
                              type="button"
                              onClick={() => handleRemoveExclusion(item)}
                              className="text-cyan-400 hover:text-rose-400 transition-colors"
                              aria-label={`Remove exclusion ${item}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ------------------------------------------------------------------ */}
          {/* 2. CODE ANALYSIS SETTINGS                                          */}
          {/* ------------------------------------------------------------------ */}
          <SectionCard
            title="Code Analysis Settings"
            description="Enable or disable automated code health & complexity detection services for this project."
            icon={ShieldAlert}
            iconColor="text-amber-400"
          >
            <div>
              <ToggleSwitch
                label="Cyclomatic Complexity Analysis"
                description="Analyze function and method complexity scores and flag large methods."
                checked={settings.enable_complexity}
                onChange={(val) => setSettings({ ...settings, enable_complexity: val })}
              />
              <ToggleSwitch
                label="Dead Code Detection"
                description="Detect unused files, uncalled functions, and orphaned classes."
                checked={settings.enable_dead_code}
                onChange={(val) => setSettings({ ...settings, enable_dead_code: val })}
              />
              <ToggleSwitch
                label="Circular Dependency Detection"
                description="Detect module and file import cycles across the repository."
                checked={settings.enable_circular_dependency}
                onChange={(val) =>
                  setSettings({ ...settings, enable_circular_dependency: val })
                }
              />
            </div>
          </SectionCard>

          {/* ------------------------------------------------------------------ */}
          {/* 3. AI SETTINGS                                                      */}
          {/* ------------------------------------------------------------------ */}
          <SectionCard
            title="AI & Context Settings"
            description="Configure the Ollama LLM model and context retrieval options for codebase RAG."
            icon={Sparkles}
            iconColor="text-violet-400"
          >
            <div className="space-y-5">
              {/* Ollama Model Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Ollama LLM Model
                </label>
                <p className="mt-0.5 text-xs text-slate-400">
                  Select an available LLM model installed on your local Ollama service.
                </p>
                <div className="mt-2.5 max-w-md">
                  <select
                    value={settings.ollama_model}
                    onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
                    className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-sm font-mono text-slate-100 outline-none focus:border-cyan-500"
                  >
                    {settings.available_ollama_models.map((model) => (
                      <option key={model} value={model} className="bg-slate-950 font-mono">
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Context Toggles */}
              <div className="border-t border-slate-800/80 pt-3">
                <ToggleSwitch
                  label="Use Neo4j Graph Context"
                  description="Include caller/callee entity relationships and graph neighborhood context during chat."
                  checked={settings.use_graph_context}
                  onChange={(val) => setSettings({ ...settings, use_graph_context: val })}
                />
                <ToggleSwitch
                  label="Use Semantic / Code Search Context"
                  description="Include vector similarity code chunk search results during chat."
                  checked={settings.use_search_context}
                  onChange={(val) => setSettings({ ...settings, use_search_context: val })}
                />
              </div>
            </div>
          </SectionCard>

          {/* ------------------------------------------------------------------ */}
          {/* Save & Reset Actions Bar                                           */}
          {/* ------------------------------------------------------------------ */}
          <div className="sticky bottom-6 z-20 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/90 p-4 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="size-4 text-cyan-400 shrink-0" />
              <span>Settings are saved per project in PostgreSQL.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={isResetting || isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100 disabled:opacity-50"
              >
                <RotateCcw className={`size-3.5 ${isResetting ? "animate-spin" : ""}`} />
                Reset to Defaults
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || isResetting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500 px-5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
