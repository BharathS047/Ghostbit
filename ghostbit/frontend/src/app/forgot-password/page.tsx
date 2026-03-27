"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Something went wrong");
      }
      setSent(true);
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
          <h2 className="text-lg font-semibold mb-1" style={{ color: "#ececed" }}>
            Forgot Password
          </h2>
          <p className="text-xs mb-6" style={{ color: "#52525b" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>

          {sent ? (
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
                Reset Link Sent
              </h2>
              <p className="text-sm" style={{ color: "#8b8b8e" }}>
                If an account with that email exists, you&apos;ll receive a password reset link shortly.
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: "#52525b" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono transition-colors"
                  style={inputStyle}
                  placeholder="Enter your email"
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
                disabled={submitting}
                className="w-full py-3 text-sm font-semibold rounded-lg transition-all"
                style={{
                  background: "#6366f1",
                  color: "#fff",
                  opacity: submitting ? 0.4 : 1,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Sending..." : "Send Reset Link"}
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
