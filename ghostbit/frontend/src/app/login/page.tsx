"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function LoginForm() {
  const { login, signup, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (!loading && user) {
      switch (user.role) {
        case "Admin":
          router.push("/admin");
          break;
        case "Approved":
          router.push("/dashboard");
          break;
        default:
          router.push("/play");
          break;
      }
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setShowResend(false);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        const msg = await signup(username, password, email);
        setSuccess(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      if (msg.toLowerCase().includes("not verified")) {
        setShowResend(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!resendEmail) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      setSuccess(data.message || "Verification email sent. Check your inbox.");
      setShowResend(false);
    } catch {
      setError("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (loading) return null;

  const inputStyle = {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#ececed",
    outline: "none",
  };

  return (
    <div
      className="flex items-center justify-center px-4"
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

        {/* Card */}
        <div
          className="p-7 rounded-xl"
          style={{
            background: "rgba(18,18,20,0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          {/* Tabs */}
          <div
            className="flex mb-8 rounded-lg overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setSuccess("");
                }}
                className="flex-1 py-2.5 text-sm font-medium transition-all"
                style={{
                  background:
                    mode === m ? "rgba(255,255,255,0.05)" : "transparent",
                  color: mode === m ? "#ececed" : "#52525b",
                  borderBottom:
                    mode === m
                      ? "2px solid #6366f1"
                      : "2px solid transparent",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Success message (e.g. after signup) */}
          {success && (
            <div
              className="flex items-start gap-2.5 text-xs font-mono px-4 py-3 rounded-lg mb-5"
              style={{
                color: "#4ade80",
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.2)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2"
                className="shrink-0 mt-0.5"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4 12 14.01l-3-3" />
              </svg>
              <span>
                {success.includes("[DEV MODE]") ? (
                  <>
                    {success.split("[DEV MODE]")[0]}
                    <br />
                    <span style={{ color: "#818cf8", fontSize: "10px" }}>
                      [DEV MODE]{" "}
                      <a
                        href={success.split("Verify here: ")[1]?.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#a5b4fc", textDecoration: "underline" }}
                      >
                        Click here to verify
                      </a>
                    </span>
                  </>
                ) : (
                  success
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                className="block text-xs font-mono uppercase tracking-wider mb-2"
                style={{ color: "#475569" }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
                className="w-full px-4 py-3 rounded-lg text-sm font-mono transition-colors"
                style={inputStyle}
                placeholder="Enter username"
              />
            </div>

            {/* Email field — signup only */}
            {mode === "signup" && (
              <div>
                <label
                  className="block text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: "#475569" }}
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
                  placeholder="Enter email"
                />
              </div>
            )}

            <div>
              <label
                className="block text-xs font-mono uppercase tracking-wider mb-2"
                style={{ color: "#475569" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-lg text-sm font-mono transition-colors"
                style={inputStyle}
                placeholder="Enter password"
              />
            </div>

            {/* Forgot password — login only */}
            {mode === "login" && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs transition-colors"
                  style={{ color: "#6366f1" }}
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <p
                className="text-xs font-mono px-3 py-2 rounded-lg"
                style={{
                  color: "#f87171",
                  background: "rgba(248,113,113,0.08)",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                {error}
              </p>
            )}

            {/* Resend verification email */}
            {showResend && (
              <div
                className="rounded-md px-4 py-3 space-y-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-xs" style={{ color: "#94a3b8" }}>
                  Enter your email to resend the verification link:
                </p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={inputStyle}
                  placeholder="Your email address"
                />
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !resendEmail}
                  className="w-full py-2 text-xs font-medium rounded-md transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#ececed",
                    border: "1px solid rgba(255,255,255,0.1)",
                    opacity: resending || !resendEmail ? 0.4 : 1,
                    cursor: resending || !resendEmail ? "not-allowed" : "pointer",
                  }}
                >
                  {resending ? "Sending..." : "Resend Verification Email"}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !!success}
              className="w-full py-3 text-sm font-semibold rounded-lg transition-all"
              style={{
                background: "#6366f1",
                color: "#fff",
                opacity: submitting || success ? 0.4 : 1,
                cursor: submitting || success ? "not-allowed" : "pointer",
              }}
            >
              {submitting
                ? "Processing..."
                : mode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
