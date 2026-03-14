"""
Tests for audio steganography roundtrip.
"""

import pytest
import numpy as np
import soundfile as sf
import io

from ghostbit.core.crypto import KeyPair
from ghostbit.stego.audio_stego import (
    AudioSteganography, embed_audio, extract_audio,
    compute_frame_energy, compute_spectral_flux,
    analyze_frame_complexity, analyze_audio_capacity
)


def create_test_audio(
    duration: float = 2.0,
    sample_rate: int = 44100,
    complexity: str = 'medium'
) -> bytes:
    """Create test WAV audio with controllable complexity."""
    samples = int(duration * sample_rate)
    t = np.linspace(0, duration, samples, dtype=np.float32)
    
    if complexity == 'simple':
        audio = np.sin(2 * np.pi * 440 * t)
    elif complexity == 'medium':
        audio = (
            np.sin(2 * np.pi * 440 * t) * 0.4 +
            np.sin(2 * np.pi * 880 * t) * 0.3 +
            np.sin(2 * np.pi * 1320 * t) * 0.2 +
            np.random.randn(samples) * 0.1
        )
    elif complexity == 'complex':
        audio = np.random.randn(samples) * 0.5
        
        for freq in [220, 440, 880, 1760, 3520]:
            audio += np.sin(2 * np.pi * freq * t) * 0.1
        
        envelope = np.exp(-t * 0.5) + np.exp(-(duration - t) * 0.5)
        audio *= envelope
    
    audio = np.clip(audio / np.max(np.abs(audio)) * 0.9, -1, 1)
    
    buffer = io.BytesIO()
    sf.write(buffer, audio.astype(np.float32), sample_rate, format='WAV')
    return buffer.getvalue()


class TestFrameAnalysis:
    """Tests for frame complexity analysis."""
    
    def test_compute_frame_energy(self):
        """Test frame energy computation."""
        frame = np.array([0.5, 0.5, 0.5, 0.5])
        energy = compute_frame_energy(frame)
        
        assert energy > 0
    
    def test_compute_spectral_flux(self):
        """Test spectral flux computation."""
        frame1 = np.random.randn(1024)
        frame2 = np.random.randn(1024)
        
        flux = compute_spectral_flux(frame2, frame1)
        
        assert flux >= 0
    
    def test_spectral_flux_zero_for_identical(self):
        """Test spectral flux is low for identical frames."""
        frame = np.random.randn(1024)
        flux = compute_spectral_flux(frame, frame)
        
        assert flux < 1e-10
    
    def test_analyze_frame_complexity(self):
        """Test full frame complexity analysis."""
        audio = np.random.randn(10000)
        
        scores = analyze_frame_complexity(audio, frame_size=1024, hop_length=512)
        
        assert len(scores) > 0
        for start, score in scores:
            assert score >= 0


class TestAudioSteganography:
    """Tests for full audio steganography."""
    
    def test_embed_extract_short_message(self):
        """Test embedding and extracting a short message."""
        keypair = KeyPair.generate()
        cover = create_test_audio(2.0, 44100, 'complex')
        message = "Hello!"
        
        stego, metadata = embed_audio(cover, message, keypair.public_pem())
        extracted, valid, _ = extract_audio(stego, keypair.private_pem())
        
        assert extracted == message
        assert valid is True
    
    def test_embed_extract_medium_message(self):
        """Test embedding and extracting a medium message."""
        keypair = KeyPair.generate()
        cover = create_test_audio(5.0, 44100, 'complex')
        message = "This is a test message for audio steganography. " * 3
        
        stego, metadata = embed_audio(cover, message, keypair.public_pem())
        extracted, valid, _ = extract_audio(stego, keypair.private_pem())
        
        assert extracted == message
        assert valid is True
    
    def test_embed_extract_unicode(self):
        """Test embedding and extracting unicode message."""
        keypair = KeyPair.generate()
        cover = create_test_audio(2.0, 44100, 'complex')
        message = "Secret: "
        
        stego, metadata = embed_audio(cover, message, keypair.public_pem())
        extracted, valid, _ = extract_audio(stego, keypair.private_pem())
        
        assert extracted == message
        assert valid is True
    
    def test_wrong_key_fails(self):
        """Test that wrong private key fails extraction."""
        keypair1 = KeyPair.generate()
        keypair2 = KeyPair.generate()
        cover = create_test_audio(2.0, 44100, 'complex')
        message = "Secret"
        
        stego, _ = embed_audio(cover, message, keypair1.public_pem())
        
        with pytest.raises(Exception):
            extract_audio(stego, keypair2.private_pem())
    
    def test_different_frame_sizes(self):
        """Test with different frame sizes."""
        keypair = KeyPair.generate()
        cover = create_test_audio(3.0, 44100, 'complex')
        message = "Testing frame sizes"
        
        for frame_size in [1024, 2048, 4096]:
            stego = AudioSteganography(frame_size=frame_size)
            stego_data, _ = stego.embed(cover, message, keypair.public_pem())
            extracted, valid, _ = stego.extract(stego_data, keypair.private_pem())
            
            assert extracted == message
            assert valid is True


class TestAudioCapacity:
    """Tests for audio capacity analysis."""
    
    def test_analyze_capacity(self):
        """Test capacity analysis."""
        audio = create_test_audio(2.0, 44100, 'medium')
        
        capacity = analyze_audio_capacity(audio)
        
        assert 'total_samples' in capacity
        assert 'usable_samples' in capacity
        assert 'usable_capacity_bytes' in capacity
    
    def test_longer_audio_more_capacity(self):
        """Test that longer audio has more capacity."""
        short = create_test_audio(1.0, 44100, 'complex')
        long = create_test_audio(5.0, 44100, 'complex')
        
        short_cap = analyze_audio_capacity(short)
        long_cap = analyze_audio_capacity(long)
        
        assert long_cap['total_samples'] > short_cap['total_samples']
