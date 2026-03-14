"""
Video steganography module using MP4 container atom embedding.

Embeds encrypted payloads as a custom 'uuid' atom in the MP4 container.
The video/audio streams remain completely untouched, so stego files play
normally in any media player. Only someone with the private key can
extract the hidden message.
"""

import struct
import os
import tempfile
from typing import Tuple, Dict, Any
from pathlib import Path

from ..core.payload import (
    MediaType, pack_payload, unpack_payload, pack_plaintext, unpack_plaintext,
    payload_to_bits, bits_to_payload, pack_with_length, unpack_with_length
)
from ..core.crypto import Encryptor, Decryptor, load_public_key, KeyPair


# GhostBit's unique UUID for the custom atom (16 bytes)
# "GHST-BIT0-STEG-0001" mapped to bytes
GHOSTBIT_UUID = b'\x47\x48\x53\x54\x42\x49\x54\x30\x53\x54\x45\x47\x30\x30\x30\x31'

# Minimum valid MP4 file size (ftyp atom minimum)
MIN_MP4_SIZE = 8


def _read_atom_header(data: bytes, offset: int) -> Tuple[int, str, int]:
    """
    Read an MP4 atom header at the given offset.

    Args:
        data: MP4 file bytes
        offset: Byte offset to read from

    Returns:
        Tuple of (atom_size, atom_type, header_size)
        header_size is 8 for normal atoms, 16 for extended-size atoms
    """
    if offset + 8 > len(data):
        raise ValueError(f"Cannot read atom header at offset {offset}")

    size = struct.unpack('>I', data[offset:offset + 4])[0]
    atom_type = data[offset + 4:offset + 8].decode('ascii', errors='replace')

    if size == 1:
        # Extended size (64-bit)
        if offset + 16 > len(data):
            raise ValueError("Cannot read extended atom size")
        size = struct.unpack('>Q', data[offset + 8:offset + 16])[0]
        return size, atom_type, 16
    elif size == 0:
        # Atom extends to end of file
        size = len(data) - offset
        return size, atom_type, 8

    return size, atom_type, 8


def _scan_atoms(data: bytes) -> list:
    """
    Scan all top-level atoms in an MP4 file.

    Args:
        data: MP4 file bytes

    Returns:
        List of (offset, size, type) tuples
    """
    atoms = []
    offset = 0

    while offset < len(data):
        try:
            size, atom_type, header_size = _read_atom_header(data, offset)
        except ValueError:
            break

        if size < 8:
            break

        atoms.append((offset, size, atom_type))
        offset += size

    return atoms


def _find_ghostbit_atom(data: bytes) -> Tuple[int, int]:
    """
    Find the GhostBit uuid atom in MP4 data.

    Args:
        data: MP4 file bytes

    Returns:
        Tuple of (payload_offset, payload_size) or (-1, 0) if not found
    """
    atoms = _scan_atoms(data)

    for offset, size, atom_type in atoms:
        if atom_type == 'uuid':
            # Check if this uuid atom has our GhostBit UUID
            _, _, header_size = _read_atom_header(data, offset)
            uuid_start = offset + header_size
            uuid_end = uuid_start + 16

            if uuid_end <= len(data):
                atom_uuid = data[uuid_start:uuid_end]
                if atom_uuid == GHOSTBIT_UUID:
                    payload_start = uuid_end
                    payload_size = size - header_size - 16
                    return payload_start, payload_size

    return -1, 0


def _create_uuid_atom(payload: bytes) -> bytes:
    """
    Create a uuid atom containing the GhostBit payload.

    Format:
        [4 bytes size][4 bytes 'uuid'][16 bytes GHOSTBIT_UUID][payload]

    Args:
        payload: Encrypted payload bytes

    Returns:
        Complete uuid atom bytes
    """
    atom_size = 8 + 16 + len(payload)  # header + uuid + payload

    atom = struct.pack('>I', atom_size)
    atom += b'uuid'
    atom += GHOSTBIT_UUID
    atom += payload

    return atom


def _remove_ghostbit_atom(data: bytes) -> bytes:
    """
    Remove any existing GhostBit uuid atom from MP4 data.

    Args:
        data: MP4 file bytes

    Returns:
        MP4 data without the GhostBit atom
    """
    atoms = _scan_atoms(data)
    result = bytearray()

    for offset, size, atom_type in atoms:
        if atom_type == 'uuid':
            _, _, header_size = _read_atom_header(data, offset)
            uuid_start = offset + header_size
            uuid_end = uuid_start + 16

            if uuid_end <= len(data):
                atom_uuid = data[uuid_start:uuid_end]
                if atom_uuid == GHOSTBIT_UUID:
                    # Skip this atom
                    continue

        result.extend(data[offset:offset + size])

    return bytes(result)


def validate_mp4(data: bytes) -> bool:
    """
    Validate that data looks like a valid MP4/MOV file.

    Args:
        data: File bytes to validate

    Returns:
        True if the data appears to be a valid MP4 file
    """
    if len(data) < MIN_MP4_SIZE:
        return False

    # Check for ftyp atom (standard MP4)
    try:
        size, atom_type, _ = _read_atom_header(data, 0)
        if atom_type == 'ftyp':
            return True
    except ValueError:
        pass

    # Some MP4 files start with 'moov' or 'mdat' (rare but valid)
    try:
        _, atom_type, _ = _read_atom_header(data, 0)
        if atom_type in ('moov', 'mdat', 'free', 'skip', 'wide'):
            return True
    except ValueError:
        pass

    return False


class VideoSteganography:
    """
    Video steganography using MP4 container atom embedding.

    Embeds encrypted data as a custom uuid atom in the MP4 container.
    The video and audio streams are completely untouched, ensuring
    the stego file plays normally in any media player.
    """

    def __init__(self, **kwargs):
        """Initialize video steganography. Accepts kwargs for API compatibility."""
        pass

    def analyze_capacity(self, video_data: bytes) -> Dict[str, Any]:
        """
        Analyze embedding capacity of a video file.

        For atom-based embedding, capacity is essentially unlimited
        (limited only by filesystem/practical considerations).

        Args:
            video_data: MP4 video bytes

        Returns:
            Capacity analysis dictionary
        """
        if not validate_mp4(video_data):
            raise ValueError("Input does not appear to be a valid MP4 file")

        atoms = _scan_atoms(video_data)
        atom_types = [a[2] for a in atoms]

        return {
            "file_size": len(video_data),
            "atom_count": len(atoms),
            "atom_types": atom_types,
            "has_existing_payload": _find_ghostbit_atom(video_data)[0] != -1,
            "method": "MP4 atom embedding",
            "max_message_bytes": 10 * 1024 * 1024,  # 10 MB practical limit
            "usable_capacity_bytes": 10 * 1024 * 1024,
            "notes": "Capacity is virtually unlimited for text messages"
        }

    def embed(
        self,
        cover_video_data: bytes,
        message: str,
        receiver_public_key_pem: bytes
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Embed encrypted message into an MP4 video file.

        The message is encrypted with AES-256-GCM using X25519 key exchange,
        then stored in a custom uuid atom appended to the MP4 container.
        The video/audio streams are untouched.

        Args:
            cover_video_data: MP4 video bytes
            message: Secret message to embed
            receiver_public_key_pem: Receiver's public key PEM

        Returns:
            Tuple of (stego_mp4_bytes, metadata_dict)
        """
        if not cover_video_data or len(cover_video_data) < MIN_MP4_SIZE:
            raise ValueError("Cover video data is empty or too small")

        if not validate_mp4(cover_video_data):
            raise ValueError(
                "Input does not appear to be a valid MP4 file. "
                "Supported formats: MP4, M4V, MOV"
            )

        if not message or not message.strip():
            raise ValueError("Message cannot be empty")

        # Remove any existing GhostBit atom (in case of re-embedding)
        clean_data = _remove_ghostbit_atom(cover_video_data)

        # Encrypt the message
        receiver_pub = load_public_key(receiver_public_key_pem)
        encryptor = Encryptor(receiver_pub)

        plaintext = pack_plaintext(message)
        nonce, eph_pub, ciphertext = encryptor.encrypt(plaintext)

        # Pack into GhostBit payload format
        payload = pack_payload(MediaType.VIDEO, nonce, eph_pub, ciphertext)

        # Create the uuid atom
        ghost_atom = _create_uuid_atom(payload)

        # Append the atom to the MP4 file
        stego_data = clean_data + ghost_atom

        metadata = {
            "method": "MP4 atom embedding",
            "payload_size_bytes": len(payload),
            "atom_size_bytes": len(ghost_atom),
            "original_file_size": len(cover_video_data),
            "stego_file_size": len(stego_data),
            "size_increase_bytes": len(stego_data) - len(cover_video_data),
            "size_increase_percent": ((len(stego_data) - len(cover_video_data)) / len(cover_video_data)) * 100,
            "output_format": "MP4 (standard, playable)"
        }

        return stego_data, metadata

    def extract(
        self,
        stego_video_data: bytes,
        private_key_pem: bytes
    ) -> Tuple[str, bool, Dict[str, Any]]:
        """
        Extract and decrypt hidden message from a stego MP4 file.

        Scans the MP4 container for the GhostBit uuid atom,
        reads the encrypted payload, and decrypts it.

        Args:
            stego_video_data: Stego MP4 bytes
            private_key_pem: Receiver's private key PEM

        Returns:
            Tuple of (message, integrity_valid, metadata_dict)
        """
        if not stego_video_data or len(stego_video_data) < MIN_MP4_SIZE:
            raise ValueError("Stego video data is empty or too small")

        # Find the GhostBit atom
        payload_offset, payload_size = _find_ghostbit_atom(stego_video_data)

        if payload_offset == -1:
            raise ValueError(
                "No hidden message found in this video file. "
                "The file may not contain embedded data, or it may have been "
                "re-encoded (which removes the hidden payload)."
            )

        # Read the payload
        payload = stego_video_data[payload_offset:payload_offset + payload_size]

        # Unpack the GhostBit header
        header = unpack_payload(payload)

        if header.media_type != MediaType.VIDEO:
            raise ValueError(f"Wrong media type: expected VIDEO, got {header.media_type}")

        # Decrypt
        keypair = KeyPair.from_private_pem(private_key_pem)
        decryptor = Decryptor(keypair.private_key)

        plaintext = decryptor.decrypt(header.nonce, header.eph_pub, header.ciphertext)

        # Unpack and verify integrity
        message, integrity_valid = unpack_plaintext(plaintext)

        metadata = {
            "method": "MP4 atom embedding",
            "payload_size_bytes": payload_size,
            "media_type": "video",
            "integrity_verified": integrity_valid
        }

        return message, integrity_valid, metadata


# ─── Convenience Functions ───────────────────────────────────────────────────

def embed_video(
    cover_video_data: bytes,
    message: str,
    receiver_public_key_pem: bytes,
    **kwargs
) -> Tuple[bytes, Dict[str, Any]]:
    """Convenience function for video embedding."""
    stego = VideoSteganography()
    return stego.embed(cover_video_data, message, receiver_public_key_pem)


def extract_video(
    stego_video_data: bytes,
    private_key_pem: bytes,
    **kwargs
) -> Tuple[str, bool, Dict[str, Any]]:
    """Convenience function for video extraction."""
    stego = VideoSteganography()
    return stego.extract(stego_video_data, private_key_pem)


def analyze_video_capacity(
    video_data: bytes,
    **kwargs
) -> Dict[str, Any]:
    """Convenience function for capacity analysis."""
    stego = VideoSteganography()
    return stego.analyze_capacity(video_data)
