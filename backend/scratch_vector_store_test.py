import argparse
import logging
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.postgres import SessionLocal, initialize_postgres
from app.models.project import Project
from app.services.vector_indexing_service import VectorIndexingService
from app.services.semantic_search_service import SemanticSearchService

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    parser = argparse.ArgumentParser(description="Verify Vector Store and Qdrant Indexing")
    parser.add_argument("--project-id", type=int, required=True, help="Project ID to verify")
    parser.add_argument("--query", type=str, default="how does authentication work?", help="Test search query")
    args = parser.parse_args()

    project_id = args.project_id
    print(f"CodeGraph AI -- Vector Store Verification for Project {project_id}\n")

    # Initialize DB (if not already handled)
    initialize_postgres()

    # 1. Load project
    with SessionLocal() as session:
        project = session.get(Project, project_id)
        if not project:
            print(f"Error: Project {project_id} not found in database.")
            sys.exit(1)
        print(f"Loaded project: {project.name} (Path: {project.local_path})")

    # 2. Vector Indexing Service
    indexing_service = VectorIndexingService()
    try:
        # This will also load chunks, generate embeddings, and index them.
        print("Starting vector indexing process...")
        stats = indexing_service.index_project(project_id)
        
        print("\nIndexing Statistics:")
        print(f"- Project ID: {stats.get('project_id')}")
        print(f"- Files Scanned: {stats.get('files_scanned')}")
        print(f"- Chunks Created: {stats.get('chunks_created')}")
        print(f"- Vectors Indexed: {stats.get('vectors_indexed')}")
        print(f"- Collection: {indexing_service.collection_name}")
        print(f"- Dimension: {indexing_service.embedding_service.embedding_dim}")
    except Exception as e:
        print(f"Error during indexing: {e}")
        sys.exit(1)

    # 3. Search Verification
    print(f"\nExecuting semantic search query: '{args.query}'")
    search_service = SemanticSearchService()
    try:
        results = search_service.search(query=args.query, project_id=project_id, limit=5)
        print(f"Found {len(results.results)} results.\n")
        
        for i, result in enumerate(results.results):
            print(f"Result {i+1} [Score: {result.score:.4f}]")
            print(f"  File: {result.metadata.get('file_path')}")
            print(f"  Entity Name: {result.metadata.get('name')} ({result.metadata.get('entity_type')})")
            print(f"  Lines: {result.metadata.get('start_line')} - {result.metadata.get('end_line')}")
            print(f"  Project ID Filter Working: {'Yes' if result.metadata.get('project_id') == project_id else 'No'}")
            print("-" * 40)
            
    except Exception as e:
        print(f"Error during search: {e}")
        sys.exit(1)

    print("\nVerification completed successfully.")

if __name__ == "__main__":
    main()
