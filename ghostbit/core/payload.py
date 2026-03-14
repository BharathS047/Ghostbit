"""
Payload packing and unpacking for GhostBit.
Implements the binary header format with integrity verification.
"""

import struct
import hashlib
from typing import Tuple, Optional
from dataclasses import dataclass
from enum import IntEnum


MAGIC = b"GHST"
VERSION = 0x01


class MediaType(IntEnum):
    IMAGE = 1
    AUDIO = 2
    VIDEO = 3


class KexType(IntEnum):
    X25519 = 1


class AeadType(IntEnum):
    AESGCM = 1


@dataclass
class PayloadHeader:
    """Parsed payload header."""
    magic: bytes
    version: int
    media_type: MediaType
    kex: KexType
    aead: AeadType
    nonce_len: int
    nonce: bytes
    eph_pub: bytes
    ciphertext: bytes


def compute_integrity_hash(message: bytes) -> bytes:
    """Compute SHA-256 hash for integrity verification."""
    return hashlib.sha256(message).digest()


def pack_plaintext(message: str) -> bytes:
    """
    Pack message into plaintext format for encryption.
    
    Format:
        - msg_len: 4 bytes (big endian)
        - msg_utf8: message bytes
        - sha256(msg_utf8): 32 bytes
    """
    msg_bytes = message.encode('utf-8')
    msg_len = len(msg_bytes)
    integrity_hash = compute_integrity_hash(msg_bytes)
    
    return struct.pack('>I', msg_len) + msg_bytes + integrity_hash


def unpack_plaintext(data: bytes) -> Tuple[str, bool]:
    """
    Unpack and verify plaintext.
    
    Returns:
        Tuple of (message, integrity_valid)
    """
    if len(data) < 4 + 32:
        raise ValueError("Plaintext too short")
    
    msg_len = struct.unpack('>I', data[:4])[0]
    
    if len(data) < 4 + msg_len + 32:
        raise ValueError("Plaintext length mismatch")
    
    msg_bytes = data[4:4 + msg_len]
    stored_hash = data[4 + msg_len:4 + msg_len + 32]
    
    computed_hash = compute_integrity_hash(msg_bytes)
    integrity_valid = (stored_hash == computed_hash)
    
    try:
        message = msg_bytes.decode('utf-8')
    except UnicodeDecodeError:
        message = msg_bytes.decode('utf-8', errors='replace')
        integrity_valid = False
    
    return message, integrity_valid


def pack_payload(
    media_type: MediaType,
    nonce: bytes,
    eph_pub: bytes,
    ciphertext: bytes
) -> bytes:
    """
    Pack encrypted payload into binary format.
    
    Binary header format:
        - magic: 4 bytes "GHST"
        - version: 1 byte (0x01)
        - media_type: 1 byte (1=image, 2=audio, 3=video)
        - kex: 1 byte (1=X25519)
        - aead: 1 byte (1=AESGCM)
        - nonce_len: 1 byte (12)
        - nonce: nonce_len bytes
        - eph_pub_len: 2 bytes (big endian)
        - eph_pub: bytes
        - ct_len: 4 bytes (big endian)
        - ciphertext: ct_len bytes
    """
    header = struct.pack(
        '>4sBBBBB',
        MAGIC,
        VERSION,
        media_type,
        KexType.X25519,
        AeadType.AESGCM,
        len(nonce)
    )
    
    eph_pub_header = struct.pack('>H', len(eph_pub))
    ct_header = struct.pack('>I', len(ciphertext))
    
    return header + nonce + eph_pub_header + eph_pub + ct_header + ciphertext


def unpack_payload(data: bytes) -> PayloadHeader:
    """
    Unpack binary payload.
    
    Returns:
        PayloadHeader with all parsed fields
    """
    if len(data) < 9:
        raise ValueError("Payload too short for header")
    
    magic, version, media_type, kex, aead, nonce_len = struct.unpack('>4sBBBBB', data[:9])
    
    if magic != MAGIC:
        raise ValueError(f"Invalid magic bytes: expected {MAGIC}, got {magic}")
    
    if version != VERSION:
        raise ValueError(f"Unsupported version: {version}")
    
    offset = 9
    
    if len(data) < offset + nonce_len:
        raise ValueError("Payload too short for nonce")
    nonce = data[offset:offset + nonce_len]
    offset += nonce_len
    
    if len(data) < offset + 2:
        raise ValueError("Payload too short for eph_pub_len")
    eph_pub_len = struct.unpack('>H', data[offset:offset + 2])[0]
    offset += 2
    
    if len(data) < offset + eph_pub_len:
        raise ValueError("Payload too short for eph_pub")
    eph_pub = data[offset:offset + eph_pub_len]
    offset += eph_pub_len
    
    if len(data) < offset + 4:
        raise ValueError("Payload too short for ct_len")
    ct_len = struct.unpack('>I', data[offset:offset + 4])[0]
    offset += 4
    
    if len(data) < offset + ct_len:
        raise ValueError("Payload too short for ciphertext")
    ciphertext = data[offset:offset + ct_len]
    
    return PayloadHeader(
        magic=magic,
        version=version,
        media_type=MediaType(media_type),
        kex=KexType(kex),
        aead=AeadType(aead),
        nonce_len=nonce_len,
        nonce=nonce,
        eph_pub=eph_pub,
        ciphertext=ciphertext
    )


def payload_to_bits(payload: bytes) -> list:
    """Convert payload bytes to list of bits."""
    bits = []
    for byte in payload:
        for i in range(7, -1, -1):
            bits.append((byte >> i) & 1)
    return bits


def bits_to_payload(bits: list) -> bytes:
    """Convert list of bits back to payload bytes."""
    if len(bits) % 8 != 0:
        raise ValueError("Bit count must be multiple of 8")
    
    payload = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for j in range(8):
            byte = (byte << 1) | bits[i + j]
        payload.append(byte)
    
    return bytes(payload)


def get_payload_bit_length(payload: bytes) -> int:
    """Get total bit length of payload including length prefix."""
    return (4 + len(payload)) * 8


def pack_with_length(payload: bytes) -> bytes:
    """Pack payload with 4-byte length prefix."""
    return struct.pack('>I', len(payload)) + payload


def unpack_with_length(data: bytes) -> bytes:
    """Unpack payload with length prefix."""
    if len(data) < 4:
        raise ValueError("Data too short for length prefix")
    length = struct.unpack('>I', data[:4])[0]
    if len(data) < 4 + length:
        raise ValueError(f"Data too short: expected {4 + length}, got {len(data)}")
    return data[4:4 + length]
