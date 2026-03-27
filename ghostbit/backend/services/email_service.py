"""
GhostBit Email Service
Sends verification and password-reset emails via Azure Communication Services.
"""

import os
import logging
from azure.communication.email import EmailClient

log = logging.getLogger(__name__)

ACS_CONNECTION_STRING = os.environ.get("GHOSTBIT_ACS_CONNECTION_STRING", "")
FROM_EMAIL = os.environ.get("GHOSTBIT_FROM_EMAIL", "")
FRONTEND_URL = os.environ.get("GHOSTBIT_FRONTEND_URL", "http://localhost:3000")


def is_dev_mode() -> bool:
    return not ACS_CONNECTION_STRING or not FROM_EMAIL


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an HTML email via ACS. Returns True on success, False on failure."""
    if is_dev_mode():
        log.warning(
            "ACS not configured. Email would be sent to %s:\n  Subject: %s\n  Body: %s",
            to_email,
            subject,
            html_body,
        )
        print(f"\n{'='*60}")
        print(f"[DEV EMAIL] To: {to_email}")
        print(f"[DEV EMAIL] Subject: {subject}")
        print(f"[DEV EMAIL] Body:\n{html_body}")
        print(f"{'='*60}\n")
        return True

    try:
        client = EmailClient.from_connection_string(ACS_CONNECTION_STRING)
        message = {
            "senderAddress": FROM_EMAIL,
            "recipients": {"to": [{"address": to_email}]},
            "content": {"subject": subject, "html": html_body},
        }
        poller = client.begin_send(message)
        result = poller.result()
        if result["status"] == "Succeeded":
            return True
        log.error("ACS email send failed with status: %s", result["status"])
        return False
    except Exception:
        log.exception("Failed to send email to %s", to_email)
        return False


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def send_verification_email(to_email: str, token: str) -> bool:
    link = f"{FRONTEND_URL}/verify?token={token}"
    subject = "Verify your GhostPlay account"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0f172a;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#a5b4fc;margin-bottom:8px;">Welcome to GhostPlay!</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
        Click the button below to verify your email address and activate your account.
      </p>
      <a href="{link}"
         style="display:inline-block;margin:24px 0;padding:12px 28px;
                background:linear-gradient(135deg,#6366f1,#4f46e5);
                color:#fff;text-decoration:none;border-radius:10px;
                font-weight:600;font-size:14px;">
        Verify Email
      </a>
      <p style="color:#475569;font-size:12px;">
        Or copy this link: <br/>
        <span style="color:#94a3b8;word-break:break-all;">{link}</span>
      </p>
      <p style="color:#334155;font-size:11px;margin-top:24px;">
        This link expires in 30 minutes. If you didn't create an account, ignore this email.
      </p>
    </div>
    """
    return _send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    link = f"{FRONTEND_URL}/reset-password?token={token}"
    subject = "Reset your GhostPlay password"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                background:#0f172a;color:#e2e8f0;border-radius:12px;">
      <h2 style="color:#a5b4fc;margin-bottom:8px;">Password Reset</h2>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
        We received a request to reset your password. Click the button below to set a new one.
      </p>
      <a href="{link}"
         style="display:inline-block;margin:24px 0;padding:12px 28px;
                background:linear-gradient(135deg,#6366f1,#4f46e5);
                color:#fff;text-decoration:none;border-radius:10px;
                font-weight:600;font-size:14px;">
        Reset Password
      </a>
      <p style="color:#475569;font-size:12px;">
        Or copy this link: <br/>
        <span style="color:#94a3b8;word-break:break-all;">{link}</span>
      </p>
      <p style="color:#334155;font-size:11px;margin-top:24px;">
        This link expires in 15 minutes. If you didn't request a reset, ignore this email.
      </p>
    </div>
    """
    return _send_email(to_email, subject, html)
