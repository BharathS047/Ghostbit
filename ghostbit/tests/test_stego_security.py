"""
Tests for the security-relevant properties added to the steganography core:

  * KeySeededPRNG.sample_indices — unbiased, distinct, deterministic selection.
  * KeySeededPRNG.get_int — uniform (no modulo bias).
  * Ciphertext is embedded at shared-secret-seeded positions, i.e. spread across
    the carrier rather than written into a detectable contiguous prefix.
"""

import io
import numpy as np
import cv2
import pytest

from ghostbit.core.prng import KeySeededPRNG
from ghostbit.core.crypto import KeyPair
from ghostbit.stego.image_stego import embed_image, extract_image, detect_edge_pixels


class TestSampleIndices:
    def test_distinct_and_in_range(self):
        idx = KeySeededPRNG(b"seed").sample_indices(1000, 50)
        assert len(idx) == 50
        assert len(set(idx)) == 50               # all distinct
        assert all(0 <= i < 1000 for i in idx)   # all in range

    def test_deterministic_per_seed(self):
        a = KeySeededPRNG(b"same").sample_indices(500, 40)
        b = KeySeededPRNG(b"same").sample_indices(500, 40)
        assert a == b

    def test_differs_by_seed(self):
        a = KeySeededPRNG(b"seed-a").sample_indices(500, 40)
        b = KeySeededPRNG(b"seed-b").sample_indices(500, 40)
        assert a != b

    def test_full_selection_is_a_permutation(self):
        idx = KeySeededPRNG(b"s").sample_indices(64, 64)
        assert sorted(idx) == list(range(64))

    def test_over_select_raises(self):
        with pytest.raises(ValueError):
            KeySeededPRNG(b"s").sample_indices(5, 6)


class TestGetIntUnbiased:
    def test_in_range(self):
        prng = KeySeededPRNG(b"x")
        assert all(0 <= prng.get_int(7) < 7 for _ in range(2000))

    def test_rough_uniformity(self):
        # Deterministic (seeded), so this is a fixed, non-flaky check.
        prng = KeySeededPRNG(b"uniformity")
        buckets, n = [0] * 5, 5000
        for _ in range(n):
            buckets[prng.get_int(5)] += 1
        for c in buckets:
            assert abs(c - n / 5) < (n / 5) * 0.2   # within 20% of expected


def _make_png(arr: np.ndarray) -> bytes:
    ok, data = cv2.imencode(".png", arr)
    assert ok
    return data.tobytes()


class TestPositionSecrecy:
    def test_ciphertext_is_spread_not_a_prefix(self):
        # Random cover so LSB diffs reflect embedding, not encoder artefacts (PNG is lossless).
        rng = np.random.RandomState(0)
        cover_arr = rng.randint(0, 256, size=(400, 400, 3), dtype=np.uint8)
        cover = _make_png(cover_arr)

        keypair = KeyPair.generate()
        message = "Position secrecy check " * 10
        stego, _ = embed_image(cover, message, keypair.public_pem())

        cov = cv2.imdecode(np.frombuffer(cover, np.uint8), cv2.IMREAD_COLOR).reshape(-1, 3)
        stg = cv2.imdecode(np.frombuffer(stego, np.uint8), cv2.IMREAD_COLOR).reshape(-1, 3)
        changed = np.nonzero(((cov ^ stg) & 1).any(axis=1))[0]

        assert changed.size > 0
        # Bits land far beyond a contiguous prefix -> positions are shuffled.
        assert int(changed.max()) > changed.size * 4
        assert not np.array_equal(changed, np.arange(changed.size))

    def test_roundtrip_still_correct(self):
        rng = np.random.RandomState(1)
        cover = _make_png(rng.randint(0, 256, size=(256, 256, 3), dtype=np.uint8))
        keypair = KeyPair.generate()
        message = "round-trip with shuffled positions"
        stego, _ = embed_image(cover, message, keypair.public_pem())
        out, valid, _ = extract_image(stego, keypair.private_pem())
        assert out == message
        assert valid is True


def _mixed_cover() -> bytes:
    """A cover with a smooth area plus a textured/edged area."""
    img = np.full((300, 300, 3), 120, dtype=np.uint8)          # smooth background
    rng = np.random.RandomState(3)
    img[20:140, 20:280] = rng.randint(0, 256, (120, 260, 3), dtype=np.uint8)  # texture
    cv2.rectangle(img, (30, 160), (270, 270), (255, 255, 255), 2)
    cv2.circle(img, (150, 215), 40, (0, 0, 0), 2)
    return _make_png(img)


class TestEdgeAdaptive:
    def test_embedding_only_touches_edge_pixels(self):
        cover = _mixed_cover()
        keypair = KeyPair.generate()
        message = "edge-adaptive placement keeps bits in busy regions"

        stego, _ = embed_image(cover, message, keypair.public_pem())
        out, valid, _ = extract_image(stego, keypair.private_pem())
        assert out == message and valid is True

        cov = cv2.imdecode(np.frombuffer(cover, np.uint8), cv2.IMREAD_COLOR)
        stg = cv2.imdecode(np.frombuffer(stego, np.uint8), cv2.IMREAD_COLOR)
        changed = np.flatnonzero(((cov ^ stg).reshape(-1, 3) & 1).any(axis=1))
        edge_set = set(
            int(i) for i in np.flatnonzero(detect_edge_pixels(cov, bits_per_channel=1).reshape(-1))
        )

        assert changed.size > 0
        # Every modified pixel is an edge pixel -> embedding is content-adaptive.
        assert all(int(c) in edge_set for c in changed)

    def test_edge_map_invariant_under_embedding(self):
        # The round-trip only works because the edge map is unchanged by embedding.
        cover = _mixed_cover()
        keypair = KeyPair.generate()
        stego, _ = embed_image(cover, "x" * 60, keypair.public_pem())

        cov = cv2.imdecode(np.frombuffer(cover, np.uint8), cv2.IMREAD_COLOR)
        stg = cv2.imdecode(np.frombuffer(stego, np.uint8), cv2.IMREAD_COLOR)
        assert np.array_equal(
            detect_edge_pixels(cov, bits_per_channel=1),
            detect_edge_pixels(stg, bits_per_channel=1),
        )
