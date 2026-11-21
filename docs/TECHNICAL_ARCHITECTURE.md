# TRACE — Technical Architecture

## Current frontend
React + TypeScript, Vite, Three.js and static synthetic data for one integrated demonstration case.

## Proposed production architecture
- Frontend: React + TypeScript.
- API: Python + FastAPI.
- Relational store: PostgreSQL for cases, artifacts, provenance and audit events.
- Optional graph store: Neo4j or a PostgreSQL graph model after query needs are validated.
- Object storage: immutable originals and separately stored derivatives.
- Isolated processing workers for EML, CSV, JSON, PDF, image metadata and PCAP/PCAPNG.

## Evidence ingestion pipeline
1. Receive file into quarantine.
2. Compute SHA-256 from original bytes.
3. Persist immutable original and ingestion event.
4. Parse in a constrained worker.
5. Store derived records with parser version and source offsets.
6. Surface validation warnings for analyst review.

## Core entities
Case, Artifact, ArtifactDerivative, Person, EmailAddress, PhoneNumber, Device, IPAddress, Organization, Message, Event, Location, Relationship, Finding, ProcessingRun, AuditEvent.

## Trust model
Every relationship or finding needs provenance, method, limitations and analyst review state. Automated extraction is a lead, not proof.