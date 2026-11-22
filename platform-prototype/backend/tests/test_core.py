import unittest

from app.core import correlate, parse_artifact, sha256_bytes

class CoreTests(unittest.TestCase):
    def test_hash_is_stable(self):
        self.assertEqual(sha256_bytes(b"trace"), sha256_bytes(b"trace"))

    def test_json_extraction(self):
        parsed = parse_artifact("sample.json", b'{"contact":"analyst@example.org","ip":"192.0.2.10"}')
        self.assertIn("analyst@example.org", [e["value"] for e in parsed.entities])
        self.assertIn("192.0.2.10", [e["value"] for e in parsed.entities])

    def test_source_line_is_preserved_and_ip_is_not_misread_as_phone(self):
        parsed = parse_artifact("lines.txt", b"header\ncontact: person@example.org\naddress: 192.0.2.44")
        email = next(e for e in parsed.entities if e["type"] == "email")
        self.assertEqual(email["source_lines"], [2])
        self.assertFalse(any(e["type"] == "phone" and e["value"] == "192.0.2.44" for e in parsed.entities))

    def test_media_original_is_classified_without_fake_transcription(self):
        parsed = parse_artifact("recording.wav", b"synthetic binary placeholder")
        self.assertEqual(parsed.metadata["media_category"], "audio")
        self.assertEqual(parsed.metadata["analysis_status"], "original_preserved_not_transcribed")
        self.assertEqual(parsed.text, "")

    def test_gpx_parser_preserves_source_coordinates_and_timestamps(self):
        payload = b"""<?xml version="1.0"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="test">
          <trk><name>Field route</name><trkseg>
            <trkpt lat="52.5200" lon="13.4050"><ele>34.2</ele><time>2026-11-22T10:00:00Z</time></trkpt>
            <trkpt lat="52.5210" lon="13.4060"><time>2026-11-22T10:01:00Z</time></trkpt>
          </trkseg></trk>
        </gpx>"""
        parsed = parse_artifact("route.gpx", payload)
        self.assertEqual(parsed.metadata["parser"], "gpx")
        self.assertEqual(parsed.metadata["point_count"], 2)
        points = parsed.metadata["geo_tracks"][0]["points"]
        self.assertEqual(points[0]["lat"], 52.52)
        self.assertEqual(points[0]["lon"], 13.405)
        self.assertEqual(points[0]["time"], "2026-11-22T10:00:00Z")
        self.assertEqual(points[1]["point_index"], 1)
        self.assertEqual(parsed.text, "")

    def test_gpx_parser_rejects_invalid_coordinates(self):
        payload = b'<gpx><trk><trkseg><trkpt lat="95" lon="13"/></trkseg></trk></gpx>'
        with self.assertRaises(ValueError):
            parse_artifact("invalid.gpx", payload)

    def test_exact_match_links_sources_without_identity_claim(self):
        artifacts = [
            {"id": "a1", "filename": "one.txt", "entities": [{"type":"email","value":"x@y.org","normalized":"x@y.org"}]},
            {"id": "a2", "filename": "two.txt", "entities": [{"type":"email","value":"x@y.org","normalized":"x@y.org"}]},
        ]
        result = correlate(artifacts)
        self.assertEqual(len(result["links"]), 1)
        self.assertEqual(result["links"][0]["interpretation"], "shared_value_not_proof_of_shared_identity")

if __name__ == "__main__":
    unittest.main()
