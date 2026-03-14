"""
Tests for payload packing and unpacking.
"""

import pytest
from ghostbit.core.payload import (
    MediaType, KexType, AeadType,
    pack_plaintext, unpack_plaintext,
    pack_payload, unpack_payload,
    payload_to_bits, bits_to_payload,
    pack_with_length, unpack_with_length,
    compute_integrity_hash
)


class TestPlaintext:
    """Tests for plaintext packing/unpacking."""
    
    def test_pack_unpack_simple(self):
        """Test simple plaintext roundtrip."""
        message = "Hello, World!"
        
        packed = pack_plaintext(message)
        unpacked, valid = unpack_plaintext(packed)
        
        assert unpacked == message
        assert valid is True
    
    def test_pack_unpack_unicode(self):
        """Test unicode plaintext roundtrip."""
        message = "Hello, "
        
        packed = pack_plaintext(message)
        unpacked, valid = unpack_plaintext(packed)
        
        assert unpacked == message
        assert valid is True
    
    def test_pack_unpack_empty(self):
        """Test empty message roundtrip."""
        message = ""
        
        packed = pack_plaintext(message)
        unpacked, valid = unpack_plaintext(packed)
        
        assert unpacked == message
        assert valid is True
    
    def test_integrity_detects_tampering(self):
        """Test that tampering is detected."""
        message = "Secret message"
        
        packed = pack_plaintext(message)
        
        tampered = bytearray(packed)
        tampered[5] ^= 0xFF
        tampered = bytes(tampered)
        
        _, valid = unpack_plaintext(tampered)
        assert valid is False
    
    def test_pack_structure(self):
        """Test packed structure."""
        message = "Test"
        packed = pack_plaintext(message)
        
        assert len(packed) == 4 + len(message) + 32


class TestPayload:
    """Tests for full payload packing/unpacking."""
    
    def test_pack_unpack_image_payload(self):
        """Test image payload roundtrip."""
        nonce = b'\x00' * 12
        eph_pub = b'\x01' * 32
        ciphertext = b'\x02' * 64
        
        packed = pack_payload(MediaType.IMAGE, nonce, eph_pub, ciphertext)
        header = unpack_payload(packed)
        
        assert header.media_type == MediaType.IMAGE
        assert header.kex == KexType.X25519
        assert header.aead == AeadType.AESGCM
        assert header.nonce == nonce
        assert header.eph_pub == eph_pub
        assert header.ciphertext == ciphertext
    
    def test_pack_unpack_audio_payload(self):
        """Test audio payload roundtrip."""
        nonce = b'\xAA' * 12
        eph_pub = b'\xBB' * 32
        ciphertext = b'\xCC' * 128
        
        packed = pack_payload(MediaType.AUDIO, nonce, eph_pub, ciphertext)
        header = unpack_payload(packed)
        
        assert header.media_type == MediaType.AUDIO
        assert header.nonce == nonce
        assert header.eph_pub == eph_pub
        assert header.ciphertext == ciphertext
    
    def test_pack_unpack_video_payload(self):
        """Test video payload roundtrip."""
        nonce = b'\x11' * 12
        eph_pub = b'\x22' * 32
        ciphertext = b'\x33' * 256
        
        packed = pack_payload(MediaType.VIDEO, nonce, eph_pub, ciphertext)
        header = unpack_payload(packed)
        
        assert header.media_type == MediaType.VIDEO
        assert header.nonce == nonce
        assert header.eph_pub == eph_pub
        assert header.ciphertext == ciphertext
    
    def test_invalid_magic_fails(self):
        """Test that invalid magic bytes fail."""
        valid = pack_payload(MediaType.IMAGE, b'\x00' * 12, b'\x00' * 32, b'\x00' * 16)
        
        invalid = b"XXXX" + valid[4:]
        
        with pytest.raises(ValueError, match="Invalid magic"):
            unpack_payload(invalid)
    
    def test_payload_too_short_fails(self):
        """Test that too-short payload fails."""
        with pytest.raises(ValueError):
            unpack_payload(b"GHST")


class TestBitConversion:
    """Tests for bit conversion functions."""
    
    def test_payload_to_bits_and_back(self):
        """Test bit conversion roundtrip."""
        original = b"Hello, World!"
        
        bits = payload_to_bits(original)
        recovered = bits_to_payload(bits)
        
        assert recovered == original
    
    def test_bit_count(self):
        """Test correct bit count."""
        data = b"\xFF\x00"
        bits = payload_to_bits(data)
        
        assert len(bits) == 16
        assert bits[:8] == [1, 1, 1, 1, 1, 1, 1, 1]
        assert bits[8:] == [0, 0, 0, 0, 0, 0, 0, 0]
    
    def test_bits_to_payload_non_multiple_fails(self):
        """Test that non-multiple of 8 bits fails."""
        bits = [1, 0, 1]
        
        with pytest.raises(ValueError, match="multiple of 8"):
            bits_to_payload(bits)


class TestLengthPrefix:
    """Tests for length-prefixed packing."""
    
    def test_pack_unpack_with_length(self):
        """Test length prefix roundtrip."""
        data = b"Test data for packing"
        
        packed = pack_with_length(data)
        unpacked = unpack_with_length(packed)
        
        assert unpacked == data
    
    def test_length_prefix_size(self):
        """Test that length prefix is 4 bytes."""
        data = b"Test"
        packed = pack_with_length(data)
        
        assert len(packed) == 4 + len(data)
    
    def test_unpack_too_short_fails(self):
        """Test that too-short data fails."""
        with pytest.raises(ValueError):
            unpack_with_length(b"\x00\x00")


class TestIntegrityHash:
    """Tests for integrity hash computation."""
    
    def test_hash_deterministic(self):
        """Test that hash is deterministic."""
        data = b"Test message"
        
        hash1 = compute_integrity_hash(data)
        hash2 = compute_integrity_hash(data)
        
        assert hash1 == hash2
    
    def test_hash_length(self):
        """Test that hash is 32 bytes (SHA-256)."""
        data = b"Test"
        hash_value = compute_integrity_hash(data)
        
        assert len(hash_value) == 32
    
    def test_different_data_different_hash(self):
        """Test that different data produces different hash."""
        hash1 = compute_integrity_hash(b"data1")
        hash2 = compute_integrity_hash(b"data2")
        
        assert hash1 != hash2
