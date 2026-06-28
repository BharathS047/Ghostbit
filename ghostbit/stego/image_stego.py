"""
Image steganography module for PNG files.
Uses Canny edge detection for content-adaptive embedding.
"""

import struct
import numpy as np
import cv2
from typing import Tuple, List, Optional, Dict, Any

from ..core.prng import KeySeededPRNG, derive_prng_seed
from ..core.payload import (
    MediaType, pack_payload, unpack_payload, unpack_payload_header,
    pack_plaintext, unpack_plaintext, payload_to_bits, bits_to_payload,
)
from ..core.crypto import Encryptor, Decryptor, load_public_key, KeyPair
from ..core.capacity import estimate_image_capacity


def detect_edge_pixels(
    image: np.ndarray,
    low_threshold: int = 50,
    high_threshold: int = 150,
    bits_per_channel: int = 1,
) -> np.ndarray:
    """
    Detect edge / textured pixels for content-adaptive embedding.

    Embedding hides bits in busy regions (edges, texture) where LSB changes are
    perceptually masked, instead of in smooth areas where they stand out.

    Crucially, Canny is run on the image with the ``bits_per_channel`` low bits
    **masked off** — the exact bits embedding overwrites. The high bits are
    untouched by embedding, so the cover and the stego image yield an *identical*
    edge map, which is what lets the receiver reconstruct the same embedding
    positions. A light dilation grows each edge into its textured neighbourhood
    for extra capacity.

    Args:
        image: BGR image array (uint8)
        low_threshold: Canny low threshold
        high_threshold: Canny high threshold
        bits_per_channel: Number of LSBs embedding will overwrite (1-4)

    Returns:
        Binary mask where 1 indicates a usable (edge/textured) pixel
    """
    keep = 0xFF & ~((1 << bits_per_channel) - 1)
    base = (image & keep).astype(np.uint8)
    gray = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, low_threshold, high_threshold)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    return (edges > 0).astype(np.uint8)


def embed_bits_in_pixel(pixel: np.ndarray, bits: List[int], bits_per_channel: int = 1) -> np.ndarray:
    """
    Embed bits into a pixel's LSBs.
    
    Args:
        pixel: RGB pixel array (3 values)
        bits: List of bits to embed (up to 3 * bits_per_channel)
        bits_per_channel: Number of LSBs to use per channel
        
    Returns:
        Modified pixel
    """
    result = pixel.copy()
    bit_idx = 0
    
    for channel in range(3):
        if bit_idx >= len(bits):
            break
        
        mask = ~((1 << bits_per_channel) - 1) & 0xFF
        result[channel] = result[channel] & mask
        
        for b in range(bits_per_channel):
            if bit_idx >= len(bits):
                break
            result[channel] |= (bits[bit_idx] << (bits_per_channel - 1 - b))
            bit_idx += 1
    
    return result


def extract_bits_from_pixel(pixel: np.ndarray, bits_per_channel: int = 1) -> List[int]:
    """
    Extract LSB bits from a pixel.
    
    Args:
        pixel: RGB pixel array
        bits_per_channel: Number of LSBs per channel
        
    Returns:
        List of extracted bits
    """
    bits = []
    
    for channel in range(3):
        for b in range(bits_per_channel):
            bit = (pixel[channel] >> (bits_per_channel - 1 - b)) & 1
            bits.append(bit)
    
    return bits


class ImageSteganography:
    """Image steganography handler for PNG files."""
    
    def __init__(self, bits_per_channel: int = 1):
        """
        Initialize image steganography.
        
        Args:
            bits_per_channel: LSBs to use per color channel (1-4)
        """
        if not 1 <= bits_per_channel <= 4:
            raise ValueError("bits_per_channel must be between 1 and 4")
        self.bits_per_channel = bits_per_channel
        self.bits_per_pixel = bits_per_channel * 3
    
    def analyze_capacity(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze embedding capacity of an image.
        
        Args:
            image_data: PNG image bytes
            
        Returns:
            Capacity analysis dictionary
        """
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        height, width = image.shape[:2]
        edge_mask = detect_edge_pixels(image, bits_per_channel=self.bits_per_channel)
        edge_count = int(np.sum(edge_mask))
        
        return estimate_image_capacity(
            width=width,
            height=height,
            edge_pixel_count=edge_count,
            bits_per_channel=self.bits_per_channel
        )
    
    def _ceil_pixels(self, bit_count: int) -> int:
        """Number of pixels needed to carry ``bit_count`` bits."""
        return (bit_count + self.bits_per_pixel - 1) // self.bits_per_pixel

    def _write_bits(self, flat: np.ndarray, positions, bits: List[int]) -> None:
        """Embed ``bits`` (MSB-first) into the pixels at ``positions`` in order."""
        bit_idx = 0
        total = len(bits)
        for k in positions:
            if bit_idx >= total:
                break
            chunk = bits[bit_idx:bit_idx + self.bits_per_pixel]
            flat[k] = embed_bits_in_pixel(flat[k], chunk, self.bits_per_channel)
            bit_idx += len(chunk)

    def _read_bits(self, flat: np.ndarray, positions, num_bits: int) -> List[int]:
        """Extract up to ``num_bits`` bits from the pixels at ``positions``."""
        bits: List[int] = []
        for k in positions:
            if len(bits) >= num_bits:
                break
            bits.extend(extract_bits_from_pixel(flat[k], self.bits_per_channel))
        return bits[:num_bits]

    def embed(
        self,
        cover_image_data: bytes,
        message: str,
        receiver_public_key_pem: bytes
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Embed an encrypted message into a cover image.

        Layout:
          * Header region (magic … ct_len) is embedded sequentially from pixel 0.
            It carries only public values (nonce, ephemeral pubkey) needed to
            bootstrap extraction.
          * Ciphertext is embedded at pseudo-random pixel positions selected by a
            PRNG seeded from the ECDH **shared secret**, so an observer who lacks
            the private key cannot locate (or order) the hidden bits.

        Returns:
            Tuple of (stego_image_png_bytes, metadata_dict)
        """
        nparr = np.frombuffer(cover_image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode cover image")

        receiver_pub = load_public_key(receiver_public_key_pem)
        encryptor = Encryptor(receiver_pub)

        plaintext = pack_plaintext(message)
        nonce, eph_pub, ciphertext = encryptor.encrypt(plaintext)

        payload = pack_payload(MediaType.IMAGE, nonce, eph_pub, ciphertext)
        header_part = payload[:len(payload) - len(ciphertext)]   # magic … ct_len
        region_a = struct.pack('>I', len(header_part)) + header_part

        a_bits = payload_to_bits(region_a)
        c_bits = payload_to_bits(ciphertext)
        a_pixels = self._ceil_pixels(len(a_bits))
        c_pixels = self._ceil_pixels(len(c_bits))

        # Candidate positions: edge/textured pixels only (content-adaptive).
        edge_idx = np.flatnonzero(
            detect_edge_pixels(image, bits_per_channel=self.bits_per_channel).reshape(-1)
        )
        num_edge = int(edge_idx.size)

        if a_pixels + c_pixels > num_edge:
            raise ValueError(
                f"Message too large: need {a_pixels + c_pixels} edge pixels, "
                f"only {num_edge} available in this cover image"
            )

        flat = image.reshape(-1, image.shape[2]).copy()

        # Header: first edge pixels in raster order (carries only public values).
        self._write_bits(flat, edge_idx[:a_pixels], a_bits)

        # Ciphertext: shared-secret-seeded positions among the remaining edge pixels.
        prng = KeySeededPRNG(derive_prng_seed(encryptor.shared_secret))
        pool = prng.sample_indices(num_edge - a_pixels, c_pixels)
        body_positions = edge_idx[a_pixels:][np.asarray(pool, dtype=np.int64)]
        self._write_bits(flat, body_positions, c_bits)

        stego_image = flat.reshape(image.shape)
        ok, png_data = cv2.imencode('.png', stego_image)
        if not ok:
            raise ValueError("Failed to encode stego image")

        pixels_used = a_pixels + c_pixels
        metadata = {
            "pixels_used": pixels_used,
            "bits_embedded": len(a_bits) + len(c_bits),
            "payload_size": len(payload),
            "edge_pixels_available": num_edge,
            "capacity_used_percent": (pixels_used / num_edge) * 100,
        }

        return png_data.tobytes(), metadata
    
    def extract(
        self,
        stego_image_data: bytes,
        private_key_pem: bytes
    ) -> Tuple[str, bool, Dict[str, Any]]:
        """
        Extract and decrypt message from stego image.
        
        Args:
            stego_image_data: Stego PNG image bytes
            private_key_pem: Receiver's private key PEM
            
        Returns:
            Tuple of (message, integrity_valid, metadata_dict)
        """
        nparr = np.frombuffer(stego_image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode stego image")

        flat = image.reshape(-1, image.shape[2])

        # Same edge map as embed — Canny on LSB-masked bits is embedding-invariant.
        edge_idx = np.flatnonzero(
            detect_edge_pixels(image, bits_per_channel=self.bits_per_channel).reshape(-1)
        )
        num_edge = int(edge_idx.size)

        # 1) Read the 4-byte header-region length from the first edge pixels.
        len_pixels = self._ceil_pixels(32)
        if len_pixels > num_edge:
            raise ValueError("Image has too few edge pixels to contain a payload")
        header_len = int.from_bytes(
            bits_to_payload(self._read_bits(flat, edge_idx[:len_pixels], 32)), 'big'
        )

        # Bound the header length (magic..ct_len is small and fixed-ish).
        min_header_size = 9 + 12 + 2 + 32 + 4
        if header_len < min_header_size or header_len > 4096:
            raise ValueError("Invalid payload length or corrupted data")

        # 2) Read the full header region (first edge pixels) and parse it.
        a_total_bits = 32 + header_len * 8
        a_pixels = self._ceil_pixels(a_total_bits)
        if a_pixels > num_edge:
            raise ValueError("Not enough edge pixels for payload header")
        region_a = bits_to_payload(self._read_bits(flat, edge_idx[:a_pixels], a_total_bits))
        header_part = region_a[4:4 + header_len]

        info = unpack_payload_header(header_part)
        if info.media_type != MediaType.IMAGE:
            raise ValueError(f"Wrong media type: expected IMAGE, got {info.media_type}")

        # 3) Re-derive the shared secret and the same shuffled ciphertext positions.
        keypair = KeyPair.from_private_pem(private_key_pem)
        decryptor = Decryptor(keypair.private_key)
        prng = KeySeededPRNG(derive_prng_seed(decryptor.derive_shared_secret(info.eph_pub)))

        pool_n = num_edge - a_pixels
        c_bits_needed = info.ct_len * 8
        c_pixels = self._ceil_pixels(c_bits_needed)
        if c_pixels > pool_n:
            raise ValueError("Not enough edge pixels for payload extraction")
        pool = prng.sample_indices(pool_n, c_pixels)
        body_positions = edge_idx[a_pixels:][np.asarray(pool, dtype=np.int64)]
        ciphertext = bits_to_payload(self._read_bits(flat, body_positions, c_bits_needed))

        # 4) Reassemble, decrypt, verify.
        header = unpack_payload(header_part + ciphertext)
        plaintext = decryptor.decrypt(header.nonce, header.eph_pub, header.ciphertext)
        message, integrity_valid = unpack_plaintext(plaintext)

        metadata = {
            "payload_size": len(header_part) + len(ciphertext),
            "media_type": "image",
            "integrity_verified": integrity_valid,
        }

        return message, integrity_valid, metadata


def embed_image(
    cover_image_data: bytes,
    message: str,
    receiver_public_key_pem: bytes,
    bits_per_channel: int = 1
) -> Tuple[bytes, Dict[str, Any]]:
    """Convenience function for image embedding."""
    stego = ImageSteganography(bits_per_channel)
    return stego.embed(cover_image_data, message, receiver_public_key_pem)


def extract_image(
    stego_image_data: bytes,
    private_key_pem: bytes,
    bits_per_channel: int = 1
) -> Tuple[str, bool, Dict[str, Any]]:
    """Convenience function for image extraction."""
    stego = ImageSteganography(bits_per_channel)
    return stego.extract(stego_image_data, private_key_pem)


def analyze_image_capacity(
    image_data: bytes,
    bits_per_channel: int = 1
) -> Dict[str, Any]:
    """Convenience function for capacity analysis."""
    stego = ImageSteganography(bits_per_channel)
    return stego.analyze_capacity(image_data)
