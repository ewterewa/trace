# TRACE

**Digital Investigation & Intelligence Platform**

TRACE is an evidence-centered investigation workspace. This repository contains the first integrated front-end MVP: a synthetic case with an interactive 3D globe, evidence register and inspector, communication records, entity relationship view, and chronology.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

## GitHub Pages

The Vite base path is configured for `/trace/`. To publish:

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and deploys the site after pushes to `main`.

Expected site address: https://ewterewa.github.io/trace/

## Current MVP

- Case overview and investigation metrics
- Interactive Three.js globe (illustrative markers only)
- Evidence register with search and artifact inspector
- Synthetic communication records and participants
- Entity relationship visualization
- Chronology with source timestamps
- Responsive dark editorial interface with powder-pink accents

## Integrity and limitations

All included case data is synthetic. Hashes are demonstration placeholders, not computed digests. Geographic markers are decorative and do not represent evidence-backed locations. This is a front-end prototype: file ingestion, persistent storage, authentication, server-side parsing, cryptographic verification, and production analytical processing are not implemented yet.

## Product principles

- Preserve original evidence as immutable data in a production implementation.
- Keep provenance and source references attached to derived records.
- Distinguish facts, detections, and hypotheses.
- Do not infer identity or precise location from weak indicators.
- Make uncertainty visible to the analyst.

## Stack

React, TypeScript, Vite, Three.js, and Lucide icons.

See `docs/` for product requirements, architecture, and design guidelines.
