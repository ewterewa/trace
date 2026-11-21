# TRACE — presentation website

This repository hosts the public-facing presentation shell for the TRACE project.

It is intentionally separate from the functional TRACE Intelligence Platform. This website explains the concept, design principles and proposed architecture; it does not ingest evidence or perform investigations.

## Stack
- React + TypeScript + Vite
- Three.js for the interactive 3D globe
- GitHub Pages deployment through GitHub Actions

## Local development
```bash
npm install
npm run dev
npm run build
```

## GitHub Pages
In repository Settings → Pages, set **Build and deployment → Source** to **GitHub Actions**. The workflow in `.github/workflows/deploy.yml` builds the Vite site and deploys the `dist` directory.

Expected URL: https://ewterewa.github.io/trace/

## Separate product
The working platform should live in a separate repository (planned: `trace-platform`). This presentation site should link to it when the platform has a published demo URL.
