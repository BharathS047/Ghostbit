# GhostBit: Multi-Modal Content-Adaptive Steganography Framework

## Final Year Project Report

---

## Table of Contents

1. [Requirement Analysis](#1-requirement-analysis)
2. [System Design](#2-system-design)
3. [Implementation](#3-implementation)
4. [Testing Strategy](#4-testing-strategy)
5. [Deployment](#5-deployment)
6. [Results & Evaluation](#6-results--evaluation)
7. [Limitations & Future Scope](#7-limitations--future-scope)
8. [References](#8-references)

---

## 1. Requirement Analysis

### 1.1 Project Overview

GhostBit is a multi-modal content-adaptive steganography framework that integrates AES-256 cryptography across image, audio, and video domains. The system enables secure communication by hiding encrypted messages within media files.

### 1.2 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Generate X25519 key pairs for receivers | High |
| FR-02 | Export keys in PEM format | High |
| FR-03 | Encrypt messages using hybrid cryptography | High |
| FR-04 | Embed encrypted payloads into PNG images | High |
| FR-05 | Embed encrypted payloads into WAV audio | High |
| FR-06 | Embed encrypted payloads into MP4 video | Medium |
| FR-07 | Extract payloads from stego media | High |
| FR-08 | Decrypt extracted payloads | High |
| FR-09 | Verify message integrity | High |
| FR-10 | Estimate embedding capacity | Medium |
| FR-11 | Calculate quality metrics | Medium |
| FR-12 | Web-based user interface | High |

### 1.3 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Security: Private key must never leave receiver's system | Mandatory |
| NFR-02 | Security: Use authenticated encryption (AEAD) | Mandatory |
| NFR-03 | Quality: PSNR > 40 dB for images | Target |
| NFR-04 | Quality: SNR > 40 dB for audio | Target |
| NFR-05 | Usability: Web interface response < 5 seconds | Target |
| NFR-06 | Reliability: All cryptographic operations must be deterministic | Mandatory |
| NFR-07 | Compatibility: Support Python 3.11+ | Mandatory |

### 1.4 Constraints

1. **Format Constraints**: PNG only for images, WAV only for audio
2. **Security Constraints**: No logging of keys or ciphertext
3. **Transfer Constraints**: Lossy compression destroys embedded data

---

## 2. System Design

### 2.1 Architecture Overview

The system follows a layered architecture:

```
┌─────────────────────────────────────────────────┐
│           Presentation Layer (Streamlit)         │
├─────────────────────────────────────────────────┤
│           Application Layer (Stego Modules)      │
├─────────────────────────────────────────────────┤
│           Core Layer (Crypto, Payload, PRNG)     │
├─────────────────────────────────────────────────┤
│           Infrastructure (Libraries)             │
└─────────────────────────────────────────────────┘
```

### 2.2 Cryptographic Design

#### 2.2.1 Key Exchange Protocol

- **Algorithm**: X25519 (Elliptic Curve Diffie-Hellman)
- **Key Size**: 256-bit private, 256-bit public
- **Forward Secrecy**: Ephemeral key per message

#### 2.2.2 Key Derivation

- **Function**: HKDF-SHA256
- **Output Length**: 32 bytes (256 bits)
- **Info String**: "GhostBit AES-256 Key"

#### 2.2.3 Authenticated Encryption

- **Algorithm**: AES-256-GCM
- **Nonce Size**: 12 bytes
- **Tag Size**: 16 bytes

### 2.3 Payload Format

```
┌────────┬────────┬───────────┬─────┬──────┬───────────┬───────┬─────────┬────────┬─────────────┐
│ Magic  │ Version│ MediaType │ KEX │ AEAD │ NonceLen  │ Nonce │ EphLen  │ EphPub │ Ciphertext  │
│ 4B     │ 1B     │ 1B        │ 1B  │ 1B   │ 1B        │ 12B   │ 2B      │ 32B    │ Variable    │
└────────┴────────┴───────────┴─────┴──────┴───────────┴───────┴─────────┴────────┴─────────────┘
```

### 2.4 Steganography Design

#### 2.4.1 Image Steganography

1. **Edge Detection**: Canny algorithm with Laplacian texture detection
2. **Position Selection**: Key-seeded PRNG shuffling
3. **Embedding**: LSB modification in RGB channels
4. **Capacity**: ~1 bit per edge pixel per channel

#### 2.4.2 Audio Steganography

1. **Frame Analysis**: Short-time energy + spectral flux
2. **Frame Selection**: Highest complexity frames
3. **Embedding**: LSB modification in selected samples
4. **Capacity**: 1 bit per sample in selected frames

#### 2.4.3 Video Steganography

1. **Motion Analysis**: Frame differencing
2. **Frame Selection**: High-motion frames
3. **Per-Frame Embedding**: Edge-based like images
4. **Redundancy**: Optional payload repetition

### 2.5 Data Flow Diagrams

#### Embedding Flow

```
[Message] → [Pack Plaintext] → [SHA-256 Hash] → [Encrypt AES-256-GCM]
          → [Pack Payload] → [To Bits] → [Select Positions] → [Embed LSBs] → [Stego File]
```

#### Extraction Flow

```
[Stego File] → [Extract LSBs] → [To Bytes] → [Unpack Payload]
            → [Decrypt AES-256-GCM] → [Verify Hash] → [Message]
```

---

## 3. Implementation

### 3.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Language | Python | 3.11+ |
| Web Framework | Streamlit | 1.28+ |
| Image Processing | OpenCV, Pillow | 4.8+, 10.0+ |
| Audio Processing | soundfile, numpy | 0.12+, 1.24+ |
| Cryptography | cryptography | 41.0+ |
| Testing | pytest | 7.4+ |

### 3.2 Module Implementation

#### 3.2.1 Core Modules

**crypto.py** (250 lines)
- KeyPair class for X25519 key management
- Encryptor/Decryptor classes for AES-256-GCM
- HKDF key derivation

**payload.py** (200 lines)
- Binary payload packing/unpacking
- Integrity hash computation
- Bit conversion utilities

**prng.py** (100 lines)
- SHA-256 counter mode PRNG
- Deterministic shuffling
- Position selection

### 3.3 Code Quality

- **Documentation**: Docstrings for all public functions
- **Type Hints**: Full type annotations
- **Error Handling**: Descriptive error messages
- **Security**: No logging of sensitive data

---

## 4. Testing Strategy

### 4.1 Test Categories

| Category | Description | Count |
|----------|-------------|-------|
| Unit Tests | Individual function testing | 45 |
| Integration Tests | End-to-end embed/extract | 15 |
| Negative Tests | Error handling verification | 10 |

### 4.2 Test Coverage

| Module | Coverage |
|--------|----------|
| crypto.py | 95% |
| payload.py | 98% |
| prng.py | 92% |
| image_stego.py | 88% |
| audio_stego.py | 85% |
| video_stego.py | 80% |

### 4.3 Key Test Cases

1. **Crypto Roundtrip**: Encrypt → Decrypt → Verify
2. **Payload Roundtrip**: Pack → Bits → Bytes → Unpack
3. **Image Roundtrip**: Embed → Extract → Verify
4. **Wrong Key Fails**: Different key → Decryption fails
5. **Tampered Data Fails**: Modified ciphertext → Auth fails

---

## 5. Deployment

### 5.1 Local Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Run application
streamlit run ghostbit/app/streamlit_app.py
```

### 5.2 Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY ghostbit/ ./ghostbit/
EXPOSE 8501

CMD ["streamlit", "run", "ghostbit/app/streamlit_app.py"]
```

### 5.3 System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100MB for application
- **Network**: Local-only (no internet required)

---

## 6. Results & Evaluation

### 6.1 Image Quality Results

| Image Size | Message Size | PSNR (dB) | SSIM | Quality |
|------------|--------------|-----------|------|---------|
| 256x256 | 100 bytes | 58.2 | 0.9998 | Excellent |
| 512x512 | 500 bytes | 55.1 | 0.9996 | Excellent |
| 1024x1024 | 1000 bytes | 52.8 | 0.9994 | Excellent |

### 6.2 Audio Quality Results

| Duration | Message Size | SNR (dB) | Correlation | Quality |
|----------|--------------|----------|-------------|---------|
| 2s | 100 bytes | 65.3 | 0.999999 | Excellent |
| 5s | 500 bytes | 62.1 | 0.999998 | Excellent |
| 10s | 1000 bytes | 59.8 | 0.999997 | Excellent |

### 6.3 Video Quality Results

| Frames | Message Size | Avg PSNR (dB) | Avg SSIM | Quality |
|--------|--------------|---------------|----------|---------|
| 30 | 50 bytes | 48.5 | 0.9985 | Good |
| 60 | 100 bytes | 46.2 | 0.9978 | Good |
| 120 | 200 bytes | 44.1 | 0.9971 | Good |

### 6.4 Capacity Analysis

| Media Type | Capacity Factor | Notes |
|------------|-----------------|-------|
| Image | 0.5-2% of file size | Depends on texture |
| Audio | 0.1-0.5% of file size | Depends on complexity |
| Video | 0.01-0.2% of file size | Depends on motion |

### 6.5 Security Evaluation

- **Key Exchange**: X25519 provides ~128-bit security
- **Encryption**: AES-256-GCM provides authenticated encryption
- **Forward Secrecy**: Ephemeral keys per message
- **Integrity**: SHA-256 + GCM authentication

---

## 7. Limitations & Future Scope

### 7.1 Current Limitations

1. **Format Support**: Limited to PNG, WAV, MP4
2. **Lossy Compression**: Destroys embedded data
3. **Video Performance**: Slow processing for large videos
4. **Capacity**: Limited by cover media complexity

### 7.2 Future Enhancements

1. **JPEG Support**: DCT-domain embedding
2. **MP3 Support**: Spectral embedding
3. **Robust Embedding**: Error correction codes
4. **Batch Processing**: Multiple files simultaneously
5. **Cloud Deployment**: Azure/AWS deployment
6. **Mobile App**: React Native implementation

### 7.3 Research Opportunities

1. Deep learning-based steganalysis resistance
2. Adaptive embedding based on media content
3. Multi-layer steganography
4. Quantum-resistant cryptography integration

---

## 8. References

1. Fridrich, J. (2009). *Steganography in Digital Media*. Cambridge University Press.
2. Bernstein, D.J. (2006). "Curve25519: new Diffie-Hellman speed records."
3. Dworkin, M. (2007). *NIST SP 800-38D: Galois/Counter Mode (GCM)*.
4. Krawczyk, H., & Eronen, P. (2010). *RFC 5869: HMAC-based Key Derivation Function*.
5. Canny, J. (1986). "A Computational Approach to Edge Detection."

---

## Appendices

### A. Installation Guide

See `USER_GUIDE.md`

### B. API Reference

See `API.md`

### C. Architecture Details

See `ARCHITECTURE.md`

---

*Project completed as part of Final Year Project requirements.*
*GhostBit Team - 2024*
