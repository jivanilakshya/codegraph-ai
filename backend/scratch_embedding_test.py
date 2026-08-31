"""Development script to verify embedding generation against a real project in the database.

Usage (inside the Docker backend container):
    python scratch_embedding_test.py --project-id 1
"""

import argparse
import sys
from pathlib import Path

# Database session & models
from app.database.postgres import SessionLocal
from app.models.project import Project
from app.models.file import File

# Chunker & Embeddings
from app.ai.chunker import CodeChunker
from app.ai.embeddings import EmbeddingService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify embedding generation against a project from the database."
    )
    parser.add_argument(
        "--project-id",
        type=int,
        required=True,
        help="ID of the project to verify (e.g., --project-id 1)"
    )
    return parser.parse_args()


def resolve_file_path(project: Project, file: File) -> Path | None:
    """Build the absolute path for a project file."""
    if project.local_path:
        base = Path(project.local_path)
    else:
        base = Path("/repositories")

    candidate = base / file.path
    if candidate.is_file():
        return candidate

    fallback = Path("/repositories") / file.path
    if fallback.is_file():
        return fallback

    return None


def main() -> None:
    args = parse_args()
    project_id = args.project_id

    session = SessionLocal()
    try:
        project = session.query(Project).filter(Project.id == project_id).first()
        if project is None:
            print(f"[ERROR] Project with ID {project_id} not found in the database.", file=sys.stderr)
            sys.exit(1)

        files = session.query(File).filter(File.project_id == project_id).all()
        if not files:
            print(f"[ERROR] Project '{project.name}' (ID {project_id}) has no files recorded.", file=sys.stderr)
            sys.exit(1)

        print(f"Loaded project '{project.name}' with {len(files)} file(s). Chunking...")
        
        chunker = CodeChunker()
        all_candidate_chunks = []  # List of tuple (file_path, CodeChunk)
        processed_files_count = 0

        for file in files:
            abs_path = resolve_file_path(project, file)
            if abs_path is None:
                continue

            try:
                # Use default max_chars = 1000
                chunks = chunker.chunk_file(abs_path, max_chars=1000)
                for chunk in chunks:
                    all_candidate_chunks.append((file.path, chunk))
                processed_files_count += 1
            except Exception as e:
                print(f"  [WARN] Failed to chunk file {file.path}: {e}", file=sys.stderr)

        total_chunks = len(all_candidate_chunks)
        if total_chunks == 0:
            print("[ERROR] No chunks could be generated for this project.", file=sys.stderr)
            sys.exit(1)

        print(f"Generated {total_chunks} chunk(s) from {processed_files_count} file(s). Initializing Embedding Service...")
        
        # Load embedding service and generate embeddings
        embedding_service = EmbeddingService()
        
        print("Generating embeddings...")
        chunks_only = [chunk for _, chunk in all_candidate_chunks]
        chunk_embeddings = embedding_service.embed_chunks(chunks_only)
        
        # Find a good example chunk (prefer a named class/function/documentation chunk)
        example_idx = 0
        for idx, (path, chunk) in enumerate(all_candidate_chunks):
            if chunk.name:
                example_idx = idx
                break

        example_path, example_chunk = all_candidate_chunks[example_idx]
        example_emb = chunk_embeddings[example_idx].embedding
        example_preview = example_emb[:10] if example_emb else []

        print("\n================================================")
        print("CodeGraph AI -- Embedding Verification")
        print("================================================")
        print(f"Project: {project.name}")
        print(f"Files: {processed_files_count}")
        print(f"Chunks: {total_chunks}")
        print()
        print(f"Model: {embedding_service.model_name}")
        print(f"Embedding Dimension: {embedding_service.embedding_dim}")
        print(f"Device: {embedding_service.device}")
        print(f"Batch Size: {embedding_service.batch_size}")
        print(f"Embeddings Generated: {sum(1 for ce in chunk_embeddings if ce.embedding)}")
        print()
        print("Example Chunk:")
        print(f"File: {example_path}")
        print(f"Type: {example_chunk.entity_type or 'documentation'}")
        print(f"Name: {example_chunk.name or '(anonymous)'}")
        print(f"Start Line: {example_chunk.start_line}")
        print(f"End Line: {example_chunk.end_line}")
        print()
        print("Embedding Preview:")
        print(f"[{', '.join(f'{v:.6f}' for v in example_preview)}...]")
        print()
        print("================================================")
        print("Verification complete. No data was written.")
        print("================================================")

    finally:
        session.close()


if __name__ == "__main__":
    main()
