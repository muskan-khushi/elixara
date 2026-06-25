"""
services/compliance_service/routers/report.py
GET /report/{scan_id} — generate full audit evidence pack from a scan.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from fastapi import APIRouter, HTTPException
from services.shared.mongo import get_db

router = APIRouter()


@router.get("/report/{scan_id}")
async def get_report(scan_id: str):
    """
    Return structured audit evidence pack for a completed scan.
    Frontend renders this as a printable HTML page.
    """
    db   = get_db()
    scan = await db["compliance_scans"].find_one({"_id": scan_id})
    if not scan:
        raise HTTPException(404, f"Scan '{scan_id}' not found")
    if scan.get("status") != "done":
        raise HTTPException(400, f"Scan '{scan_id}' is not yet complete (status: {scan.get('status')})")

    results  = scan.get("results", [])
    summary  = scan.get("summary", {})

    compliant = [r for r in results if r["status"] == "COMPLIANT"]
    partial   = [r for r in results if r["status"] == "PARTIAL"]
    gaps      = [r for r in results if r["status"] == "GAP"]

    return {
        "scan_id":      scan_id,
        "generated_at": scan.get("completed_at", ""),
        "summary":      summary,
        "compliant":    compliant,
        "partial":      partial,
        "gaps":         gaps,
        "score_pct":    round(
            (summary.get("compliant", 0) + 0.5 * summary.get("partial", 0))
            / max(summary.get("total", 1), 1) * 100,
            1,
        ),
    }


@router.get("/report")
async def get_latest_report():
    """Shortcut: report for the most recent completed scan."""
    db   = get_db()
    scan = await db["compliance_scans"].find_one(
        {"status": "done"},
        sort=[("started_at", -1)],
    )
    if not scan:
        raise HTTPException(404, "No completed scan found")
    return await get_report(str(scan["_id"]))