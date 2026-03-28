"use client";

import { useState, useRef } from "react";
import MatrixLoadingScreen from "./MatrixLoadingScreen";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function EmbedForm() {
  const [file, setFile] = useState<File | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [capacity, setCapacity] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const token = localStorage.getItem("ghostbit_token");
      const res = await fetch(`${API}/api/capacity`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setCapacity(data.capacity);
    } catch {
      setCapacity(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !publicKey || !message) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("ghostbit_token");
      const formData = new FormData();
      formData.append("cover_file", file);
      formData.append("public_key", publicKey);
      formData.append("message", message);
      const [res] = await Promise.all([
        fetch(`${API}/api/embed`, { method: "POST", body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
      if (!res.ok) throw new Error(await res.text());
      const disposition = res.headers.get("content-disposition");
      let filename = "stego_output";
      if (disposition && disposition.includes("filename=")) filename = disposition.split("filename=")[1];
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Embedding failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {loading && <MatrixLoadingScreen text="Encrypting & Embedding..." />}

      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gradient mb-3">Embed Message</h2>
        <p style={{ color: "var(--text-secondary)" }}>
          Encrypt and hide your message inside a media file. Supports PNG, WAV, and MP4.
        </p>
      </div>

      <form onSubmit={handleEmbed} className="space-y-6">
        {/* Drag & Drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="relative p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center"
          style={{
            borderColor: isDragging ? "var(--accent-primary)" : file ? "var(--accent-secondary)" : "var(--border-subtle)",
            background: isDragging ? "rgba(239,68,68,0.05)" : file ? "rgba(220,38,38,0.05)" : "rgba(0,0,0,0.2)",
          }}
        >
          <input ref={fileRef} type="file" accept=".png,.wav,.mp4,.mov,.m4v" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <p style={{ color: "var(--text-secondary)" }}>Drag & drop a cover file here, or click to browse</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>PNG · WAV · MP4</p>
            </div>
          )}
        </div>

        {/* Capacity info */}
        {capacity && (
          <div className="p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-sm" style={{ color: "var(--accent-primary)" }}>
              Capacity: <strong>{capacity.usable_capacity_bytes || "N/A"}</strong> usable bytes
              {capacity.capacity_bytes ? ` · ${capacity.capacity_bytes} total bytes` : ""}
            </p>
          </div>
        )}

        {/* Public Key */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Receiver&apos;s Public Key</label>
          <textarea
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            required
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            className="glass-input w-full max-w-full h-28 p-4 text-xs font-mono resize-none"
            style={{ color: "#fca5a5" }}
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Secret Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            placeholder="Type your classified message here..."
            className="glass-input w-full max-w-full h-28 p-4 text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file || !publicKey || !message}
          className="btn-primary w-full py-4 text-base"
        >
          {loading ? "Processing..." : "Embed & Encrypt"}
        </button>
      </form>
    </div>
  );
}
