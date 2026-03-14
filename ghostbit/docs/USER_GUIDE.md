# GhostBit User Guide

## Introduction

GhostBit enables secure steganographic communication by hiding encrypted messages within media files. This guide explains how to use the application.

## Getting Started

### Prerequisites

- Python 3.11 or higher
- FFmpeg (optional, for video processing)
- Web browser

### Installation

```bash
pip install -r requirements.txt
```

### Running the Application

```bash
streamlit run ghostbit/app/streamlit_app.py
```

Access the application at `http://localhost:8501`

## Workflow Overview

### Role: Receiver (Message Recipient)

1. Generate key pair
2. Share public key with sender
3. Receive stego file
4. Extract and decrypt message

### Role: Sender (Message Creator)

1. Obtain receiver's public key
2. Write secret message
3. Embed into cover media
4. Send stego file to receiver

## Detailed Instructions

### Step 1: Generate Keys (Receiver)

1. Go to "Receiver - Generate Keys" tab
2. Click "Generate New Key Pair"
3. Download both files:
   - `private_key.pem` - **KEEP SECRET!**
   - `public_key.pem` - Share with senders
4. Store private key securely

### Step 2: Embed Message (Sender)

1. Go to "Sender - Embed" tab
2. Upload cover media file:
   - **Image**: PNG format only
   - **Audio**: WAV format only
   - **Video**: MP4 format
3. Paste or upload receiver's public key
4. Enter your secret message
5. Review capacity analysis
6. Click "Embed Message"
7. Review quality metrics
8. Download stego file

### Step 3: Extract Message (Receiver)

1. Go to "Receiver - Extract" tab
2. Upload the stego file received
3. Paste or upload your private key
4. Click "Extract Message"
5. View decrypted message
6. Verify integrity status

## Advanced Settings

### Image Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| Bits per channel | LSBs to use per color channel | 1 | 1-4 |

- Higher values = more capacity, lower quality
- Recommended: 1 for best stealth

### Audio Settings

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| Frame size | Samples per analysis frame | 2048 | 1024, 2048, 4096 |
| Hop length | Samples between frames | 1024 | 512, 1024, 2048 |

### Video Settings

| Setting | Description | Default | Range |
|---------|-------------|---------|-------|
| Motion frames | High-motion frames to use | 10 | 5-30 |
| Redundancy factor | Payload repetition | 1 | 1-3 |

## Capacity Guidelines

### Image Capacity

Depends on image complexity:
- Simple images (solid colors): Low capacity
- Complex images (photos, textures): High capacity
- Typical: 1-5% of image size

### Audio Capacity

Depends on audio complexity:
- Pure tones: Low capacity
- Music/speech: Medium capacity
- Noise/complex audio: High capacity
- Typical: 0.1-1% of file size

### Video Capacity

Depends on motion level:
- Static videos: Low capacity
- High-motion videos: High capacity
- Typical: 0.01-0.5% of file size

## Safe Sharing Practices

### DO
- Email as attachment
- Upload to cloud storage (Drive, Dropbox)
- Transfer via USB drive
- Send as "Document" in messaging apps

### DON'T
- Send via WhatsApp (recompresses media)
- Post on Instagram/Facebook (recompresses)
- Edit or convert the stego file
- Apply filters or effects

## Troubleshooting

### "Message too large" Error

- Use larger cover file
- Increase bits per channel (reduces quality)
- Shorten message

### Extraction Fails

- Ensure correct private key
- Verify same settings were used (bits per channel, etc.)
- File may have been recompressed

### Integrity Verification Failed

- File was modified during transfer
- Wrong settings used for extraction
- Try sending again using safe method

### Video Processing Slow

- Video processing is CPU-intensive
- Use shorter videos for testing
- Consider reducing resolution

## Security Best Practices

1. **Never share your private key**
2. **Use strong, unique keys per communication**
3. **Delete temporary files after use**
4. **Verify integrity after extraction**
5. **Use safe file transfer methods**

## Quality Metrics

### PSNR (Peak Signal-to-Noise Ratio)

| PSNR (dB) | Quality |
|-----------|---------|
| > 50 | Excellent |
| 40-50 | Good |
| 30-40 | Acceptable |
| < 30 | Poor |

### SSIM (Structural Similarity)

| SSIM | Quality |
|------|---------|
| > 0.99 | Excellent |
| 0.95-0.99 | Good |
| 0.90-0.95 | Acceptable |
| < 0.90 | Poor |

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review error messages carefully
3. Ensure all dependencies are installed
4. Try with smaller test files first
