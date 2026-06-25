"""
services/ingest_service/routers/docs.py
Document listing and metadata endpoints.

GET /docs              — list all documents (with filter support)
GET /docs/{doc_id}     — single document metadata
DELETE /docs/{doc_id}  — remove document + its chunks + graph nodes
"""
import sys
import os

from fastapi import APIRouter, HTTPException, Query

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from services.shared.mongo import get_db
from services.shared.chroma import get_collection

router = APIRouter()


@router.get("/docs")
async def list_documents(
    status:   str | None = Query(None),   # indexed|processing|failed|queued
    doc_type: str | None = Query(None),   # manual|inspection|procedure|...
    limit:    int        = Query(50, le=200),
    skip:     int        = Query(0, ge=0),
):
    db    = get_db()
    query = {}
    if status:   query["status"]   = status
    if doc_type: query["doc_type"] = doc_type

    docs = await db["documents"].find(
        query, {"_id": 0, "file_path": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db["documents"].count_documents(query)
    return {"total": total, "documents": docs}


@router.get("/docs/{doc_id}")
async def get_document(doc_id: str):
    db  = get_db()
    doc = await db["documents"].find_one({"doc_id": doc_id}, {"_id": 0, "file_path": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    # Attach entity summary from chunks
    pipeline = [
        {"$match":   {"doc_id": doc_id}},
        {"$project": {"entities": 1}},
    ]
    chunks = await db["chunks"].aggregate(pipeline).to_list(None)

    entity_summary: dict[str, set] = {
        "equipment_tags": set(),
        "regulations":    set(),
        "personnel":      set(),
        "locations":      set(),
    }
    for chunk in chunks:
        for key in entity_summary:
            for val in chunk.get("entities", {}).get(key, []):
                entity_summary[key].add(val)

    doc["entity_summary"] = {k: sorted(v) for k, v in entity_summary.items()}
    return doc


@router.delete("/docs/{doc_id}")
async def delete_document(doc_id: str):
    """
    Remove document, its job record, its chunks from MongoDB,
    its vectors from ChromaDB, and its graph nodes/edges.
    """
    db = get_db()

    # Check exists
    doc = await db["documents"].find_one({"doc_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")

    # Delete from MongoDB
    await db["documents"].delete_one({"doc_id": doc_id})
    await db["jobs"].delete_many({"doc_id": doc_id})
    await db["chunks"].delete_many({"doc_id": doc_id})

    # Delete from ChromaDB
    try:
        collection = get_collection()
        # ChromaDB: delete by metadata filter
        results = collection.get(where={"doc_id": doc_id})
        if results and results.get("ids"):
            collection.delete(ids=results["ids"])
    except Exception as e:
        # Non-fatal — log and continue
        import logging
        logging.getLogger(__name__).warning(f"ChromaDB delete failed for {doc_id}: {e}")

    # Delete graph edges referencing this doc
    doc_node_id = f"doc:{doc_id}"
    await db["graph_edges"].delete_many({
        "$or": [{"from_node": doc_node_id}, {"to_node": doc_node_id}]
    })
    await db["graph_nodes"].delete_one({"_id": doc_node_id})

    return {"deleted": doc_id, "status": "ok"}