"use client";

import React from "react";
import { cn } from "@/lib/cn";

export type WorkspaceBackgroundProps = {
  className?: string;
  hideGrid?: boolean;
  hideGlow?: boolean;
  hideVignette?: boolean;
};

/**
 * Reusable CodeGraph AI Workspace Background System.
 * Matches the Figma AST design:
 * - Layer 1: Deep black/navy base (#03070D / #050912 / #060B12)
 * - Layer 2: Subtle technical cyan/blue grid pattern
 * - Layer 3: Soft ambient radial glows (cyan, blue, indigo/violet)
 * - Layer 4: Edge depth vignette focusing attention on workspace content
 * - Layer 5: Micro-texture noise to eliminate CSS gradient banding
 */
export function WorkspaceBackground({
  className,
  hideGrid = false,
  hideGlow = false,
  hideVignette = false,
}: WorkspaceBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 pointer-events-none select-none overflow-hidden",
        className
      )}
      style={{ zIndex: 0 }}
    >
      {/* Layer 1: Base background */}
      <div className="absolute inset-0 cg-workspace-base" />

      {/* Layer 2: Technical subtle cyan/blue grid */}
      {!hideGrid && <div className="absolute inset-0 cg-workspace-grid" />}

      {/* Layer 3: Ambient glow */}
      {!hideGlow && <div className="absolute inset-0 cg-workspace-glow" />}

      {/* Layer 4: Edge depth vignette */}
      {!hideVignette && <div className="absolute inset-0 cg-workspace-vignette" />}

      {/* Layer 5: Micro-texture noise */}
      <div className="absolute inset-0 cg-workspace-noise" />
    </div>
  );
}
