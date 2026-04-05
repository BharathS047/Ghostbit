"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
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
      const data = await res.json();
      // Extract dev code if present
      if (data.message?.includes("[DEV CODE]")) {
        setDevCode(data.message.split("[DEV CODE]")[1]?.trim() || "");
      }
      setStep("code");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Reset failed");
      }
      setStep("done");
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
          {/* Step 1: Enter email */}
          {step === "email" && (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "#ececed" }}>
                Forgot Password
              </h2>
              <p className="text-xs mb-6" style={{ color: "#52525b" }}>
                Enter your email and we&apos;ll send you a 6-digit reset code.
              </p>

              <form onSubmit={handleSendCode} className="space-y-5">
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
                  {submitting ? "Sending..." : "Send Reset Code"}
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

          {/* Step 2: Enter code + new password */}
          {step === "code" && (
            <>
              <h2 className="text-lg font-semibold mb-1" style={{ color: "#ececed" }}>
                Reset Password
              </h2>
              <p className="text-xs mb-6" style={{ color: "#52525b" }}>
                Enter the code sent to <strong style={{ color: "#94a3b8" }}>{email}</strong> and your new password.
              </p>

              {devCode && (
                <div
                  className="text-xs font-mono px-3 py-2 rounded-md mb-5"
                  style={{
                    color: "#818cf8",
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  [DEV] Code: <strong>{devCode}</strong>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label
                    className="block text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "#52525b" }}
                  >
                    Reset Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full px-4 py-4 rounded-lg text-2xl font-mono tracking-[0.5em] text-center transition-colors"
                    style={inputStyle}
                    placeholder="000000"
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "#52525b" }}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-lg text-sm font-mono transition-colors"
                      style={inputStyle}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none select-none transition-transform hover:scale-110"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "🐵" : "🙈"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "#52525b" }}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 rounded-lg text-sm font-mono transition-colors"
                      style={inputStyle}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none select-none transition-transform hover:scale-110"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? "🐵" : "🙈"}
                    </button>
                  </div>
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
                  disabled={submitting || code.length !== 6}
                  className="w-full py-3 text-sm font-semibold rounded-lg transition-all"
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    opacity: submitting || code.length !== 6 ? 0.4 : 1,
                    cursor: submitting || code.length !== 6 ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Resetting..." : "Reset Password"}
                </button>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep("email"); setError(""); setCode(""); setDevCode(""); }}
                    className="text-xs transition-colors"
                    style={{ color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Change email
                  </button>
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

          {/* Step 3: Success */}
          {step === "done" && (
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
