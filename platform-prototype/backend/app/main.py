"""TRACE Platform API MVP."""
from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .ai import ask_trace_ai
from .core import correlate, parse_artifact, sha256_bytes

DATA_DIR = Path(os.getenv("TRACE_DATA_DIR", "./data")).resolve()
DB_PATH = DATA_DIR / "trace.sqlite3"
MAX_UPLOAD = int(os.getenv("TRACE_MAX_UPLOAD_MB", "20")) * 1024 * 1024
ALLOWED = {".txt", ".md", ".log", ".json", ".csv", ".eml"}

app = FastAPI(title="TRACE Platform API", version="0.1.0",
              description="Evidence-first analytical workspace prototype")

class CaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=4000)

def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def init_db() -> None:
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS cases (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY, case_id TEXT NOT NULL, filename TEXT NOT NULL,
          sha256 TEXT NOT NULL, mime_type TEXT, storage_path TEXT NOT NULL,
          text_content TEXT NOT NULL, metadata_json TEXT NOT NULL,
          entities_json TEXT NOT NULL, created_at TEXT NOT NULL,
          FOREIGN KEY(case_id) REFERENCES cases(id)
        );
        """)

@app.on_event("startup")
def startup() -> None:
    init_db()

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "TRACE Platform API"}

@app.post("/cases")
def create_case(payload: CaseCreate) -> dict[str, Any]:
    case_id = str(uuid.uuid4())
    created = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute("INSERT INTO cases VALUES (?, ?, ?)", (case_id, payload.name, created))
    return {"id": case_id, "name": payload.name, "created_at": created}

@app.get("/cases")
def list_cases() -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute("SELECT id, name, created_at FROM cases ORDER BY created_at DESC").fetchall()
    return [dict(row) for row in rows]

def get_case(case_id: str) -> dict[str, Any]:
    with connect() as db:
        row = db.execute("SELECT id, name, created_at FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Case not found")
    return dict(row)

def get_artifacts(case_id: str) -> list[dict[str, Any]]:
    with connect() as db:
        rows = db.execute(
            "SELECT id, filename, sha256, mime_type, text_content, metadata_json, entities_json, created_at "
            "FROM artifacts WHERE case_id = ? ORDER BY created_at", (case_id,)
        ).fetchall()
    return [{
        "id": r["id"], "filename": r["filename"], "sha256": r["sha256"],
        "mime_type": r["mime_type"], "text": r["text_content"],
        "metadata": json.loads(r["metadata_json"]),
        "entities": json.loads(r["entities_json"]), "created_at": r["created_at"],
    } for r in rows]

@app.post("/cases/{case_id}/artifacts")
async def upload_artifact(case_id: str, file: UploadFile = File(...)) -> dict[str, Any]:
    get_case(case_id)
    filename = Path(file.filename or "upload.txt").name
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(415, f"Unsupported format. Allowed: {', '.join(sorted(ALLOWED))}")
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "File exceeds configured upload limit")
    try:
        parsed = parse_artifact(filename, data)
    except (UnicodeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(422, f"Could not parse file: {exc}") from exc
    artifact_id = str(uuid.uuid4())
    digest = sha256_bytes(data)
    created = datetime.now(timezone.utc).isoformat()
    case_dir = DATA_DIR / "originals" / case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    stored = case_dir / f"{artifact_id}{suffix}"
    stored.write_bytes(data)
    with connect() as db:
        db.execute(
            "INSERT INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (artifact_id, case_id, filename, digest, file.content_type, str(stored),
             parsed.text, json.dumps(parsed.metadata, ensure_ascii=False),
             json.dumps(parsed.entities, ensure_ascii=False), created),
        )
    return {
        "id": artifact_id, "filename": filename, "sha256": digest,
        "metadata": parsed.metadata, "entities": parsed.entities,
        "notice": "Original file stored separately. Extracted text is a derived representation.",
    }

@app.get("/cases/{case_id}/artifacts")
def list_artifacts(case_id: str) -> list[dict[str, Any]]:
    get_case(case_id)
    return [{k: a[k] for k in ("id", "filename", "sha256", "mime_type", "metadata", "created_at")}
            for a in get_artifacts(case_id)]

@app.get("/cases/{case_id}/analysis")
def analyze_case(case_id: str) -> dict[str, Any]:
    get_case(case_id)
    artifacts = get_artifacts(case_id)
    return correlate(artifacts)

@app.post("/cases/{case_id}/ask")
def ask(case_id: str, payload: AskRequest) -> dict[str, Any]:
    case = get_case(case_id)
    artifacts = get_artifacts(case_id)
    if not artifacts:
        raise HTTPException(400, "Upload evidence before asking TRACE AI")
    packet = {
        "case": {"id": case["id"], "name": case["name"]},
        "artifacts": [{
            "id": a["id"], "filename": a["filename"], "sha256": a["sha256"],
            "metadata": a["metadata"], "text_excerpt": a["text"][:12000],
            "entities": a["entities"],
        } for a in artifacts],
        "deterministic_correlations": correlate(artifacts),
    }
    try:
        return ask_trace_ai(payload.question, packet)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, f"AI provider error: {type(exc).__name__}") from exc
