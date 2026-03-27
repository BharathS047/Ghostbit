"""
Tests for GhostBit authentication, role-based routing, and admin access control.
"""

import os
import sys
import tempfile
import pytest

# Ensure the project root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Use a temporary database for tests
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["GHOSTBIT_DB_PATH"] = _tmp_db.name
os.environ["GHOSTBIT_SECRET_KEY"] = "test-secret-key-for-unit-tests"
_tmp_db.close()

from fastapi.testclient import TestClient
from ghostbit.backend.main import app
from ghostbit.backend.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True, scope="module")
def setup_db():
    init_db()
    yield
    os.unlink(os.environ["GHOSTBIT_DB_PATH"])


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------

class TestSignup:
    def test_signup_creates_user_with_decoy_role(self):
        res = client.post("/auth/signup", json={"username": "alice", "password": "password123"})
        assert res.status_code == 200
        data = res.json()
        assert data["role"] == "Decoy"
        assert data["username"] == "alice"
        assert "access_token" in data

    def test_signup_duplicate_username(self):
        client.post("/auth/signup", json={"username": "dupuser", "password": "password123"})
        res = client.post("/auth/signup", json={"username": "dupuser", "password": "password123"})
        assert res.status_code == 409

    def test_signup_short_username(self):
        res = client.post("/auth/signup", json={"username": "ab", "password": "password123"})
        assert res.status_code == 422

    def test_signup_short_password(self):
        res = client.post("/auth/signup", json={"username": "shortpw", "password": "12345"})
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self):
        client.post("/auth/signup", json={"username": "bob", "password": "secret99"})
        res = client.post("/auth/login", json={"username": "bob", "password": "secret99"})
        assert res.status_code == 200
        data = res.json()
        assert data["username"] == "bob"
        assert "access_token" in data

    def test_login_wrong_password(self):
        client.post("/auth/signup", json={"username": "carol", "password": "correct"})
        res = client.post("/auth/login", json={"username": "carol", "password": "wrong"})
        assert res.status_code == 401

    def test_login_nonexistent_user(self):
        res = client.post("/auth/login", json={"username": "nobody", "password": "pass"})
        assert res.status_code == 401


class TestMe:
    def test_me_returns_user_info(self):
        res = client.post("/auth/signup", json={"username": "dave", "password": "password123"})
        token = res.json()["access_token"]
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["username"] == "dave"
        assert me.json()["role"] == "Decoy"

    def test_me_without_token(self):
        res = client.get("/auth/me")
        assert res.status_code in (401, 403)  # HTTPBearer may return 401 or 403

    def test_me_with_invalid_token(self):
        res = client.get("/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# Role-based access control tests
# ---------------------------------------------------------------------------

def _create_user_with_role(username, password, role):
    """Helper: create a user and set their role directly in DB."""
    from ghostbit.backend.database import get_connection
    signup_res = client.post("/auth/signup", json={"username": username, "password": password})
    token = signup_res.json()["access_token"]
    if role != "Decoy":
        conn = get_connection()
        conn.execute("UPDATE users SET role = ? WHERE username = ?", (role, username))
        conn.commit()
        conn.close()
        # Re-login to get fresh token with correct role
        login_res = client.post("/auth/login", json={"username": username, "password": password})
        token = login_res.json()["access_token"]
    return token


class TestAccessControl:
    @pytest.fixture(autouse=True, scope="class")
    def setup_users(self):
        self.__class__.decoy_token = _create_user_with_role("ac_decoy", "password123", "Decoy")
        self.__class__.approved_token = _create_user_with_role("ac_approved", "password123", "Approved")
        self.__class__.admin_token = _create_user_with_role("ac_admin", "password123", "Admin")

    def test_decoy_cannot_access_keys(self):
        res = client.post("/api/keys/generate", headers={"Authorization": f"Bearer {self.decoy_token}"})
        assert res.status_code == 403

    def test_approved_can_access_keys(self):
        res = client.post("/api/keys/generate", headers={"Authorization": f"Bearer {self.approved_token}"})
        assert res.status_code == 200
        assert "private_key" in res.json()

    def test_admin_can_access_keys(self):
        res = client.post("/api/keys/generate", headers={"Authorization": f"Bearer {self.admin_token}"})
        assert res.status_code == 200

    def test_unauthenticated_cannot_access_keys(self):
        res = client.post("/api/keys/generate")
        assert res.status_code in (401, 403)


class TestAdminEndpoints:
    @pytest.fixture(autouse=True, scope="class")
    def setup_users(self):
        self.__class__.admin_token = _create_user_with_role("adm_admin", "password123", "Admin")
        self.__class__.approved_token = _create_user_with_role("adm_approved", "password123", "Approved")
        self.__class__.decoy_token = _create_user_with_role("adm_decoy", "password123", "Decoy")

    def test_admin_can_list_users(self):
        res = client.get("/admin/users", headers={"Authorization": f"Bearer {self.admin_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_approved_cannot_list_users(self):
        res = client.get("/admin/users", headers={"Authorization": f"Bearer {self.approved_token}"})
        assert res.status_code == 403

    def test_decoy_cannot_list_users(self):
        res = client.get("/admin/users", headers={"Authorization": f"Bearer {self.decoy_token}"})
        assert res.status_code == 403

    def test_admin_can_change_role(self):
        # Get user list and find the decoy user
        users = client.get("/admin/users", headers={"Authorization": f"Bearer {self.admin_token}"}).json()
        decoy_user = next(u for u in users if u["username"] == "adm_decoy")

        res = client.put(
            f"/admin/users/{decoy_user['id']}/role",
            json={"role": "Approved"},
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        assert res.status_code == 200
        assert res.json()["role"] == "Approved"

    def test_admin_can_view_logs(self):
        res = client.get("/admin/logs", headers={"Authorization": f"Bearer {self.admin_token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_approved_cannot_view_logs(self):
        res = client.get("/admin/logs", headers={"Authorization": f"Bearer {self.approved_token}"})
        assert res.status_code == 403

    def test_invalid_role_rejected(self):
        users = client.get("/admin/users", headers={"Authorization": f"Bearer {self.admin_token}"}).json()
        some_user = users[0]
        res = client.put(
            f"/admin/users/{some_user['id']}/role",
            json={"role": "superadmin"},
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        assert res.status_code == 422


# ---------------------------------------------------------------------------
# Honeypot logging tests
# ---------------------------------------------------------------------------

class TestHoneypotLogging:
    def test_decoy_action_logged(self):
        token = _create_user_with_role("honeypot_user", "password123", "Decoy")
        res = client.post(
            "/api/honeypot/action",
            json={"action": "test_action"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.json()["status"] == "success"

    def test_health_endpoint_remains_public(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
