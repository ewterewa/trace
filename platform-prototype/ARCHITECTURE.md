# TRACE Intelligence Platform — architecture

## Product boundary

The repository contains two separate applications:

- `/` — TRACE presentation website (concept, public explanation, showcase).
- `/platform-prototype` — TRACE Intelligence Platform (functional investigation workspace).

They share one Git repository but have independent frontend builds and deployment targets. GitHub Pages can serve the presentation and a static platform frontend under a second path, but the working platform also requires a separately hosted backend and protected data storage.

## Product modules

1. **Case Workspace** — investigations, access scope, case status, notes and audit trail.
2. **Evidence Explorer** — immutable originals, SHA-256, MIME/type detection, parsers, derived text, metadata and source offsets.
3. **Communication Intelligence** — email and chat threads, participants, sender/recipient, timestamps, timezone, attachments and location fields when supported by source evidence.
4. **Entity Resolution & Link Analysis** — people, accounts, organizations, devices, files, messages, events and places; exact matches first, explainable probabilistic candidates later. Every edge stores its rule and source references.
5. **Chronology** — original timestamp, timezone, normalized timestamp, precision, source and confidence; no silent timezone assumptions.
6. **Global Intelligence** — 3D globe and map layers; coordinates only when explicitly present or supported by a documented geocoding source. A point is never inferred from an IP address.
7. **TRACE AI** — retrieval over one case at a time, tool calls to deterministic analyzers, evidence citations, fact/hypothesis/question separation, contradiction checks and report drafting.
8. **Research Library** — reusable analytical methods and case-independent reference material, separated from case evidence.

## Hybrid analysis pipeline

```text
Original evidence
  -> ingestion + SHA-256 + immutable storage
  -> format-specific parsers
  -> normalized records with source offsets
  -> deterministic extraction and validation
  -> exact correlation / chronology / geospatial indexing
  -> evidence graph + search index
  -> retrieval for a user question
  -> AI synthesis over retrieved records and tool results
  -> claims with source citations + human review
```

The language model is not the source of truth. It cannot create entities, locations, events or relationships without a traceable evidence record. Deterministic services own extraction, normalization, matching and validation; AI explains, compares, summarizes and proposes follow-up checks.

## Data model

Core records:

- `Case`
- `Artifact` (original object, hash, MIME, storage key, acquisition metadata)
- `ArtifactVersion` (derived representation, parser/version, timestamp)
- `Message` and `Conversation`
- `Entity` and `EntityOccurrence`
- `Event` and `TimestampObservation`
- `Location` and `LocationObservation`
- `Relationship` (type, rule, confidence, status, supporting artifact offsets)
- `AIAnalysis` and `Claim`
- `AuditEvent`

All extracted records must retain an artifact ID plus page/row/line/message/byte offset where available. Original evidence is never overwritten by parsing or AI.

## Initial synthetic investigation

Build one coherent synthetic investigation containing 100 evidence objects across formats and types:

- 30 communication artifacts (email and chat exports)
- 20 documents (TXT/MD/PDF/CSV/JSON)
- 15 operational logs
- 15 media metadata manifests (synthetic metadata, not fabricated real photos)
- 10 event/location records with explicit synthetic coordinates
- 10 cross-reference / registry records

The objects share fictional entities, events, message IDs and timestamps so the platform can demonstrate search, entity resolution, graph traversal, chronology, geospatial filtering and evidence-cited AI analysis. Clearly label all generated records as synthetic.

Target scale after the MVP: 100 investigations × approximately 100 artifacts = approximately 10,000 evidence objects. The initial 100-object case is a fixture for development, not a claim that production scale has already been validated.

## Browser-only development

The repository includes a GitHub Codespaces configuration. It provisions Python 3.11 and Node.js 20, installs dependencies, starts the API and frontend, and forwards ports 8000 and 5173. This allows development and preview from an iPad browser; no local laptop setup is required.

## Deployment and security boundary

- Presentation: GitHub Pages.
- Platform frontend: static hosting or the same domain under a separate path.
- Platform API: cloud application hosting.
- Evidence storage: private object storage with encryption and retention policy.
- Database: PostgreSQL for hosted multi-case use.
- Secrets: backend environment variables only.
- Do not expose a public demo until authentication, authorization, rate limiting, backups, audit logging and upload scanning are in place.
- Start with synthetic evidence only.
