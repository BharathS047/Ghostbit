<![CDATA[# GhostBit

**Multi-Modal Content-Adaptive Steganography Framework Integrating AES-256 Cryptography**

GhostBit is a secure steganography framework that enables hiding encrypted messages within images, audio, and video files. It combines hybrid public-key cryptography (X25519 + AES-256-GCM) with content-adaptive embedding algorithms to maximize stealth while maintaining media quality.

---

## ✨ Features

- **Hybrid Cryptography** — X25519 key exchange, HKDF-SHA256 key derivation, AES-256-GCM authenticated encryption
- **Content-Adaptive Embedding** — Edge detection (images), spectral complexity (audio), motion analysis (video)
- **Integrity Verification** — SHA-256 hash verification + GCM authentication tag
- **Quality Metrics** — PSNR, SSIM, SNR, histogram correlation, and frame-level analysis
- **Dual Interface** — Streamlit-based UI for quick use, plus a modern Next.js web app with a FastAPI backend
- **Docker Support** — Containerized deployment with a single Dockerfile
- **Comprehensive Tests** — Crypto, payload, image, audio, and video round-trip tests via pytest

## 📁 Supported Formats

| Media Type | Input  | Output | Embedding Method               |
| ---------- | ------ | ------ | ------------------------------ |
| Image      | PNG    | PNG    | Canny edge-based LSB           |
| Audio      | WAV    | WAV    | Spectral complexity-based LSB  |
| Video      | MP4    | MP4    | Motion-adaptive frame embedding|

---

## 🏗️ Architecture

```
                    ┌──────────────────────────────┐
                    │       Interface Layer         │
                    │  Next.js Frontend (Port 3000) │
                    │  Streamlit App   (Port 8501)  │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │     FastAPI Backend (8000)     │
                    │  /api/keys  /api/embed         │
                    │  /api/extract  /api/capacity    │
                    └──────────────┬───────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│  Image Stego    │   │   Audio Stego    │   │   Video Stego   │
│  (PNG / LSB)    │   │   (WAV / LSB)    │   │   (MP4 / Frame) │
└────────┬────────┘   └────────┬─────────┘   └────────┬────────┘
         └─────────────────────┼─────────────────────────┘
                               ▼
                ┌──────────────────────────────┐
                │     Cryptographic Layer       │
                │  X25519 → HKDF → AES-256-GCM │
                └──────────────────────────────┘
```

---

## 📂 Project Structure

```
GhostBit/
├── ghostbit/
│   ├── app/
│   │   └── streamlit_app.py          # Streamlit web interface
│   ├── backend/
│   │   └── main.py                   # FastAPI REST API
│   ├── frontend/                     # Next.js / React / TypeScript
│   │   ├── src/
│   │   │   ├── app/                  # Pages & global styles
│   │   │   └── components/           # UI components
│   │   │       ├── EmbedForm.tsx
│   │   │       ├── ExtractForm.tsx
│   │   │       ├── KeyGenerator.tsx
│   │   │       ├── MatrixLoadingScreen.tsx
│   │   │       └── ParticleSphere.tsx
│   │   └── package.json
│   ├── core/
│   │   ├── crypto.py                 # X25519, HKDF, AES-256-GCM
│   │   ├── payload.py                # Binary payload format
│   │   ├── prng.py                   # Key-seeded PRNG
│   │   └── capacity.py               # Capacity estimation
│   ├── stego/
│   │   ├── image_stego.py            # PNG steganography
│   │   ├── audio_stego.py            # WAV steganography
│   │   └── video_stego.py            # MP4 steganography
│   ├── metrics/
│   │   ├── image_metrics.py          # PSNR, SSIM, histogram
│   │   ├── audio_metrics.py          # SNR, spectral distortion
│   │   └── video_metrics.py          # Frame-level metrics
│   ├── tests/
│   │   ├── test_crypto.py
│   │   ├── test_prng.py
│   │   ├── test_payload_roundtrip.py
│   │   ├── test_image_roundtrip.py
│   │   ├── test_audio_roundtrip.py
│   │   └── test_video_roundtrip_small.py
│   └── docs/
│       ├── ARCHITECTURE.md
│       ├── REPORT.md
│       ├── USER_GUIDE.md
│       └── API.md
├── Dockerfile
├── requirements.txt
├── pytest.ini
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for the Next.js frontend)
- **FFmpeg** (for video processing)

### Installation

```bash
# Clone the repository
git clone https://github.com/BharathS047/Ghostbit.git
cd GhostBit

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd ghostbit/frontend
npm install
cd ../..
```

### Running the Applications

#### Option 1 — Streamlit UI (quick start)

```bash
streamlit run ghostbit/app/streamlit_app.py
```

Open your browser at **http://localhost:8501**

#### Option 2 — Next.js Frontend + FastAPI Backend

```bash
# Terminal 1 — Start the FastAPI backend
cd ghostbit/backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Start the Next.js frontend
cd ghostbit/frontend
npm run dev
```

- Frontend: **http://localhost:3000**
- API: **http://localhost:8000/docs** (interactive Swagger docs)

#### Option 3 — Docker

```bash
docker build -t ghostbit .
docker run -p 8501:8501 ghostbit
```

---

## 🔑 Workflow

1. **Receiver generates keys** — Generate an X25519 key pair and share the public key with the sender
2. **Sender embeds a message** — Load the receiver's public key, enter a secret message, and embed it into a cover media file
3. **Receiver extracts** — Load the private key and extract + decrypt the hidden message from the stego file

---

## 🧪 Running Tests

```bash
# Run all tests
pytest ghostbit/tests/ -v

# Run a specific test module
pytest ghostbit/tests/test_crypto.py -v

# Run with coverage
pytest ghostbit/tests/ --cov=ghostbit --cov-report=term-missing
```

---

## 🔒 Security

- Private keys **never leave** the receiver's system
- All cryptographic operations happen **locally**
- Ephemeral keys per message provide **forward secrecy**
- **AES-256-GCM** provides authenticated encryption
- Message integrity verified with **SHA-256**
- Payload validated with **magic bytes** (`GHST`)

---

## ⚠️ Warnings

- **Do NOT** share stego files via platforms that recompress media (WhatsApp, Instagram, etc.)
- **Do NOT** edit, crop, or convert stego files after embedding
- **DO** share as direct file attachments or via cloud storage (Google Drive, Dropbox, etc.)

---

## 🛠️ Tech Stack

| Layer        | Technology                                                      |
| ------------ | --------------------------------------------------------------- |
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS, Three.js        |
| Backend API  | FastAPI, Uvicorn, Pydantic                                      |
| Streamlit UI | Streamlit ≥ 1.28                                                |
| Crypto       | `cryptography` (X25519, HKDF, AES-256-GCM)                     |
| Image        | OpenCV, Pillow, NumPy                                           |
| Audio        | SoundFile                                                       |
| Video        | OpenCV, imageio, imageio-ffmpeg, PyAV                           |
| Metrics      | scikit-image (SSIM), NumPy                                      |
| Testing      | pytest, pytest-cov                                              |
| Container    | Docker (Python 3.11-slim)                                       |

---

## 📚 Documentation

Detailed documentation is available in [`ghostbit/docs/`](ghostbit/docs/):

- [**ARCHITECTURE.md**](ghostbit/docs/ARCHITECTURE.md) — System design, module descriptions, data flow
- [**REPORT.md**](ghostbit/docs/REPORT.md) — Technical report with algorithm details
- [**USER_GUIDE.md**](ghostbit/docs/USER_GUIDE.md) — Step-by-step usage instructions
- [**API.md**](ghostbit/docs/API.md) — API reference for all modules

---

## 📄 License

MIT License
]]>
