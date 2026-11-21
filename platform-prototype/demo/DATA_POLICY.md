# TRACE demo evidence and provenance policy

## Two layers must remain visibly separate

1. **Public case facts** — facts stated in the cited public source, with a source URL and (when available) page/paragraph reference.
2. **Demonstration reconstructions** — synthetic chat exports, email headers, device logs, IP address records, map pins, screenshots, file metadata and illustrative photographs created only to demonstrate platform workflows.

Never merge these layers without a visible provenance label. A reconstruction must carry:
- `record_status: "RECONSTRUCTION"`
- `is_original_evidence: false`
- a short note explaining which fields are synthetic
- a link to the public source facts that informed the scenario

## Six public case studies

The catalogue in `cases.json` contains six real, publicly documented cases and links to primary or official sources where available.

The demo should not fabricate private messages, IP addresses, precise street addresses, geolocation, witness identities or timestamps and then imply that they came from an original case file. When an authentic source is not public, use a clearly marked synthetic analogue or show "not publicly available".

## Visual materials

Use non-graphic public images of locations, buildings, maps, aircraft, documents and objects where the rights and source are clear. Do not add graphic images of victims or crime-scene injuries. Do not create fake "evidence photographs" that could be mistaken for original exhibits.

## Analytical rules

- A shared IP address is not proof of a shared person or physical location.
- A geolocation estimate must show its source, uncertainty and method.
- Separate observed fact, algorithmic detection, hypothesis and open question.
- Preserve original files and hashes; derived views must point back to their source.
- Never let the language model invent missing evidence or citations.
