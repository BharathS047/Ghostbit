"""
Tests for key-seeded PRNG.
"""

import pytest
from ghostbit.core.prng import (
    KeySeededPRNG, derive_prng_seed, create_embedding_prng
)


class TestKeySeededPRNG:
    """Tests for KeySeededPRNG class."""
    
    def test_deterministic_output(self):
        """Test that same seed produces same output."""
        seed = b"test_seed_12345"
        
        prng1 = KeySeededPRNG(seed)
        prng2 = KeySeededPRNG(seed)
        
        assert prng1.get_bytes(32) == prng2.get_bytes(32)
    
    def test_different_seeds_different_output(self):
        """Test that different seeds produce different output."""
        prng1 = KeySeededPRNG(b"seed1")
        prng2 = KeySeededPRNG(b"seed2")
        
        assert prng1.get_bytes(32) != prng2.get_bytes(32)
    
    def test_get_bytes_length(self):
        """Test that get_bytes returns correct length."""
        prng = KeySeededPRNG(b"test")
        
        for length in [1, 16, 32, 100, 1000]:
            result = prng.get_bytes(length)
            assert len(result) == length
    
    def test_get_int_range(self):
        """Test that get_int returns values in range."""
        prng = KeySeededPRNG(b"test")
        
        for max_val in [10, 100, 1000, 10000]:
            for _ in range(100):
                val = prng.get_int(max_val)
                assert 0 <= val < max_val
    
    def test_get_int_invalid(self):
        """Test that get_int raises for invalid max_val."""
        prng = KeySeededPRNG(b"test")
        
        with pytest.raises(ValueError):
            prng.get_int(0)
        
        with pytest.raises(ValueError):
            prng.get_int(-1)
    
    def test_shuffle_deterministic(self):
        """Test that shuffle is deterministic."""
        seed = b"shuffle_test"
        items = list(range(100))
        
        prng1 = KeySeededPRNG(seed)
        prng2 = KeySeededPRNG(seed)
        
        shuffled1 = prng1.shuffle(items)
        shuffled2 = prng2.shuffle(items)
        
        assert shuffled1 == shuffled2
    
    def test_shuffle_preserves_elements(self):
        """Test that shuffle preserves all elements."""
        prng = KeySeededPRNG(b"test")
        items = list(range(50))
        
        shuffled = prng.shuffle(items)
        
        assert sorted(shuffled) == items
    
    def test_shuffle_actually_shuffles(self):
        """Test that shuffle changes order (with high probability)."""
        prng = KeySeededPRNG(b"test")
        items = list(range(100))
        
        shuffled = prng.shuffle(items)
        
        assert shuffled != items
    
    def test_select_positions(self):
        """Test position selection."""
        prng = KeySeededPRNG(b"test")
        positions = list(range(1000))
        
        selected = prng.select_positions(positions, 100)
        
        assert len(selected) == 100
        assert len(set(selected)) == 100
        assert all(p in positions for p in selected)
    
    def test_select_positions_too_many(self):
        """Test that selecting too many positions raises error."""
        prng = KeySeededPRNG(b"test")
        positions = list(range(10))
        
        with pytest.raises(ValueError):
            prng.select_positions(positions, 20)
    
    def test_reset(self):
        """Test PRNG reset."""
        prng = KeySeededPRNG(b"test")
        
        first_output = prng.get_bytes(32)
        prng.get_bytes(100)
        
        prng.reset()
        
        assert prng.get_bytes(32) == first_output


class TestPRNGSeedDerivation:
    """Tests for PRNG seed derivation."""
    
    def test_derive_prng_seed_deterministic(self):
        """Test that seed derivation is deterministic."""
        secret = b"shared_secret"
        
        seed1 = derive_prng_seed(secret)
        seed2 = derive_prng_seed(secret)
        
        assert seed1 == seed2
    
    def test_derive_prng_seed_length(self):
        """Test that derived seed is 32 bytes."""
        seed = derive_prng_seed(b"test")
        
        assert len(seed) == 32
    
    def test_different_secrets_different_seeds(self):
        """Test that different secrets produce different seeds."""
        seed1 = derive_prng_seed(b"secret1")
        seed2 = derive_prng_seed(b"secret2")
        
        assert seed1 != seed2
    
    def test_different_context_different_seeds(self):
        """Test that different contexts produce different seeds."""
        secret = b"shared_secret"
        
        seed1 = derive_prng_seed(secret, b"context1")
        seed2 = derive_prng_seed(secret, b"context2")
        
        assert seed1 != seed2


class TestEmbeddingPRNG:
    """Tests for embedding PRNG creation."""
    
    def test_create_embedding_prng_deterministic(self):
        """Test that embedding PRNG is deterministic."""
        eph_pub = b'\x01' * 32
        nonce = b'\x02' * 12
        
        prng1 = create_embedding_prng(eph_pub, nonce)
        prng2 = create_embedding_prng(eph_pub, nonce)
        
        assert prng1.get_bytes(64) == prng2.get_bytes(64)
    
    def test_different_eph_pub_different_prng(self):
        """Test that different eph_pub produces different PRNG."""
        nonce = b'\x00' * 12
        
        prng1 = create_embedding_prng(b'\x01' * 32, nonce)
        prng2 = create_embedding_prng(b'\x02' * 32, nonce)
        
        assert prng1.get_bytes(32) != prng2.get_bytes(32)
    
    def test_different_nonce_different_prng(self):
        """Test that different nonce produces different PRNG."""
        eph_pub = b'\x00' * 32
        
        prng1 = create_embedding_prng(eph_pub, b'\x01' * 12)
        prng2 = create_embedding_prng(eph_pub, b'\x02' * 12)
        
        assert prng1.get_bytes(32) != prng2.get_bytes(32)
