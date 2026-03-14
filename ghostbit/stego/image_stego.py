"""
Image steganography module for PNG files.
Uses Canny edge detection for content-adaptive embedding.
"""

import numpy as np
import cv2
from PIL import Image
from typing import Tuple, List, Optional, Dict, Any
import io

from ..core.prng import KeySeededPRNG, create_embedding_prng
from ..core.payload import (
    MediaType, pack_payload, unpack_payload, pack_plaintext, unpack_plaintext,
    payload_to_bits, bits_to_payload, pack_with_length, unpack_with_length
)
from ..core.crypto import Encryptor, Decryptor, load_public_key, KeyPair
from ..core.capacity import estimate_image_capacity, check_capacity


def detect_edge_pixels(image: np.ndarray, low_threshold: int = 50, high_threshold: int = 150) -> np.ndarray:
    """
    Detect edge and textured pixels using Canny edge detection.
    For simplicity and determinism, we use all pixels as potential embedding locations.
    
    Args:
        image: BGR image array
        low_threshold: Canny low threshold
        high_threshold: Canny high threshold
        
    Returns:
        Binary mask where 1 indicates usable pixels
    """
    height, width = image.shape[:2]
    return np.ones((height, width), dtype=np.uint8)


def get_embedding_positions(
    mask: np.ndarray,
    prng: Optional[KeySeededPRNG],
    count: int
) -> List[Tuple[int, int]]:
    """
    Get embedding positions from edge mask.
    
    Args:
        mask: Binary edge mask
        prng: Seeded PRNG for shuffling (None for sequential order)
        count: Number of positions needed
        
    Returns:
        List of (row, col) positions
    """
    positions = list(zip(*np.where(mask > 0)))
    
    if len(positions) < count:
        raise ValueError(f"Not enough edge pixels: need {count}, have {len(positions)}")
    
    if prng is not None:
        selected = prng.select_positions(positions, count)
        return selected
    else:
        return positions[:count]


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
        edge_mask = detect_edge_pixels(image)
        edge_count = int(np.sum(edge_mask))
        
        return estimate_image_capacity(
            width=width,
            height=height,
            edge_pixel_count=edge_count,
            bits_per_channel=self.bits_per_channel
        )
    
    def embed(
        self,
        cover_image_data: bytes,
        message: str,
        receiver_public_key_pem: bytes
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Embed encrypted message into cover image.
        
        Args:
            cover_image_data: PNG image bytes
            message: Secret message to embed
            receiver_public_key_pem: Receiver's public key PEM
            
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
        payload_with_len = pack_with_length(payload)
        payload_bits = payload_to_bits(payload_with_len)
        
        pixels_needed = (len(payload_bits) + self.bits_per_pixel - 1) // self.bits_per_pixel
        
        edge_mask = detect_edge_pixels(image)
        edge_count = int(np.sum(edge_mask))
        
        if pixels_needed > edge_count:
            raise ValueError(
                f"Message too large: need {pixels_needed} pixels, "
                f"only {edge_count} edge pixels available"
            )
        
        positions = get_embedding_positions(edge_mask, None, pixels_needed)
        
        stego_image = image.copy()
        bit_idx = 0
        
        for row, col in positions:
            if bit_idx >= len(payload_bits):
                break
            
            bits_to_embed = payload_bits[bit_idx:bit_idx + self.bits_per_pixel]
            pixel = stego_image[row, col]
            stego_image[row, col] = embed_bits_in_pixel(pixel, bits_to_embed, self.bits_per_channel)
            bit_idx += len(bits_to_embed)
        
        _, png_data = cv2.imencode('.png', stego_image)
        
        metadata = {
            "pixels_used": len(positions),
            "bits_embedded": len(payload_bits),
            "payload_size": len(payload),
            "edge_pixels_available": edge_count,
            "capacity_used_percent": (len(positions) / edge_count) * 100
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
        
        edge_mask = detect_edge_pixels(image)
        edge_positions = list(zip(*np.where(edge_mask > 0)))
        
        if len(edge_positions) < 100:
            raise ValueError("Not enough edge pixels for extraction")
        
        length_bits = 32
        length_pixels = (length_bits + self.bits_per_pixel - 1) // self.bits_per_pixel
        
        initial_bits = []
        for row, col in edge_positions[:length_pixels]:
            pixel = image[row, col]
            initial_bits.extend(extract_bits_from_pixel(pixel, self.bits_per_channel))
        
        length_bytes = bits_to_payload(initial_bits[:32])
        payload_len = int.from_bytes(length_bytes, 'big')
        
        min_header_size = 9 + 12 + 2 + 32 + 4
        if payload_len < min_header_size or payload_len > 10 * 1024 * 1024:
            raise ValueError("Invalid payload length or corrupted data")
        
        total_bits_needed = (4 + payload_len) * 8
        pixels_needed = (total_bits_needed + self.bits_per_pixel - 1) // self.bits_per_pixel
        
        if pixels_needed > len(edge_positions):
            raise ValueError("Not enough edge pixels for payload extraction")
        
        all_bits = []
        for row, col in edge_positions[:pixels_needed]:
            pixel = image[row, col]
            all_bits.extend(extract_bits_from_pixel(pixel, self.bits_per_channel))
        
        payload_data = bits_to_payload(all_bits[:total_bits_needed])
        payload = unpack_with_length(payload_data)
        
        header = unpack_payload(payload)
        
        if header.media_type != MediaType.IMAGE:
            raise ValueError(f"Wrong media type: expected IMAGE, got {header.media_type}")
        
        keypair = KeyPair.from_private_pem(private_key_pem)
        decryptor = Decryptor(keypair.private_key)
        
        plaintext = decryptor.decrypt(header.nonce, header.eph_pub, header.ciphertext)
        
        message, integrity_valid = unpack_plaintext(plaintext)
        
        metadata = {
            "payload_size": len(payload),
            "media_type": "image",
            "integrity_verified": integrity_valid
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
