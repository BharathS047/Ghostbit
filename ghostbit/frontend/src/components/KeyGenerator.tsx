"use client";

import { useState } from "react";

export default function KeyGenerator() {
  const [keys, setKeys] = useState<{ public: string; private: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const generateKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/keys/generate", { method: "POST" });
      const data = await res.json();
      setKeys({ public: data.public_key, private: data.private_key });
    } catch {
      alert("Failed to connect to backend API.");
    } finally {
      setLoading(false);
    }
  };

  const downloadKey = (type: "public" | "private", content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_key.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🔑</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gradient">Generate Keys</h2>
        </div>
        <p style={{ color: "var(--text-secondary)" }}>
          Generate your X25519 elliptic-curve key pair. Share the public key with senders — keep your private key <strong className="text-red-400">secret</strong>.
        </p>
      </div>

      {/* Generate Button */}
      <button onClick={generateKeys} disabled={loading} className="btn-primary text-base w-full sm:w-auto">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating...
          </span>
        ) : (
          "⚡ Generate New Key Pair"
        )}
      </button>

      {/* Key Output */}
      {keys && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up">
          {/* Private Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="badge badge-red">🔐 Private Key — SECRET</span>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(keys.private)} className="text-xs px-3 py-1 rounded-full transition" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                  Copy
                </button>
                <button onClick={() => downloadKey("private", keys.private)} className="text-xs px-3 py-1 rounded-full transition" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                  ↓ Download
                </button>
              </div>
            </div>
            <div className="glass-input p-4 font-mono text-xs h-56 overflow-y-auto word-break" style={{ color: "#fca5a5", borderColor: "rgba(248,113,113,0.15)" }}>
              {keys.private}
            </div>
          </div>

          {/* Public Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="badge badge-green">🌐 Public Key — SHARE</span>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(keys.public)} className="text-xs px-3 py-1 rounded-full transition" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                  Copy
                </button>
                <button onClick={() => downloadKey("public", keys.public)} className="text-xs px-3 py-1 rounded-full transition" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
                  ↓ Download
                </button>
              </div>
            </div>
            <div className="glass-input p-4 font-mono text-xs h-56 overflow-y-auto word-break" style={{ color: "#6ee7b7", borderColor: "rgba(16,185,129,0.15)" }}>
              {keys.public}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
