# GhostBit — FastAPI Backend
# Frontend (Next.js) is built and deployed separately.

FROM python:3.11-slim

WORKDIR /app

# System dependencies for OpenCV, audio, and video processing
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ghostbit/ ./ghostbit/

EXPOSE 8000

HEALTHCHECK CMD curl --fail http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "ghostbit.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
