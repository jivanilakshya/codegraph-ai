/**
 * Source Location Navigation & Highlighting Utilities
 */

export interface SourceLocation {
  projectId?: number | null;
  fileId?: number | null;
  filePath?: string | null;
  startLine?: number | null;
  endLine?: number | null;
  startColumn?: number | null;
  endColumn?: number | null;
}

export interface HighlightRange {
  startLine: number;
  endLine: number;
  startColumn?: number | null;
  endColumn?: number | null;
}

/**
 * Builds a repository URL with source location query parameters.
 */
export function buildSourceLocationUrl(location: SourceLocation): string {
  const params = new URLSearchParams();

  if (location.projectId != null && !Number.isNaN(Number(location.projectId))) {
    params.set("projectId", String(location.projectId));
  }

  if (location.fileId != null && !Number.isNaN(Number(location.fileId))) {
    params.set("fileId", String(location.fileId));
  } else if (location.filePath) {
    params.set("filePath", location.filePath);
  }

  if (location.startLine != null && !Number.isNaN(Number(location.startLine)) && Number(location.startLine) > 0) {
    params.set("startLine", String(location.startLine));
  }

  if (location.endLine != null && !Number.isNaN(Number(location.endLine)) && Number(location.endLine) > 0) {
    params.set("endLine", String(location.endLine));
  }

  if (location.startColumn != null && !Number.isNaN(Number(location.startColumn)) && Number(location.startColumn) >= 0) {
    params.set("startCol", String(location.startColumn));
  }

  if (location.endColumn != null && !Number.isNaN(Number(location.endColumn)) && Number(location.endColumn) >= 0) {
    params.set("endCol", String(location.endColumn));
  }

  const queryString = params.toString();
  return queryString ? `/repository?${queryString}` : "/repository";
}

/**
 * Parses search parameters into a structured SourceLocation.
 * Supports canonical and alias parameter names for broad backwards compatibility.
 */
export function parseSourceLocation(
  searchParams: { get: (key: string) => string | null }
): SourceLocation | null {
  const projectIdRaw = searchParams.get("projectId");
  const fileIdRaw = searchParams.get("fileId") ?? searchParams.get("file");
  const filePath = searchParams.get("filePath") ?? searchParams.get("path");
  const startLineRaw = searchParams.get("startLine") ?? searchParams.get("start_line") ?? searchParams.get("line");
  const endLineRaw = searchParams.get("endLine") ?? searchParams.get("end_line");
  const startColRaw = searchParams.get("startCol") ?? searchParams.get("startColumn") ?? searchParams.get("start_column") ?? searchParams.get("col");
  const endColRaw = searchParams.get("endCol") ?? searchParams.get("endColumn") ?? searchParams.get("end_column");

  const projectId = projectIdRaw ? Number.parseInt(projectIdRaw, 10) : null;
  const fileId = fileIdRaw ? Number.parseInt(fileIdRaw, 10) : null;
  const startLine = startLineRaw ? Number.parseInt(startLineRaw, 10) : null;
  const endLine = endLineRaw ? Number.parseInt(endLineRaw, 10) : null;
  const startColumn = startColRaw ? Number.parseInt(startColRaw, 10) : null;
  const endColumn = endColRaw ? Number.parseInt(endColRaw, 10) : null;

  if (
    projectId == null &&
    fileId == null &&
    !filePath &&
    startLine == null &&
    endLine == null
  ) {
    return null;
  }

  return {
    projectId: Number.isInteger(projectId) ? projectId : null,
    fileId: Number.isInteger(fileId) ? fileId : null,
    filePath: filePath || null,
    startLine: Number.isInteger(startLine) && startLine! > 0 ? startLine : null,
    endLine: Number.isInteger(endLine) && endLine! > 0 ? endLine : null,
    startColumn: Number.isInteger(startColumn) && startColumn! >= 0 ? startColumn : null,
    endColumn: Number.isInteger(endColumn) && endColumn! >= 0 ? endColumn : null,
  };
}

/**
 * Clamps and normalizes a highlight range against the total lines in a file.
 */
export function clampHighlightRange(
  range: HighlightRange | null | undefined,
  totalLines: number
): HighlightRange | null {
  if (!range || totalLines <= 0) return null;

  let start = Math.max(1, Math.min(range.startLine, totalLines));
  let end = range.endLine ? Math.max(1, Math.min(range.endLine, totalLines)) : start;

  if (start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  return {
    startLine: start,
    endLine: end,
    startColumn: range.startColumn,
    endColumn: range.endColumn,
  };
}
