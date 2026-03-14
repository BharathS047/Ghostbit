# GhostBit

**Multi-Modal Content-Adaptive Steganography Framework Integrating AES-256 Cryptography**

GhostBit is a secure steganography framework that enables hiding encrypted messages within images, audio, and video files using hybrid cryptography.

## Features

- **Hybrid Cryptography**: X25519 key exchange, HKDF-SHA256 key derivation, AES-256-GCM encryption
- **Content-Adaptive Embedding**: Uses edge detection (images), spectral complexity (audio), and motion analysis (video)
- **Integrity Verification**: SHA-256 hash verification for message integrity
- **Quality Metrics**: PSNR, SSIM, SNR analysis for embedded media
- **Web Interface**: Streamlit-based UI for easy embedding and extraction

## Supported Formats

| Media Type | Input | Output | Method |
|------------|-------|--------|--------|
| Image | PNG | PNG | Edge-based LSB |
| Audio | WAV | WAV | Complexity-based LSB |
| Video | MP4 | MP4 | Motion-based frame embedding |

## Installation

```bash
# Clone the repository
cd GhostBit

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

## Quick Start

### Run the Web Application

```bash
streamlit run ghostbit/app/streamlit_app.py
```

Open your browser to `http://localhost:8501`

### Workflow

1. **Receiver generates keys**: Generate X25519 key pair, share public key
2. **Sender embeds message**: Load public key, enter message, embed in media
3. **Receiver extracts**: Load private key, extract and decrypt message

## Project Structure

```
ghostbit/
├── app/
│   └── streamlit_app.py      # Web interface
├── core/
│   ├── crypto.py             # X25519, HKDF, AES-256-GCM
│   ├── payload.py            # Binary payload format
│   ├── prng.py               # Key-seeded PRNG
│   └── capacity.py           # Capacity estimation
├── stego/
│   ├── image_stego.py        # PNG steganography
│   ├── audio_stego.py        # WAV steganography
│   └── video_stego.py        # MP4 steganography
├── metrics/
│   ├── image_metrics.py      # PSNR, SSIM, etc.
│   ├── audio_metrics.py      # SNR, correlation
│   └── video_metrics.py      # Frame-level metrics
├── tests/
│   ├── test_crypto.py
│   ├── test_payload_roundtrip.py
│   ├── test_image_roundtrip.py
│   ├── test_audio_roundtrip.py
│   └── test_video_roundtrip_small.py
└── docs/
    ├── REPORT.md
    ├── ARCHITECTURE.md
    ├── USER_GUIDE.md
    └── API.md
```

## Running Tests

```bash
pytest ghostbit/tests/ -v
```

## Security

- Private keys never leave the receiver's system
- All cryptographic operations happen locally
- Uses authenticated encryption (AES-256-GCM)
- Message integrity verified with SHA-256

## Warnings

- **Do NOT** share stego files via platforms that recompress media (WhatsApp, Instagram)
- **Do NOT** edit or convert stego files after embedding
- **DO** share as file attachments or via cloud storage

## Requirements

- Python 3.11+
- OpenCV
- Pillow
- soundfile
- cryptography
- streamlit

## License

MIT License
