"""
Key-seeded PRNG for deterministic position selection in steganography.
"""

import hashlib
import struct
from typing import List, Tuple


class KeySeededPRNG:
    """
    Deterministic PRNG seeded from shared secret.
    Uses SHA-256 in counter mode for reproducible randomness.
    """
    
    def __init__(self, seed: bytes):
        """
        Initialize PRNG with a seed.
        
        Args:
            seed: Seed bytes (typically derived from shared secret)
        """
        self.seed = hashlib.sha256(seed).digest()
        self.counter = 0
        self.buffer = b''
        self.buffer_pos = 0
    
    def _generate_block(self) -> bytes:
        """Generate next block of random bytes."""
        data = self.seed + struct.pack('>Q', self.counter)
        self.counter += 1
        return hashlib.sha256(data).digest()
    
    def _fill_buffer(self, min_bytes: int):
        """Ensure buffer has at least min_bytes available."""
        while len(self.buffer) - self.buffer_pos < min_bytes:
            self.buffer = self.buffer[self.buffer_pos:] + self._generate_block()
            self.buffer_pos = 0
    
    def get_bytes(self, n: int) -> bytes:
        """Get n random bytes."""
        self._fill_buffer(n)
        result = self.buffer[self.buffer_pos:self.buffer_pos + n]
        self.buffer_pos += n
        return result
    
    def get_int(self, max_val: int) -> int:
        """Get a uniform random integer in range [0, max_val).

        Uses rejection sampling on the raw byte range to avoid modulo bias:
        any draw at or above the largest multiple of max_val that fits in
        ``bytes_needed`` bytes is rejected and redrawn.
        """
        if max_val <= 0:
            raise ValueError("max_val must be positive")

        bytes_needed = max((max_val.bit_length() + 7) // 8, 1)
        span = 1 << (8 * bytes_needed)          # 256 ** bytes_needed
        limit = span - (span % max_val)         # largest unbiased ceiling

        while True:
            raw = int.from_bytes(self.get_bytes(bytes_needed), 'big')
            if raw < limit:
                return raw % max_val
    
    def shuffle(self, items: List) -> List:
        """
        Shuffle a list using Fisher-Yates algorithm.
        Returns a new shuffled list.
        """
        result = list(items)
        n = len(result)
        
        for i in range(n - 1, 0, -1):
            j = self.get_int(i + 1)
            result[i], result[j] = result[j], result[i]
        
        return result
    
    def select_positions(self, available: List, count: int) -> List:
        """
        Select 'count' positions from available list without replacement.
        Returns selected positions in shuffled order.
        """
        if count > len(available):
            raise ValueError(f"Cannot select {count} from {len(available)} positions")

        shuffled = self.shuffle(available)
        return shuffled[:count]

    def sample_indices(self, n: int, count: int) -> List[int]:
        """
        Select ``count`` distinct indices from ``[0, n)`` without replacement,
        returned in pseudo-random order.

        Runs in O(count) time and memory using a partial Fisher-Yates shuffle
        backed by a sparse swap map, so it never materialises the full ``n``
        candidate list — essential when sampling a small message's worth of
        positions out of millions of pixels/samples.
        """
        if count < 0:
            raise ValueError("count must be non-negative")
        if count > n:
            raise ValueError(f"Cannot select {count} indices from {n}")

        state: dict = {}
        chosen: List[int] = []
        for i in range(count):
            j = i + self.get_int(n - i)          # uniform in [i, n)
            chosen.append(state.get(j, j))       # a[j]
            state[j] = state.get(i, i)           # a[j] <- a[i]
        return chosen
    
    def reset(self):
        """Reset PRNG to initial state."""
        self.counter = 0
        self.buffer = b''
        self.buffer_pos = 0


def derive_prng_seed(shared_secret: bytes, context: bytes = b"GhostBit PRNG") -> bytes:
    """
    Derive PRNG seed from shared secret.
    
    Args:
        shared_secret: The ECDH shared secret
        context: Additional context for domain separation
        
    Returns:
        32-byte seed
    """
    return hashlib.sha256(context + shared_secret).digest()
