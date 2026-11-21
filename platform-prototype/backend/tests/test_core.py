import unittest

from app.core import correlate, parse_artifact, sha256_bytes

class CoreTests(unittest.TestCase):
    def test_hash_is_stable(self):
        self.assertEqual(sha256_bytes(b"trace"), sha256_bytes(b"trace"))

    def test_json_extraction(self):
        parsed = parse_artifact("sample.json", b'{"contact":"analyst@example.org","ip":"192.0.2.10"}')
        self.assertIn("analyst@example.org", [e["value"] for e in parsed.entities])
        self.assertIn("192.0.2.10", [e["value"] for e in parsed.entities])

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
