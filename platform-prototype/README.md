# TRACE Intelligence Platform — prototype and backend foundation

This directory is the **separate application prototype**. The public TRACE website remains a presentation of the concept; it is not the platform.

## Current implementation

- FastAPI service with case creation and listing
- Evidence ingestion for TXT, MD, LOG, JSON, CSV and EML
- SHA-256 digest of every uploaded original
- Original files stored separately from extracted text and metadata
- Deterministic extraction of email addresses, domains, valid IPv4 addresses, date strings and phone-like values
- Exact-value cross-source correlation with explicit limitations
- TRACE AI provider adapter: OpenAI API or a self-hosted OpenAI-compatible inference endpoint; credentials stay on the backend
- AI claims are restricted to known artifact IDs; unsupported "facts" without citations are downgraded to hypotheses
- Unit tests for hashing, extraction and correlation
- Image, audio and video uploads are preserved as original hashed evidence files; no transcript is fabricated
- Original artifact download endpoint, case notes, audit-event records, source-derived date mentions and an evidence-to-entity graph API
- The graph API labels edges as source mentions only; it does not infer identity or physical presence

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

## Private Docker pilot

The API can be run in a container with a persistent local evidence volume. The compose file binds the API to localhost only and is intended for a private pilot/demo, not a public production deployment.

```bash
cd platform-prototype
docker compose up --build -d
docker compose logs -f trace-api
```

API health: http://127.0.0.1:8000/health

The container runs as a non-root user, drops Linux capabilities, uses a read-only root filesystem and stores case data in the named volume. This does not replace production identity, tenant isolation, managed PostgreSQL, encrypted object storage, malware scanning or independent security review.

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

Open http://127.0.0.1:5173. The UI connects to the local API at http://127.0.0.1:8000. Create an investigation, upload synthetic files from `backend/samples/`, then open **Связи** or **TRACE AI**. To enable live model responses, configure either `OPENAI_API_KEY` (OpenAI-hosted model) or `TRACE_AI_BASE_URL` plus `TRACE_AI_MODEL` (a self-hosted OpenAI-compatible inference server) in `backend/.env`, then restart the API. A self-hosted model can avoid a commercial API key, but it still requires a reachable inference server and compute. The frontend never receives credentials.

## Minimal API flow

1. `POST /cases` with JSON `{"name":"Synthetic review"}`
2. `POST /cases/{case_id}/artifacts` as multipart form-data, field name `file`
3. `GET /cases/{case_id}/analysis` for deterministic matches
4. `POST /cases/{case_id}/ask` with JSON `{"question":"What exact values recur across the sources?"}`

The AI endpoint returns HTTP 503 until either OpenAI credentials or a self-hosted compatible inference endpoint is configured on the backend. No API key belongs in frontend code, GitHub Pages, or a committed file.

## Run tests

```bash
cd platform-prototype/backend
python -m unittest discover -s tests -v
```

## New analyst API modules

- `GET /cases/{case_id}/artifacts/{artifact_id}/download` returns the stored original file.
- `GET /cases/{case_id}/timeline` returns date mentions with artifact IDs and source-line numbers. These are not verified event times.
- `GET /cases/{case_id}/graph` returns extracted entities connected to their source artifacts and source lines.
- `GET /cases/{case_id}/audit` returns recorded case and evidence ingestion events.
- `GET/POST /cases/{case_id}/notes` stores analyst notes separately from originals.
- Image/audio/video files are hashed and stored unchanged. Automated OCR, transcription and media metadata extraction are not implemented yet.

The React workspace now exposes chronology, graph, notes and audit panels. The graph is an evidence-linked data view, not yet a force-directed visual graph. The chronology is a source-date register, not a verified event timeline.

## Production boundary

See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md). This remains a pilot foundation: SQLite/local disk, no production identity provider, no multi-tenant authorization, no malware quarantine, no managed encrypted object storage and no operational SLA. Do not upload sensitive or real investigative material to a public deployment.

## Planned next milestones

1. Add a React workspace for evidence, graph, chronology and TRACE AI.
2. Add PDF and structured network-capture parsing with dedicated parsers and test fixtures.
3. Replace SQLite with PostgreSQL and add explicit provenance and append-only audit events.
4. Add authentication, case-level authorization, upload scanning, encryption and retention/deletion policy before any real-data use.
5. Add graph visualization and evidence-linked report export.
6. Add a provider abstraction and controlled tool-calling for AI; keep deterministic operations authoritative.


## Public interactive preview

After the GitHub Pages deployment workflow completes, the static demonstration workspace is available at:

https://ewterewa.github.io/trace/platform/

This preview includes six public case-study summaries and 600 synthetic interface records (100 per case) to demonstrate evidence registers, reconstructed communications, link analysis, chronology and schematic geospatial views. Synthetic records are explicitly marked **RECONSTRUCTION / DEMO DATA** and are not authentic case evidence. Public historical facts remain separated from those records and link to their institutional sources.

The public preview is static. It does not persist uploads, connect to the FastAPI database, or execute live AI inference. For the interactive backend prototype, launch the Codespaces environment described above. Do not expose the current MVP backend to the public internet or upload sensitive material.
