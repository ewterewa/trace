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
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from .ai import ask_trace_ai
from .core import correlate, parse_artifact, sha256_bytes

load_dotenv()

DATA_DIR = Path(os.getenv("TRACE_DATA_DIR", "./data")).resolve()
DB_PATH = DATA_DIR / "trace.sqlite3"
MAX_UPLOAD = int(os.getenv("TRACE_MAX_UPLOAD_MB", "20")) * 1024 * 1024
ALLOWED = {".txt", ".md", ".log", ".json", ".csv", ".eml"}

app = FastAPI(title="TRACE Platform API", version="0.1.0",
              description="Evidence-first analytical workspace prototype")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_origin_regex=r"https://.*\.app\.github\.dev",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class CaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

class NotePayload(BaseModel):
    body: str = Field(min_length=1, max_length=12000)

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


def init_enterprise_db() -> None:
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS audit_events (
          id TEXT PRIMARY KEY, case_id TEXT NOT NULL, actor TEXT NOT NULL,
          action TEXT NOT NULL, target_id TEXT, details_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS case_notes (
          id TEXT PRIMARY KEY, case_id TEXT NOT NULL, body TEXT NOT NULL,
          author TEXT NOT NULL, created_at TEXT NOT NULL
        );
        """)

@app.on_event("startup")
def startup() -> None:
    init_db()
    init_enterprise_db()

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


@app.get("/cases/{case_id}/artifacts/{artifact_id}/download")
def download_artifact(case_id: str, artifact_id: str):
    from fastapi.responses import FileResponse
    get_case(case_id)
    with connect() as db:
        row = db.execute("SELECT filename, storage_path FROM artifacts WHERE id=? AND case_id=?", (artifact_id, case_id)).fetchone()
    if not row:
        raise HTTPException(404, "Artifact not found")
    path = Path(row["storage_path"]).resolve()
    if not path.is_relative_to(DATA_DIR.resolve()) or not path.is_file():
        raise HTTPException(404, "Original file unavailable")
    return FileResponse(path, filename=row["filename"], media_type="application/octet-stream")


@app.get("/cases/{case_id}/timeline")
def case_timeline(case_id: str):
    get_case(case_id)
    items = []
    for artifact in get_artifacts(case_id):
        for entity in artifact.get("entities", []):
            if entity.get("type") == "date":
                for line in entity.get("source_lines", []):
                    items.append({
                        "date_text": entity["value"], "artifact_id": artifact["id"],
                        "filename": artifact["filename"], "source_line": line,
                        "classification": "date-mentioned-in-source", "precision": "as-written"
                    })
    return {"items": items, "notice": "Extracted date mentions are not verified event times. Review the cited source line before adding an event to the official chronology."}


@app.get("/cases/{case_id}/graph")
def case_graph(case_id: str):
    get_case(case_id)
    artifacts = get_artifacts(case_id)
    nodes = {}
    edges = []
    for artifact in artifacts:
        artifact_node = "artifact:" + artifact["id"]
        nodes[artifact_node] = {"id": artifact_node, "type": "artifact", "label": artifact["filename"], "artifact_id": artifact["id"]}
        for entity in artifact.get("entities", []):
            key = entity["type"] + ":" + entity["normalized"]
            nodes.setdefault(key, {"id": key, "type": entity["type"], "label": entity["value"]})
            edges.append({
                "source": key, "target": artifact_node, "relation": "mentioned_in",
                "source_artifact_id": artifact["id"], "source_lines": entity.get("source_lines", []),
                "confidence": "exact_extraction"
            })
    return {"nodes": list(nodes.values()), "edges": edges, "notice": "An edge means only that an extracted value occurs in a source. It does not prove identity, contact, causation or physical presence."}


@app.get("/cases/{case_id}/audit")
def case_audit(case_id: str):
    get_case(case_id)
    with connect() as db:
        rows = db.execute("SELECT id, actor, action, target_id, details_json, created_at FROM audit_events WHERE case_id=? ORDER BY created_at DESC LIMIT 500", (case_id,)).fetchall()
    return [{"id": row["id"], "actor": row["actor"], "action": row["action"], "target_id": row["target_id"], "details": json.loads(row["details_json"]), "created_at": row["created_at"]} for row in rows]


@app.get("/cases/{case_id}/notes")
def list_notes(case_id: str):
    get_case(case_id)
    with connect() as db:
        rows = db.execute("SELECT id, body, author, created_at FROM case_notes WHERE case_id=? ORDER BY created_at DESC", (case_id,)).fetchall()
    return [dict(row) for row in rows]


@app.post("/cases/{case_id}/notes")
def add_note(case_id: str, payload: NotePayload):
    get_case(case_id)
    note_id = str(uuid.uuid4())
    created = datetime.now(timezone.utc).isoformat()
    with connect() as db:
        db.execute("INSERT INTO case_notes VALUES (?,?,?,?,?)", (note_id, case_id, payload.body, "local-operator", created))
        db.execute("INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)", (str(uuid.uuid4()), case_id, "local-operator", "note.created", note_id, json.dumps({"length": len(payload.body)}), created))
    return {"id": note_id, "body": payload.body, "author": "local-operator", "created_at": created}
