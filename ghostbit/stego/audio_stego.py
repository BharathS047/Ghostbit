"""
Audio steganography module for WAV files.
Uses frame complexity analysis for content-adaptive embedding.
"""

import struct
import numpy as np
import soundfile as sf
import io
from typing import Tuple, List, Dict, Any, Optional

from ..core.prng import KeySeededPRNG, derive_prng_seed
from ..core.payload import (
    MediaType, pack_payload, unpack_payload, unpack_payload_header,
    pack_plaintext, unpack_plaintext, payload_to_bits, bits_to_payload,
)
from ..core.crypto import Encryptor, Decryptor, load_public_key, KeyPair
from ..core.capacity import estimate_audio_capacity


def compute_frame_energy(frame: np.ndarray) -> float:
    """Compute short-time energy of a frame."""
    return np.sum(frame ** 2) / len(frame)


def compute_spectral_flux(frame: np.ndarray, prev_frame: np.ndarray) -> float:
    """
    Compute spectral flux between consecutive frames.
    Measures spectral change over time.
    """
    if prev_frame is None or len(prev_frame) == 0:
        return 0.0
    
    fft_curr = np.abs(np.fft.rfft(frame))
    fft_prev = np.abs(np.fft.rfft(prev_frame))
    
    min_len = min(len(fft_curr), len(fft_prev))
    fft_curr = fft_curr[:min_len]
    fft_prev = fft_prev[:min_len]
    
    diff = fft_curr - fft_prev
    flux = np.sum(diff[diff > 0] ** 2)
    
    return flux


def analyze_frame_complexity(
    audio: np.ndarray,
    frame_size: int = 2048,
    hop_length: int = 1024
) -> List[Tuple[int, float]]:
    """
    Analyze complexity of audio frames.
    
    Args:
        audio: Audio samples (mono)
        frame_size: Samples per frame
        hop_length: Samples between frame starts
        
    Returns:
        List of (frame_start_index, complexity_score) tuples
    """
    frame_scores = []
    prev_frame = None
    
    for start in range(0, len(audio) - frame_size, hop_length):
        frame = audio[start:start + frame_size]
        
        energy = compute_frame_energy(frame)
        flux = compute_spectral_flux(frame, prev_frame)
        
        complexity = energy * 0.3 + flux * 0.7
        frame_scores.append((start, complexity))
        
        prev_frame = frame
    
    return frame_scores


def select_complex_frames(
    frame_scores: List[Tuple[int, float]],
    count: int
) -> List[int]:
    """
    Select the most complex frames for embedding.
    
    Args:
        frame_scores: List of (frame_start, complexity) tuples
        count: Number of frames to select
        
    Returns:
        List of frame start indices
    """
    sorted_frames = sorted(frame_scores, key=lambda x: x[1], reverse=True)
    selected = [f[0] for f in sorted_frames[:count]]
    return sorted(selected)


def embed_bit_in_sample(sample: np.int16, bit: int) -> np.int16:
    """Embed a bit in the LSB of a sample."""
    return np.int16((int(sample) & ~1) | bit)


def extract_bit_from_sample(sample: np.int16) -> int:
    """Extract LSB from a sample."""
    return int(sample) & 1


class AudioSteganography:
    """Audio steganography handler for WAV files."""
    
    def __init__(
        self,
        frame_size: int = 2048,
        hop_length: int = 1024,
        bits_per_sample: int = 1
    ):
        """
        Initialize audio steganography.
        
        Args:
            frame_size: Samples per frame
            hop_length: Samples between frames
            bits_per_sample: LSBs to use per sample (typically 1)
        """
        self.frame_size = frame_size
        self.hop_length = hop_length
        self.bits_per_sample = bits_per_sample
    
    def analyze_capacity(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Analyze embedding capacity of audio.
        
        Args:
            audio_data: WAV file bytes
            
        Returns:
            Capacity analysis dictionary
        """
        audio, sample_rate = sf.read(io.BytesIO(audio_data))
        
        if len(audio.shape) > 1:
            audio = audio[:, 0]
        
        total_samples = len(audio)
        
        frame_scores = analyze_frame_complexity(audio, self.frame_size, self.hop_length)
        
        max_frames = len(frame_scores) // 2
        
        return estimate_audio_capacity(
            total_samples=total_samples,
            complex_frame_count=max_frames,
            frame_size=self.frame_size,
            bits_per_sample=self.bits_per_sample
        )
    
    def embed(
        self,
        cover_audio_data: bytes,
        message: str,
        receiver_public_key_pem: bytes
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Embed encrypted message into cover audio.
        
        Args:
            cover_audio_data: WAV file bytes
            message: Secret message to embed
            receiver_public_key_pem: Receiver's public key PEM
            
        Returns:
            Tuple of (stego_wav_bytes, metadata_dict)
        """
        audio, sample_rate = sf.read(io.BytesIO(cover_audio_data))
        original_shape = audio.shape
        original_dtype = audio.dtype
        
        if len(audio.shape) > 1:
            audio_mono = audio[:, 0].copy()
            is_stereo = True
        else:
            audio_mono = audio.copy()
            is_stereo = False
        
        if np.issubdtype(original_dtype, np.floating):
            audio_int = (audio_mono * 32767).astype(np.int16)
        else:
            audio_int = audio_mono.astype(np.int16)
        
        receiver_pub = load_public_key(receiver_public_key_pem)
        encryptor = Encryptor(receiver_pub)

        plaintext = pack_plaintext(message)
        nonce, eph_pub, ciphertext = encryptor.encrypt(plaintext)

        payload = pack_payload(MediaType.AUDIO, nonce, eph_pub, ciphertext)
        header_part = payload[:len(payload) - len(ciphertext)]   # magic … ct_len
        region_a = struct.pack('>I', len(header_part)) + header_part

        # One LSB per sample: header is sequential, ciphertext is shuffled by a
        # PRNG seeded from the ECDH shared secret (see image_stego.embed).
        a_bits = payload_to_bits(region_a)
        c_bits = payload_to_bits(ciphertext)
        a_samples = len(a_bits)
        c_samples = len(c_bits)
        total_samples = len(audio_int)
        pool_n = total_samples - a_samples

        if c_samples > pool_n:
            raise ValueError(
                f"Message too large: need {a_samples + c_samples} samples, "
                f"only {total_samples} samples available"
            )

        stego_audio = audio_int.copy()

        # Header: sequential samples [0, a_samples)
        for i in range(a_samples):
            stego_audio[i] = embed_bit_in_sample(stego_audio[i], a_bits[i])

        # Ciphertext: shared-secret-seeded sample positions from the remaining pool
        prng = KeySeededPRNG(derive_prng_seed(encryptor.shared_secret))
        for bit, p in zip(c_bits, prng.sample_indices(pool_n, c_samples)):
            k = a_samples + p
            stego_audio[k] = embed_bit_in_sample(stego_audio[k], bit)

        if is_stereo:
            stego_out = np.zeros_like(audio, dtype=np.int16)
            stego_out[:, 0] = stego_audio
            if len(audio.shape) > 1:
                for ch in range(1, audio.shape[1]):
                    if np.issubdtype(original_dtype, np.floating):
                        stego_out[:, ch] = (audio[:, ch] * 32767).astype(np.int16)
                    else:
                        stego_out[:, ch] = audio[:, ch].astype(np.int16)
        else:
            stego_out = stego_audio
        
        output_buffer = io.BytesIO()
        sf.write(output_buffer, stego_out, sample_rate, format='WAV', subtype='PCM_16')
        stego_wav_bytes = output_buffer.getvalue()
        
        metadata = {
            "samples_used": a_samples + c_samples,
            "bits_embedded": a_samples + c_samples,
            "payload_size": len(payload),
            "sample_rate": sample_rate,
            "duration_seconds": len(audio) / sample_rate
        }

        return stego_wav_bytes, metadata
    
    def extract(
        self,
        stego_audio_data: bytes,
        private_key_pem: bytes
    ) -> Tuple[str, bool, Dict[str, Any]]:
        """
        Extract and decrypt message from stego audio.
        
        Args:
            stego_audio_data: Stego WAV bytes
            private_key_pem: Receiver's private key PEM
            
        Returns:
            Tuple of (message, integrity_valid, metadata_dict)
        """
        audio, sample_rate = sf.read(io.BytesIO(stego_audio_data), dtype='int16')

        if len(audio.shape) > 1:
            audio_int = audio[:, 0]
        else:
            audio_int = audio

        total_samples = len(audio_int)

        # 1) Read the 4-byte header-region length from the sequential prefix.
        if total_samples < 32:
            raise ValueError("Audio too small to contain a payload")
        length_bits = [extract_bit_from_sample(audio_int[i]) for i in range(32)]
        header_len = int.from_bytes(bits_to_payload(length_bits), 'big')

        min_header_size = 9 + 12 + 2 + 32 + 4
        if header_len < min_header_size or header_len > 4096:
            raise ValueError("Invalid payload length or corrupted data")

        # 2) Read the full header region sequentially and parse it.
        a_samples = 32 + header_len * 8
        if a_samples > total_samples:
            raise ValueError("Not enough samples for payload header")
        a_bits = [extract_bit_from_sample(audio_int[i]) for i in range(a_samples)]
        region_a = bits_to_payload(a_bits)
        header_part = region_a[4:4 + header_len]

        info = unpack_payload_header(header_part)
        if info.media_type != MediaType.AUDIO:
            raise ValueError(f"Wrong media type: expected AUDIO, got {info.media_type}")

        # 3) Re-derive the shared secret and the same shuffled ciphertext positions.
        keypair = KeyPair.from_private_pem(private_key_pem)
        decryptor = Decryptor(keypair.private_key)
        prng = KeySeededPRNG(derive_prng_seed(decryptor.derive_shared_secret(info.eph_pub)))

        pool_n = total_samples - a_samples
        c_samples = info.ct_len * 8
        if c_samples > pool_n:
            raise ValueError("Not enough samples for payload extraction")
        c_bits = [
            extract_bit_from_sample(audio_int[a_samples + p])
            for p in prng.sample_indices(pool_n, c_samples)
        ]
        ciphertext = bits_to_payload(c_bits)

        # 4) Reassemble, decrypt, verify.
        header = unpack_payload(header_part + ciphertext)
        plaintext = decryptor.decrypt(header.nonce, header.eph_pub, header.ciphertext)
        message, integrity_valid = unpack_plaintext(plaintext)

        metadata = {
            "payload_size": len(header_part) + len(ciphertext),
            "media_type": "audio",
            "integrity_verified": integrity_valid,
            "sample_rate": sample_rate
        }

        return message, integrity_valid, metadata


def embed_audio(
    cover_audio_data: bytes,
    message: str,
    receiver_public_key_pem: bytes,
    frame_size: int = 2048,
    hop_length: int = 1024
) -> Tuple[bytes, Dict[str, Any]]:
    """Convenience function for audio embedding."""
    stego = AudioSteganography(frame_size, hop_length)
    return stego.embed(cover_audio_data, message, receiver_public_key_pem)


def extract_audio(
    stego_audio_data: bytes,
    private_key_pem: bytes,
    frame_size: int = 2048,
    hop_length: int = 1024
) -> Tuple[str, bool, Dict[str, Any]]:
    """Convenience function for audio extraction."""
    stego = AudioSteganography(frame_size, hop_length)
    return stego.extract(stego_audio_data, private_key_pem)


def analyze_audio_capacity(
    audio_data: bytes,
    frame_size: int = 2048,
    hop_length: int = 1024
) -> Dict[str, Any]:
    """Convenience function for capacity analysis."""
    stego = AudioSteganography(frame_size, hop_length)
    return stego.analyze_capacity(audio_data)
