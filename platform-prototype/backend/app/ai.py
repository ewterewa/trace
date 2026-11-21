"""Provider-neutral AI layer. The model interprets evidence; it does not create evidence."""
from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI

SYSTEM_PROMPT = """You are TRACE AI, an analytical assistant for reviewing user-provided digital materials.
Use only the evidence packet supplied in this request. Never claim to have inspected files or facts not included.
Separate directly supported observations from hypotheses and questions for further review.
Every claim must cite one or more artifact IDs present in the packet. If no artifact supports a claim, do not state it as a fact.
A shared email, phone number, IP address, or other identifier is not proof of common identity, ownership, intent, or physical location.
Do not infer exact geolocation from an IP address. Preserve uncertainty and mention conflicting or missing data.
Return JSON with keys: summary (string), claims (array of objects with type: fact|hypothesis|question, text (string), source_ids (array of artifact IDs), confidence (low|medium|high)), next_checks (array of strings).
Do not provide instructions for unauthorized access, credential theft, malware, evasion, or surveillance."""


def _client_and_model() -> tuple[OpenAI, str, str]:
    """Use OpenAI directly or any self-hosted OpenAI-compatible inference server.

    A self-hosted server can run without a commercial API key, but it still needs
    an inference endpoint and compute. Never expose its credentials in the frontend.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    base_url = os.getenv("TRACE_AI_BASE_URL", "").strip()
    model = os.getenv("TRACE_AI_MODEL", "gpt-4.1-mini").strip()

    if base_url:
        # For local/self-hosted OpenAI-compatible servers, a placeholder key is
        # accepted by the SDK when the server does not require authentication.
        client = OpenAI(api_key=api_key or "local-inference", base_url=base_url)
        provider = "self-hosted-compatible" if not api_key else "compatible-endpoint"
        return client, model, provider

    if api_key:
        return OpenAI(api_key=api_key), model, "OpenAI"

    raise RuntimeError(
        "TRACE AI is not configured. Set OPENAI_API_KEY for OpenAI, or "
        "TRACE_AI_BASE_URL and TRACE_AI_MODEL for a self-hosted OpenAI-compatible model."
    )


def ask_trace_ai(question: str, evidence_packet: dict[str, Any]) -> dict[str, Any]:
    client, model, provider = _client_and_model()
    response = client.chat.completions.create(
        model=model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps({
                "question": question,
                "evidence_packet": evidence_packet,
            }, ensure_ascii=False)},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    result = json.loads(raw)
    allowed_ids = {a["id"] for a in evidence_packet.get("artifacts", [])}
    claims = []
    for claim in result.get("claims", []):
        cited = [sid for sid in claim.get("source_ids", []) if sid in allowed_ids]
        kind = claim.get("type", "hypothesis")
        if kind not in {"fact", "hypothesis", "question"}:
            kind = "hypothesis"
        if kind == "fact" and not cited:
            kind = "hypothesis"
        claims.append({
            "type": kind,
            "text": str(claim.get("text", "")),
            "source_ids": cited,
            "confidence": claim.get("confidence", "low") if claim.get("confidence") in {"low", "medium", "high"} else "low",
        })
    return {
        "summary": str(result.get("summary", "")),
        "claims": claims,
        "next_checks": [str(x) for x in result.get("next_checks", [])],
        "model": f"{provider} · {model}",
        "notice": "AI-generated interpretation. Verify every claim against the cited original material.",
    }
