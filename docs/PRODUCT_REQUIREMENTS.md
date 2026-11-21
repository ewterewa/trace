# TRACE — Product Requirements

## Objective
An integrated digital investigation workspace where analysts inspect source artifacts, review communications, explore relationships and reconstruct chronology while preserving traceability to evidence.

## First milestone
- Case overview and status metrics.
- Evidence register and artifact inspector.
- Communication records linked to source artifacts.
- Entity relationship visualization.
- Chronology with source timestamps and timezone labels.
- Responsive interface and accessible controls.

## Production requirements
- Original evidence must be immutable.
- Every derived record must retain its source artifact and source location.
- Hashes must be computed from original bytes, never hardcoded.
- Facts, detections and hypotheses must be labeled separately.
- Geographic claims must include source and precision; IP-derived geography is not exact physical location.
- Synthetic data must be clearly labeled.

## Not implemented in this frontend MVP
Authentication, permissions, secure evidence storage, actual file parsing, backend APIs, database persistence, and production forensic validation.