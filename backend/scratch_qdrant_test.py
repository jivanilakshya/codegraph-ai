"""Scratch script to verify Qdrant connection and collection creation."""

import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ai.vector_store import VectorStoreService


def main():
    print("CodeGraph AI -- Qdrant Verification\n")

    # If QDRANT_HOST is set (e.g. in container), use it.
    # If not set, check if 'qdrant' host is resolvable; otherwise default to 'localhost' for host execution.
    host = os.getenv("QDRANT_HOST")
    if not host:
        host = "localhost"

    service = VectorStoreService(host=host)

    # 1. Health check
    is_healthy = service.health_check()
    if is_healthy:
        print("Qdrant connection: OK")
    else:
        # Fallback retry with localhost if default host failed (e.g. host='qdrant' on local host machine)
        if host == "qdrant":
            service = VectorStoreService(host="localhost")
            if service.health_check():
                print("Qdrant connection: OK")
                is_healthy = True

        if not is_healthy:
            print("Qdrant connection: FAILED")
            sys.exit(1)

    # 2. List existing collections
    collections_before = service.list_collections()
    print(f"Existing collections: {collections_before}\n")

    # 3. Ensure collection
    collection_name = os.getenv("QDRANT_COLLECTION", "code_chunks")
    print(f"Ensuring collection: {collection_name}")
    print("Vector size: 384")
    print("Distance: COSINE\n")

    service.ensure_collection(collection_name=collection_name, vector_size=384)

    # 4. List collections again
    collections_after = service.list_collections()
    if collection_name in collections_after:
        print(f"Collection ready: {collection_name}")
    else:
        print(f"Failed to verify collection readiness: {collection_name}")
        sys.exit(1)


if __name__ == "__main__":
    main()
