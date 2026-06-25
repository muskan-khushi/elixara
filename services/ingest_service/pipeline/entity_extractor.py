"""
services/ingest_service/pipeline/entity_extractor.py
Industrial NER: hybrid LLM (phi4-mini JSON mode) + regex validation.

Entity types extracted:
  equipment_tags  — P-101, C-204A, HX-102, V-301B, TCV-1042
  process_params  — "operating pressure: 12 bar", "temperature: 180°C"
  personnel       — "Suresh Kumar (Inspector)", "Maintenance Team B"
  dates           — "2024-03-15", "Q3 2023", "March 2022"
  regulations     — "OISD-137 Clause 4.2", "Factory Act Section 7(1)"
  locations       — "Unit 3 — Pump House", "Area B — East Wing"

Strategy:
  1. phi4-mini JSON mode — one LLM call per chunk, all entity types
  2. Regex runs independently and merges (catches LLM misses for equip/regs)
  3. If JSON parse fails: regex-only for equip + regs, skip others for chunk
"""
import json
import logging
import re

import httpx

logger = logging.getLogger(__name__)

# ── Regex patterns ──────────────────────────────────────────────────────────

# Equipment tag: P-101, C-204A, HX-102, V-301B, TCV-1042
EQUIP_RE = re.compile(r"\b([A-Z]{1,4}-\d{2,4}[A-Z]?)\b")

# Regulation references
REG_RE = re.compile(
    r"\b(OISD-\d+|PESO[\s\-]\w+|Factory Act[\s\w.]+|ISO[\s\-]\d+|BIS[\s\-]\d+)\b",
    re.IGNORECASE,
)

# ── LLM prompt ──────────────────────────────────────────────────────────────

EXTRACT_PROMPT = """\
You are an industrial document analyst.
Extract structured entities from the document chunk below.

CRITICAL: Return ONLY valid JSON. No explanation, no markdown, no preamble.

Return exactly this JSON structure:
{{
  "equipment_tags": [],
  "process_params": [],
  "personnel":      [],
  "dates":          [],
  "regulations":    [],
  "locations":      []
}}

Examples:
  equipment_tags: ["P-101", "C-204A", "HX-102"]
  process_params: ["operating pressure: 12 bar", "temperature: 180°C"]
  personnel:      ["Suresh Kumar (Inspector)", "Maintenance Team B"]
  dates:          ["2024-03-15", "Q3 2023", "March 2022"]
  regulations:    ["OISD-137 Clause 4.2", "Factory Act Section 7(1)"]
  locations:      ["Unit 3 — Pump House", "Area B — East Wing"]

Document chunk:
{chunk_text}"""

# ── Empty result template ────────────────────────────────────────────────────

EMPTY: dict = {
    "equipment_tags": [],
    "process_params": [],
    "personnel":      [],
    "dates":          [],
    "regulations":    [],
    "locations":      [],
}


async def extract_entities(
    chunk_text: str,
    ollama_base: str,
    model: str = "phi4-mini",
) -> dict:
    """
    Extract industrial entities from a chunk of text.
    Returns merged LLM + regex result.
    """
    # ── LLM extraction (primary) ─────────────────────────────────────────
    llm_result: dict = {}
    try:
        prompt = EXTRACT_PROMPT.format(chunk_text=chunk_text[:1800])
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{ollama_base}/api/generate",
                json={
                    "model":  model,
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0, "num_predict": 512},
                },
            )
            resp.raise_for_status()
        raw = resp.json().get("response", "{}")
        llm_result = json.loads(raw)
    except (json.JSONDecodeError, httpx.TimeoutException, httpx.HTTPError, KeyError) as e:
        logger.warning(f"Entity LLM extraction fallback (regex only): {e}")

    # ── Regex extraction (always runs, catches LLM misses) ───────────────
    regex_equip = EQUIP_RE.findall(chunk_text)
    regex_regs  = REG_RE.findall(chunk_text)

    # ── Merge: deduplicate preserving order ──────────────────────────────
    def merge(llm_list, regex_list):
        combined = list(llm_list or []) + list(regex_list or [])
        return list(dict.fromkeys(combined))  # deduplicate, preserve insertion order

    return {
        "equipment_tags": merge(llm_result.get("equipment_tags"), regex_equip),
        "process_params": llm_result.get("process_params", []),
        "personnel":      llm_result.get("personnel",      []),
        "dates":          llm_result.get("dates",          []),
        "regulations":    merge(llm_result.get("regulations"), regex_regs),
        "locations":      llm_result.get("locations",      []),
    }