"""
GhostBit Database Module
SQLite database for user management.
"""

import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = os.environ.get(
    "GHOSTBIT_DB_PATH",
    str(Path(__file__).parent / "ghostbit.db"),
)

# Ensure parent directory exists (needed on Azure App Service)
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(os.path.abspath(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist, and migrate schema as needed."""
    conn = get_connection()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            username            TEXT    NOT NULL UNIQUE,
            password            TEXT    NOT NULL,
            email               TEXT    UNIQUE,
            is_verified         INTEGER NOT NULL DEFAULT 0,
            verification_token  TEXT,
            reset_token         TEXT,
            token_expiry        TEXT,
            role                TEXT    NOT NULL DEFAULT 'Decoy'
                                        CHECK(role IN ('Decoy', 'Approved', 'Admin')),
            created_at          TEXT    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scores (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            username   TEXT    NOT NULL,
            game       TEXT    NOT NULL,
            score      INTEGER NOT NULL,
            played_at  TEXT    NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game);
        """
    )
    conn.commit()

    # Migrate existing tables — add columns if missing
    cursor = conn.execute("PRAGMA table_info(users)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    migrations = [
        ("email", "TEXT"),
        ("is_verified", "INTEGER NOT NULL DEFAULT 0"),
        ("verification_token", "TEXT"),
        ("reset_token", "TEXT"),
        ("token_expiry", "TEXT"),
    ]
    for col_name, col_def in migrations:
        if col_name not in existing_cols:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
    # Ensure unique index on email (safe to run repeatedly)
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL")
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# User helpers
# ---------------------------------------------------------------------------

def create_user(
    username: str,
    hashed_password: str,
    role: str = "Decoy",
    email: str | None = None,
    verification_token: str | None = None,
    token_expiry: str | None = None,
) -> dict:
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    try:
        cur = conn.execute(
            """INSERT INTO users
               (username, password, role, email, is_verified, verification_token, token_expiry, created_at)
               VALUES (?, ?, ?, ?, 0, ?, ?, ?)""",
            (username, hashed_password, role, email, verification_token, token_expiry, now),
        )
        conn.commit()
        user = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
        return dict(user)
    except sqlite3.IntegrityError as e:
        err_msg = str(e).lower()
        if "email" in err_msg:
            raise ValueError("Email already registered")
        raise ValueError("Username already exists")
    finally:
        conn.close()


def get_user_by_username(username: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_users() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT id, username, role, created_at FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_user_role(user_id: int, role: str) -> dict | None:
    if role not in ("Decoy", "Approved", "Admin"):
        raise ValueError(f"Invalid role: {role}")
    conn = get_connection()
    conn.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
    conn.commit()
    row = conn.execute("SELECT id, username, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None



def get_user_by_email(email: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_verification_token(token: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE verification_token = ?", (token,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_reset_token(token: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE reset_token = ?", (token,)).fetchone()
    conn.close()
    return dict(row) if row else None


def set_verification_token(user_id: int, token: str, expiry: str) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE users SET verification_token = ?, token_expiry = ? WHERE id = ?",
        (token, expiry, user_id),
    )
    conn.commit()
    conn.close()


def verify_user_email(user_id: int) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE users SET is_verified = 1, verification_token = NULL, token_expiry = NULL WHERE id = ?",
        (user_id,),
    )
    conn.commit()
    conn.close()


def set_reset_token(user_id: int, token: str, expiry: str) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE users SET reset_token = ?, token_expiry = ? WHERE id = ?",
        (token, expiry, user_id),
    )
    conn.commit()
    conn.close()


def update_user_password(user_id: int, hashed_password: str) -> None:
    conn = get_connection()
    conn.execute(
        "UPDATE users SET password = ?, reset_token = NULL, token_expiry = NULL WHERE id = ?",
        (hashed_password, user_id),
    )
    conn.commit()
    conn.close()


def seed_admin_user(
    username: str,
    hashed_password: str,
    email: str,
) -> None:
    """Idempotently ensure the seeded admin user exists with the correct role.

    - If the user doesn't exist → insert with role='admin' and is_verified=1.
    - If the user exists but is not admin → promote to admin and mark verified.
    - If the user already exists as admin → do nothing.
    """
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id, role FROM users WHERE email = ? OR username = ?",
            (email, username),
        ).fetchone()
        if existing:
            if existing["role"] != "Admin":
                conn.execute(
                    "UPDATE users SET role = 'Admin', is_verified = 1 WHERE id = ?",
                    (existing["id"],),
                )
                conn.commit()
            return
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """INSERT INTO users
               (username, password, role, email, is_verified,
                verification_token, token_expiry, created_at)
               VALUES (?, ?, 'Admin', ?, 1, NULL, NULL, ?)""",
            (username, hashed_password, email, now),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Score / leaderboard helpers
# ---------------------------------------------------------------------------

# Aggregation and sort direction per game
_GAME_AGG: dict[str, tuple[str, str]] = {
    "snake":     ("MAX", "DESC"),   # highest single-game score
    "tictactoe": ("SUM", "DESC"),   # cumulative wins
    "memory":    ("MIN", "ASC"),    # fewest moves to complete
}


def submit_score(user_id: int, username: str, game: str, score: int) -> None:
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO scores (user_id, username, game, score, played_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, username, game, score, now),
    )
    conn.commit()
    conn.close()


def get_leaderboard(game: str, limit: int = 10) -> list[dict]:
    agg, order = _GAME_AGG.get(game, ("MAX", "DESC"))
    conn = get_connection()
    rows = conn.execute(
        f"""
        SELECT username, {agg}(score) AS score
        FROM scores
        WHERE game = ?
        GROUP BY user_id
        ORDER BY score {order}
        LIMIT ?
        """,
        (game, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

