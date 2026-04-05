# GhostBit - Algorithms & Implementation Document

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Cryptographic Algorithms](#3-cryptographic-algorithms)
4. [Steganography Algorithms](#4-steganography-algorithms)
5. [Binary Payload Protocol](#5-binary-payload-protocol)
6. [Key-Seeded PRNG & Position Shuffling](#6-key-seeded-prng--position-shuffling)
7. [Authentication & Security Algorithms](#7-authentication--security-algorithms)
8. [Quality Metrics & Analysis](#8-quality-metrics--analysis)
9. [Honeypot System](#9-honeypot-system)
10. [Algorithm Summary Table](#10-algorithm-summary-table)

---

## 1. Project Overview

**GhostBit** is a dual-purpose steganography platform with three operational layers:

| Layer | Purpose | Users |
|-------|---------|-------|
| **Surface (Honeypot)** | GhostPlay gaming portal that covertly logs all user activity | Decoy users |
| **Hidden (Steganography)** | Military-grade encrypted message embedding in media files | Approved users |
| **Admin (Control Panel)** | Full system visibility, user role management, activity monitoring | Admin users |

The platform supports hiding encrypted messages inside **PNG images**, **WAV audio**, and **MP4 video** files using distinct steganographic techniques for each media type.

---

## 2. System Architecture

```
Frontend (Next.js/React)  <-->  FastAPI Backend  <-->  SQLite Database
     Port 3000                    Port 8000            ghostbit.db
```

**Data Flow for Message Embedding:**
```
Plaintext Message
    |
    v
[SHA-256 Integrity Hash] --> pack_plaintext()
    |
    v
[X25519 Key Exchange] --> Shared Secret
    |
    v
[HKDF-SHA256] --> AES-256 Key
    |
    v
[AES-256-GCM Encryption] --> Ciphertext + Auth Tag
    |
    v
[GhostBit Payload Header] --> pack_payload()
    |
    v
[Bit Serialization] --> payload_to_bits()
    |
    v
[PRNG Position Selection] --> Deterministic positions
    |
    v
[LSB Embedding / Atom Insertion] --> Stego File
```

---

## 3. Cryptographic Algorithms

### 3.1 X25519 Elliptic Curve Diffie-Hellman (Key Exchange)

**File:** `ghostbit/core/crypto.py`

**What it is:** X25519 is a key agreement protocol using Curve25519 (a Montgomery elliptic curve). It allows two parties to establish a shared secret over an insecure channel without ever transmitting the secret itself.

**Why it's used:**
- Provides **forward secrecy** -- a new ephemeral key pair is generated per message, so compromising one key doesn't compromise past messages
- 128-bit security level with only 32-byte keys (compact for embedding)
- Constant-time implementation prevents timing side-channel attacks
- Recommended by NIST and widely trusted in modern cryptographic systems

**How it works in GhostBit:**
```
SENDER (Embedding)                    RECEIVER (Extracting)
========================              ========================
1. Generate ephemeral                 1. Has long-term
   X25519 key pair                       X25519 key pair
   (eph_private, eph_public)             (recv_private, recv_public)

2. ECDH(eph_private, recv_public)     2. ECDH(recv_private, eph_public)
         |                                     |
         v                                     v
   shared_secret (32 bytes)           shared_secret (32 bytes)
   [IDENTICAL on both sides]          [IDENTICAL on both sides]

3. Embed eph_public in payload        3. Read eph_public from payload
```

**Implementation:**
- `KeyPair` class: Generates and manages X25519 key pairs, supports PEM import/export
- `Encryptor` class: Creates ephemeral key, performs ECDH, derives AES key, encrypts
- `Decryptor` class: Accepts ephemeral public key, performs ECDH, derives same AES key, decrypts

---

### 3.2 HKDF-SHA256 (Key Derivation)

**File:** `ghostbit/core/crypto.py`

**What it is:** HMAC-based Key Derivation Function (HKDF) using SHA-256. It transforms raw key material (the shared secret) into a cryptographically strong key suitable for AES.

**Why it's used:**
- The raw X25519 shared secret has uneven entropy distribution
- HKDF extracts and expands entropy to produce a uniformly random key
- Provides domain separation via the `info` parameter

**How it works:**
```python
aes_key = HKDF(
    algorithm = SHA-256,
    length    = 32 bytes (256 bits),
    salt      = None,
    info      = b"GhostBit AES-256 Key",
    key_material = shared_secret
)
```

The `info` string `"GhostBit AES-256 Key"` acts as a domain separator, ensuring this derived key is unique to GhostBit's encryption context even if the same shared secret were used elsewhere.

---

### 3.3 AES-256-GCM (Symmetric Encryption)

**File:** `ghostbit/core/crypto.py`

**What it is:** Advanced Encryption Standard with 256-bit key in Galois/Counter Mode. GCM provides both **confidentiality** (encryption) and **authenticity** (tamper detection) in a single operation.

**Why it's used:**
- AES-256 provides 256-bit security (quantum-resistant against Grover's algorithm at 128-bit effective)
- GCM mode provides authenticated encryption -- if anyone tampers with the ciphertext, decryption fails
- Efficient and parallelizable
- Industry standard for secure communications

**How it works:**
```
Encryption:
    Input:  plaintext, 32-byte AES key, 12-byte random nonce
    Output: ciphertext || 16-byte authentication tag

    1. Generate 12-byte random nonce (os.urandom)
    2. AES-256-GCM.encrypt(key, nonce, plaintext)
    3. Returns: nonce + ciphertext_with_tag

Decryption:
    Input:  nonce, ciphertext_with_tag, 32-byte AES key
    Output: plaintext (or authentication failure)

    1. AES-256-GCM.decrypt(key, nonce, ciphertext_with_tag)
    2. GCM internally verifies the authentication tag
    3. Returns plaintext only if tag is valid
```

**Key properties:**
- **Nonce:** 12 bytes (96 bits), randomly generated per encryption
- **Tag:** 16 bytes (128 bits), appended to ciphertext
- **Tampering:** Any modification to ciphertext, tag, or nonce causes decryption to fail

---

### 3.4 SHA-256 (Integrity Hashing)

**File:** `ghostbit/core/payload.py`

**What it is:** Secure Hash Algorithm producing a 256-bit (32-byte) digest. Used as an additional integrity check on the plaintext message before encryption.

**Why it's used:**
- Provides a second layer of integrity verification beyond GCM's authentication tag
- Allows verification that the decrypted message is exactly what was originally embedded
- Detects any corruption in the steganographic embedding/extraction process

**How it works:**
```
pack_plaintext(message):
    encoded = message.encode('utf-8')
    hash    = SHA-256(encoded)
    return  len(encoded) [4 bytes] + encoded + hash [32 bytes]

unpack_plaintext(data):
    length  = data[0:4]  (big-endian uint32)
    message = data[4 : 4+length]
    hash    = data[4+length : 4+length+32]
    valid   = SHA-256(message) == hash
    return  (message.decode('utf-8'), valid)
```

---

## 4. Steganography Algorithms

### 4.1 Image Steganography -- LSB Embedding

**File:** `ghostbit/stego/image_stego.py`

**What it is:** Least Significant Bit (LSB) steganography modifies the least significant bits of pixel color values to encode hidden data. Since the LSB contributes minimally to perceived color, changes are invisible to the human eye.

**Why it's used:**
- PNG is lossless, so embedded bits survive save/load cycles without corruption
- LSB changes produce imperceptible visual differences (PSNR typically 40-50 dB)
- High capacity: a 1920x1080 image can hide ~777 KB of data
- Simple, proven technique for lossless image formats

**How the embedding algorithm works:**

```
Step 1: Prepare the encrypted payload
    message --> pack_plaintext() --> encrypt() --> pack_payload() --> bits[]

Step 2: Seed the PRNG for deterministic position selection
    seed = SHA-256("GhostBit Embed" + ephemeral_public_key + nonce)
    prng = KeySeededPRNG(seed)

Step 3: Select pixel positions
    available_positions = all pixels in image (width x height)
    needed_pixels = ceil(total_bits / bits_per_pixel)
    selected = prng.select_positions(available_positions, needed_pixels)

Step 4: Embed bits into pixel LSBs
    For each selected pixel at (row, col):
        For each color channel (R, G, B):
            original_value = image[row][col][channel]  (0-255)
            mask = 0xFF << bits_per_channel             (e.g., 0xFE for 1-bit)
            new_value = (original_value & mask) | next_bits
            image[row][col][channel] = new_value

Step 5: Save as PNG (lossless)
```

**Bit embedding detail (1-bit per channel):**
```
Original pixel:  R=156 (10011100), G=203 (11001011), B=97 (01100001)
Bits to embed:   1, 0, 1

Modified pixel:  R=157 (10011101), G=202 (11001010), B=97 (01100001)
                          ^changed          ^changed         ^same

Color change: imperceptible (max +/-1 per channel)
```

**Extraction algorithm:**
```
Step 1: Recreate the same PRNG seed from payload header
    Read first ~108 bytes of LSB data to get nonce + ephemeral_public_key
    seed = SHA-256("GhostBit Embed" + ephemeral_public_key + nonce)
    prng = KeySeededPRNG(seed)

Step 2: Select same positions (deterministic)
    positions = prng.select_positions(available, needed)

Step 3: Extract bits from LSBs
    For each position, read the LSB(s) of each channel

Step 4: Reconstruct payload, decrypt, verify integrity
```

**Configuration:**
- `bits_per_channel`: 1-4 (default: 1). Higher = more capacity, more distortion
- At 1 bit/channel: 3 bits per pixel, PSNR ~50 dB
- At 4 bits/channel: 12 bits per pixel, PSNR ~30 dB (visible artifacts)

---

### 4.2 Audio Steganography -- Complexity-Adaptive LSB Embedding

**File:** `ghostbit/stego/audio_stego.py`

**What it is:** LSB steganography applied to WAV audio samples, with an intelligent frame selection algorithm that preferentially embeds data in high-complexity audio regions where modifications are least perceptible.

**Why it's used:**
- WAV is uncompressed/lossless, preserving embedded bits
- Complexity-adaptive embedding minimizes audible distortion
- Human hearing is less sensitive to changes in noisy/complex audio passages
- Typical SNR of 40-60 dB (imperceptible)

**How the complexity analysis algorithm works:**

```
analyze_frame_complexity(audio, frame_size=2048, hop_length=1024):

    For each overlapping frame of 2048 samples:

        1. Compute Short-Time Energy:
           energy = sum(sample^2 for each sample in frame) / frame_length

        2. Compute Spectral Flux:
           current_spectrum  = |FFT(current_frame)|
           previous_spectrum = |FFT(previous_frame)|
           flux = sum((current_spectrum - previous_spectrum)^2)

        3. Compute Complexity Score:
           complexity = (energy * 0.3) + (flux * 0.7)

    Sort frames by complexity (descending)
    Select top 50% of frames for embedding
```

**Why this weighting (30% energy, 70% spectral flux):**
- **Spectral flux** (70%): Measures how rapidly the frequency content changes. High flux means transients, percussive hits, or noisy passages where the ear is least sensitive to small amplitude changes
- **Energy** (30%): Loud passages can better mask small LSB changes than quiet passages

**Embedding algorithm:**
```
Step 1: Analyze complexity of all frames
Step 2: Select highest-complexity frames (up to 50% of total)
Step 3: Within selected frames, embed bits via LSB replacement

    embed_bit_in_sample(sample: int16, bit: int) -> int16:
        return (sample & 0xFFFE) | bit
        // Clears LSB, sets it to the embedded bit

Step 4: Reconstruct audio from modified frames
Step 5: Save as WAV
```

**Example:**
```
Original sample: 15234 (binary: 0011101110000010)
Embed bit 1:     15235 (binary: 0011101110000011)
                                              ^LSB changed

Amplitude change: +/- 1 out of 32768 range = 0.003% change
```

---

### 4.3 Video Steganography -- MP4 Container Atom Embedding

**File:** `ghostbit/stego/video_stego.py`

**What it is:** Instead of modifying video frames (which would be destroyed by H.264 compression), GhostBit embeds data as a custom `uuid` atom in the MP4 container structure. MP4 files are organized as a tree of "atoms" (also called "boxes"), and custom atoms are ignored by standard media players.

**Why it's used:**
- H.264/H.265 video compression destroys pixel-level changes, making frame-based LSB impractical
- Container atom embedding preserves the video and audio streams completely untouched
- Video plays normally in any standard media player
- Virtually unlimited capacity for text messages
- Simple and robust

**How the MP4 atom structure works:**
```
MP4 File Structure:
+------------------+
| ftyp atom        |  <-- File type identifier
+------------------+
| moov atom        |  <-- Movie metadata (tracks, codecs, timing)
+------------------+
| mdat atom        |  <-- Actual video/audio data
+------------------+
| uuid atom (NEW)  |  <-- GhostBit payload (custom, ignored by players)
+------------------+
```

**Custom UUID Atom Format:**
```
+----------+----------+--------------------+-------------------+
| Size     | Type     | UUID               | Payload           |
| (4 bytes)| "uuid"   | GHOSTBIT_UUID      | Encrypted data    |
| (4 bytes)| (4 bytes)| (16 bytes)         | (variable)        |
+----------+----------+--------------------+-------------------+

GHOSTBIT_UUID = bytes([0x47,0x48,0x53,0x54,  // "GHST"
                       0x42,0x49,0x54,0x00,  // "BIT\0"
                       0xDE,0xAD,0xBE,0xEF,  // signature
                       0x00,0x01,0x00,0x00]) // version
```

**Embedding algorithm:**
```
Step 1: Validate MP4 file (check ftyp atom exists)
Step 2: Scan existing atoms to check for prior GhostBit data
Step 3: If previous GhostBit atom exists, remove it (allows re-embedding)
Step 4: Encrypt message using X25519 + AES-256-GCM
Step 5: Pack into GhostBit payload format
Step 6: Create uuid atom: [size][type="uuid"][GHOSTBIT_UUID][payload]
Step 7: Append atom to end of MP4 file
```

**Extraction algorithm:**
```
Step 1: Scan all top-level atoms in MP4
Step 2: Find atom with type="uuid" and matching GHOSTBIT_UUID
Step 3: Extract payload bytes from atom
Step 4: Unpack payload header (nonce, ephemeral key, ciphertext)
Step 5: Decrypt with recipient's private key
Step 6: Verify SHA-256 integrity hash
```

**Atom scanning implementation:**
```python
def _read_atom_header(data, offset):
    size = big_endian_uint32(data[offset:offset+4])
    type = ascii(data[offset+4:offset+8])
    if size == 1:  # Extended size
        size = big_endian_uint64(data[offset+8:offset+16])
        header_size = 16
    elif size == 0:  # Atom extends to end of file
        size = len(data) - offset
        header_size = 8
    else:
        header_size = 8
    return (size, type, header_size)
```

---

## 5. Binary Payload Protocol

**File:** `ghostbit/core/payload.py`

**What it is:** A custom binary protocol for packaging all cryptographic parameters needed for decryption into a compact header that gets embedded alongside the ciphertext.

**Why it's needed:** The recipient needs several pieces of information to decrypt: the ephemeral public key (for ECDH), the nonce (for AES-GCM), the ciphertext, and metadata about which algorithms were used. The payload protocol packages all of this into a self-describing binary format.

**Payload Header Layout:**
```
Offset  Size   Field              Value
------  -----  -----------------  -------------------
0       4      Magic bytes        "GHST" (0x47485354)
4       1      Version            0x01
5       1      Media type         1=Image, 2=Audio, 3=Video
6       1      KEX algorithm      0x01 = X25519
7       1      AEAD algorithm     0x01 = AES-256-GCM
8       1      Nonce length       12
9       12     Nonce              12 random bytes
21      2      Eph pub key len    32 (big-endian uint16)
23      32     Ephemeral pub key  32-byte X25519 public key
55      4      Ciphertext length  N (big-endian uint32)
59      N      Ciphertext         AES-256-GCM output (includes 16-byte tag)
```

**Total header overhead:** ~59 bytes + ciphertext length

**Plaintext Structure (before encryption):**
```
Offset  Size   Field
------  -----  -----------------
0       4      Message length (big-endian uint32)
4       N      UTF-8 encoded message
4+N     32     SHA-256 hash of message bytes
```

**Bit Serialization:**
```python
def payload_to_bits(payload: bytes) -> list[int]:
    bits = []
    for byte in payload:
        for i in range(7, -1, -1):      # MSB first
            bits.append((byte >> i) & 1)
    return bits
```

---

## 6. Key-Seeded PRNG & Position Shuffling

**File:** `ghostbit/core/prng.py`

**What it is:** A deterministic pseudo-random number generator seeded from a shared secret. Both the sender and receiver can independently generate the exact same sequence of "random" positions without communicating the positions themselves.

**Why it's used:**
- Embedding bits at predictable, sequential positions is trivially detectable by steganalysis tools
- Random-looking position selection makes detection much harder
- Deterministic seeding means the receiver can reproduce the exact same positions for extraction
- No need to transmit a position map (which would add overhead and a detection vector)

**Algorithm -- SHA-256 Counter Mode:**
```
class KeySeededPRNG:
    state:
        seed    = input_seed (bytes)
        counter = 0
        buffer  = empty

    get_bytes(n):
        while buffer has fewer than n bytes:
            block = SHA-256(seed + counter.to_bytes(8, 'big'))
            buffer += block (32 bytes)
            counter += 1
        result = buffer[:n]
        buffer = buffer[n:]
        return result

    get_int(max_val):
        // Rejection sampling to avoid modulo bias
        bytes_needed = ceil(log2(max_val) / 8) + 1
        while True:
            raw = get_bytes(bytes_needed)
            value = int.from_bytes(raw, 'big')
            if value < (256^bytes_needed // max_val) * max_val:
                return value % max_val
```

**Fisher-Yates Shuffle (for position randomization):**
```
shuffle(items):
    for i from len(items)-1 down to 1:
        j = get_int(i + 1)     // random index in [0, i]
        swap items[i], items[j]
    return items
```

**Position Selection (without replacement):**
```
select_positions(available_count, needed_count):
    indices = list(range(available_count))
    // Partial Fisher-Yates: only shuffle the last 'needed_count' elements
    for i from available_count-1 down to available_count-needed_count:
        j = get_int(i + 1)
        swap indices[i], indices[j]
    return indices[available_count-needed_count:]
```

**Seeding Strategy:**
```python
seed = SHA-256(b"GhostBit Embed" + ephemeral_public_key + nonce)
```
- `ephemeral_public_key`: Unique per message (ensures different positions per message)
- `nonce`: Random 12 bytes (additional uniqueness)
- `"GhostBit Embed"`: Domain separator

---

## 7. Authentication & Security Algorithms

### 7.1 PBKDF2-HMAC-SHA256 (Password Hashing)

**File:** `ghostbit/backend/auth.py`

**What it is:** Password-Based Key Derivation Function 2 using HMAC-SHA256. It deliberately slows down password hashing to make brute-force attacks computationally expensive.

**Why it's used:**
- Standard plain hashing (SHA-256) is too fast -- attackers can try billions of passwords per second
- PBKDF2 with 260,000 iterations makes each attempt take ~100ms
- Per-password random salt prevents rainbow table attacks
- OWASP 2024 recommended configuration

**How it works:**
```
hash_password(password):
    salt = random_hex(16 bytes = 32 hex chars)
    derived_key = PBKDF2(
        algorithm  = HMAC-SHA256,
        password   = password.encode('utf-8'),
        salt       = salt.encode('utf-8'),
        iterations = 260,000,
        key_length = 32 bytes
    )
    return "pbkdf2:sha256:260000${salt}${derived_key.hex()}"

verify_password(password, stored_hash):
    Parse: algorithm, hash_func, iterations, salt, stored_key from stored_hash
    derived_key = PBKDF2(password, salt, iterations, 32)
    return hmac.compare_digest(derived_key.hex(), stored_key)
```

**Key properties:**
- `hmac.compare_digest` prevents timing attacks (constant-time comparison)
- Salt is stored alongside the hash (not secret, just unique)
- 260,000 iterations matches OWASP 2024 recommendation

---

### 7.2 Custom JWT Implementation (Session Tokens)

**File:** `ghostbit/backend/auth.py`

**What it is:** A hand-rolled JSON Web Token implementation using HMAC-SHA256 signatures. JWTs are stateless authentication tokens that encode user identity and role.

**Why it's custom:**
- Avoids dependency on external JWT libraries
- Full control over token format and validation

**How it works:**
```
create_access_token(data, expires_delta):
    header  = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": "Admin" | "Approved" | "Decoy",
        "iat": current_timestamp,
        "exp": current_timestamp + 24_hours
    }

    segments = [
        base64url(json(header)),
        base64url(json(payload))
    ]
    signing_input = segments[0] + "." + segments[1]
    signature = HMAC-SHA256(SECRET_KEY, signing_input)

    return signing_input + "." + base64url(signature)

decode_access_token(token):
    header_b64, payload_b64, signature_b64 = token.split(".")

    // Verify signature
    expected_sig = HMAC-SHA256(SECRET_KEY, header_b64 + "." + payload_b64)
    if signature != expected_sig:
        raise "Invalid token"

    // Check expiry
    payload = json(base64url_decode(payload_b64))
    if payload["exp"] < current_time:
        raise "Token expired"

    return payload
```

**Security properties:**
- SECRET_KEY: 64 hex characters (32 bytes), from environment variable or randomly generated at startup
- Token lifetime: 24 hours (configurable via `GHOSTBIT_TOKEN_EXPIRE_MINUTES`)
- Base64url encoding (URL-safe, no padding)

---

### 7.3 Role-Based Access Control

**Files:** `ghostbit/backend/auth.py`, `ghostbit/backend/routes_admin.py`

**Role hierarchy:**
```
Admin    --> Can access: Admin panel + Steganography dashboard + All APIs
Approved --> Can access: Steganography dashboard + Stego APIs
Decoy    --> Can access: Play page (honeypot) only
```

**Implementation:**
```python
def require_role(*allowed_roles):
    def checker(current_user):
        if current_user["role"] not in allowed_roles:
            raise HTTP 403 Forbidden
        return current_user
    return checker

# Usage:
@app.post("/api/embed")
async def embed(user=Depends(require_role("Approved", "Admin"))):
    ...
```

---

### 7.4 Email Verification & Password Reset Tokens

**File:** `ghostbit/backend/routes_auth.py`

**Token generation:**
```python
token = secrets.token_urlsafe(32)  // 32 random bytes, base64url encoded
```

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| Email verification | 30 minutes | Confirm email ownership before account activation |
| Password reset | 15 minutes | Short-lived to minimize interception window |

**Anti-enumeration:** The forgot-password endpoint always returns a generic "If an account exists..." message, preventing attackers from discovering which emails are registered.

---

## 8. Quality Metrics & Analysis

### 8.1 Image Quality Metrics

**File:** `ghostbit/metrics/image_metrics.py`

**MSE (Mean Squared Error):**
```
MSE = (1 / (M * N)) * sum((original[i][j] - stego[i][j])^2)

Where M*N = total pixels
```

**PSNR (Peak Signal-to-Noise Ratio):**
```
PSNR = 10 * log10(MAX_PIXEL^2 / MSE)

Where MAX_PIXEL = 255 for 8-bit images
Typical result: 40-50 dB (imperceptible at > 30 dB)
```

**SSIM (Structural Similarity Index):**
```
SSIM(x, y) = (2*mu_x*mu_y + C1) * (2*sigma_xy + C2)
             -----------------------------------------------
             (mu_x^2 + mu_y^2 + C1) * (sigma_x^2 + sigma_y^2 + C2)

Where:
    mu_x, mu_y       = mean luminance
    sigma_x, sigma_y  = standard deviation
    sigma_xy          = cross-correlation
    C1 = (0.01 * 255)^2, C2 = (0.03 * 255)^2  (stability constants)

Result range: [0, 1] where 1 = identical
```

**Why SSIM matters:** Unlike PSNR which treats all pixel errors equally, SSIM models human visual perception -- it accounts for luminance, contrast, and structural patterns.

---

### 8.2 Audio Quality Metrics

**File:** `ghostbit/metrics/audio_metrics.py`

**SNR (Signal-to-Noise Ratio):**
```
noise = original_signal - stego_signal
SNR = 10 * log10(power(signal) / power(noise))

Typical result: 40-60 dB (imperceptible at > 30 dB)
```

**Spectral Distortion:**
```
original_spectrum = |FFT(original)|
stego_spectrum    = |FFT(stego)|
distortion = mean(|original_spectrum - stego_spectrum|)
```

---

### 8.3 Video Quality Metrics

**File:** `ghostbit/metrics/video_metrics.py`

Since GhostBit's video steganography uses container atom embedding (not frame modification), the video metrics will show **zero distortion** -- the video and audio streams are completely unmodified. Metrics are provided for completeness and to verify this property.

---

## 9. Honeypot System

**Files:** `ghostbit/backend/routes_scores.py`, `ghostbit/frontend/src/app/play/page.tsx`

**Concept:** Users assigned the "Decoy" role are redirected to a gaming portal (GhostPlay). They believe they're using a legitimate gaming platform, but every interaction is logged and visible to administrators.

**Logged events:**
```
decoy:visited_play_page       -- User accessed the play page
decoy:opened_game:snake       -- User started a game
decoy:opened_game:tictactoe
decoy:opened_game:memory
decoy:clicked_coming_soon:*   -- User clicked unavailable features
decoy:nav_click:leaderboard   -- User accessed leaderboard
```

**Game scores** are stored in the `scores` table and used for the leaderboard, but also serve as a behavioral tracking mechanism.

---

## 10. Algorithm Summary Table

| Component | Algorithm | Key Size | Purpose |
|-----------|-----------|----------|---------|
| Key Exchange | X25519 (ECDH) | 32-byte keys | Establish shared secret between sender and receiver |
| Key Derivation | HKDF-SHA256 | 32-byte output | Derive uniform AES key from shared secret |
| Encryption | AES-256-GCM | 256-bit key, 96-bit nonce | Authenticated encryption of messages |
| Integrity | SHA-256 | 256-bit hash | Verify message integrity after decryption |
| Password Hashing | PBKDF2-HMAC-SHA256 | 260K iterations | Protect stored passwords against brute-force |
| Session Tokens | HMAC-SHA256 JWT | 256-bit secret | Stateless user authentication |
| Image Stego | LSB Embedding | 1-4 bits/channel | Hide data in PNG pixel values |
| Audio Stego | Complexity-Adaptive LSB | 1 bit/sample | Hide data in WAV audio samples |
| Video Stego | MP4 Atom Embedding | N/A | Hide data in MP4 container structure |
| Position PRNG | SHA-256 Counter Mode | 256-bit seed | Deterministic position selection |
| Position Shuffle | Fisher-Yates | N/A | Randomize embedding positions |
| Capacity Analysis | Energy + Spectral Flux | N/A | Select optimal embedding regions |

---

## Appendix: Capacity Reference

| Media Type | Example File | Approximate Capacity |
|------------|-------------|---------------------|
| PNG Image (1920x1080, 1-bit LSB) | ~6 MB file | ~777 KB hidden data |
| PNG Image (1920x1080, 2-bit LSB) | ~6 MB file | ~1.5 MB hidden data |
| WAV Audio (44.1 kHz, 10 seconds) | ~1.7 MB file | ~27 KB hidden data |
| WAV Audio (44.1 kHz, 60 seconds) | ~10 MB file | ~162 KB hidden data |
| MP4 Video (any size) | Any | Virtually unlimited (text) |

---

*Document generated for the GhostBit project. All algorithms referenced are implemented in the `ghostbit/` source directory.*
