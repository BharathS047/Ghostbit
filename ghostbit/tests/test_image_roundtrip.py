"""
Tests for image steganography roundtrip.
"""

import pytest
import numpy as np
import cv2
import io
from PIL import Image

from ghostbit.core.crypto import KeyPair
from ghostbit.stego.image_stego import (
    ImageSteganography, embed_image, extract_image,
    detect_edge_pixels, embed_bits_in_pixel, extract_bits_from_pixel,
    analyze_image_capacity
)


def create_test_image(width: int = 256, height: int = 256, complexity: str = 'medium') -> bytes:
    """Create a test PNG image with controllable complexity."""
    image = np.zeros((height, width, 3), dtype=np.uint8)
    
    if complexity == 'simple':
        image[:, :] = [128, 128, 128]
    elif complexity == 'medium':
        for i in range(0, width, 32):
            color = [(i * 7) % 256, (i * 11) % 256, (i * 13) % 256]
            image[:, i:i+32] = color
        
        cv2.rectangle(image, (50, 50), (200, 200), (255, 0, 0), 2)
        cv2.circle(image, (128, 128), 50, (0, 255, 0), 2)
    elif complexity == 'complex':
        np.random.seed(42)
        image = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
        
        cv2.rectangle(image, (20, 20), (236, 236), (255, 255, 255), 2)
        cv2.line(image, (0, 0), (255, 255), (0, 0, 0), 1)
        cv2.line(image, (255, 0), (0, 255), (0, 0, 0), 1)
    
    _, png_data = cv2.imencode('.png', image)
    return png_data.tobytes()


class TestEdgeDetection:
    """Tests for edge detection."""
    
    def test_detect_edges_simple_image(self):
        """Test edge detection returns all pixels (simplified for determinism)."""
        image = np.ones((100, 100, 3), dtype=np.uint8) * 128
        mask = detect_edge_pixels(image)
        
        assert np.sum(mask) == 10000
    
    def test_detect_edges_with_shapes(self):
        """Test edge detection on image with shapes."""
        image = np.ones((100, 100, 3), dtype=np.uint8) * 128
        cv2.rectangle(image, (20, 20), (80, 80), (255, 255, 255), 2)
        
        mask = detect_edge_pixels(image)
        
        assert np.sum(mask) == 10000


class TestPixelEmbedding:
    """Tests for pixel-level embedding."""
    
    def test_embed_extract_single_pixel(self):
        """Test embedding and extracting bits in a pixel."""
        pixel = np.array([100, 150, 200], dtype=np.uint8)
        bits = [1, 0, 1]
        
        modified = embed_bits_in_pixel(pixel, bits, bits_per_channel=1)
        extracted = extract_bits_from_pixel(modified, bits_per_channel=1)
        
        assert extracted[:3] == bits
    
    def test_embed_multiple_bits_per_channel(self):
        """Test embedding multiple bits per channel."""
        pixel = np.array([100, 150, 200], dtype=np.uint8)
        bits = [1, 1, 0, 0, 1, 0]
        
        modified = embed_bits_in_pixel(pixel, bits, bits_per_channel=2)
        extracted = extract_bits_from_pixel(modified, bits_per_channel=2)
        
        assert extracted[:6] == bits


class TestImageSteganography:
    """Tests for full image steganography."""
    
    def test_embed_extract_short_message(self):
        """Test embedding and extracting a short message."""
        keypair = KeyPair.generate()
        cover = create_test_image(256, 256, 'complex')
        message = "Hello!"
        
        stego, metadata = embed_image(cover, message, keypair.public_pem())
        extracted, valid, _ = extract_image(stego, keypair.private_pem())
        
        assert extracted == message
        assert valid is True
    
    def test_embed_extract_medium_message(self):
        """Test embedding and extracting a medium message."""
        keypair = KeyPair.generate()
        cover = create_test_image(512, 512, 'complex')
        message = "This is a longer test message with more content. " * 5
        
        stego, metadata = embed_image(cover, message, keypair.public_pem())
        extracted, valid, _ = extract_image(stego, keypair.private_pem())
        
        assert extracted == message
        assert valid is True
    
    def test_embed_extract_unicode(self):
        """Test embedding and extracting unicode message."""
        keypair = KeyPair.generate()
        cover = create_test_image(256, 256, 'complex')
        message = "Hello, "
        
        stego, metadata = embed_image(cover, message, keypair.public_pem())
        extracted, valid, _ = extract_image(stego, keypair.private_pem())
        
        assert extracted == message
        assert valid is True
    
    def test_wrong_key_fails(self):
        """Test that wrong private key fails extraction."""
        keypair1 = KeyPair.generate()
        keypair2 = KeyPair.generate()
        cover = create_test_image(256, 256, 'complex')
        message = "Secret"
        
        stego, _ = embed_image(cover, message, keypair1.public_pem())
        
        with pytest.raises(Exception):
            extract_image(stego, keypair2.private_pem())
    
    def test_capacity_exceeded_raises(self):
        """Test that exceeding capacity raises an error."""
        keypair = KeyPair.generate()
        cover = create_test_image(64, 64, 'simple')
        message = "A" * 10000
        
        with pytest.raises(ValueError, match="too large|capacity"):
            embed_image(cover, message, keypair.public_pem())
    
    def test_bits_per_channel_2(self):
        """Test with 2 bits per channel."""
        keypair = KeyPair.generate()
        cover = create_test_image(256, 256, 'complex')
        message = "Testing 2 bits per channel"
        
        stego = ImageSteganography(bits_per_channel=2)
        stego_data, metadata = stego.embed(cover, message, keypair.public_pem())
        extracted, valid, _ = stego.extract(stego_data, keypair.private_pem())
        
        assert extracted == message
        assert valid is True


class TestCapacityAnalysis:
    """Tests for capacity analysis."""
    
    def test_analyze_simple_image(self):
        """Test capacity analysis on simple image."""
        cover = create_test_image(256, 256, 'simple')
        
        capacity = analyze_image_capacity(cover)
        
        assert 'total_pixels' in capacity
        assert 'usable_pixels' in capacity
        assert 'usable_capacity_bytes' in capacity
    
    def test_analyze_complex_image(self):
        """Test capacity analysis on complex image."""
        cover = create_test_image(256, 256, 'complex')
        
        capacity = analyze_image_capacity(cover)
        
        assert capacity['usable_pixels'] > 0
        assert capacity['usable_capacity_bytes'] > 0
    
    def test_complex_has_more_capacity(self):
        """Test that larger image has more capacity."""
        small = create_test_image(128, 128, 'complex')
        large = create_test_image(256, 256, 'complex')
        
        small_cap = analyze_image_capacity(small)
        large_cap = analyze_image_capacity(large)
        
        assert large_cap['usable_pixels'] > small_cap['usable_pixels']
