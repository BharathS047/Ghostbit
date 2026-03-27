# GhostBit - Complete System Documentation

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [Creating Your First Admin Account](#3-creating-your-first-admin-account)
4. [User Roles Explained](#4-user-roles-explained)
5. [Authentication Flow](#5-authentication-flow)
6. [Admin Panel Guide](#6-admin-panel-guide)
7. [The Honeypot System](#7-the-honeypot-system)
8. [Steganography Dashboard](#8-steganography-dashboard)
9. [API Reference](#9-api-reference)
10. [Environment Variables](#10-environment-variables)
11. [Architecture Overview](#11-architecture-overview)

---

## 1. System Overview

GhostBit is a dual-purpose platform:

- **Surface layer (GhostPlay):** A decoy gaming portal that acts as a honeypot. Users who sign up land here and their every action is logged.
- **Hidden layer (Dashboard):** A military-grade steganography framework for embedding encrypted messages into images, audio, and video files. Only admin-approved users can access this.
- **Admin layer (Control Panel):** Full visibility into all users, role management, and activity monitoring.

**Tech Stack:**

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Next.js, React 19, TypeScript, Tailwind CSS |
| Backend  | FastAPI (Python), SQLite            |
| Auth     | JWT (custom HS256), PBKDF2-SHA256   |
| Crypto   | X25519 key exchange, AES-256-GCM    |
| Stego    | LSB embedding (PNG, WAV, MP4)       |

---

## 2. Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- pip (Python package manager)

### Starting the Backend

```bash
cd ghostbit/backend

# Install dependencies (first time)
pip install fastapi uvicorn pydantic[email]

# Start the server
python -m uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

### Starting the Frontend

```bash
cd ghostbit/frontend

# Install dependencies (first time)
npm install

# Start the dev server
npm run dev
```

The frontend runs at `http://localhost:3000`.

---

## 3. Creating Your First Admin Account

There is no default admin account. You must create one manually. Here are two methods:

### Method A: Python Script (Recommended)

Create and run this script from the project root:

```python
# create_admin.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from ghostbit.backend.database import init_db, create_user, verify_user_email
from ghostbit.backend.auth import hash_password

init_db()

admin = create_user(
    username="admin",
    hashed_password=hash_password("YourSecurePassword123"),
    role="admin",
    email="admin@yourdomain.com",
    verification_token=None,
    token_expiry=None,
)

# Mark email as verified so the admin can log in
verify_user_email(admin["id"])

print(f"Admin account created successfully!")
print(f"  Username: admin")
print(f"  User ID:  {admin['id']}")
print(f"  Role:     admin")
print(f"  Verified: Yes")
```

Run it:

```bash
python create_admin.py
```

### Method B: Direct SQLite

```bash
# Open the database
sqlite3 ghostbit/backend/ghostbit.db
```

You would need to generate a PBKDF2 hash first, so Method A is strongly recommended.

### Logging In as Admin

1. Open `http://localhost:3000/login`
2. Enter admin username and password
3. You will be automatically redirected to `/admin`

---

## 4. User Roles Explained

GhostBit uses three roles that control what each user can see and do:

### Role: `decoy` (Default)

- **What they see:** The GhostPlay gaming portal (`/play`)
- **What they can do:** Play browser games (Tic Tac Toe, Snake, Memory Match)
- **What they don't know:** Every action they take is being logged
- **Purpose:** Honeypot trap. These users believe they signed up for a gaming site.
- **Sidebar message:** "Account Pending - Premium features will unlock once your account is reviewed."

### Role: `approved`

- **What they see:** The steganography dashboard (`/dashboard`)
- **What they can do:**
  - Generate X25519 encryption key pairs
  - Embed encrypted messages into images, audio, and video
  - Extract and decrypt hidden messages from stego files
- **Purpose:** Trusted users who need access to the real tool

### Role: `admin`

- **What they see:** The control panel (`/admin`) + dashboard access
- **What they can do:**
  - Everything an approved user can do
  - View all registered users
  - Change any user's role (promote/demote)
  - View all activity logs (who did what, when, from where)
  - Monitor honeypot activity in real time

### Access Control Matrix

| Page / Feature         | Guest | Decoy | Approved | Admin |
|------------------------|-------|-------|----------|-------|
| Landing hero (`/play`) | See   | ---   | ---      | ---   |
| Gaming portal          | ---   | See   | Redirect | Redirect |
| Stego dashboard        | ---   | ---   | See      | See   |
| Admin control panel    | ---   | ---   | ---      | See   |
| Generate keys          | ---   | ---   | Yes      | Yes   |
| Embed messages         | ---   | ---   | Yes      | Yes   |
| Extract messages       | ---   | ---   | Yes      | Yes   |
| Manage users           | ---   | ---   | ---      | Yes   |
| View activity logs     | ---   | ---   | ---      | Yes   |

### Redirect Rules

When a user tries to access a page they don't have permission for:

| User Role | Visits `/play` | Visits `/dashboard` | Visits `/admin` |
|-----------|---------------|--------------------|-----------------|
| Guest     | Hero section  | Redirect `/login`  | Redirect `/login` |
| Decoy     | Game portal   | Redirect `/play`   | Redirect `/play`  |
| Approved  | Redirect `/dashboard` | Dashboard  | Redirect `/dashboard` |
| Admin     | Redirect `/admin`     | Allowed    | Control panel    |

---

## 5. Authentication Flow

### 5.1 Signup Flow

```
User fills form (/login?mode=signup)
  |
  v
POST /auth/signup {username, password, email}
  |
  v
Backend creates user (role=decoy, is_verified=false)
  |
  v
Verification email sent with token link
  |
  v
User sees: "Account created. Please check your email to verify your account."
  |
  v
User clicks link: /verify?token=XYZ
  |
  v
GET /auth/verify-email?token=XYZ
  |
  v
Backend sets is_verified=true, clears token
  |
  v
User sees: "Email Verified!" with link to login
```

### 5.2 Login Flow

```
User enters credentials (/login)
  |
  v
POST /auth/login {username, password}
  |
  +--> Password wrong?  --> 401 "Invalid credentials"
  |
  +--> Email not verified?  --> 403 "Email not verified"
  |
  v
Returns JWT token + role
  |
  v
Frontend stores token in localStorage
  |
  v
Auto-redirect based on role:
  admin    --> /admin
  approved --> /dashboard
  decoy    --> /play
```

### 5.3 Password Reset Flow

```
User clicks "Forgot password?" on login page
  |
  v
Navigates to /forgot-password
  |
  v
POST /auth/forgot-password {email}
  |
  v
Backend always responds: "If an account with that email exists, a reset link has been sent."
(This prevents email enumeration attacks)
  |
  v
If email exists: sends reset email with 15-minute token
  |
  v
User clicks link: /reset-password?token=XYZ
  |
  v
User enters new password + confirmation
  |
  v
POST /auth/reset-password {token, new_password}
  |
  v
Backend validates token, updates password, clears token
  |
  v
User sees: "Password Reset!" with link to login
```

### 5.4 Token Security

| Property              | Value                         |
|-----------------------|-------------------------------|
| Algorithm             | HMAC-SHA256                   |
| Token lifetime        | 24 hours (default)            |
| Verification token    | 30 minutes                    |
| Reset token           | 15 minutes                    |
| Token format          | URL-safe random (32 bytes)    |
| Password hashing      | PBKDF2-SHA256, 260k iterations |
| Storage               | localStorage (`ghostbit_token`) |

---

## 6. Admin Panel Guide

### Accessing the Admin Panel

1. Log in with an admin account at `/login`
2. You are automatically redirected to `/admin`
3. Or navigate directly to `http://localhost:3000/admin`

### 6.1 User Management Tab

This is the first tab you see. It shows a table of all registered users.

**Table Columns:**

| Column   | Description                                      |
|----------|--------------------------------------------------|
| ID       | Auto-incremented user ID                         |
| Username | The user's login name                            |
| Role     | Current role badge (color-coded)                 |
| Created  | Account creation date                            |
| Actions  | Role change buttons                              |

**Role Badge Colors:**

- Red badge = `admin`
- Green badge = `approved`
- Yellow badge = `decoy`

**Changing a User's Role:**

1. Find the user in the table
2. Click one of the role buttons next to their name:
   - **decoy** - Demote to honeypot user (can only see games)
   - **approved** - Promote to steganography access
   - **admin** - Promote to full admin access
3. The change takes effect immediately
4. The user's current role button is hidden (can't re-assign same role)
5. Your own row shows "(you)" with no action buttons (you can't change your own role)

**Example Workflow - Approving a New User:**

```
1. User signs up -> appears in table as "decoy"
2. You review their activity in the Logs tab
3. If legitimate, click "approved" button next to their name
4. User can now access /dashboard with steganography tools
5. The user will be redirected from /play to /dashboard on next login
```

**Example Workflow - Revoking Access:**

```
1. Find the user you want to restrict
2. Click "decoy" button next to their name
3. Their steganography access is immediately revoked
4. On next page load, they'll be redirected to /play
```

### 6.2 Activity Logs Tab

Click the "Activity Logs" tab to monitor all system activity.

**Table Columns:**

| Column | Description                                      |
|--------|--------------------------------------------------|
| User   | Username of who performed the action             |
| Action | What they did (color-coded)                      |
| IP     | Their IP address                                 |
| Time   | When it happened (local time format)             |

**Action Types You'll See:**

| Action                        | Meaning                                     |
|-------------------------------|---------------------------------------------|
| `signup`                      | New user registered                         |
| `login`                       | User logged in                              |
| `decoy:visited_play_page`     | Decoy user visited the game portal          |
| `decoy:opened_game:tictactoe` | Decoy user opened Tic Tac Toe               |
| `decoy:opened_game:snake`     | Decoy user opened Snake                     |
| `decoy:opened_game:memory`    | Decoy user opened Memory Match              |
| `decoy:clicked_coming_soon:*` | Decoy user clicked a "coming soon" game     |
| `decoy:nav_click:leaderboard` | Decoy user clicked a nav item               |
| `capacity_analysis:image`     | Approved user analyzed image capacity        |
| `capacity_analysis:audio`     | Approved user analyzed audio capacity        |
| `capacity_analysis:video`     | Approved user analyzed video capacity        |
| `embed:image`                 | Approved user embedded message in image      |
| `embed:audio`                 | Approved user embedded message in audio      |
| `embed:video`                 | Approved user embedded message in video      |
| `extract:image`               | Approved user extracted message from image   |
| `extract:audio`               | Approved user extracted message from audio   |
| `extract:video`               | Approved user extracted message from video   |

**Action Badge Colors:**

- Yellow = Decoy/honeypot actions (prefixed with `decoy:`)
- Indigo/Purple = All other system actions

**What to Look For:**

- Unusual signup patterns (multiple accounts from same IP)
- Decoy users repeatedly clicking "coming soon" features (frustration/probing)
- High-frequency game opens (could be automated)
- Login attempts without corresponding signups

---

## 7. The Honeypot System

### How It Works

The entire gaming portal (`/play`) is a honeypot. Here's the deception:

1. **Users sign up** thinking they're joining a gaming platform called "GhostPlay"
2. **They get a decoy role** by default - they never know this
3. **They play games** - Tic Tac Toe, Snake, Memory Match
4. **They see "Account Pending"** in the sidebar, making them think premium features are coming
5. **Every action is logged** - page visits, game opens, nav clicks, everything
6. **The admin watches** from the `/admin` panel

### What Gets Logged

Every time a decoy user does anything, a `POST /api/honeypot/action` is fired silently in the background. The backend logs:

- **Who:** User ID + username
- **What:** The action name (e.g., `opened_game:snake`)
- **Where:** Their IP address
- **When:** UTC timestamp

### The Deception Elements

| What the user sees             | What's actually happening              |
|-------------------------------|----------------------------------------|
| "GhostPlay - Free Browser Games" | It's a monitoring system              |
| "Account Pending"              | Their account will never be "approved" automatically |
| "Premium features coming soon" | There are no premium gaming features   |
| Games working normally         | Every click is being tracked           |
| "Leaderboard" / "Store" nav   | These are fake links that log clicks   |
| "Coming Soon" game badges      | These will never launch               |

---

## 8. Steganography Dashboard

### Who Can Access

Only users with `approved` or `admin` roles. Access it at `/dashboard`.

### 8.1 Key Generation

**Tab:** Keys

1. Click "Generate New Key Pair"
2. Two keys are generated:
   - **Private Key** (RED, SECRET) - Keep this safe, never share
   - **Public Key** (SHARE) - Give this to people who want to send you messages
3. Use "Copy" or "Download" buttons to save each key
4. Keys are in PEM format (X25519 elliptic curve)

### 8.2 Embedding a Message

**Tab:** Embed

1. **Upload a cover file** - Drag and drop a PNG image, WAV audio, or MP4 video
2. The system automatically analyzes the file's capacity (how much data it can hide)
3. **Paste the receiver's public key** - The PEM key of whoever should read the message
4. **Type your secret message** - The text you want to hide
5. Click **"Embed & Encrypt"**
6. Download the stego file - It looks identical to the original but contains your hidden message

### 8.3 Extracting a Message

**Tab:** Extract

1. **Upload the stego file** - The file containing a hidden message
2. **Paste your private key** - Your PEM private key
3. Click **"Extract & Decrypt"**
4. The system shows:
   - **Integrity badge** - Green (authentic) or Red (tampered)
   - **Decrypted message** - The hidden text

### 8.4 Encryption Pipeline

```
Sender                                    Receiver
  |                                          |
  |  1. Receiver generates keypair           |
  |  <--- Public Key shared ---              |
  |                                          |
  |  2. Sender embeds message:               |
  |     Message                              |
  |       --> AES-256-GCM encrypt            |
  |       --> LSB embed into cover file      |
  |       --> Stego file                     |
  |  --- Stego file sent --->                |
  |                                          |
  |  3. Receiver extracts:                   |
  |     Stego file + Private Key             |
  |       --> LSB extract                    |
  |       --> AES-256-GCM decrypt            |
  |       --> Original message               |
```

**Supported Formats:**

| Format | Type  | Extension |
|--------|-------|-----------|
| Image  | PNG   | .png      |
| Audio  | WAV   | .wav      |
| Video  | MP4   | .mp4, .m4v, .mov |

---

## 9. API Reference

### Authentication Endpoints (Public)

#### POST /auth/signup
```
Request:  {"username": "john", "password": "pass123", "email": "john@example.com"}
Response: {"message": "Account created. Please check your email to verify your account."}
Errors:   409 - Username/email already exists
```

#### POST /auth/login
```
Request:  {"username": "john", "password": "pass123"}
Response: {"access_token": "...", "token_type": "bearer", "role": "decoy", "username": "john"}
Errors:   401 - Invalid credentials
          403 - Email not verified
```

#### GET /auth/verify-email?token=XYZ
```
Response: {"message": "Email verified successfully. You can now log in."}
Errors:   400 - Invalid/expired token
```

#### POST /auth/forgot-password
```
Request:  {"email": "john@example.com"}
Response: {"message": "If an account with that email exists, a reset link has been sent."}
```

#### POST /auth/reset-password
```
Request:  {"token": "reset_token", "new_password": "newpass123"}
Response: {"message": "Password reset successfully. You can now log in."}
Errors:   400 - Invalid/expired token
```

#### GET /auth/me (Requires auth)
```
Headers:  Authorization: Bearer {token}
Response: {"id": 1, "username": "john", "role": "decoy", "created_at": "2026-03-27T..."}
```

### Steganography Endpoints (Requires approved/admin)

All require `Authorization: Bearer {token}` header.

#### POST /api/keys/generate
```
Response: {"private_key": "-----BEGIN PRIVATE KEY-----\n...", "public_key": "-----BEGIN PUBLIC KEY-----\n..."}
```

#### POST /api/capacity (multipart/form-data)
```
Fields:   file (required), bits_per_channel (default: 1)
Response: {"media_type": "image", "capacity": {"capacity_bytes": 12345, "usable_capacity_bytes": 10000}}
```

#### POST /api/embed (multipart/form-data)
```
Fields:   cover_file, public_key, message, bits_per_channel
Response: Binary file download with X-GhostBit-Metadata header
```

#### POST /api/extract (multipart/form-data)
```
Fields:   stego_file, private_key, bits_per_channel
Response: {"message": "secret text", "integrity_valid": true, "metadata": {...}}
```

### Admin Endpoints (Requires admin)

All require `Authorization: Bearer {token}` header with admin role.

#### GET /admin/users
```
Response: [{"id": 1, "username": "admin", "role": "admin", "created_at": "..."}]
```

#### PUT /admin/users/{user_id}/role
```
Request:  {"role": "approved"}   (valid: "decoy", "approved", "admin")
Response: {"id": 2, "username": "john", "role": "approved", "created_at": "..."}
Errors:   404 - User not found
```

#### GET /admin/logs?limit=100&offset=0
```
Response: [{"id": 1, "user_id": 2, "username": "john", "ip_address": "127.0.0.1", "action": "login", "timestamp": "..."}]
```

### Honeypot Endpoint (Any authenticated user)

#### POST /api/honeypot/action
```
Request:  {"action": "opened_game:snake"}
Response: {"status": "success", "message": "Operation completed successfully"}
Note:     Always returns success (it's a trap)
```

---

## 10. Environment Variables

### Backend (.env or system environment)

| Variable                      | Default              | Description                            |
|-------------------------------|----------------------|----------------------------------------|
| `GHOSTBIT_SECRET_KEY`         | Random (generated)   | JWT signing secret. Set this in production! |
| `GHOSTBIT_TOKEN_EXPIRE_MINUTES` | `1440` (24 hours)  | JWT access token lifetime              |
| `GHOSTBIT_DB_PATH`            | `./ghostbit.db`      | SQLite database file path              |
| `GHOSTBIT_SMTP_HOST`          | `smtp.gmail.com`     | SMTP server for sending emails         |
| `GHOSTBIT_SMTP_PORT`          | `587`                | SMTP port (TLS)                        |
| `GHOSTBIT_SMTP_USER`          | `""` (dev mode)      | SMTP login username                    |
| `GHOSTBIT_SMTP_PASS`          | `""` (dev mode)      | SMTP login password                    |
| `GHOSTBIT_FROM_EMAIL`         | Same as SMTP_USER    | "From" address on emails               |
| `GHOSTBIT_FRONTEND_URL`       | `http://localhost:3000` | Used in email verification/reset links |

**Dev Mode:** When `GHOSTBIT_SMTP_USER` is empty, emails are printed to the terminal instead of being sent. You'll see the verification/reset links in the backend console output.

### Frontend (.env.local)

| Variable              | Default                | Description            |
|-----------------------|------------------------|------------------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL  |

---

## 11. Architecture Overview

### System Flow Diagram

```
                    +------------------+
                    |   User Browser   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   Next.js (3000)  |
                    |                  |
                    |  /login          |  <-- All users start here
                    |  /play           |  <-- Decoy users land here (honeypot)
                    |  /dashboard      |  <-- Approved users (stego tools)
                    |  /admin          |  <-- Admin users (control panel)
                    |  /verify         |  <-- Email verification
                    |  /forgot-password|  <-- Password reset request
                    |  /reset-password |  <-- Password reset form
                    +--------+---------+
                             |
                        HTTP API calls
                             |
                    +--------v---------+
                    |  FastAPI (8000)   |
                    |                  |
                    |  /auth/*         |  <-- Authentication
                    |  /admin/*        |  <-- User management
                    |  /api/*          |  <-- Stego + honeypot
                    +--------+---------+
                             |
                    +--------v---------+
                    |  SQLite Database  |
                    |                  |
                    |  users           |  <-- Accounts + roles
                    |  honeypot_logs   |  <-- Activity tracking
                    +------------------+
```

### Database Schema

```
users
+----+----------+----------+-------------------+-------------+--------------------+-------------+--------------+-------+---------------------+
| id | username | password | email             | is_verified | verification_token | reset_token | token_expiry | role  | created_at          |
+----+----------+----------+-------------------+-------------+--------------------+-------------+--------------+-------+---------------------+
| 1  | admin    | pbkdf2.. | admin@example.com | 1           | NULL               | NULL        | NULL         | admin | 2026-03-27T00:00:00 |
| 2  | john     | pbkdf2.. | john@test.com     | 1           | NULL               | NULL        | NULL         | decoy | 2026-03-27T01:00:00 |
+----+----------+----------+-------------------+-------------+--------------------+-------------+--------------+-------+---------------------+

honeypot_logs
+----+---------+------------+-------------------------+---------------------+
| id | user_id | ip_address | action                  | timestamp           |
+----+---------+------------+-------------------------+---------------------+
| 1  | 2       | 127.0.0.1  | signup                  | 2026-03-27T01:00:00 |
| 2  | 2       | 127.0.0.1  | login                   | 2026-03-27T01:01:00 |
| 3  | 2       | 127.0.0.1  | decoy:visited_play_page | 2026-03-27T01:01:05 |
| 4  | 2       | 127.0.0.1  | decoy:opened_game:snake | 2026-03-27T01:02:30 |
+----+---------+------------+-------------------------+---------------------+
```

### Security Layers

```
Layer 1: PBKDF2-SHA256 (260k iterations) -- Password hashing
Layer 2: JWT HS256 with expiry           -- Session tokens
Layer 3: Email verification              -- Account activation
Layer 4: Role-based access control       -- Feature gating
Layer 5: X25519 + AES-256-GCM           -- Message encryption
Layer 6: LSB steganography              -- Data hiding
Layer 7: Honeypot logging               -- Threat monitoring
```
