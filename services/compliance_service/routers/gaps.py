"""
services/compliance_service/routers/gaps.py
GET /gaps — return all GAP and PARTIAL findings from the latest scan.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from fastapi import APIRouter
from services.shared.mongo import get_db

router = APIRouter()


@router.get("/gaps")
async def get_gaps():
    """Return GAP + PARTIAL items from the most recent completed scan."""
    db = get_db()
    scan = await db["compliance_scans"].find_one(
        {"status": "done"},
        sort=[("started_at", -1)],
    )
    if not scan:
        return {"gaps": [], "message": "No completed compliance scan found. Run POST /scan first."}

    gaps = [r for r in scan.get("results", []) if r["status"] in ("GAP", "PARTIAL")]
    return {
        "scan_id":    str(scan["_id"]),
        "scanned_at": scan.get("started_at", ""),
        "summary":    scan.get("summary", {}),
        "gaps":       gaps,
    }