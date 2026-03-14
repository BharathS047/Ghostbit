"use client";

import { useState, useRef } from "react";
import MatrixLoadingScreen from "./MatrixLoadingScreen";

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
      const res = await fetch("http://localhost:8000/api/capacity", {
        method: "POST",
        body: formData,
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
      const formData = new FormData();
      formData.append("cover_file", file);
      formData.append("public_key", publicKey);
      formData.append("message", message);
      const res = await fetch("http://localhost:8000/api/embed", { method: "POST", body: formData });
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
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🔒</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gradient">Embed Message</h2>
        </div>
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
            background: isDragging ? "rgba(34,211,238,0.05)" : file ? "rgba(16,185,129,0.05)" : "rgba(0,0,0,0.2)",
          }}
        >
          <input ref={fileRef} type="file" accept=".png,.wav,.mp4,.mov,.m4v" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">✅</span>
              <p className="font-semibold">{file.name}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-4xl opacity-40">📁</span>
              <p style={{ color: "var(--text-secondary)" }}>Drag & drop a cover file here, or click to browse</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>PNG · WAV · MP4</p>
            </div>
          )}
        </div>

        {/* Capacity info */}
        {capacity && (
          <div className="p-4 rounded-lg" style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)" }}>
            <p className="text-sm" style={{ color: "var(--accent-primary)" }}>
              📊 Capacity: <strong>{capacity.usable_capacity_bytes || "N/A"}</strong> usable bytes
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
            className="glass-input w-full h-28 p-4 text-xs font-mono resize-none"
            style={{ color: "#6ee7b7" }}
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
            className="glass-input w-full h-28 p-4 text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file || !publicKey || !message}
          className="btn-primary w-full py-4 text-base"
        >
          {loading ? "Processing..." : "🔒 Embed & Encrypt"}
        </button>
      </form>
    </div>
  );
}
