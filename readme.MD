
# ⬡ Elixara — Industrial Knowledge Intelligence Platform

> ET AI Hackathon 2.0 · Problem Statement 8 · CPU-Only · Zero Cloud Cost

Ask questions. Get cited answers. Prevent failures. All from your plant's collective knowledge.

---

## Stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Document Parsing | MinerU (pipeline backend, 86.2 OmniDocBench) |
| LLM              | phi4-mini 3.8B via Ollama                    |
| Embeddings       | nomic-embed-text 137M via Ollama             |
| Vector Store     | ChromaDB (embedded, cosine)                  |
| Sparse Retrieval | BM25Okapi (rank-bm25)                        |
| Reranker         | ms-marco-MiniLM-L-6-v2 (22MB, CPU)           |
| Fusion           | Reciprocal Rank Fusion (RRF k=60)            |
| Database         | MongoDB 7                                    |
| Cache            | Redis 7                                      |
| Gateway          | Node.js + Express                            |
| Frontend         | React 18 + Vite + Tailwind + D3 + Recharts   |

---

## Prerequisites

- Node.js 20 LTS
- Python 3.11
- MongoDB 7 (running on :27017)
- Redis 7 (running on :6379)
- Ollama (running on :11434)

---

## Setup (5 steps)

### Step 1 — Pull AI models (one-time, ~2.7GB)

```bash
ollama pull phi4-mini
ollama pull nomic-embed-text
```

### Step 2 — Install MinerU and download pipeline models (one-time, ~1.5GB)

```bash
python3.11 -m venv ~/.mineru_env
source ~/.mineru_env/bin/activate
pip install "mineru[core]"
CUDA_VISIBLE_DEVICES="" python -c "from mineru.utils.download import download_model; download_model('pipeline')"
deactivate

# Add MinerU to PATH (add to your .bashrc/.zshrc):
export PATH="$HOME/.mineru_env/bin:$PATH"
```

### Step 3 — Configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### Step 4 — Install all dependencies

```bash
# Root + frontend + gateway
npm install
cd frontend && npm install && cd ..
cd gateway && npm install && cd ..

# Python services
for svc in ingest_service rag_service graph_service compliance_service; do
  cd services/$svc
  python3.11 -m venv .venv
  # For rag_service: install CPU torch first
  if [ "$svc" = "rag_service" ]; then
    .venv/bin/pip install torch==2.3.1+cpu --index-url https://download.pytorch.org/whl/cpu
  fi
  .venv/bin/pip install -r requirements.txt
  cd ../..
done
```

### Step 5 — Run everything

```bash
# Ensure MongoDB, Redis, and Ollama are running first, then:
npm run dev:all
```

Open http://localhost:5173 — Login with `demo` / `elixara2024`

---

## Seed demo documents

```bash
# After all services are running:
python scripts/seed_demo.py
```

---

## Service ports

| Service            | Port  |
| ------------------ | ----- |
| React Frontend     | 5173  |
| API Gateway        | 4000  |
| Ingest Service     | 5001  |
| RAG Service        | 5002  |
| Graph Service      | 5003  |
| Compliance Service | 5004  |
| Ollama             | 11434 |
| MongoDB            | 27017 |
| Redis              | 6379  |

---

## Health check

```bash
python scripts/check_health.py
# Or visit: http://localhost:4000/api/health
```

---

*⬡ Elixara · The industrial brain that never forgets*
