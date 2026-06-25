"""
services/ingest_service/pipeline/graph_builder.py
Builds the knowledge graph in MongoDB from extracted entity data.

Graph model:
  Nodes (elixara.graph_nodes):
    - One node per unique entity (equipment, regulation, person, location, etc.)
    - Node _id: "{type_prefix}:{NORMALIZED_VALUE}" e.g. "equip:P-101"
    - mention_count incremented on each occurrence
    - doc_ids array accumulates all documents mentioning this entity

  Edges (elixara.graph_edges):
    - entity → document  ("mentioned_in")
    - entity ↔ entity    ("co_occurs", within same chunk)
    - weight incremented on repeated co-occurrence

This is the LightRAG-inspired approach: graph built as a byproduct of
entity extraction (no extra LLM calls for graph construction).
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Map from entity dict key → node type label
ENTITY_TYPE_MAP = {
    "equipment_tags": "equipment",
    "regulations":    "regulation",
    "personnel":      "person",
    "locations":      "location",
    "process_params": "process_param",
}


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_node_id(entity_type: str, value: str) -> str:
    """
    Create a consistent, deterministic node ID.
    e.g. "equip:P-101", "regul:OISD-137", "perso:SURESH_KUMAR"
    """
    prefix  = entity_type[:5]
    cleaned = value.strip().upper().replace(" ", "_")[:60]
    return f"{prefix}:{cleaned}"


async def build_graph_from_chunks(
    chunks: list[dict],
    doc_id: str,
    doc_name: str,
    mongo_db,
) -> tuple[int, int]:
    """
    Upsert all entity nodes and edges for a document's chunks.

    Returns (nodes_added, edges_added) counts.
    Uses MongoDB upsert with $inc so repeated ingestion accumulates weight
    rather than overwriting.
    """
    nodes_coll = mongo_db["graph_nodes"]
    edges_coll = mongo_db["graph_edges"]

    nodes_touched = 0
    edges_touched = 0

    # ── Register the document itself as a node ──────────────────────────
    doc_node_id = f"doc:{doc_id}"
    await nodes_coll.update_one(
        {"_id": doc_node_id},
        {
            "$set": {
                "type":       "document",
                "label":      doc_name,
                "doc_id":     doc_id,
                "updated_at": utcnow(),
            }
        },
        upsert=True,
    )
    nodes_touched += 1

    # ── Process each chunk ──────────────────────────────────────────────
    for chunk in chunks:
        entities       = chunk.get("entities", {})
        chunk_node_ids: list[str] = []

        for ent_key, ent_type in ENTITY_TYPE_MAP.items():
            for value in entities.get(ent_key, []):
                if not value or len(str(value).strip()) < 2:
                    continue

                node_id = normalize_node_id(ent_type, str(value))

                # Upsert entity node (merge if already exists from another doc)
                await nodes_coll.update_one(
                    {"_id": node_id},
                    {
                        "$set":         {"type": ent_type, "label": value},
                        "$addToSet":    {"doc_ids": doc_id},
                        "$inc":         {"mention_count": 1},
                        "$setOnInsert": {"first_seen": utcnow()},
                    },
                    upsert=True,
                )
                nodes_touched += 1

                # Edge: entity → document (mentioned_in)
                edge_id = f"{node_id}__IN__{doc_node_id}"
                await edges_coll.update_one(
                    {"_id": edge_id},
                    {
                        "$set": {
                            "from_node": node_id,
                            "to_node":   doc_node_id,
                            "relation":  "mentioned_in",
                        },
                        "$inc": {"weight": 1},
                    },
                    upsert=True,
                )
                edges_touched += 1
                chunk_node_ids.append(node_id)

        # ── Co-occurrence edges: every entity pair in this chunk ────────
        for i, node_a in enumerate(chunk_node_ids):
            for node_b in chunk_node_ids[i + 1:]:
                if node_a == node_b:
                    continue
                # Canonical edge ID: smaller ID first for deduplication
                edge_id = "__CO__".join(sorted([node_a, node_b]))
                await edges_coll.update_one(
                    {"_id": edge_id},
                    {
                        "$set": {
                            "from_node": node_a,
                            "to_node":   node_b,
                            "relation":  "co_occurs",
                        },
                        "$inc": {"weight": 1},
                    },
                    upsert=True,
                )
                edges_touched += 1

    logger.info(
        f"Graph build for doc {doc_id}: "
        f"{nodes_touched} node upserts, {edges_touched} edge upserts"
    )
    return nodes_touched, edges_touched