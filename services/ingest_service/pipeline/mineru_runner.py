"""
services/ingest_service/pipeline/mineru_runner.py
Wraps the MinerU CLI as a subprocess.

MinerU pipeline backend:
  - CPU-only (no GPU needed)
  - Scores 86.2 on OmniDocBench v1.5
  - Outputs: <filename>.md + <filename>_content_list.json + images/

Usage:
  result = await run_mineru(input_path, output_dir, job_id, jobs_coll)
  result["md_path"]      → path to clean Markdown
  result["content_list"] → parsed JSON with bounding boxes
  result["page_count"]   → number of pages detected
"""
import json
import logging
import subprocess
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _push_event(jobs_coll, job_id: str, message: str):
    """Append a progress event to the MongoDB job document."""
    await jobs_coll.update_one(
        {"job_id": job_id},
        {"$push": {"events": {"message": message, "ts": utcnow()}}},
    )


async def run_mineru(
    input_path: str,
    output_dir: str,
    job_id: str,
    jobs_coll,
) -> dict:
    """
    Run MinerU pipeline backend on a single file.
    Streams progress events to the MongoDB job record.

    Returns dict with md_path, content_list, page_count, output_dir.
    Raises RuntimeError on failure (caller sets job status to 'failed').
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    await _push_event(jobs_coll, job_id, "MinerU parser started (CPU pipeline mode)")

    # CUDA_VISIBLE_DEVICES="" prevents MinerU from trying CUDA on CPU-only systems
    env = {"CUDA_VISIBLE_DEVICES": "", **__import__("os").environ.copy()}

    cmd = ["mineru", "-p", input_path, "-o", output_dir, "-b", "pipeline"]
    logger.info(f"Running MinerU: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 min max per document
            env=env,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("MinerU timed out after 10 minutes")
    except FileNotFoundError:
        raise RuntimeError(
            "MinerU not found. Install: pip install 'mineru[core]' "
            "and ensure it is on PATH"
        )

    if result.returncode != 0:
        snippet = (result.stderr or "")[-400:] or "no stderr output"
        raise RuntimeError(f"MinerU exit {result.returncode}: {snippet}")

    # ── Locate output files ──
    out_path = Path(output_dir)

    # MinerU creates a subdirectory named after the input file stem
    md_files   = list(out_path.rglob("*.md"))
    json_files = list(out_path.rglob("*content_list.json"))

    if not md_files:
        raise RuntimeError(
            "MinerU produced no .md output. "
            "Check if the PDF is corrupt or password-protected."
        )

    md_path      = str(md_files[0])
    content_list = (
        json.loads(json_files[0].read_text(encoding="utf-8"))
        if json_files
        else []
    )

    page_count = (
        max((e.get("page_no", 0) for e in content_list), default=0) + 1
        if content_list
        else 1
    )
    elem_count = len(content_list)

    await _push_event(
        jobs_coll, job_id,
        f"Parsed: {page_count} pages, {elem_count} structural elements"
    )

    logger.info(
        f"MinerU done for job {job_id}: {page_count}p, {elem_count} elements, "
        f"md={md_path}"
    )

    return {
        "md_path":      md_path,
        "content_list": content_list,
        "page_count":   page_count,
        "output_dir":   output_dir,
    }