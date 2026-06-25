"""
services/graph_service/routers/pathfinder.py
GET /path — BFS shortest path between two entity nodes.

Demo killer feature: shows how P-101 connects to OISD-137 through
documents, revealing cross-document relationships no one explicitly wrote.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from fastapi import APIRouter, Query
from services.shared.mongo import get_db

router = APIRouter()


@router.get("/path")
async def find_path(
    from_id:  str,
    to_id:    str,
    max_hops: int = Query(5, ge=1, le=8),
):
    """
    BFS shortest path between two node IDs.
    Returns ordered list of node IDs + their display labels.

    Example:
      GET /path?from_id=equip:P-101&to_id=reg:OISD-137
      → {"path": ["equip:P-101", "doc:abc123", "reg:OISD-137"], "hops": 2}
    """
    db = get_db()

    if from_id == to_id:
        node = await db["graph_nodes"].find_one({"_id": from_id})
        label = node.get("label", from_id) if node else from_id
        return {"path": [from_id], "labels": [label], "hops": 0}

    # Standard BFS — queue of paths
    queue:   list[list[str]] = [[from_id]]
    visited: set[str]        = {from_id}

    while queue:
        path    = queue.pop(0)
        current = path[-1]

        if len(path) - 1 >= max_hops:
            continue

        # All neighbors (edges in either direction)
        cursor = db["graph_edges"].find({
            "$or": [{"from_node": current}, {"to_node": current}]
        })

        async for edge in cursor:
            neighbor = (
                edge["to_node"]
                if edge["from_node"] == current
                else edge["from_node"]
            )

            if neighbor in visited:
                continue

            new_path = path + [neighbor]

            if neighbor == to_id:
                # Found — enrich with labels
                node_docs = await db["graph_nodes"].find(
                    {"_id": {"$in": new_path}}
                ).to_list(None)
                label_map = {n["_id"]: n.get("label", n["_id"]) for n in node_docs}
                return {
                    "path":   new_path,
                    "labels": [label_map.get(nid, nid) for nid in new_path],
                    "hops":   len(new_path) - 1,
                }

            visited.add(neighbor)
            queue.append(new_path)

    return {
        "path":    [],
        "labels":  [],
        "hops":    -1,
        "message": f"No path found within {max_hops} hops",
    }