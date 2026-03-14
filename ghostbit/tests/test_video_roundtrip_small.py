"""
Tests for video steganography using MP4 atom embedding.
"""

import pytest
import struct
import numpy as np
import cv2
import tempfile
import os

from ghostbit.core.crypto import KeyPair
from ghostbit.stego.video_stego import (
    VideoSteganography, embed_video, extract_video,
    analyze_video_capacity, validate_mp4,
    _read_atom_header, _scan_atoms, _find_ghostbit_atom,
    _create_uuid_atom, _remove_ghostbit_atom, GHOSTBIT_UUID
)


def create_test_mp4(
    width: int = 128,
    height: int = 128,
    num_frames: int = 30,
    fps: float = 10.0
) -> bytes:
    """Create a minimal test MP4 video file."""
    frames = []
    for i in range(num_frames):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        offset = int(np.sin(i * 0.3) * 20)
        cv2.rectangle(
            frame,
            (40 + offset, 40),
            (88 + offset, 88),
            (0, 255, 0),
            -1
        )
        frames.append(frame)

    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
        temp_path = f.name

    try:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
        for frame in frames:
            out.write(frame)
        out.release()

        with open(temp_path, 'rb') as f:
            return f.read()
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


class TestMP4AtomParsing:
    """Tests for MP4 atom reading and scanning."""

    def test_validate_mp4(self):
        """Test that a real MP4 file passes validation."""
        mp4_data = create_test_mp4()
        assert validate_mp4(mp4_data) is True

    def test_validate_mp4_rejects_random(self):
        """Test that random bytes fail validation."""
        assert validate_mp4(b'random data here') is False

    def test_validate_mp4_rejects_empty(self):
        """Test that empty data fails validation."""
        assert validate_mp4(b'') is False

    def test_scan_atoms(self):
        """Test scanning top-level atoms in an MP4 file."""
        mp4_data = create_test_mp4()
        atoms = _scan_atoms(mp4_data)

        assert len(atoms) > 0
        atom_types = [a[2] for a in atoms]
        # MP4 must have at least ftyp
        assert 'ftyp' in atom_types

    def test_read_atom_header(self):
        """Test reading individual atom headers."""
        mp4_data = create_test_mp4()
        size, atom_type, header_size = _read_atom_header(mp4_data, 0)

        assert atom_type == 'ftyp'
        assert header_size == 8
        assert size > 0


class TestUUIDAtom:
    """Tests for GhostBit uuid atom creation and detection."""

    def test_create_uuid_atom(self):
        """Test creating a uuid atom."""
        payload = b'test payload data'
        atom = _create_uuid_atom(payload)

        # Check size
        expected_size = 8 + 16 + len(payload)
        actual_size = struct.unpack('>I', atom[:4])[0]
        assert actual_size == expected_size

        # Check type
        assert atom[4:8] == b'uuid'

        # Check UUID
        assert atom[8:24] == GHOSTBIT_UUID

        # Check payload
        assert atom[24:] == payload

    def test_find_ghostbit_atom_not_present(self):
        """Test that clean MP4 has no GhostBit atom."""
        mp4_data = create_test_mp4()
        offset, size = _find_ghostbit_atom(mp4_data)
        assert offset == -1
        assert size == 0

    def test_find_ghostbit_atom_present(self):
        """Test finding GhostBit atom after appending it."""
        mp4_data = create_test_mp4()
        payload = b'hidden data here'
        atom = _create_uuid_atom(payload)

        stego_data = mp4_data + atom
        offset, size = _find_ghostbit_atom(stego_data)

        assert offset > 0
        assert size == len(payload)
        assert stego_data[offset:offset + size] == payload

    def test_remove_ghostbit_atom(self):
        """Test removing GhostBit atom from MP4."""
        mp4_data = create_test_mp4()
        payload = b'to be removed'
        atom = _create_uuid_atom(payload)

        stego_data = mp4_data + atom
        assert _find_ghostbit_atom(stego_data)[0] != -1

        clean = _remove_ghostbit_atom(stego_data)
        assert _find_ghostbit_atom(clean)[0] == -1

    def test_remove_preserves_other_atoms(self):
        """Test that removing GhostBit atom preserves other atoms."""
        mp4_data = create_test_mp4()
        original_atoms = _scan_atoms(mp4_data)

        # Add then remove
        atom = _create_uuid_atom(b'test')
        stego = mp4_data + atom
        clean = _remove_ghostbit_atom(stego)

        clean_atoms = _scan_atoms(clean)
        assert len(clean_atoms) == len(original_atoms)


class TestVideoSteganography:
    """Tests for full video steganography embed/extract."""

    def test_embed_extract_short_message(self):
        """Test embedding and extracting a short message."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()
        message = "Hi!"

        stego = VideoSteganography()
        stego_data, metadata = stego.embed(cover, message, keypair.public_pem())

        assert metadata['method'] == 'MP4 atom embedding'
        assert metadata['output_format'] == 'MP4 (standard, playable)'
        assert len(stego_data) > len(cover)

        extracted, valid, ext_meta = stego.extract(stego_data, keypair.private_pem())

        assert extracted == message
        assert valid is True

    def test_embed_extract_long_message(self):
        """Test embedding a longer message."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()
        message = "This is a much longer secret message! " * 50

        stego = VideoSteganography()
        stego_data, metadata = stego.embed(cover, message, keypair.public_pem())

        extracted, valid, _ = stego.extract(stego_data, keypair.private_pem())
        assert extracted == message
        assert valid is True

    def test_embed_extract_unicode(self):
        """Test embedding unicode characters."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()
        message = "Secret: Hello World! 12345"

        stego = VideoSteganography()
        stego_data, metadata = stego.embed(cover, message, keypair.public_pem())

        extracted, valid, _ = stego.extract(stego_data, keypair.private_pem())
        assert extracted == message
        assert valid is True

    def test_wrong_key_fails(self):
        """Test that wrong private key fails extraction."""
        keypair1 = KeyPair.generate()
        keypair2 = KeyPair.generate()
        cover = create_test_mp4()
        message = "Secret"

        stego = VideoSteganography()
        stego_data, _ = stego.embed(cover, message, keypair1.public_pem())

        with pytest.raises(Exception):
            stego.extract(stego_data, keypair2.private_pem())

    def test_stego_mp4_is_valid(self):
        """Test that stego output is still a valid MP4."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()

        stego = VideoSteganography()
        stego_data, _ = stego.embed(cover, "test", keypair.public_pem())

        assert validate_mp4(stego_data)
        # ftyp should still be the first atom
        atoms = _scan_atoms(stego_data)
        assert atoms[0][2] == 'ftyp'

    def test_no_hidden_message_in_clean_mp4(self):
        """Test that extraction from clean MP4 gives clear error."""
        keypair = KeyPair.generate()
        clean = create_test_mp4()

        stego = VideoSteganography()
        with pytest.raises(ValueError, match="No hidden message found"):
            stego.extract(clean, keypair.private_pem())

    def test_re_embed_replaces_old_payload(self):
        """Test that embedding twice replaces the first payload."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()

        stego = VideoSteganography()
        stego_data1, _ = stego.embed(cover, "First message", keypair.public_pem())
        stego_data2, _ = stego.embed(stego_data1, "Second message", keypair.public_pem())

        extracted, valid, _ = stego.extract(stego_data2, keypair.private_pem())
        assert extracted == "Second message"
        assert valid is True

    def test_empty_message_fails(self):
        """Test that empty message is rejected."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()

        stego = VideoSteganography()
        with pytest.raises(ValueError, match="empty"):
            stego.embed(cover, "", keypair.public_pem())

    def test_empty_data_fails(self):
        """Test that empty video data is rejected."""
        keypair = KeyPair.generate()

        stego = VideoSteganography()
        with pytest.raises(ValueError):
            stego.embed(b'', "test", keypair.public_pem())

    def test_size_increase_is_small(self):
        """Test that the stego file is only slightly larger than original."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()

        stego = VideoSteganography()
        stego_data, metadata = stego.embed(cover, "Short msg", keypair.public_pem())

        # The size increase should be less than 1 KB for a short message
        increase = metadata['size_increase_bytes']
        assert increase < 1024


class TestConvenienceFunctions:
    """Tests for convenience wrapper functions."""

    def test_embed_video(self):
        """Test embed_video convenience function."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()

        stego_data, metadata = embed_video(cover, "test", keypair.public_pem())
        assert len(stego_data) > len(cover)

    def test_extract_video(self):
        """Test extract_video convenience function."""
        keypair = KeyPair.generate()
        cover = create_test_mp4()

        stego_data, _ = embed_video(cover, "hello", keypair.public_pem())
        message, valid, _ = extract_video(stego_data, keypair.private_pem())

        assert message == "hello"
        assert valid is True

    def test_analyze_capacity(self):
        """Test analyze_video_capacity convenience function."""
        cover = create_test_mp4()
        capacity = analyze_video_capacity(cover)

        assert 'method' in capacity
        assert capacity['method'] == 'MP4 atom embedding'
        assert 'usable_capacity_bytes' in capacity
