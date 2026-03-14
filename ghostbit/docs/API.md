# GhostBit API Reference

## Core Module

### crypto.py

#### KeyPair

```python
class KeyPair:
    """X25519 key pair for receiver."""
    
    @classmethod
    def generate(cls) -> "KeyPair":
        """Generate a new X25519 key pair."""
    
    @classmethod
    def from_private_pem(cls, pem_data: bytes) -> "KeyPair":
        """Load key pair from private key PEM."""
    
    def private_pem(self) -> bytes:
        """Export private key as PEM."""
    
    def public_pem(self) -> bytes:
        """Export public key as PEM."""
```

#### Encryptor

```python
class Encryptor:
    """Handles encryption for sender."""
    
    def __init__(self, receiver_public_key: X25519PublicKey):
        """Initialize with receiver's public key."""
    
    def encrypt(self, plaintext: bytes) -> Tuple[bytes, bytes, bytes]:
        """
        Encrypt plaintext using AES-256-GCM.
        
        Returns:
            Tuple of (nonce, ephemeral_public_key_bytes, ciphertext)
        """
```

#### Decryptor

```python
class Decryptor:
    """Handles decryption for receiver."""
    
    def __init__(self, private_key: X25519PrivateKey):
        """Initialize with receiver's private key."""
    
    def decrypt(self, nonce: bytes, eph_pub_bytes: bytes, ciphertext: bytes) -> bytes:
        """Decrypt ciphertext using AES-256-GCM."""
```

#### Functions

```python
def load_public_key(pem_data: bytes) -> X25519PublicKey:
    """Load X25519 public key from PEM data."""

def derive_aes_key(shared_secret: bytes) -> bytes:
    """Derive AES-256 key from shared secret using HKDF-SHA256."""

def encrypt_message(message: str, receiver_public_key: X25519PublicKey) -> Tuple[bytes, bytes, bytes]:
    """Convenience function to encrypt a message."""

def decrypt_message(nonce: bytes, eph_pub_bytes: bytes, ciphertext: bytes, private_key: X25519PrivateKey) -> str:
    """Convenience function to decrypt a message."""
```

### payload.py

#### Enums

```python
class MediaType(IntEnum):
    IMAGE = 1
    AUDIO = 2
    VIDEO = 3

class KexType(IntEnum):
    X25519 = 1

class AeadType(IntEnum):
    AESGCM = 1
```

#### PayloadHeader

```python
@dataclass
class PayloadHeader:
    magic: bytes
    version: int
    media_type: MediaType
    kex: KexType
    aead: AeadType
    nonce_len: int
    nonce: bytes
    eph_pub: bytes
    ciphertext: bytes
```

#### Functions

```python
def pack_plaintext(message: str) -> bytes:
    """Pack message with integrity hash."""

def unpack_plaintext(data: bytes) -> Tuple[str, bool]:
    """Unpack and verify plaintext. Returns (message, integrity_valid)."""

def pack_payload(media_type: MediaType, nonce: bytes, eph_pub: bytes, ciphertext: bytes) -> bytes:
    """Pack encrypted payload into binary format."""

def unpack_payload(data: bytes) -> PayloadHeader:
    """Unpack binary payload."""

def payload_to_bits(payload: bytes) -> list:
    """Convert payload bytes to list of bits."""

def bits_to_payload(bits: list) -> bytes:
    """Convert list of bits back to payload bytes."""
```

### prng.py

#### KeySeededPRNG

```python
class KeySeededPRNG:
    """Deterministic PRNG seeded from shared secret."""
    
    def __init__(self, seed: bytes):
        """Initialize PRNG with seed."""
    
    def get_bytes(self, n: int) -> bytes:
        """Get n random bytes."""
    
    def get_int(self, max_val: int) -> int:
        """Get random integer in range [0, max_val)."""
    
    def shuffle(self, items: List) -> List:
        """Shuffle a list using Fisher-Yates algorithm."""
    
    def select_positions(self, available: List, count: int) -> List:
        """Select 'count' positions without replacement."""
    
    def reset(self):
        """Reset PRNG to initial state."""
```

## Stego Module

### image_stego.py

#### ImageSteganography

```python
class ImageSteganography:
    """Image steganography handler for PNG files."""
    
    def __init__(self, bits_per_channel: int = 1):
        """Initialize with LSB count per channel."""
    
    def analyze_capacity(self, image_data: bytes) -> Dict[str, Any]:
        """Analyze embedding capacity."""
    
    def embed(self, cover_image_data: bytes, message: str, receiver_public_key_pem: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """Embed encrypted message. Returns (stego_png_bytes, metadata)."""
    
    def extract(self, stego_image_data: bytes, private_key_pem: bytes) -> Tuple[str, bool, Dict[str, Any]]:
        """Extract message. Returns (message, integrity_valid, metadata)."""
```

#### Convenience Functions

```python
def embed_image(cover_data: bytes, message: str, public_key_pem: bytes, bits_per_channel: int = 1) -> Tuple[bytes, Dict]:
    """Embed message into image."""

def extract_image(stego_data: bytes, private_key_pem: bytes, bits_per_channel: int = 1) -> Tuple[str, bool, Dict]:
    """Extract message from image."""

def analyze_image_capacity(image_data: bytes, bits_per_channel: int = 1) -> Dict[str, Any]:
    """Analyze image capacity."""
```

### audio_stego.py

#### AudioSteganography

```python
class AudioSteganography:
    """Audio steganography handler for WAV files."""
    
    def __init__(self, frame_size: int = 2048, hop_length: int = 1024, bits_per_sample: int = 1):
        """Initialize with frame parameters."""
    
    def analyze_capacity(self, audio_data: bytes) -> Dict[str, Any]:
        """Analyze embedding capacity."""
    
    def embed(self, cover_audio_data: bytes, message: str, receiver_public_key_pem: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """Embed encrypted message. Returns (stego_wav_bytes, metadata)."""
    
    def extract(self, stego_audio_data: bytes, private_key_pem: bytes) -> Tuple[str, bool, Dict[str, Any]]:
        """Extract message. Returns (message, integrity_valid, metadata)."""
```

### video_stego.py

#### VideoSteganography

```python
class VideoSteganography:
    """Video steganography handler for MP4 files."""
    
    def __init__(self, motion_frame_count: int = 10, bits_per_channel: int = 1, redundancy_factor: int = 1):
        """Initialize with video parameters."""
    
    def analyze_capacity(self, video_data: bytes) -> Dict[str, Any]:
        """Analyze embedding capacity."""
    
    def embed(self, cover_video_data: bytes, message: str, receiver_public_key_pem: bytes) -> Tuple[bytes, Dict[str, Any]]:
        """Embed encrypted message. Returns (stego_mp4_bytes, metadata)."""
    
    def extract(self, stego_video_data: bytes, private_key_pem: bytes) -> Tuple[str, bool, Dict[str, Any]]:
        """Extract message. Returns (message, integrity_valid, metadata)."""
```

## Metrics Module

### image_metrics.py

```python
def calculate_mse(original: np.ndarray, stego: np.ndarray) -> float:
    """Calculate Mean Squared Error."""

def calculate_psnr(original: np.ndarray, stego: np.ndarray, max_pixel: int = 255) -> float:
    """Calculate Peak Signal-to-Noise Ratio in dB."""

def calculate_ssim(original: np.ndarray, stego: np.ndarray) -> float:
    """Calculate Structural Similarity Index."""

def analyze_image_quality(original_data: bytes, stego_data: bytes) -> Dict[str, float]:
    """Perform comprehensive image quality analysis."""
```

### audio_metrics.py

```python
def calculate_snr(original: np.ndarray, stego: np.ndarray) -> float:
    """Calculate Signal-to-Noise Ratio in dB."""

def calculate_audio_psnr(original: np.ndarray, stego: np.ndarray) -> float:
    """Calculate PSNR for audio signals."""

def analyze_audio_quality(original_data: bytes, stego_data: bytes) -> Dict[str, float]:
    """Perform comprehensive audio quality analysis."""
```

### video_metrics.py

```python
def calculate_video_psnr(original_frames: List, stego_frames: List) -> Dict[str, float]:
    """Calculate PSNR metrics for video frames."""

def calculate_video_ssim(original_frames: List, stego_frames: List) -> Dict[str, float]:
    """Calculate SSIM metrics for video frames."""

def analyze_video_quality(original_data: bytes, stego_data: bytes) -> Dict[str, any]:
    """Perform comprehensive video quality analysis."""
```

## Usage Examples

### Basic Embedding

```python
from ghostbit.core.crypto import KeyPair
from ghostbit.stego.image_stego import embed_image, extract_image

# Generate keys (receiver)
keypair = KeyPair.generate()
private_pem = keypair.private_pem()
public_pem = keypair.public_pem()

# Embed message (sender)
with open("cover.png", "rb") as f:
    cover_data = f.read()

stego_data, metadata = embed_image(cover_data, "Secret message", public_pem)

with open("stego.png", "wb") as f:
    f.write(stego_data)

# Extract message (receiver)
with open("stego.png", "rb") as f:
    stego_data = f.read()

message, valid, metadata = extract_image(stego_data, private_pem)
print(f"Message: {message}, Integrity: {valid}")
```

### Quality Analysis

```python
from ghostbit.metrics.image_metrics import analyze_image_quality

metrics = analyze_image_quality(original_data, stego_data)
print(f"PSNR: {metrics['psnr_db']:.2f} dB")
print(f"SSIM: {metrics['ssim']:.4f}")
```
