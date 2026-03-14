"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import KeyGenerator from "../components/KeyGenerator";
import EmbedForm from "../components/EmbedForm";
import ExtractForm from "../components/ExtractForm";

const ParticleSphere = dynamic(() => import("../components/ParticleSphere"), {
  ssr: false,
});

type Tab = "home" | "keys" | "embed" | "extract";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen relative" style={{ background: "var(--bg-primary)" }}>
      {/* ─── Sticky Nav ─── */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(3, 7, 18, 0.7)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22d3ee, #10b981)", boxShadow: "0 0 16px rgba(34,211,238,0.35)" }}>
              <span className="text-lg">👻</span>
            </div>
            <span className="text-lg font-bold text-gradient">GhostBit</span>
          </button>

          <nav className="flex items-center gap-1">
            {([
              { id: "home", label: "Home", icon: "◈" },
              { id: "keys", label: "Keys", icon: "⚿" },
              { id: "embed", label: "Embed", icon: "⬢" },
              { id: "extract", label: "Extract", icon: "⬡" },
            ] as { id: Tab; label: string; icon: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              >
                <span className="mr-1.5 opacity-60">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="pt-16">
        {activeTab === "home" && <HeroSection onNavigate={setActiveTab} />}
        {activeTab === "keys" && (
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="glass-card-green p-8 md:p-12">
              <KeyGenerator />
            </div>
          </div>
        )}
        {activeTab === "embed" && (
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="glass-card p-8 md:p-12">
              <EmbedForm />
            </div>
          </div>
        )}
        {activeTab === "extract" && (
          <div className="max-w-4xl mx-auto px-6 py-16">
            <div className="glass-card-violet p-8 md:p-12">
              <ExtractForm />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HERO LANDING SECTION
   ═══════════════════════════════════════════════════ */
function HeroSection({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left — Text & CTA */}
          <div className="text-left">
            <div className="animate-fade-in-up">
              <span className="badge badge-cyan mb-6 inline-flex">AES-256-GCM · X25519 · SHA-256</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Hide in
              <span className="text-gradient"> Plain Sight</span>
            </h1>
            <p className="text-lg md:text-xl max-w-xl mb-10 animate-fade-in-up" style={{ color: "var(--text-secondary)", animationDelay: "0.2s" }}>
              Military-grade steganography framework. Encrypt messages and embed them invisibly into images, audio, and video files.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <button onClick={() => onNavigate("embed")} className="btn-primary text-base px-8 py-3.5">
                Start Embedding →
              </button>
              <button onClick={() => onNavigate("keys")} className="btn-secondary text-base px-8 py-3.5">
                Generate Keys
              </button>
            </div>
          </div>

          {/* Right — ParticleSphere */}
          <div className="relative w-full aspect-square max-w-[600px] mx-auto">
            <ParticleSphere />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How it <span className="text-gradient">Works</span>
          </h2>
          <p style={{ color: "var(--text-secondary)" }} className="max-w-lg mx-auto">
            Three simple steps to send undetectable encrypted messages through any media file.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 stagger">
          {[
            {
              icon: "🔑",
              title: "Generate Keys",
              desc: "The receiver creates an X25519 elliptic-curve keypair and shares the public key with the sender.",
              accent: "var(--accent-secondary)",
              card: "glass-card-green",
            },
            {
              icon: "🔒",
              title: "Embed Message",
              desc: "The sender encrypts the message with AES-256-GCM and hides it inside a PNG, WAV, or MP4 cover file.",
              accent: "var(--accent-primary)",
              card: "glass-card",
            },
            {
              icon: "🔓",
              title: "Extract Message",
              desc: "The receiver uses their private key to extract and decrypt the hidden message from the stego media.",
              accent: "var(--accent-extract)",
              card: "glass-card-violet",
            },
          ].map((step, i) => (
            <div
              key={i}
              className={`${step.card} p-8 animate-fade-in-up group hover:-translate-y-1 transition-transform duration-300`}
            >
              <div className="text-4xl mb-5">{step.icon}</div>
              <h3 className="text-xl font-bold mb-3" style={{ color: step.accent }}>
                Step {i + 1}: {step.title}
              </h3>
              <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Formats */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="glass-card p-10 text-center">
          <h3 className="text-2xl font-bold mb-8 text-gradient">Supported Formats</h3>
          <div className="grid grid-cols-3 gap-6">
            {[
              { type: "Image", fmt: "PNG", icon: "🖼️" },
              { type: "Audio", fmt: "WAV", icon: "🎵" },
              { type: "Video", fmt: "MP4", icon: "🎬" },
            ].map((f) => (
              <div key={f.type} className="flex flex-col items-center gap-2">
                <span className="text-3xl">{f.icon}</span>
                <span className="font-bold">{f.type}</span>
                <span className="badge badge-cyan">{f.fmt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
        <p className="text-sm">
          GhostBit v1.0 — Secure Steganography Framework
        </p>
      </footer>
    </>
  );
}
