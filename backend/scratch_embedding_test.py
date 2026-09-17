"""Real project embedding verification script for Step 6.2.6.

Usage:
    python scratch_embedding_test.py --project-id 1
"""

import argparse
import os
import sys
from pathlib import Path

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.ai.chunker import CodeChunker
from app.ai.embeddings import EmbeddingService
from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.project import Project


def _resolve_file_path(project: Project, file_record: File) -> Path | None:
    """Resolve a database file record to a local filesystem path."""
    if project.local_path:
        base = Path(project.local_path).resolve()
    else:
        base = Path("/repositories").resolve()

    candidate = base / file_record.path
    if candidate.is_file():
        return candidate

    fallback = Path("/repositories") / file_record.path
    if fallback.is_file():
        return fallback

    return None


def verify_project_embeddings(project_id: int) -> None:
    """Load project files, generate code chunks, compute embeddings, and print summary."""
    print("=" * 60)
    print(f"🚀 CodeGraph AI — Embedding Service Real Project Verification")
    print("=" * 60)

    # 1. Load project and files from database
    with SessionLocal() as session:
        project = session.get(Project, project_id)
        if project is None:
            print(f"❌ Error: Project with ID {project_id} not found in database.")
            sys.exit(1)

        files = session.query(File).filter(File.project_id == project_id).all()
        print(f"✅ Loaded Project: ID={project.id}, Name='{project.name}', Local Path='{project.local_path}'")
        print(f"✅ Total Registered Files: {len(files)}")

        if not files:
            print(f"⚠️ Warning: Project {project_id} has no registered files.")
            sys.exit(0)

        # 2. Chunk files using CodeChunker
        chunker = CodeChunker()
        all_chunks = []
        resolved_files_count = 0

        for f in files:
            abs_path = _resolve_file_path(project, f)
            if abs_path is None:
                continue
            resolved_files_count += 1
            try:
                file_chunks = chunker.chunk_file(abs_path, max_chars=1000)
                all_chunks.extend(file_chunks)
            except Exception as e:
                print(f"⚠️ Failed to chunk file '{f.path}': {e}")

        print(f"✅ Resolved Files on Disk: {resolved_files_count}")
        print(f"✅ Total Generated Code Chunks: {len(all_chunks)}")

        if not all_chunks:
            print("⚠️ No valid code chunks generated.")
            sys.exit(0)

        # 3. Generate embeddings using EmbeddingService
        embedding_service = EmbeddingService()
        print(f"⏳ Generating embeddings using model '{embedding_service.model_name}' on device '{embedding_service.device}'...")

        chunk_embeddings = embedding_service.embed_chunks(all_chunks)

        print("\n" + "=" * 60)
        print("📊 EMBEDDING VERIFICATION SUMMARY")
        print("=" * 60)
        print(f"Project ID          : {project.id}")
        print(f"Files Processed     : {resolved_files_count}")
        print(f"Code Chunks         : {len(all_chunks)}")
        print(f"Embeddings Created  : {len(chunk_embeddings)}")
        print(f"Model Name          : {embedding_service.model_name}")
        print(f"Embedding Dimension : {embedding_service.embedding_dim}")
        print(f"Device              : {embedding_service.device}")
        print(f"Default Batch Size  : {embedding_service.batch_size}")

        if chunk_embeddings:
            sample_item = chunk_embeddings[0]
            sample_chunk = sample_item.chunk
            sample_vec = sample_item.embedding

            print("\n" + "-" * 60)
            print("🔍 SAMPLE CHUNK METADATA & EMBEDDING PREVIEW")
            print("-" * 60)
            print(f"Chunk Entity Type   : {sample_chunk.entity_type or 'N/A'}")
            print(f"Chunk Entity Name   : {sample_chunk.name or 'N/A'}")
            print(f"Line Range          : {sample_chunk.start_line}-{sample_chunk.end_line}")
            print(f"Byte Offsets        : {sample_chunk.start_byte}-{sample_chunk.end_byte}")
            print(f"Content Preview     : {sample_chunk.content[:120]!r}...")
            print(f"Embedding Length    : {len(sample_vec)}")
            print(f"First 10 Values     : {[round(v, 4) for v in sample_vec[:10]]}")
            print("-" * 60)

        print("\n✅ Step 6.2.6 Embedding Verification Completed Successfully!")


def main():
    parser = argparse.ArgumentParser(description="Verify Step 6.2.6 Embedding Service against a real project.")
    parser.add_argument("--project-id", type=int, default=1, help="ID of the project to verify embeddings for (default: 1)")
    args = parser.parse_args()

    verify_project_embeddings(args.project_id)


if __name__ == "__main__":
    main()
