"""
Capacity estimation for different media types.
"""

from typing import Tuple, Dict, Any
import numpy as np


def estimate_image_capacity(
    width: int,
    height: int,
    edge_pixel_count: int,
    bits_per_channel: int = 1,
    channels: int = 3
) -> Dict[str, Any]:
    """
    Estimate embedding capacity for an image.
    
    Args:
        width: Image width in pixels
        height: Image height in pixels
        edge_pixel_count: Number of edge/textured pixels detected
        bits_per_channel: Bits to embed per color channel
        channels: Number of color channels (typically 3 for RGB)
        
    Returns:
        Dictionary with capacity metrics
    """
    total_pixels = width * height
    usable_pixels = edge_pixel_count
    
    bits_per_pixel = bits_per_channel * channels
    total_capacity_bits = usable_pixels * bits_per_pixel
    total_capacity_bytes = total_capacity_bits // 8
    
    overhead_bytes = 4 + 1 + 1 + 1 + 1 + 1 + 12 + 2 + 32 + 4 + 16 + 4 + 32
    usable_capacity_bytes = max(0, total_capacity_bytes - overhead_bytes)
    
    return {
        "total_pixels": total_pixels,
        "usable_pixels": usable_pixels,
        "bits_per_pixel": bits_per_pixel,
        "total_capacity_bits": total_capacity_bits,
        "total_capacity_bytes": total_capacity_bytes,
        "overhead_bytes": overhead_bytes,
        "usable_capacity_bytes": usable_capacity_bytes,
        "utilization_ratio": usable_pixels / total_pixels if total_pixels > 0 else 0
    }


def estimate_audio_capacity(
    total_samples: int,
    complex_frame_count: int,
    frame_size: int = 2048,
    bits_per_sample: int = 1
) -> Dict[str, Any]:
    """
    Estimate embedding capacity for audio.
    
    Args:
        total_samples: Total number of audio samples
        complex_frame_count: Number of high-complexity frames selected
        frame_size: Samples per frame
        bits_per_sample: Bits to embed per sample
        
    Returns:
        Dictionary with capacity metrics
    """
    usable_samples = complex_frame_count * frame_size
    total_capacity_bits = usable_samples * bits_per_sample
    total_capacity_bytes = total_capacity_bits // 8
    
    overhead_bytes = 4 + 1 + 1 + 1 + 1 + 1 + 12 + 2 + 32 + 4 + 16 + 4 + 32
    usable_capacity_bytes = max(0, total_capacity_bytes - overhead_bytes)
    
    return {
        "total_samples": total_samples,
        "usable_samples": usable_samples,
        "complex_frame_count": complex_frame_count,
        "bits_per_sample": bits_per_sample,
        "total_capacity_bits": total_capacity_bits,
        "total_capacity_bytes": total_capacity_bytes,
        "overhead_bytes": overhead_bytes,
        "usable_capacity_bytes": usable_capacity_bytes,
        "utilization_ratio": usable_samples / total_samples if total_samples > 0 else 0
    }


def estimate_video_capacity(
    total_frames: int,
    selected_frame_count: int,
    frame_width: int,
    frame_height: int,
    avg_edge_pixels_per_frame: int,
    bits_per_channel: int = 1,
    channels: int = 3,
    redundancy_factor: int = 1
) -> Dict[str, Any]:
    """
    Estimate embedding capacity for video.
    
    Args:
        total_frames: Total number of video frames
        selected_frame_count: Number of high-motion frames selected
        frame_width: Frame width in pixels
        frame_height: Frame height in pixels
        avg_edge_pixels_per_frame: Average edge pixels per selected frame
        bits_per_channel: Bits to embed per color channel
        channels: Number of color channels
        redundancy_factor: How many times to repeat payload (for error resilience)
        
    Returns:
        Dictionary with capacity metrics
    """
    bits_per_pixel = bits_per_channel * channels
    total_edge_pixels = selected_frame_count * avg_edge_pixels_per_frame
    raw_capacity_bits = total_edge_pixels * bits_per_pixel
    
    effective_capacity_bits = raw_capacity_bits // redundancy_factor
    total_capacity_bytes = effective_capacity_bits // 8
    
    overhead_bytes = 4 + 1 + 1 + 1 + 1 + 1 + 12 + 2 + 32 + 4 + 16 + 4 + 32
    usable_capacity_bytes = max(0, total_capacity_bytes - overhead_bytes)
    
    return {
        "total_frames": total_frames,
        "selected_frames": selected_frame_count,
        "frame_dimensions": (frame_width, frame_height),
        "avg_edge_pixels_per_frame": avg_edge_pixels_per_frame,
        "bits_per_pixel": bits_per_pixel,
        "redundancy_factor": redundancy_factor,
        "raw_capacity_bits": raw_capacity_bits,
        "effective_capacity_bits": effective_capacity_bits,
        "total_capacity_bytes": total_capacity_bytes,
        "overhead_bytes": overhead_bytes,
        "usable_capacity_bytes": usable_capacity_bytes,
        "utilization_ratio": selected_frame_count / total_frames if total_frames > 0 else 0
    }


def check_capacity(required_bytes: int, available_bytes: int) -> Tuple[bool, str]:
    """
    Check if there's enough capacity for embedding.
    
    Args:
        required_bytes: Bytes needed for payload
        available_bytes: Available capacity in bytes
        
    Returns:
        Tuple of (can_embed, message)
    """
    if required_bytes <= available_bytes:
        usage_percent = (required_bytes / available_bytes) * 100 if available_bytes > 0 else 0
        return True, f"Capacity OK: {required_bytes}/{available_bytes} bytes ({usage_percent:.1f}% usage)"
    else:
        shortfall = required_bytes - available_bytes
        return False, f"Insufficient capacity: need {required_bytes} bytes, have {available_bytes} bytes (short by {shortfall} bytes)"


def format_capacity_info(capacity_dict: Dict[str, Any], media_type: str) -> str:
    """Format capacity information for display."""
    lines = [f"=== {media_type.upper()} Capacity Analysis ==="]
    
    if media_type == "image":
        lines.append(f"Total pixels: {capacity_dict['total_pixels']:,}")
        lines.append(f"Edge/textured pixels: {capacity_dict['usable_pixels']:,}")
        lines.append(f"Utilization: {capacity_dict['utilization_ratio']*100:.1f}%")
    elif media_type == "audio":
        lines.append(f"Total samples: {capacity_dict['total_samples']:,}")
        lines.append(f"Usable samples: {capacity_dict['usable_samples']:,}")
        lines.append(f"Complex frames: {capacity_dict['complex_frame_count']}")
    elif media_type == "video":
        lines.append(f"Total frames: {capacity_dict['total_frames']}")
        lines.append(f"Selected frames: {capacity_dict['selected_frames']}")
        lines.append(f"Redundancy: {capacity_dict['redundancy_factor']}x")
    
    lines.append(f"Raw capacity: {capacity_dict['total_capacity_bytes']:,} bytes")
    lines.append(f"Protocol overhead: {capacity_dict['overhead_bytes']} bytes")
    lines.append(f"Usable capacity: {capacity_dict['usable_capacity_bytes']:,} bytes")
    
    return "\n".join(lines)
