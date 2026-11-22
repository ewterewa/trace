# TRACE — Production readiness plan

## Current truth

The published GitHub Pages application is a static demonstration. The FastAPI service in backend/ is an early single-process prototype backed by SQLite and local disk. It is NOT safe for real case evidence or public multi-tenant use. Do not market the current deployment as a production forensic platform.

## Target production topology

- Web application: static React build behind a CDN; no secrets in browser bundles.
- API: FastAPI containers behind TLS ingress and rate limiting.
- Identity: OIDC provider, MFA, short-lived sessions, revocation and recovery.
- Database: managed PostgreSQL with encrypted backups, point-in-time recovery, schema migrations and least-privilege DB roles.
- Evidence storage: private S3-compatible object storage, server-side encryption, versioning, retention locks where legally appropriate, malware scanning and signed short-lived download URLs.
- Queue: Redis or managed queue for asynchronous parsing, OCR, transcription, media processing and AI jobs.
- Search: PostgreSQL full-text initially; OpenSearch only when scale requires it.
- Observability: structured logs, metrics, traces, alerting, error reporting and security-event export.
- Secrets: cloud secret manager; never commit API keys, signing secrets or database credentials.
- Deployment: separate dev/staging/production environments, CI tests, dependency scanning, container scanning and approval before production release.

## Required security controls before real evidence

1. OIDC authentication, MFA and account lifecycle management.
2. Tenant isolation and case-level RBAC (owner, analyst, viewer); deny by default.
3. Authorization tests for every read, write, export and download route.
4. Immutable audit events for login, access, upload, view, export, mutation, invitation and deletion.
5. Original evidence immutable after ingestion; derived text, OCR, thumbnails and transcripts stored separately and linked to original SHA-256.
6. File type detection by content, size limits, malware quarantine, archive-bomb protection and parser sandboxing.
7. Encryption in transit and at rest; per-tenant keys if required by the threat model.
8. Explicit retention, legal hold, deletion and export workflows.
9. Backup restoration tests and incident-response procedures.
10. Privacy impact assessment, data-processing agreements and jurisdiction-specific legal review.

## Evidence model

Every item must record: immutable artifact ID, original filename, detected MIME type, byte size, SHA-256, uploader, tenant/case, received timestamp (UTC), source/provenance statement, acquisition method, storage object version, parser name/version, derivative links and audit history. Never overwrite an original. Re-ingestion creates a new artifact version and preserves both records.

## Analytical integrity

- Timeline dates extracted from documents are mentions, not verified event times.
- GPS coordinates are source-derived only; preserve original coordinate precision and time zone.
- IP addresses are not physical-location evidence and shared IPs do not establish identity.
- Graph edges must carry source artifact + page/line/message/time offset and relation semantics.
- AI output is advisory. Each factual claim must cite evidence. Hypotheses, contradictions and unknowns remain separately labelled.
- Synthetic material must carry a persistent synthetic watermark and must never be mixed with real evidence without explicit classification.

## Delivery gates

### Gate A — secure pilot
Authentication/SSO, tenant and case authorization, PostgreSQL, private object storage, audit trail, upload quarantine, backups, operational monitoring.

### Gate B — analyst workflow
PDF/OCR and office parsing, email/chat ingestion, media metadata, transcript review, timeline editing with provenance, graph explorer, map layers, evidence exports.

### Gate C — enterprise
SSO/SAML, SCIM, granular retention/legal hold, customer-managed keys, audit export/SIEM, SLA, disaster recovery, penetration test, accessibility and compliance program.

## No false production claims

A code scaffold, passing unit tests or a successful GitHub Pages deployment does not establish security, compliance, chain-of-custody admissibility or operational readiness. These require independent testing and deployment controls.
