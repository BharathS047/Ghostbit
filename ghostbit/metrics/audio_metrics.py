"""
Audio quality metrics for steganography evaluation.
"""

import numpy as np
import soundfile as sf
import io
from typing import Dict
import math


def calculate_snr(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate Signal-to-Noise Ratio for audio.
    
    Args:
        original: Original audio samples
        stego: Stego audio samples
        
    Returns:
        SNR in dB
    """
    if original.shape != stego.shape:
        raise ValueError("Audio signals must have the same length")
    
    noise = stego.astype(float) - original.astype(float)
    
    signal_power = np.mean(original.astype(float) ** 2)
    noise_power = np.mean(noise ** 2)
    
    if noise_power == 0:
        return float('inf')
    
    snr = 10 * math.log10(signal_power / noise_power)
    return snr


def calculate_audio_psnr(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate PSNR for audio signals.
    
    Args:
        original: Original audio samples
        stego: Stego audio samples
        
    Returns:
        PSNR in dB
    """
    if original.shape != stego.shape:
        raise ValueError("Audio signals must have the same length")
    
    if np.issubdtype(original.dtype, np.floating):
        max_val = 1.0
    else:
        max_val = 32767
    
    mse = np.mean((original.astype(float) - stego.astype(float)) ** 2)
    
    if mse == 0:
        return float('inf')
    
    psnr = 10 * math.log10((max_val ** 2) / mse)
    return psnr


def calculate_correlation(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate normalized cross-correlation between signals.
    
    Args:
        original: Original audio samples
        stego: Stego audio samples
        
    Returns:
        Correlation coefficient (-1 to 1)
    """
    if len(original.shape) > 1:
        original = original[:, 0]
    if len(stego.shape) > 1:
        stego = stego[:, 0]
    
    original_norm = original - np.mean(original)
    stego_norm = stego - np.mean(stego)
    
    numerator = np.sum(original_norm * stego_norm)
    denominator = np.sqrt(np.sum(original_norm ** 2) * np.sum(stego_norm ** 2))
    
    if denominator == 0:
        return 1.0
    
    return float(numerator / denominator)


def calculate_spectral_distortion(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate spectral distortion between signals.
    
    Args:
        original: Original audio samples
        stego: Stego audio samples
        
    Returns:
        Spectral distortion measure (lower is better)
    """
    if len(original.shape) > 1:
        original = original[:, 0]
    if len(stego.shape) > 1:
        stego = stego[:, 0]
    
    spec_orig = np.abs(np.fft.rfft(original))
    spec_stego = np.abs(np.fft.rfft(stego))
    
    eps = 1e-10
    spec_orig = np.maximum(spec_orig, eps)
    spec_stego = np.maximum(spec_stego, eps)
    
    log_diff = np.log10(spec_orig / spec_stego)
    sd = np.sqrt(np.mean(log_diff ** 2))
    
    return float(sd)


def calculate_lsb_modification_rate(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate the rate of LSB modifications.
    
    Args:
        original: Original audio samples
        stego: Stego audio samples
        
    Returns:
        Modification rate (0 to 1)
    """
    if len(original.shape) > 1:
        original = original[:, 0]
    if len(stego.shape) > 1:
        stego = stego[:, 0]
    
    if np.issubdtype(original.dtype, np.floating):
        original_int = (original * 32767).astype(np.int16)
        stego_int = (stego * 32767).astype(np.int16)
    else:
        original_int = original.astype(np.int16)
        stego_int = stego.astype(np.int16)
    
    lsb_orig = original_int & 1
    lsb_stego = stego_int & 1
    
    modifications = np.sum(lsb_orig != lsb_stego)
    rate = modifications / len(original_int)
    
    return float(rate)


def analyze_audio_quality(
    original_data: bytes,
    stego_data: bytes
) -> Dict[str, float]:
    """
    Perform comprehensive audio quality analysis.
    
    Args:
        original_data: Original WAV bytes
        stego_data: Stego WAV bytes
        
    Returns:
        Dictionary with all quality metrics
    """
    original, sr_orig = sf.read(io.BytesIO(original_data))
    stego, sr_stego = sf.read(io.BytesIO(stego_data))
    
    if sr_orig != sr_stego:
        raise ValueError("Sample rates must match")
    
    if len(original.shape) > 1:
        original_mono = original[:, 0]
    else:
        original_mono = original
    
    if len(stego.shape) > 1:
        stego_mono = stego[:, 0]
    else:
        stego_mono = stego
    
    snr = calculate_snr(original_mono, stego_mono)
    psnr = calculate_audio_psnr(original_mono, stego_mono)
    correlation = calculate_correlation(original_mono, stego_mono)
    spectral_dist = calculate_spectral_distortion(original_mono, stego_mono)
    lsb_mod_rate = calculate_lsb_modification_rate(original_mono, stego_mono)
    
    return {
        "snr_db": snr,
        "psnr_db": psnr,
        "correlation": correlation,
        "spectral_distortion": spectral_dist,
        "lsb_modification_rate": lsb_mod_rate,
        "sample_rate": sr_orig,
        "duration_seconds": len(original) / sr_orig,
        "quality_assessment": "Excellent" if snr > 50 else "Good" if snr > 40 else "Acceptable" if snr > 30 else "Poor"
    }


def format_audio_metrics(metrics: Dict[str, float]) -> str:
    """Format audio metrics for display."""
    lines = [
        "=== Audio Quality Metrics ===",
        f"SNR: {metrics['snr_db']:.2f} dB",
        f"PSNR: {metrics['psnr_db']:.2f} dB",
        f"Correlation: {metrics['correlation']:.6f}",
        f"Spectral Distortion: {metrics['spectral_distortion']:.6f}",
        f"LSB Modification Rate: {metrics['lsb_modification_rate']:.4%}",
        f"Sample Rate: {metrics['sample_rate']} Hz",
        f"Duration: {metrics['duration_seconds']:.2f} s",
        f"Quality Assessment: {metrics['quality_assessment']}"
    ]
    return "\n".join(lines)
