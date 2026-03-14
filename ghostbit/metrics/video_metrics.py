"""
Video quality metrics for steganography evaluation.
"""

import numpy as np
import cv2
import tempfile
import os
from typing import Dict, List, Tuple
import math

from .image_metrics import calculate_psnr, calculate_ssim, calculate_mse


def extract_frames(video_data: bytes) -> Tuple[List[np.ndarray], float]:
    """
    Extract frames from video data.
    
    Args:
        video_data: Video file bytes
        
    Returns:
        Tuple of (frames_list, fps)
    """
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
        f.write(video_data)
        temp_path = f.name
    
    try:
        cap = cv2.VideoCapture(temp_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        frames = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frames.append(frame)
        
        cap.release()
        return frames, fps
    finally:
        os.unlink(temp_path)


def calculate_video_psnr(original_frames: List[np.ndarray], stego_frames: List[np.ndarray]) -> Dict[str, float]:
    """
    Calculate PSNR metrics for video frames.
    
    Args:
        original_frames: List of original frames
        stego_frames: List of stego frames
        
    Returns:
        Dictionary with PSNR metrics
    """
    if len(original_frames) != len(stego_frames):
        raise ValueError("Frame counts must match")
    
    psnr_values = []
    
    for orig, stego in zip(original_frames, stego_frames):
        psnr = calculate_psnr(orig, stego)
        if not math.isinf(psnr):
            psnr_values.append(psnr)
    
    if not psnr_values:
        return {
            "min_psnr": float('inf'),
            "max_psnr": float('inf'),
            "avg_psnr": float('inf'),
            "std_psnr": 0.0
        }
    
    return {
        "min_psnr": float(np.min(psnr_values)),
        "max_psnr": float(np.max(psnr_values)),
        "avg_psnr": float(np.mean(psnr_values)),
        "std_psnr": float(np.std(psnr_values))
    }


def calculate_video_ssim(original_frames: List[np.ndarray], stego_frames: List[np.ndarray]) -> Dict[str, float]:
    """
    Calculate SSIM metrics for video frames.
    
    Args:
        original_frames: List of original frames
        stego_frames: List of stego frames
        
    Returns:
        Dictionary with SSIM metrics
    """
    if len(original_frames) != len(stego_frames):
        raise ValueError("Frame counts must match")
    
    ssim_values = []
    
    for orig, stego in zip(original_frames, stego_frames):
        ssim = calculate_ssim(orig, stego)
        ssim_values.append(ssim)
    
    return {
        "min_ssim": float(np.min(ssim_values)),
        "max_ssim": float(np.max(ssim_values)),
        "avg_ssim": float(np.mean(ssim_values)),
        "std_ssim": float(np.std(ssim_values))
    }


def calculate_temporal_consistency(stego_frames: List[np.ndarray]) -> float:
    """
    Calculate temporal consistency of stego video.
    Measures smoothness of frame transitions.
    
    Args:
        stego_frames: List of stego frames
        
    Returns:
        Consistency score (higher is better)
    """
    if len(stego_frames) < 2:
        return 1.0
    
    diffs = []
    for i in range(1, len(stego_frames)):
        diff = np.mean(np.abs(stego_frames[i].astype(float) - stego_frames[i-1].astype(float)))
        diffs.append(diff)
    
    consistency = 1.0 / (1.0 + np.std(diffs))
    return float(consistency)


def calculate_frame_modification_stats(
    original_frames: List[np.ndarray],
    stego_frames: List[np.ndarray]
) -> Dict[str, any]:
    """
    Calculate statistics about frame modifications.
    
    Args:
        original_frames: List of original frames
        stego_frames: List of stego frames
        
    Returns:
        Dictionary with modification statistics
    """
    modified_frames = 0
    total_modified_pixels = 0
    total_pixels = 0
    
    for orig, stego in zip(original_frames, stego_frames):
        diff = np.any(orig != stego, axis=2) if len(orig.shape) == 3 else (orig != stego)
        modified_pixels = np.sum(diff)
        frame_pixels = orig.shape[0] * orig.shape[1]
        
        if modified_pixels > 0:
            modified_frames += 1
            total_modified_pixels += modified_pixels
        
        total_pixels += frame_pixels
    
    return {
        "total_frames": len(original_frames),
        "modified_frames": modified_frames,
        "modification_rate": modified_frames / len(original_frames) if original_frames else 0,
        "pixel_modification_rate": total_modified_pixels / total_pixels if total_pixels > 0 else 0
    }


def analyze_video_quality(
    original_data: bytes,
    stego_data: bytes
) -> Dict[str, any]:
    """
    Perform comprehensive video quality analysis.
    
    Args:
        original_data: Original MP4 bytes
        stego_data: Stego MP4 bytes
        
    Returns:
        Dictionary with all quality metrics
    """
    original_frames, fps_orig = extract_frames(original_data)
    stego_frames, fps_stego = extract_frames(stego_data)
    
    if len(original_frames) != len(stego_frames):
        min_frames = min(len(original_frames), len(stego_frames))
        original_frames = original_frames[:min_frames]
        stego_frames = stego_frames[:min_frames]
    
    psnr_metrics = calculate_video_psnr(original_frames, stego_frames)
    ssim_metrics = calculate_video_ssim(original_frames, stego_frames)
    temporal_consistency = calculate_temporal_consistency(stego_frames)
    mod_stats = calculate_frame_modification_stats(original_frames, stego_frames)
    
    avg_psnr = psnr_metrics['avg_psnr']
    if math.isinf(avg_psnr):
        quality = "Perfect"
    elif avg_psnr > 50:
        quality = "Excellent"
    elif avg_psnr > 40:
        quality = "Good"
    elif avg_psnr > 30:
        quality = "Acceptable"
    else:
        quality = "Poor"
    
    return {
        **psnr_metrics,
        **ssim_metrics,
        "temporal_consistency": temporal_consistency,
        **mod_stats,
        "fps": fps_orig,
        "quality_assessment": quality
    }


def format_video_metrics(metrics: Dict[str, any]) -> str:
    """Format video metrics for display."""
    lines = [
        "=== Video Quality Metrics ===",
        f"PSNR (avg): {metrics['avg_psnr']:.2f} dB",
        f"PSNR (min/max): {metrics['min_psnr']:.2f} / {metrics['max_psnr']:.2f} dB",
        f"SSIM (avg): {metrics['avg_ssim']:.4f}",
        f"SSIM (min/max): {metrics['min_ssim']:.4f} / {metrics['max_ssim']:.4f}",
        f"Temporal Consistency: {metrics['temporal_consistency']:.4f}",
        f"Total Frames: {metrics['total_frames']}",
        f"Modified Frames: {metrics['modified_frames']} ({metrics['modification_rate']:.1%})",
        f"Pixel Modification Rate: {metrics['pixel_modification_rate']:.6%}",
        f"FPS: {metrics['fps']:.2f}",
        f"Quality Assessment: {metrics['quality_assessment']}"
    ]
    return "\n".join(lines)
