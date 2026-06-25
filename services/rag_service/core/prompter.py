"""
services/rag_service/core/prompter.py
Assembles the final LLM prompt from reranked source chunks.

Uses the Small-to-Big pattern:
  - parent_text (full section) is passed to LLM if available
  - chunk text used as fallback
  - Richer context → better answers

System prompt enforces six rules critical for industrial safety:
  1. Answer only from provided excerpts
  2. Cite every claim with [1], [2] etc.
  3. Say "not available" rather than hallucinating
  4. Safety-critical info gets a VERIFY disclaimer
  5. Exact numbers/units — no paraphrasing specs
  6. Concise by default, bullets only for lists
"""

SYSTEM_PROMPT = """\
You are Elixara, an expert industrial knowledge assistant.
You help engineers and field technicians get accurate answers from plant documents.

RULES — follow every one without exception:

1. Answer ONLY from the provided document excerpts below.
2. Cite every factual claim using [1], [2], [3] etc. — the numbers refer to
   the numbered excerpts in the context.
3. If the information needed is NOT in the excerpts, say exactly:
   "This information is not available in the indexed documents."
   Do NOT invent or infer information not present in the excerpts.
4. For safety-critical information (valve positions, pressure limits, chemical
   concentrations, lockout procedures), always append:
   "⚠ VERIFY with the original procedure document before acting."
5. Use exact values from the excerpts: do not paraphrase numbers or units.
   "45 Nm" stays "45 Nm", not "approximately 45 Nm".
6. Be concise: 2–5 sentences for factual questions. Use bullet points only
   when listing multiple distinct items (e.g. a step-by-step procedure).
"""


def build_prompt(query: str, chunks: list[dict]) -> str:
    """
    Assemble full RAG prompt: system rules + numbered source excerpts + question.

    Small-to-Big: uses parent_text (full section) when available for richer
    LLM context, falls back to chunk text.
    """
    context_parts = []
    for i, chunk in enumerate(chunks, start=1):
        m    = chunk.get("metadata", {})
        # Small-to-Big: prefer parent section for LLM, chunk text for retrieval
        text = (chunk.get("parent_text") or chunk.get("text", "")).strip()

        context_parts.append(
            f'[{i}] Source: "{m.get("doc_name", "Unknown")}" '
            f'| Type: {m.get("doc_type", "unknown")} '
            f'| Section: {m.get("section", "")}\n'
            f'{text}'
        )

    context = "\n\n".join(context_parts)

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"Document excerpts:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Answer:"
    )


def build_sources_payload(top_chunks: list[dict]) -> list[dict]:
    """Serialise top chunks into the sources array returned to the frontend."""
    return [
        {
            "doc_name":     c.get("metadata", {}).get("doc_name", ""),
            "doc_type":     c.get("metadata", {}).get("doc_type", ""),
            "section":      c.get("metadata", {}).get("section",  ""),
            "excerpt":      c.get("text", "")[:300],
            "rerank_score": round(c.get("rerank_score", 0.0), 4),
            "confidence":   round(c.get("confidence",   0.0), 3),
        }
        for c in top_chunks
    ]