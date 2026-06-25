"""
services/ingest_service/pipeline/chunker.py
Hierarchical Markdown chunker for MinerU output.

Strategy (research-backed):
  1. Split on H1/H2/H3 boundaries from MinerU Markdown (structure-aware)
  2. For sections > CHUNK_SIZE tokens: RecursiveCharacterTextSplitter
  3. Inject rule-based contextual prefix (Anthropic 2024: 35-67% recall gain)
  4. Store parent section for Small-to-Big retrieval pattern

Output per chunk:
  chunk_id            — "{doc_id}_c{index:04d}"
  text_for_embedding  — contextual prefix + chunk text (embedded in ChromaDB)
  text_for_llm        — clean chunk text only (passed to LLM in prompt)
  parent_text         — full section text (Small-to-Big: richer LLM context)
  section_title       — H1/H2/H3 heading this chunk belongs to
  token_count         — BPE token count (cl100k_base)
  metadata            — doc_id, doc_name, doc_type, section, chunk_idx
"""
import re
import logging
from typing import Optional

import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)

# BPE tokenizer — same encoding as phi4-mini
_enc = tiktoken.get_encoding("cl100k_base")

# Regex: split Markdown at any H1/H2/H3 heading (look-ahead keeps the heading)
HEADING_RE = re.compile(r"(?=^#{1,3} )", re.MULTILINE)


def count_tokens(text: str) -> int:
    return len(_enc.encode(text))


def extract_heading(section_text: str) -> str:
    """Extract the heading from the first line of a section."""
    first_line = section_text.split("\n")[0]
    if first_line.startswith("#"):
        return first_line.lstrip("#").strip()
    return "Content"


def make_contextual_prefix(doc_name: str, doc_type: str, section_title: str) -> str:
    """
    Rule-based contextual prefix — free (no LLM call).
    Prepended to chunk text before embedding.
    Tells the embedding model WHERE this chunk comes from.
    """
    return (
        f"[Document: {doc_name}] "
        f"[Type: {doc_type}] "
        f"[Section: {section_title}] "
    )


def chunk_markdown(
    md_text: str,
    doc_id: str,
    doc_name: str,
    doc_type: str,
    chunk_size: int = 400,
    chunk_overlap: int = 100,
) -> list[dict]:
    """
    Split MinerU Markdown output into retrieval-ready chunks.

    Returns list of chunk dicts ready for embedding and storage.
    """
    chunks: list[dict] = []

    # Split on headings; filter empty sections
    sections = HEADING_RE.split(md_text)
    sections = [s.strip() for s in sections if s.strip()]

    if not sections:
        # Fallback: no headings found — treat entire doc as one section
        sections = [md_text.strip()]

    for section in sections:
        lines      = section.split("\n")
        title      = extract_heading(section)
        # Body = everything after the heading line
        body_lines = lines[1:] if lines[0].startswith("#") else lines
        body       = "\n".join(body_lines).strip()

        if not body:
            continue

        # Sub-split if body exceeds chunk_size tokens
        if count_tokens(body) <= chunk_size:
            sub_chunks = [body]
        else:
            splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
                encoding_name="cl100k_base",
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            sub_chunks = splitter.split_text(body)

        prefix = make_contextual_prefix(doc_name, doc_type, title)

        for i, sub in enumerate(sub_chunks):
            if not sub.strip():
                continue

            chunk_id = f"{doc_id}_c{len(chunks):04d}"

            chunks.append({
                "chunk_id": chunk_id,
                "doc_id":   doc_id,
                # Embedding text: contextual prefix + content
                # NOTE: "search_document:" nomic prefix added in embedder.py
                "text_for_embedding": f"{prefix}{sub}",
                # LLM text: clean prose only
                "text_for_llm": sub,
                # Small-to-Big: full parent section for richer LLM context
                "parent_text": body,
                "section_title": title,
                "chunk_index":   i,
                "token_count":   count_tokens(sub),
                "metadata": {
                    "doc_id":    doc_id,
                    "doc_name":  doc_name,
                    "doc_type":  doc_type,
                    "section":   title,
                    "chunk_idx": i,
                },
            })

    logger.info(
        f"Chunked doc {doc_id} ({doc_name}): "
        f"{len(sections)} sections → {len(chunks)} chunks"
    )
    return chunks