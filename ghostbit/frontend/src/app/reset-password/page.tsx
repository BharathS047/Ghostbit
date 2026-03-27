"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link — no token found");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Reset failed");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#ececed",
    outline: "none",
  };

  return (
    <div
      className="flex items-center justify-center px-4 relative"
      style={{ minHeight: "100vh", background: "#0a0a0b" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#6366f1" }}
          >
            <span className="text-sm font-black text-white tracking-tighter">
              GP
            </span>
          </div>
          <span
            className="font-semibold tracking-tight text-lg"
            style={{ color: "#ececed" }}
          >
            GhostPlay
          </span>
        </div>

        <div
          className="p-7 rounded-xl"
          style={{
            background: "rgba(18,18,20,0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
              <h2 className="text-lg font-semibold" style={{ color: "#4ade80" }}>
                Password Reset!
              </h2>
              <p className="text-sm" style={{ color: "#8b8b8e" }}>
                Your password has been updated successfully.
              </p>
              <Link
                href="/login"
                className="mt-2 inline-block px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: "#6366f1", color: "#fff" }}
              >
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "#ececed" }}>
                Reset Password
              </h2>
              <p className="text-xs mb-6" style={{ color: "#52525b" }}>
                Enter your new password below.
              </p>

              {!token && (
                <div
                  className="text-xs font-mono px-3 py-2 rounded-md mb-5"
                  style={{
                    color: "#f87171",
                    background: "rgba(248,113,113,0.06)",
                    border: "1px solid rgba(248,113,113,0.12)",
                  }}
                >
                  Invalid reset link. Please request a new one.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "#52525b" }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg text-sm font-mono transition-colors"
                    style={inputStyle}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "#52525b" }}
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg text-sm font-mono transition-colors"
                    style={inputStyle}
                    placeholder="Confirm new password"
                  />
                </div>

                {error && (
                  <p
                    className="text-xs font-mono px-3 py-2 rounded-md"
                    style={{
                      color: "#f87171",
                      background: "rgba(248,113,113,0.06)",
                      border: "1px solid rgba(248,113,113,0.12)",
                    }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !token}
                  className="w-full py-3 text-sm font-semibold rounded-lg transition-all"
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    opacity: submitting || !token ? 0.4 : 1,
                    cursor: submitting || !token ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Resetting..." : "Reset Password"}
                </button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-xs transition-colors"
                    style={{ color: "#6366f1" }}
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>

        <p
          className="text-center text-xs mt-6 font-mono"
          style={{ color: "#3f3f46" }}
        >
          GhostPlay
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
