import json
import urllib.request
import urllib.error

print("--- 1. TESTING VALID REQUEST (HTTP 200) ---")
req_data = json.dumps({
    "entity_name": "authenticate_user",
    "file_path": "backend/auth.py",
    "project_id": 93,
    "top_k": 3
}).encode("utf-8")

req = urllib.request.Request(
    "http://localhost:8000/api/v1/rag/explain",
    data=req_data,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print("STATUS:", resp.status)
        print("ENTITY:", res.get("entity_name"))
        print("FILE:", res.get("file_path"))
        print("QUERY:", res.get("query"))
        print("MODEL:", res.get("model"))
        print("TOTAL CHUNKS:", res.get("total_chunks"))
        print("SOURCES COUNT:", len(res.get("sources", [])))
        print("GRAPH CONTEXT COUNT:", len(res.get("graph_context", [])))
        print("EXPLANATION SAMPLE:\n", res.get("explanation")[:250])
except Exception as e:
    print("ERROR:", e)

print("\n--- 2. TESTING INVALID REQUEST (HTTP 422) ---")
invalid_req = urllib.request.Request(
    "http://localhost:8000/api/v1/rag/explain",
    data=b"{}",
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(invalid_req) as resp:
        print("UNEXPECTED SUCCESS:", resp.status)
except urllib.error.HTTPError as e:
    print("VALIDATION FAIL STATUS:", e.code)
    print("BODY SAMPLE:", e.read().decode("utf-8")[:200])
