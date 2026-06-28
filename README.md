# GhostBit

**Multi-Modal Content-Adaptive Steganography Framework Integrating AES-256 Cryptography**

GhostBit is a secure steganography framework that enables hiding encrypted messages within images, audio, and video files. It combines hybrid public-key cryptography (X25519 + AES-256-GCM) with content-adaptive embedding algorithms to maximize stealth while maintaining media quality.

---

## ✨ Features

- **Hybrid Cryptography** — X25519 key exchange, HKDF-SHA256 key derivation, AES-256-GCM authenticated encryption
- **Content-Adaptive Embedding** — Edge detection (images), spectral complexity (audio), motion analysis (video)
- **Integrity Verification** — SHA-256 hash verification + GCM authentication tag
- **Quality Metrics** — PSNR, SSIM, SNR, histogram correlation, and frame-level analysis
- **Modern Web App** — Next.js frontend with a FastAPI backend, user accounts, email verification, and admin approval
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
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │     FastAPI Backend (8000)     │
                    │  auth · admin · scores         │
                    │  /api/embed  /api/extract      │
                    │  /api/capacity  (SQLite DB)    │
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
│   ├── backend/                      # FastAPI REST API
│   │   ├── main.py                   # App entry point (uvicorn target)
│   │   ├── database.py               # SQLite setup (auto-created)
│   │   ├── auth.py                   # Token auth & roles
│   │   ├── routes_auth.py            # Register / login / verify
│   │   ├── routes_admin.py           # Admin & user approval
│   │   ├── routes_scores.py          # Game scores
│   │   ├── services/email_service.py # Email (ACS / console fallback)
│   │   └── .env.local                # Backend dev env vars
│   ├── frontend/                     # Next.js / React / TypeScript
│   │   ├── src/
│   │   │   ├── app/                  # Pages (login, dashboard, admin, play…)
│   │   │   ├── components/           # UI components (EmbedForm, ExtractForm…)
│   │   │   └── context/AuthContext.tsx
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
├── start_dev.ps1                     # Run backend + frontend (Windows)
├── start_dev.sh                      # Run backend + frontend (Linux/macOS)
└── README.md
```

---

## 🚀 Running Locally

GhostBit runs as two processes: a **FastAPI backend** (port `8000`) and a **Next.js frontend** (port `3000`). The backend auto-creates a SQLite database and seeds an admin account on first start.

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm (for the Next.js frontend)
- **Git**
- FFmpeg is **not** required — it ships bundled via the `imageio-ffmpeg` Python package

### 1. Clone & install dependencies

```bash
# Clone the repository
git clone https://github.com/BharathS047/Ghostbit.git
cd GhostBit

# --- Backend (Python) ---
python -m venv venv
venv\Scripts\activate          # Windows (PowerShell/CMD)
# source venv/bin/activate     # Linux / macOS
pip install -r requirements.txt

# --- Frontend (Node) ---
cd ghostbit/frontend
npm install
cd ../..
```

### 2. Configure environment variables

**Backend** — `ghostbit/backend/.env.local` (a working dev file is already included; edit as needed):

| Variable                          | Purpose                                              | Default                          |
| --------------------------------- | ---------------------------------------------------- | -------------------------------- |
| `GHOSTBIT_SECRET_KEY`             | Signing key for auth tokens                          | `dev-secret-key-change-this-...` |
| `GHOSTBIT_ALLOWED_ORIGINS`        | CORS origins (comma-separated)                       | `http://localhost:3000`          |
| `GHOSTBIT_ADMIN_USERNAME`         | Admin account seeded on startup                      | `Bharath`                        |
| `GHOSTBIT_ADMIN_PASSWORD`         | Admin password                                       | `Password@123`                   |
| `GHOSTBIT_ADMIN_EMAIL`            | Admin email                                          | —                                |
| `GHOSTBIT_ACS_CONNECTION_STRING`  | Azure Communication Services (email). **Leave blank locally** | _(empty)_               |
| `GHOSTBIT_FROM_EMAIL`             | Sender address for emails. **Leave blank locally**   | _(empty)_                        |
| `GHOSTBIT_FRONTEND_URL`           | Used in email links                                  | `http://localhost:3000`          |
| `GHOSTBIT_DB_PATH`                | Optional SQLite file path override                   | `./ghostbit.db`                  |

> **Email in dev:** when `GHOSTBIT_ACS_CONNECTION_STRING` / `GHOSTBIT_FROM_EMAIL` are blank, verification and password-reset codes are **printed to the backend console** instead of being emailed.

**Frontend** — optional `ghostbit/frontend/.env.local`. Only needed if the backend is not on the default URL:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start both servers

#### Option A — Helper script (recommended)

Loads `.env.local`, starts the backend, then the frontend, and cleans up both on exit:

```bash
# Windows (PowerShell)
.\start_dev.ps1

# Linux / macOS
chmod +x start_dev.sh   # first time only
./start_dev.sh
```

#### Option B — Two terminals (manual)

```bash
# Terminal 1 — FastAPI backend (run from the repo root, with venv activated)
python -m uvicorn ghostbit.backend.main:app --reload --port 8000

# Terminal 2 — Next.js frontend
cd ghostbit/frontend
npm run dev
```

> Run the backend from the **repo root** using the module path `ghostbit.backend.main:app` (not from inside `ghostbit/backend`) so the `ghostbit` package imports resolve.

### 4. Open the app

- **Frontend:** http://localhost:3000
- **API + interactive Swagger docs:** http://localhost:8000/docs

Log in with the seeded admin credentials (default `Bharath` / `Password@123`). New users register, verify via the emailed (or console-printed) code, and must be **Approved** by an admin before they can use the embed/extract APIs.

### Docker

```bash
docker build -t ghostbit .
docker run -p 8000:8000 ghostbit
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
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS, Three.js, Spline |
| Backend API  | FastAPI, Uvicorn, Pydantic                                      |
| Auth / Data  | SQLite, token-based auth, Azure Communication Services (email)  |
| Crypto       | `cryptography` (X25519, HKDF, AES-256-GCM)                     |
| Image        | OpenCV, Pillow, NumPy                                           |
| Audio        | SoundFile                                                       |
| Video        | OpenCV, imageio, imageio-ffmpeg, PyAV                           |
| Metrics      | scikit-image (SSIM), NumPy                                      |
| Testing      | pytest, pytest-cov                                              |
| Dev tooling  | `start_dev.ps1` / `start_dev.sh` (run both servers)            |
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
