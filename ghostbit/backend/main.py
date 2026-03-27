from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
import os
import sys
from pathlib import Path
import json

# Add project root to path so we can import ghostbit modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from ghostbit.core.crypto import KeyPair
from ghostbit.stego.image_stego import analyze_image_capacity, ImageSteganography
from ghostbit.stego.audio_stego import analyze_audio_capacity, AudioSteganography
from ghostbit.stego.video_stego import analyze_video_capacity, VideoSteganography

# --- Honeypot / Auth imports ---
from ghostbit.backend.database import init_db, seed_admin_user
from ghostbit.backend.auth import get_current_user, require_role, hash_password
from ghostbit.backend.routes_auth import router as auth_router
from ghostbit.backend.routes_admin import router as admin_router
from ghostbit.backend.routes_scores import router as scores_router

app = FastAPI(title="GhostBit Steganography API")

# Initialize database on startup
@app.on_event("startup")
def on_startup():
    init_db()
    seed_admin_user(
        username=os.environ.get("GHOSTBIT_ADMIN_USERNAME", "Bharath"),
        hashed_password=hash_password(
            os.environ.get("GHOSTBIT_ADMIN_PASSWORD", "Password@123")
        ),
        email=os.environ.get("GHOSTBIT_ADMIN_EMAIL", "bharathshiva047@gmail.com"),
    )

# Configure CORS for frontend access
_raw_origins = os.environ.get("GHOSTBIT_ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register auth & admin routers ---
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(scores_router)

# --- Access control dependency for GhostBit stego APIs ---
approved_only = require_role("approved", "admin")

def get_media_type_from_filename(filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    if ext == 'png': return 'image'
    if ext == 'wav': return 'audio'
    if ext in ['mp4', 'm4v', 'mov', 'mpeg4']: return 'video'
    return 'unknown'

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/keys/generate")
def generate_keys(user: dict = Depends(approved_only)):
    keypair = KeyPair.generate()
    return {
        "private_key": keypair.private_pem().decode('utf-8'),
        "public_key": keypair.public_pem().decode('utf-8')
    }

@app.post("/api/capacity")
async def analyze_capacity_endpoint(
    file: UploadFile = File(...),
    bits_per_channel: int = Form(1),
    frame_size: int = Form(2048),
    hop_length: int = Form(1024),
    user: dict = Depends(approved_only),
):
    data = await file.read()
    media_type = get_media_type_from_filename(file.filename)

    try:
        if media_type == 'image':
            capacity = analyze_image_capacity(data, bits_per_channel)
        elif media_type == 'audio':
            capacity = analyze_audio_capacity(data, frame_size, hop_length)
        elif media_type == 'video':
            capacity = analyze_video_capacity(data)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        return {"media_type": media_type, "capacity": capacity}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/embed")
async def embed_endpoint(
    cover_file: UploadFile = File(...),
    public_key: str = Form(...),
    message: str = Form(...),
    bits_per_channel: int = Form(1),
    frame_size: int = Form(2048),
    hop_length: int = Form(1024),
    user: dict = Depends(approved_only),
):
    try:
        data = await cover_file.read()
        media_type = get_media_type_from_filename(cover_file.filename)
        public_key_bytes = public_key.encode('utf-8')

        if media_type == 'image':
            stego = ImageSteganography(bits_per_channel)
            stego_data, metadata = stego.embed(data, message, public_key_bytes)
            output_ext = 'png'
            mime_type = 'image/png'
        elif media_type == 'audio':
            stego = AudioSteganography(frame_size, hop_length)
            stego_data, metadata = stego.embed(data, message, public_key_bytes)
            output_ext = 'wav'
            mime_type = 'audio/wav'
        elif media_type == 'video':
            stego = VideoSteganography()
            stego_data, metadata = stego.embed(data, message, public_key_bytes)
            output_ext = 'mp4'
            mime_type = 'video/mp4'
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        headers = {
            "Content-Disposition": f"attachment; filename=stego_{cover_file.filename.rsplit('.', 1)[0]}.{output_ext}",
            "X-GhostBit-Metadata": json.dumps(metadata)
        }
        return Response(content=stego_data, media_type=mime_type, headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/extract")
async def extract_endpoint(
    stego_file: UploadFile = File(...),
    private_key: str = Form(...),
    bits_per_channel: int = Form(1),
    frame_size: int = Form(2048),
    hop_length: int = Form(1024),
    user: dict = Depends(approved_only),
):
    try:
        data = await stego_file.read()
        media_type = get_media_type_from_filename(stego_file.filename)
        private_key_bytes = private_key.encode('utf-8')

        if media_type == 'image':
            stego = ImageSteganography(bits_per_channel)
            message, integrity, metadata = stego.extract(data, private_key_bytes)
        elif media_type == 'audio':
            stego = AudioSteganography(frame_size, hop_length)
            message, integrity, metadata = stego.extract(data, private_key_bytes)
        elif media_type == 'video':
            stego = VideoSteganography()
            message, integrity, metadata = stego.extract(data, private_key_bytes)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        return {
            "message": message,
            "integrity_valid": integrity,
            "metadata": metadata
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
