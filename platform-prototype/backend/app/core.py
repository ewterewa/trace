"""Deterministic ingestion, extraction and evidence-linked correlation."""
from __future__ import annotations

import csv
import hashlib
import io
import ipaddress
import json
import re
from dataclasses import dataclass
from email import policy
from email.parser import BytesParser
from pathlib import Path
from typing import Any

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)")
DATE_RE = re.compile(r"\b(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})(?:[ T]\d{2}:\d{2}(?::\d{2})?)?\b")

@dataclass
class ParsedArtifact:
    text: str
    metadata: dict[str, Any]
    entities: list[dict[str, Any]]

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def _entities(text: str) -> list[dict[str, Any]]:
    found: dict[tuple[str, str], dict[str, Any]] = {}

    def add(kind: str, value: str, offset: int) -> None:
        raw = value.strip()
        normalized = raw.lower()
        key = (kind, normalized)
        line = text.count("\n", 0, offset) + 1
        if key not in found:
            found[key] = {"type": kind, "value": raw, "normalized": normalized, "source_lines": []}
        if line not in found[key]["source_lines"]:
            found[key]["source_lines"].append(line)

    for match in EMAIL_RE.finditer(text):
        add("email", match.group(), match.start())
        domain = match.group().rsplit("@", 1)[-1]
        add("domain", domain, match.start())
    for match in IP_RE.finditer(text):
        value = match.group()
        try:
            ipaddress.ip_address(value)
            add("ip", value, match.start())
        except ValueError:
            pass
    for match in DATE_RE.finditer(text):
        add("date", match.group(), match.start())
    for match in PHONE_RE.finditer(text):
        value = match.group()
        if IP_RE.fullmatch(value) or DATE_RE.fullmatch(value):
            continue
        digits = re.sub(r"\D", "", value)
        if 8 <= len(digits) <= 15:
            add("phone", value, match.start())
    return list(found.values())

def parse_artifact(filename: str, data: bytes) -> ParsedArtifact:
    suffix = Path(filename).suffix.lower()
    metadata: dict[str, Any] = {"format": suffix.lstrip(".") or "unknown"}
    if suffix == ".json":
        parsed = json.loads(data.decode("utf-8-sig"))
        text = json.dumps(parsed, ensure_ascii=False, indent=2)
        metadata["parser"] = "json"
    elif suffix == ".csv":
        decoded = data.decode("utf-8-sig")
        rows = list(csv.reader(io.StringIO(decoded)))
        text = "\n".join(" | ".join(row) for row in rows)
        metadata.update({"parser": "csv", "row_count": len(rows)})
    elif suffix == ".eml":
        message = BytesParser(policy=policy.default).parsebytes(data)
        body_parts = []
        if message.is_multipart():
            for part in message.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        body_parts.append(part.get_content())
                    except (LookupError, UnicodeDecodeError):
                        continue
        else:
            try:
                body_parts.append(message.get_content())
            except (LookupError, UnicodeDecodeError):
                body_parts.append(data.decode("utf-8", errors="replace"))
        headers = "\n".join(f"{key}: {value}" for key, value in message.items())
        text = headers + "\n\n" + "\n".join(str(p) for p in body_parts)
        metadata.update({"parser": "email", "subject": str(message.get("subject", "")),
                         "from": str(message.get("from", "")), "to": str(message.get("to", "")),
                         "date": str(message.get("date", ""))})
    elif suffix in {".txt", ".md", ".log"}:
        text = data.decode("utf-8-sig", errors="replace")
        metadata["parser"] = "plain_text"
    elif suffix in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".m4a", ".ogg", ".mp4", ".mov"}:
        text = ""
        image_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
        audio_ext = {".mp3", ".wav", ".m4a", ".ogg"}
        category = "image" if suffix in image_ext else "audio" if suffix in audio_ext else "video"
        metadata.update({"parser": "binary-media", "media_category": category, "analysis_status": "original_preserved_not_transcribed"})
    else:
        raise ValueError("Unsupported file type. Supported text, structured documents and common media.")
    return ParsedArtifact(text=text, metadata=metadata, entities=_entities(text))

def correlate(artifacts: list[dict[str, Any]]) -> dict[str, Any]:
    """Only exact normalized matches are linked; each occurrence retains source lines."""
    index: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for artifact in artifacts:
        for entity in artifact.get("entities", []):
            key = (entity["type"], entity["normalized"])
            index.setdefault(key, []).append({
                "artifact_id": artifact["id"],
                "filename": artifact["filename"],
                "type": entity["type"],
                "value": entity["value"],
                "source_lines": entity.get("source_lines", []),
            })
    links = []
    for (kind, normalized), occurrences in index.items():
        unique = {item["artifact_id"] for item in occurrences}
        if len(unique) > 1:
            links.append({
                "entity_type": kind,
                "matched_value": normalized,
                "artifact_ids": sorted(unique),
                "occurrences": occurrences,
                "match_rule": "exact_normalized_value",
                "interpretation": "shared_value_not_proof_of_shared_identity",
            })
    return {
        "artifact_count": len(artifacts),
        "entity_count": sum(len(a.get("entities", [])) for a in artifacts),
        "links": links,
        "limitations": [
            "A shared value is a lead for review, not proof that two records concern the same person or event.",
            "IP addresses are not geolocated and do not establish a person's physical location.",
            "Only supported file formats and exact matches are processed in this MVP.",
        ],
    }
