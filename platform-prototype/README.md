# TRACE Intelligence Platform — backend foundation

This directory is the **separate application prototype**. The public TRACE website remains a presentation of the concept; it is not the platform.

## Current implementation

- FastAPI service with case creation and listing
- Evidence ingestion for TXT, MD, LOG, JSON, CSV and EML
- SHA-256 digest of every uploaded original
- Original files stored separately from extracted text and metadata
- Deterministic extraction of email addresses, domains, valid IPv4 addresses, date strings and phone-like values
- Exact-value cross-source correlation with explicit limitations
- Optional TRACE AI endpoint using an OpenAI API key stored only on the backend
- AI claims are restricted to known artifact IDs; unsupported "facts" without citations are downgraded to hypotheses
- Unit tests for hashing, extraction and correlation

This is an early local MVP, not a production forensic system. It has no authentication, multi-user permissions, encryption-at-rest, retention controls, malware scanning, immutable audit log or production deployment configuration. **Do not expose it to the public internet or upload sensitive/real investigative material.** Use synthetic data only until those controls exist.

## Architecture

```text
React workspace (next implementation)
        |
        v
FastAPI API
  |-- Case service
  |-- Evidence ingestion
  |-- Deterministic parsers and normalizers
  |-- Exact-match correlation / graph data
  |-- TRACE AI orchestration
        |
        +--> SQLite (local MVP; PostgreSQL planned)
        +--> Original evidence store (local MVP; object storage planned)
        +--> AI provider (optional, server-side key only)
```

The deterministic layer establishes what is present in the supplied material. TRACE AI explains the supplied results and proposes checks. It must not create evidence, silently enrich IPs with location, or treat a shared identifier as proof of shared identity.

## Open in GitHub Codespaces (iPad / browser)

You do not need a laptop or a local Python/Node installation.

1. Open the repository: https://github.com/ewterewa/trace
2. Tap **Code** → **Codespaces** → **Create codespace on main**.
3. Wait for the environment to finish preparing. The dev container installs dependencies and starts the API and web workspace automatically.
4. Open the forwarded **TRACE Platform** port (5173). If it does not open automatically, open the **Ports** panel and tap the globe icon next to port 5173.
5. The API runs on port 8000. Keep both forwarded ports private.

The current prototype is intended for synthetic demonstration data only. It is not yet a public production deployment and must not receive sensitive case evidence.

## Run locally

Requirements: Python 3.11+

```bash
cd platform-prototype/backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env               # Add OPENAI_API_KEY only if AI is needed
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs  
Health check: http://127.0.0.1:8000/health

## Run the workspace UI

Open a second terminal:

```bash
cd platform-prototype/frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. The UI connects to the local API at http://127.0.0.1:8000. Create an investigation, upload synthetic files from `backend/samples/`, then open **Связи** or **TRACE AI**. To enable live model responses, set `OPENAI_API_KEY` in `backend/.env` and restart the API. The frontend never receives the secret key.

## Minimal API flow

1. `POST /cases` with JSON `{"name":"Synthetic review"}`
2. `POST /cases/{case_id}/artifacts` as multipart form-data, field name `file`
3. `GET /cases/{case_id}/analysis` for deterministic matches
4. `POST /cases/{case_id}/ask` with JSON `{"question":"What exact values recur across the sources?"}`

The AI endpoint returns HTTP 503 until `OPENAI_API_KEY` is configured on the backend. No API key belongs in frontend code, GitHub Pages, or a committed file.

## Run tests

```bash
cd platform-prototype/backend
python -m unittest discover -s tests -v
```

## Planned next milestones

1. Add a React workspace for evidence, graph, chronology and TRACE AI.
2. Add PDF and structured network-capture parsing with dedicated parsers and test fixtures.
3. Replace SQLite with PostgreSQL and add explicit provenance and append-only audit events.
4. Add authentication, case-level authorization, upload scanning, encryption and retention/deletion policy before any real-data use.
5. Add graph visualization and evidence-linked report export.
6. Add a provider abstraction and controlled tool-calling for AI; keep deterministic operations authoritative.
