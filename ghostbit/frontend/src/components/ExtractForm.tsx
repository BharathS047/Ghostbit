"use client";

import { useState, useRef } from "react";
import MatrixLoadingScreen from "./MatrixLoadingScreen";

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
      const formData = new FormData();
      formData.append("stego_file", file);
      formData.append("private_key", privateKey);
      const res = await fetch("http://localhost:8000/api/extract", { method: "POST", body: formData });
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
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🔓</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gradient-violet">Extract Message</h2>
        </div>
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
            background: isDragging ? "rgba(167,139,250,0.05)" : file ? "rgba(167,139,250,0.05)" : "rgba(0,0,0,0.2)",
          }}
        >
          <input ref={fileRef} type="file" accept=".png,.wav,.mp4,.mov,.m4v" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">✅</span>
              <p className="font-semibold">{file.name}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl opacity-40">📁</span>
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
            className="glass-input w-full h-28 p-4 text-xs font-mono resize-none"
            style={{ color: "#fca5a5", borderColor: "rgba(167,139,250,0.15)" }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file || !privateKey}
          className="w-full py-4 text-base font-bold rounded-xl transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
            color: "var(--bg-primary)",
            boxShadow: "var(--glow-violet)",
          }}
        >
          {loading ? "Processing..." : "🔓 Extract & Decrypt"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="space-y-6 pt-6 animate-fade-in-up" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {/* Integrity Badge */}
          <div
            className="p-4 rounded-xl border text-sm font-semibold"
            style={{
              background: result.integrity_valid ? "rgba(16,185,129,0.08)" : "rgba(248,113,113,0.08)",
              borderColor: result.integrity_valid ? "rgba(16,185,129,0.25)" : "rgba(248,113,113,0.25)",
              color: result.integrity_valid ? "#10b981" : "#f87171",
            }}
          >
            {result.integrity_valid ? "✅ Integrity Verification Passed — Message is authentic" : "❌ Integrity Verification Failed — Message may be corrupted"}
          </div>

          {/* Decrypted Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Decrypted Message</label>
            <div
              className="glass-input p-5 min-h-28 text-sm whitespace-pre-wrap word-break"
              style={{ borderColor: "rgba(167,139,250,0.15)" }}
            >
              {result.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
