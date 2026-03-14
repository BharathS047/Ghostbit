"""
Tests for cryptographic operations.
"""

import pytest
from ghostbit.core.crypto import (
    KeyPair, load_public_key, Encryptor, Decryptor,
    encrypt_message, decrypt_message, derive_aes_key
)


class TestKeyPair:
    """Tests for KeyPair class."""
    
    def test_generate_keypair(self):
        """Test key pair generation."""
        keypair = KeyPair.generate()
        assert keypair.private_key is not None
        assert keypair.public_key is not None
    
    def test_private_pem_export(self):
        """Test private key PEM export."""
        keypair = KeyPair.generate()
        pem = keypair.private_pem()
        assert b"-----BEGIN PRIVATE KEY-----" in pem
        assert b"-----END PRIVATE KEY-----" in pem
    
    def test_public_pem_export(self):
        """Test public key PEM export."""
        keypair = KeyPair.generate()
        pem = keypair.public_pem()
        assert b"-----BEGIN PUBLIC KEY-----" in pem
        assert b"-----END PUBLIC KEY-----" in pem
    
    def test_load_from_private_pem(self):
        """Test loading key pair from private PEM."""
        keypair1 = KeyPair.generate()
        pem = keypair1.private_pem()
        
        keypair2 = KeyPair.from_private_pem(pem)
        assert keypair2.private_pem() == pem
    
    def test_load_public_key(self):
        """Test loading public key from PEM."""
        keypair = KeyPair.generate()
        pub_pem = keypair.public_pem()
        
        loaded = load_public_key(pub_pem)
        assert loaded is not None


class TestEncryption:
    """Tests for encryption/decryption."""
    
    def test_encrypt_decrypt_roundtrip(self):
        """Test basic encrypt/decrypt roundtrip."""
        receiver_keypair = KeyPair.generate()
        
        message = "Hello, World!"
        
        nonce, eph_pub, ciphertext = encrypt_message(
            message,
            receiver_keypair.public_key
        )
        
        decrypted = decrypt_message(
            nonce, eph_pub, ciphertext,
            receiver_keypair.private_key
        )
        
        assert decrypted == message
    
    def test_encrypt_decrypt_unicode(self):
        """Test encryption with unicode characters."""
        receiver_keypair = KeyPair.generate()
        
        message = "Hello, "
        
        nonce, eph_pub, ciphertext = encrypt_message(
            message,
            receiver_keypair.public_key
        )
        
        decrypted = decrypt_message(
            nonce, eph_pub, ciphertext,
            receiver_keypair.private_key
        )
        
        assert decrypted == message
    
    def test_encrypt_decrypt_empty_message(self):
        """Test encryption of empty message."""
        receiver_keypair = KeyPair.generate()
        
        message = ""
        
        nonce, eph_pub, ciphertext = encrypt_message(
            message,
            receiver_keypair.public_key
        )
        
        decrypted = decrypt_message(
            nonce, eph_pub, ciphertext,
            receiver_keypair.private_key
        )
        
        assert decrypted == message
    
    def test_encrypt_decrypt_long_message(self):
        """Test encryption of long message."""
        receiver_keypair = KeyPair.generate()
        
        message = "A" * 10000
        
        nonce, eph_pub, ciphertext = encrypt_message(
            message,
            receiver_keypair.public_key
        )
        
        decrypted = decrypt_message(
            nonce, eph_pub, ciphertext,
            receiver_keypair.private_key
        )
        
        assert decrypted == message
    
    def test_wrong_private_key_fails(self):
        """Test that wrong private key fails decryption."""
        receiver_keypair = KeyPair.generate()
        wrong_keypair = KeyPair.generate()
        
        message = "Secret message"
        
        nonce, eph_pub, ciphertext = encrypt_message(
            message,
            receiver_keypair.public_key
        )
        
        with pytest.raises(Exception):
            decrypt_message(
                nonce, eph_pub, ciphertext,
                wrong_keypair.private_key
            )
    
    def test_tampered_ciphertext_fails(self):
        """Test that tampered ciphertext fails decryption."""
        receiver_keypair = KeyPair.generate()
        
        message = "Secret message"
        
        nonce, eph_pub, ciphertext = encrypt_message(
            message,
            receiver_keypair.public_key
        )
        
        tampered = bytearray(ciphertext)
        tampered[0] ^= 0xFF
        tampered = bytes(tampered)
        
        with pytest.raises(Exception):
            decrypt_message(
                nonce, eph_pub, tampered,
                receiver_keypair.private_key
            )
    
    def test_encryptor_class(self):
        """Test Encryptor class directly."""
        receiver_keypair = KeyPair.generate()
        
        encryptor = Encryptor(receiver_keypair.public_key)
        plaintext = b"Test data"
        
        nonce, eph_pub, ciphertext = encryptor.encrypt(plaintext)
        
        assert len(nonce) == 12
        assert len(eph_pub) == 32
        assert len(ciphertext) > len(plaintext)
    
    def test_decryptor_class(self):
        """Test Decryptor class directly."""
        receiver_keypair = KeyPair.generate()
        
        encryptor = Encryptor(receiver_keypair.public_key)
        plaintext = b"Test data"
        nonce, eph_pub, ciphertext = encryptor.encrypt(plaintext)
        
        decryptor = Decryptor(receiver_keypair.private_key)
        decrypted = decryptor.decrypt(nonce, eph_pub, ciphertext)
        
        assert decrypted == plaintext


class TestKeyDerivation:
    """Tests for key derivation."""
    
    def test_derive_aes_key_deterministic(self):
        """Test that key derivation is deterministic."""
        shared_secret = b"test_secret_32_bytes_exactly!!"
        
        key1 = derive_aes_key(shared_secret)
        key2 = derive_aes_key(shared_secret)
        
        assert key1 == key2
    
    def test_derive_aes_key_length(self):
        """Test that derived key is 32 bytes."""
        shared_secret = b"test_secret"
        key = derive_aes_key(shared_secret)
        
        assert len(key) == 32
    
    def test_different_secrets_different_keys(self):
        """Test that different secrets produce different keys."""
        key1 = derive_aes_key(b"secret1")
        key2 = derive_aes_key(b"secret2")
        
        assert key1 != key2
