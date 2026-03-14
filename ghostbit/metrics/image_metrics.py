"""
Image quality metrics for steganography evaluation.
"""

import numpy as np
import cv2
from typing import Dict, Tuple
import math


def calculate_mse(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate Mean Squared Error between two images.
    
    Args:
        original: Original image array
        stego: Stego image array
        
    Returns:
        MSE value
    """
    if original.shape != stego.shape:
        raise ValueError("Images must have the same dimensions")
    
    mse = np.mean((original.astype(float) - stego.astype(float)) ** 2)
    return float(mse)


def calculate_psnr(original: np.ndarray, stego: np.ndarray, max_pixel: int = 255) -> float:
    """
    Calculate Peak Signal-to-Noise Ratio.
    
    Args:
        original: Original image array
        stego: Stego image array
        max_pixel: Maximum pixel value (default: 255)
        
    Returns:
        PSNR in dB
    """
    mse = calculate_mse(original, stego)
    
    if mse == 0:
        return float('inf')
    
    psnr = 10 * math.log10((max_pixel ** 2) / mse)
    return psnr


def calculate_ssim(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate Structural Similarity Index (simplified version).
    
    Args:
        original: Original image array
        stego: Stego image array
        
    Returns:
        SSIM value between 0 and 1
    """
    if original.shape != stego.shape:
        raise ValueError("Images must have the same dimensions")
    
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2
    
    original_f = original.astype(float)
    stego_f = stego.astype(float)
    
    mu_x = np.mean(original_f)
    mu_y = np.mean(stego_f)
    
    sigma_x = np.std(original_f)
    sigma_y = np.std(stego_f)
    
    sigma_xy = np.mean((original_f - mu_x) * (stego_f - mu_y))
    
    numerator = (2 * mu_x * mu_y + C1) * (2 * sigma_xy + C2)
    denominator = (mu_x ** 2 + mu_y ** 2 + C1) * (sigma_x ** 2 + sigma_y ** 2 + C2)
    
    ssim = numerator / denominator
    return float(ssim)


def calculate_histogram_similarity(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate histogram correlation between images.
    
    Args:
        original: Original image array
        stego: Stego image array
        
    Returns:
        Correlation coefficient (1.0 = identical histograms)
    """
    if len(original.shape) == 3:
        original_gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        stego_gray = cv2.cvtColor(stego, cv2.COLOR_BGR2GRAY)
    else:
        original_gray = original
        stego_gray = stego
    
    hist_original = cv2.calcHist([original_gray], [0], None, [256], [0, 256])
    hist_stego = cv2.calcHist([stego_gray], [0], None, [256], [0, 256])
    
    cv2.normalize(hist_original, hist_original)
    cv2.normalize(hist_stego, hist_stego)
    
    correlation = cv2.compareHist(hist_original, hist_stego, cv2.HISTCMP_CORREL)
    return float(correlation)


def calculate_bit_error_rate(original: np.ndarray, stego: np.ndarray) -> float:
    """
    Calculate bit error rate between images.
    
    Args:
        original: Original image array
        stego: Stego image array
        
    Returns:
        BER value (0.0 = identical)
    """
    if original.shape != stego.shape:
        raise ValueError("Images must have the same dimensions")
    
    original_bits = np.unpackbits(original.flatten().astype(np.uint8))
    stego_bits = np.unpackbits(stego.flatten().astype(np.uint8))
    
    errors = np.sum(original_bits != stego_bits)
    ber = errors / len(original_bits)
    
    return float(ber)


def analyze_image_quality(
    original_data: bytes,
    stego_data: bytes
) -> Dict[str, float]:
    """
    Perform comprehensive image quality analysis.
    
    Args:
        original_data: Original PNG bytes
        stego_data: Stego PNG bytes
        
    Returns:
        Dictionary with all quality metrics
    """
    original_arr = np.frombuffer(original_data, np.uint8)
    stego_arr = np.frombuffer(stego_data, np.uint8)
    
    original = cv2.imdecode(original_arr, cv2.IMREAD_COLOR)
    stego = cv2.imdecode(stego_arr, cv2.IMREAD_COLOR)
    
    if original is None or stego is None:
        raise ValueError("Failed to decode images")
    
    mse = calculate_mse(original, stego)
    psnr = calculate_psnr(original, stego)
    ssim = calculate_ssim(original, stego)
    hist_corr = calculate_histogram_similarity(original, stego)
    ber = calculate_bit_error_rate(original, stego)
    
    return {
        "mse": mse,
        "psnr_db": psnr,
        "ssim": ssim,
        "histogram_correlation": hist_corr,
        "bit_error_rate": ber,
        "quality_assessment": "Excellent" if psnr > 50 else "Good" if psnr > 40 else "Acceptable" if psnr > 30 else "Poor"
    }


def format_image_metrics(metrics: Dict[str, float]) -> str:
    """Format image metrics for display."""
    lines = [
        "=== Image Quality Metrics ===",
        f"MSE: {metrics['mse']:.4f}",
        f"PSNR: {metrics['psnr_db']:.2f} dB",
        f"SSIM: {metrics['ssim']:.4f}",
        f"Histogram Correlation: {metrics['histogram_correlation']:.4f}",
        f"Bit Error Rate: {metrics['bit_error_rate']:.6f}",
        f"Quality Assessment: {metrics['quality_assessment']}"
    ]
    return "\n".join(lines)
