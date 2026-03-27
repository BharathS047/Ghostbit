"use client";

import { useState, useEffect, useCallback } from "react";
import RouteGuard from "../../components/RouteGuard";
import { useAuth } from "../../context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface UserRecord {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

export default function AdminPage() {
  return (
    <RouteGuard allowed={["admin"]}>
      <AdminDashboard />
    </RouteGuard>
  );
}

function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API}/admin/users`, { headers });
    if (res.ok) setUsers(await res.json());
  }, [token]);

  useEffect(() => {
    fetchUsers().finally(() => setLoadingData(false));
  }, [fetchUsers]);

  async function changeRole(userId: number, newRole: string) {
    await fetch(`${API}/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  }

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: "rgba(3,7,18,0.88)",
          backdropFilter: "blur(28px) saturate(180%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #ef4444, #991b1b)",
                boxShadow: "0 0 22px rgba(239,68,68,0.38)",
              }}
            >
              <span className="text-xs font-black text-white tracking-tighter">GB</span>
            </div>
            <span className="font-bold tracking-tight text-gradient text-base">GhostBit</span>
            <span
              className="ml-2 text-xs font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {user?.username}
            </span>
            <button
              onClick={logout}
              className="text-xs font-mono px-3 py-1.5 rounded-md"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative pt-16">
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0 dot-grid" style={{ opacity: 0.3 }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {/* Page title */}
          <div className="mb-8">
            <p className="section-label mb-3">GhostBit / Admin</p>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: "#ef4444" }}>
              Control Panel
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Manage users and roles.
            </p>
          </div>

          <div className="glow-line-left mb-8" />

          {loadingData ? (
            <p className="text-sm font-mono" style={{ color: "var(--text-muted)" }}>Loading...</p>
          ) : (
            <UsersTable users={users} currentUserId={user?.id ?? 0} onChangeRole={changeRole} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── User Management Table ── */
function UsersTable({
  users,
  currentUserId,
  onChangeRole,
}: {
  users: UserRecord[];
  currentUserId: number;
  onChangeRole: (id: number, role: string) => void;
}) {
  const roles = ["decoy", "approved", "admin"] as const;

  const roleButtonStyle: Record<string, { bg: string; color: string; border: string; shadow: string; label: string }> = {
    approved: {
      bg: "rgba(34,197,94,0.15)",
      color: "#22c55e",
      border: "1px solid rgba(34,197,94,0.5)",
      shadow: "0 0 8px rgba(34,197,94,0.2)",
      label: "Approve",
    },
    admin: {
      bg: "rgba(239,68,68,0.15)",
      color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.5)",
      shadow: "0 0 8px rgba(239,68,68,0.2)",
      label: "Make Admin",
    },
    decoy: {
      bg: "rgba(234,179,8,0.12)",
      color: "#eab308",
      border: "1px solid rgba(234,179,8,0.4)",
      shadow: "none",
      label: "Decoy",
    },
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>ID</th>
              <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Username</th>
              <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</th>
              <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Created</th>
              <th className="text-left px-6 py-4 font-mono text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td className="px-6 py-4 font-mono" style={{ color: "var(--text-muted)" }}>#{u.id}</td>
                <td className="px-6 py-4 font-semibold" style={{ color: "var(--text-primary)" }}>{u.username}</td>
                <td className="px-6 py-4">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-6 py-4 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {u.id === currentUserId ? (
                    <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      (you)
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      {roles
                        .filter((r) => r !== u.role)
                        .map((r) => {
                          const s = roleButtonStyle[r];
                          return (
                            <button
                              key={r}
                              onClick={() => onChangeRole(u.id, r)}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                              style={{
                                background: s.bg,
                                color: s.color,
                                border: s.border,
                                boxShadow: s.shadow,
                              }}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    admin: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
    approved: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
    decoy: { bg: "rgba(234,179,8,0.12)", text: "#eab308", border: "rgba(234,179,8,0.3)" },
  };
  const c = colors[role] || colors.decoy;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded text-xs font-mono font-semibold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {role}
    </span>
  );
}

