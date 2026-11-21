#!/usr/bin/env bash
set -euo pipefail
ROOT="${PWD}"
mkdir -p /tmp/trace-platform
if ! curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
  (cd "$ROOT/platform-prototype/backend" && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/trace-platform/api.log 2>&1 &)
fi
if ! curl -fsS http://127.0.0.1:5173 >/dev/null 2>&1; then
  (cd "$ROOT/platform-prototype/frontend" && nohup npm run dev -- --host 0.0.0.0 > /tmp/trace-platform/frontend.log 2>&1 &)
fi
