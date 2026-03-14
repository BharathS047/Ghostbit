"""
Cryptographic operations for GhostBit.
Implements X25519 key exchange, HKDF key derivation, and AES-256-GCM encryption.
"""

import os
import secrets
from typing import Tuple, Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend


HKDF_INFO = b"GhostBit AES-256 Key"
NONCE_LENGTH = 12
AES_KEY_LENGTH = 32


class KeyPair:
    """X25519 key pair for receiver."""
    
    def __init__(self, private_key: X25519PrivateKey):
        self._private_key = private_key
        self._public_key = private_key.public_key()
    
    @classmethod
    def generate(cls) -> "KeyPair":
        """Generate a new X25519 key pair."""
        private_key = X25519PrivateKey.generate()
        return cls(private_key)
    
    @classmethod
    def from_private_pem(cls, pem_data: bytes) -> "KeyPair":
        """Load key pair from private key PEM."""
        private_key = serialization.load_pem_private_key(
            pem_data,
            password=None,
            backend=default_backend()
        )
        if not isinstance(private_key, X25519PrivateKey):
            raise ValueError("Invalid key type. Expected X25519 private key.")
        return cls(private_key)
    
    @property
    def private_key(self) -> X25519PrivateKey:
        return self._private_key
    
    @property
    def public_key(self) -> X25519PublicKey:
        return self._public_key
    
    def private_pem(self) -> bytes:
        """Export private key as PEM."""
        return self._private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
    
    def public_pem(self) -> bytes:
        """Export public key as PEM."""
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )


def load_public_key(pem_data: bytes) -> X25519PublicKey:
    """Load X25519 public key from PEM data."""
    public_key = serialization.load_pem_public_key(
        pem_data,
        backend=default_backend()
    )
    if not isinstance(public_key, X25519PublicKey):
        raise ValueError("Invalid key type. Expected X25519 public key.")
    return public_key


def derive_aes_key(shared_secret: bytes) -> bytes:
    """Derive AES-256 key from shared secret using HKDF-SHA256."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=AES_KEY_LENGTH,
        salt=None,
        info=HKDF_INFO,
        backend=default_backend()
    )
    return hkdf.derive(shared_secret)


class Encryptor:
    """Handles encryption for sender."""
    
    def __init__(self, receiver_public_key: X25519PublicKey):
        self.receiver_public_key = receiver_public_key
        self.ephemeral_private = X25519PrivateKey.generate()
        self.ephemeral_public = self.ephemeral_private.public_key()
        
        shared_secret = self.ephemeral_private.exchange(receiver_public_key)
        self.aes_key = derive_aes_key(shared_secret)
    
    def encrypt(self, plaintext: bytes) -> Tuple[bytes, bytes, bytes]:
        """
        Encrypt plaintext using AES-256-GCM.
        
        Returns:
            Tuple of (nonce, ephemeral_public_key_bytes, ciphertext)
        """
        nonce = secrets.token_bytes(NONCE_LENGTH)
        aesgcm = AESGCM(self.aes_key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        
        eph_pub_bytes = self.ephemeral_public.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        
        return nonce, eph_pub_bytes, ciphertext
    
    def get_ephemeral_public_bytes(self) -> bytes:
        """Get ephemeral public key as raw bytes."""
        return self.ephemeral_public.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )


class Decryptor:
    """Handles decryption for receiver."""
    
    def __init__(self, private_key: X25519PrivateKey):
        self.private_key = private_key
    
    def decrypt(self, nonce: bytes, eph_pub_bytes: bytes, ciphertext: bytes) -> bytes:
        """
        Decrypt ciphertext using AES-256-GCM.
        
        Args:
            nonce: 12-byte nonce
            eph_pub_bytes: Ephemeral public key (32 bytes raw)
            ciphertext: Encrypted data with GCM tag
            
        Returns:
            Decrypted plaintext
        """
        eph_public_key = X25519PublicKey.from_public_bytes(eph_pub_bytes)
        shared_secret = self.private_key.exchange(eph_public_key)
        aes_key = derive_aes_key(shared_secret)
        
        aesgcm = AESGCM(aes_key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        
        return plaintext


def encrypt_message(message: str, receiver_public_key: X25519PublicKey) -> Tuple[bytes, bytes, bytes]:
    """
    Convenience function to encrypt a message.
    
    Args:
        message: UTF-8 string to encrypt
        receiver_public_key: Receiver's X25519 public key
        
    Returns:
        Tuple of (nonce, ephemeral_public_key_bytes, ciphertext)
    """
    encryptor = Encryptor(receiver_public_key)
    return encryptor.encrypt(message.encode('utf-8'))


def decrypt_message(
    nonce: bytes,
    eph_pub_bytes: bytes,
    ciphertext: bytes,
    private_key: X25519PrivateKey
) -> str:
    """
    Convenience function to decrypt a message.
    
    Args:
        nonce: 12-byte nonce
        eph_pub_bytes: Ephemeral public key bytes
        ciphertext: Encrypted data
        private_key: Receiver's X25519 private key
        
    Returns:
        Decrypted UTF-8 string
    """
    decryptor = Decryptor(private_key)
    plaintext = decryptor.decrypt(nonce, eph_pub_bytes, ciphertext)
    return plaintext.decode('utf-8')
