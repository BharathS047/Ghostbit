# GhostBit Architecture

## System Overview

GhostBit implements a hybrid cryptographic steganography system with three main layers:

1. **Cryptographic Layer**: Key exchange, encryption, and integrity verification
2. **Steganographic Layer**: Content-adaptive embedding and extraction
3. **Interface Layer**: Web-based user interface

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Streamlit Web UI                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Key Gen Tab │  │  Embed Tab   │  │ Extract Tab  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Steganography Layer                          │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐           │
│  │ Image Stego │   │ Audio Stego  │   │ Video Stego │           │
│  │  (PNG/LSB)  │   │  (WAV/LSB)   │   │ (MP4/Frame) │           │
│  └─────────────┘   └──────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Cryptographic Layer                          │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐           │
│  │   X25519    │   │  HKDF-SHA256 │   │ AES-256-GCM │           │
│  │ Key Exchange│   │ Key Derivation│  │  Encryption │           │
│  └─────────────┘   └──────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Payload Layer                               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ GHST | Ver | Media | KEX | AEAD | Nonce | EphPub | CT  │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Module Descriptions

### Core Modules

#### crypto.py
- `KeyPair`: X25519 key pair management
- `Encryptor`: Sender-side encryption with ephemeral keys
- `Decryptor`: Receiver-side decryption
- `derive_aes_key()`: HKDF key derivation

#### payload.py
- `pack_plaintext()`: Message + SHA-256 integrity hash
- `pack_payload()`: Full binary header with crypto parameters
- `payload_to_bits()`: Bit-level conversion for embedding

#### prng.py
- `KeySeededPRNG`: Deterministic PRNG from shared secret
- `create_embedding_prng()`: PRNG for position shuffling

#### capacity.py
- Capacity estimation for each media type
- Overhead calculation for payload format

### Stego Modules

#### image_stego.py
- Canny edge detection for position selection
- LSB embedding in RGB channels
- Key-seeded position shuffling

#### audio_stego.py
- Frame-based complexity analysis
- Spectral flux and energy computation
- LSB embedding in high-complexity frames

#### video_stego.py
- Motion score computation via frame differencing
- High-motion frame selection
- Edge-based embedding within selected frames

### Metrics Modules

#### image_metrics.py
- MSE, PSNR, SSIM calculations
- Histogram correlation
- Bit error rate

#### audio_metrics.py
- SNR, correlation coefficient
- Spectral distortion
- LSB modification rate

#### video_metrics.py
- Per-frame PSNR/SSIM
- Temporal consistency
- Frame modification statistics

## Data Flow

### Embedding Flow

```
Message → pack_plaintext() → Encrypt (AES-256-GCM) → pack_payload()
→ payload_to_bits() → PRNG position selection → LSB embedding → Stego file
```

### Extraction Flow

```
Stego file → LSB extraction → bits_to_payload() → unpack_payload()
→ Decrypt (AES-256-GCM) → unpack_plaintext() → Verify integrity → Message
```

## Security Model

### Key Management
- Receiver generates X25519 key pair locally
- Private key never transmitted
- Public key can be shared freely

### Encryption
- Ephemeral key per message (forward secrecy)
- AES-256-GCM provides authenticated encryption
- HKDF with context string for key derivation

### Integrity
- SHA-256 hash of plaintext message
- GCM authentication tag
- Payload magic bytes for format validation

## Steganography Strategies

### Image (Content-Adaptive LSB)
1. Detect edges using Canny algorithm
2. Dilate edges and detect texture via Laplacian
3. Shuffle positions using key-seeded PRNG
4. Embed bits in LSBs of selected pixels

### Audio (Complexity-Adaptive LSB)
1. Split into frames (2048 samples)
2. Compute energy and spectral flux per frame
3. Select highest complexity frames
4. Shuffle sample positions and embed bits

### Video (Motion-Adaptive LSB)
1. Compute motion scores via frame differencing
2. Select high-motion frames
3. Within frames, use edge-based pixel selection
4. Optional redundancy for error resilience
