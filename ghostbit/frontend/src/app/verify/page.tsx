"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function VerifyContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">("form");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`${API}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.detail || "Verification failed.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  const inputStyle = {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#ececed",
    outline: "none",
  };

  const icon =
    status === "success" ? (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </svg>
    ) : status === "error" ? (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ) : null;

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
          {status === "loading" ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "#6366f1", borderTopColor: "transparent" }}
              />
              <p className="text-sm" style={{ color: "#8b8b8e" }}>
                Verifying...
              </p>
            </div>
          ) : status === "success" || status === "error" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              {icon}
              <h2
                className="text-lg font-semibold"
                style={{ color: status === "success" ? "#4ade80" : "#f87171" }}
              >
                {status === "success" ? "Email Verified!" : "Verification Failed"}
              </h2>
              <p className="text-sm" style={{ color: "#8b8b8e" }}>
                {message}
              </p>
              {status === "error" && (
                <button
                  onClick={() => { setStatus("form"); setMessage(""); setCode(""); }}
                  className="mt-2 inline-block px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#ececed", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Try Again
                </button>
              )}
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
                Verify Your Email
              </h2>
              <p className="text-xs mb-6" style={{ color: "#52525b" }}>
                Enter your email and the 6-digit code we sent you.
              </p>

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
                <div>
                  <label
                    className="block text-xs font-mono uppercase tracking-wider mb-2"
                    style={{ color: "#52525b" }}
                  >
                    Verification Code
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

                <button
                  type="submit"
                  disabled={code.length !== 6 || !email}
                  className="w-full py-3 text-sm font-semibold rounded-lg transition-all"
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    opacity: code.length !== 6 || !email ? 0.4 : 1,
                    cursor: code.length !== 6 || !email ? "not-allowed" : "pointer",
                  }}
                >
                  Verify Email
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

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyContent />
    </Suspense>
  );
}
