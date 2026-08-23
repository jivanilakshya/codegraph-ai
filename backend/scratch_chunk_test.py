"""Development script: verify CodeChunker against a real project stored in the database.

Usage (inside the Docker backend container):
    python scratch_chunk_test.py --project-id 1

This script is READ-ONLY. It does NOT:
  - create or alter database tables
  - write to Neo4j
  - write to Qdrant
  - call Ollama
  - generate embeddings
  - modify any project data
"""

import argparse
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Database session (reuse existing infrastructure -- no new connection setup)
# ---------------------------------------------------------------------------
from app.database.postgres import SessionLocal
from app.models.project import Project
from app.models.file import File

# ---------------------------------------------------------------------------
# The chunker under test
# ---------------------------------------------------------------------------
from app.ai.chunker import CodeChunker

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
MAX_CHARS = 1000          # default chunk size
PREVIEW_CHUNKS = 3        # how many representative chunks to print per project
CONTENT_PREVIEW_LEN = 200 # max content characters shown per chunk preview


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Test CodeChunker against a real project from the database."
    )
    parser.add_argument(
        "--project-id",
        type=int,
        required=True,
        help="ID of the project to chunk (e.g. --project-id 1)",
    )
    return parser.parse_args()


def load_project(session, project_id: int):
    """Return the Project row or None if it does not exist."""
    return session.query(Project).filter(Project.id == project_id).first()


def load_files(session, project_id: int) -> list:
    """Return all File rows belonging to the given project."""
    return session.query(File).filter(File.project_id == project_id).all()


def resolve_file_path(project, file) -> "Path | None":
    """Build the absolute path for a project file.

    Projects may store their source in ``local_path`` (uploads / cloned repos).
    Falls back to the ``/repositories`` mount used by the scanner.
    """
    if project.local_path:
        base = Path(project.local_path)
    else:
        # Convention used by the repository scanner
        base = Path("/repositories")

    candidate = base / file.path
    if candidate.is_file():
        return candidate

    # Some projects store the path relative to /repositories/<owner>/<repo>
    # Try /repositories / file.path as a direct fallback
    fallback = Path("/repositories") / file.path
    if fallback.is_file():
        return fallback

    return None


def chunk_project(project, files: list) -> dict:
    """Run CodeChunker over all project files and return aggregated results."""
    chunker = CodeChunker()
    all_chunks = []
    processed_files = 0
    skipped_files = 0

    for file in files:
        abs_path = resolve_file_path(project, file)

        if abs_path is None:
            skipped_files += 1
            continue

        try:
            chunks = chunker.chunk_file(abs_path, max_chars=MAX_CHARS)
            for chunk in chunks:
                all_chunks.append(
                    {
                        "file": file.path,
                        "language": file.language or "unknown",
                        "chunk": chunk,
                    }
                )
            processed_files += 1
        except Exception as exc:  # noqa: BLE001
            # Do not crash the entire script for one bad file
            print(f"  [WARN] Could not chunk {file.path}: {exc}", file=sys.stderr)
            skipped_files += 1

    return {
        "processed_files": processed_files,
        "skipped_files": skipped_files,
        "chunks": all_chunks,
    }


def print_summary(project, results: dict) -> None:
    """Print a formatted summary of the chunking run."""
    chunks = results["chunks"]
    total_chunks = len(chunks)

    print("=" * 60)
    print("CodeChunker -- Real-Project Verification")
    print("=" * 60)
    print(f"Project ID   : {project.id}")
    print(f"Project Name : {project.name}")
    print(f"Files found  : {results['processed_files'] + results['skipped_files']}")
    print(f"Files chunked: {results['processed_files']}")
    print(f"Files skipped: {results['skipped_files']}")
    print(f"Total chunks : {total_chunks}")
    print()

    if total_chunks == 0:
        print("No chunks were generated. Check that the project files are accessible.")
        return

    # -------------------------------------------------------------------
    # Representative chunks: prefer named (semantic) chunks, fall back to any
    # -------------------------------------------------------------------
    named = [r for r in chunks if r["chunk"].name]
    sample = named[:PREVIEW_CHUNKS] if named else chunks[:PREVIEW_CHUNKS]

    print(f"--- Representative Chunks (showing up to {PREVIEW_CHUNKS}) ---")
    for idx, record in enumerate(sample, start=1):
        chunk = record["chunk"]
        content_preview = chunk.content[:CONTENT_PREVIEW_LEN]
        if len(chunk.content) > CONTENT_PREVIEW_LEN:
            content_preview += "..."

        print(f"\n[Chunk {idx}]")
        print(f"  File       : {record['file']}")
        print(f"  Language   : {record['language']}")
        print(f"  Chunk Type : {chunk.entity_type or 'text'}")
        print(f"  Name       : {chunk.name or '(anonymous)'}")
        print(f"  Start Line : {chunk.start_line}")
        print(f"  End Line   : {chunk.end_line}")
        print(f"  Content    :")
        for line in content_preview.splitlines():
            print(f"    {line}")

    print()
    print("=" * 60)
    print("Verification complete. No data was written.")
    print("=" * 60)


def main() -> None:
    args = parse_args()
    project_id: int = args.project_id

    session = SessionLocal()
    try:
        project = load_project(session, project_id)
        if project is None:
            print(
                f"[ERROR] Project with ID {project_id} was not found in the database.",
                file=sys.stderr,
            )
            sys.exit(1)

        files = load_files(session, project_id)
        if not files:
            print(
                f"[ERROR] Project '{project.name}' (ID {project_id}) has no files recorded.",
                file=sys.stderr,
            )
            sys.exit(1)

        print(f"Loaded project '{project.name}' with {len(files)} file(s). Chunking...\n")
        results = chunk_project(project, files)
        print_summary(project, results)

    finally:
        session.close()


if __name__ == "__main__":
    main()
