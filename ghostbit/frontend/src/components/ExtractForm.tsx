"use client";

import { useState, useRef } from "react";
import MatrixLoadingScreen from "./MatrixLoadingScreen";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ExtractForm() {
  const [file, setFile] = useState<File | null>(null);
  const [privateKey, setPrivateKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{ message: string; integrity_valid: boolean; metadata: any } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !privateKey) return;
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem("ghostbit_token");
      const formData = new FormData();
      formData.append("stego_file", file);
      formData.append("private_key", privateKey);
      const [res] = await Promise.all([
        fetch(`${API}/api/extract`, { method: "POST", body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      alert(`Extraction failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {loading && <MatrixLoadingScreen text="Extracting & Decrypting..." />}

      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gradient-tertiary mb-3">Extract Message</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Extract and decrypt the hidden message from a stego media file using your private key.
        </p>
      </div>

      <form onSubmit={handleExtract} className="space-y-6">
        {/* Drag & Drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="relative p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center"
          style={{
            borderColor: isDragging ? "var(--accent-extract)" : file ? "var(--accent-extract)" : "var(--border-subtle)",
            background: isDragging ? "rgba(185,28,28,0.05)" : file ? "rgba(185,28,28,0.05)" : "rgba(0,0,0,0.2)",
          }}
        >
          <input ref={fileRef} type="file" accept=".png,.wav,.mp4,.mov,.m4v" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                style={{ background: "rgba(185,28,28,0.12)", border: "1px solid rgba(185,28,28,0.3)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <p className="font-semibold">{file.name}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center opacity-40"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </span>
              <p style={{ color: "var(--text-secondary)" }}>Drag & drop a stego file here, or click to browse</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>PNG · WAV · MP4</p>
            </div>
          )}
        </div>

        {/* Private Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Your Private Key</label>
          <textarea
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            required
            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            className="glass-input w-full max-w-full h-28 p-4 text-xs font-mono resize-none"
            style={{ color: "#fca5a5", borderColor: "rgba(185,28,28,0.15)" }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file || !privateKey}
          className="w-full py-4 text-base font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #b91c1c, #ef4444)",
            color: "#fff",
            boxShadow: "var(--glow-tertiary)",
          }}
        >
          {loading ? "Processing..." : "Extract & Decrypt"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="space-y-6 pt-6 animate-fade-in-up" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {/* Integrity Badge */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border text-sm font-semibold"
            style={{
              background: result.integrity_valid ? "rgba(239,68,68,0.08)" : "rgba(127,29,29,0.08)",
              borderColor: result.integrity_valid ? "rgba(239,68,68,0.25)" : "rgba(127,29,29,0.25)",
              color: result.integrity_valid ? "#ef4444" : "#f87171",
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: result.integrity_valid ? "#ef4444" : "#7f1d1d", boxShadow: result.integrity_valid ? "0 0 6px #ef4444" : "none" }}
            />
            {result.integrity_valid
              ? "Integrity Verification Passed — Message is authentic"
              : "Integrity Verification Failed — Message may be corrupted"}
          </div>

          {/* Decrypted Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Decrypted Message</label>
            <div
              className="glass-input p-5 min-h-28 text-sm whitespace-pre-wrap word-break"
              style={{ borderColor: "rgba(185,28,28,0.15)" }}
            >
              {result.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
