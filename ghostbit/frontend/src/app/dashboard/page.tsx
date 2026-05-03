"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import KeyGenerator from "../../components/KeyGenerator";
import EmbedForm from "../../components/EmbedForm";
import ExtractForm from "../../components/ExtractForm";
import RouteGuard from "../../components/RouteGuard";
import { useAuth } from "../../context/AuthContext";

const ParticleSphere = dynamic(() => import("../../components/ParticleSphere"), { ssr: false });
const PipelineAnimation = dynamic(() => import("../../components/PipelineAnimation"), { ssr: false });

type Tab = "home" | "keys" | "embed" | "extract";

export default function DashboardPage() {
  return (
    <RouteGuard allowed={["Approved", "Admin"]}>
      <DashboardContent />
    </RouteGuard>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const isHome = activeTab === "home";

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* Navigation */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled || !isHome ? "rgba(3,7,18,0.88)" : "transparent",
          backdropFilter: scrolled || !isHome ? "blur(28px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled || !isHome ? "blur(28px) saturate(180%)" : "none",
          borderBottom: scrolled || !isHome ? "1px solid var(--border-subtle)" : "1px solid transparent",
        }}
      >
        <div
          className="max-w-7xl mx-auto h-14 flex items-center justify-between"
          style={{ padding: "0 clamp(1rem, 4vw, 2rem)" }}
        >
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-primary)" }}
            >
              <span className="text-xs font-black text-white tracking-tighter">GB</span>
            </div>
            <span
              className="font-bold tracking-tight text-gradient"
              style={{ fontSize: "clamp(0.8rem, 1.5vw, 1rem)" }}
            >
              GhostBit
            </span>
          </button>

          <nav className="flex items-center gap-0.5">
            {(["keys", "embed", "extract"] as Tab[]).map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`tab-btn ${activeTab === id ? "active" : ""}`}
                style={{ fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)", padding: "0.3rem clamp(0.5rem, 1.5vw, 0.9rem)" }}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
            <div className="flex items-center" style={{ gap: "clamp(0.5rem, 1.5vw, 0.75rem)", marginLeft: "clamp(0.5rem, 2vw, 1rem)" }}>
              <span
                className="hidden sm:inline font-mono"
                style={{ color: "var(--text-muted)", fontSize: "clamp(0.65rem, 1vw, 0.75rem)" }}
              >
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="font-mono rounded-md transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "clamp(0.65rem, 1vw, 0.75rem)",
                  padding: "0.3rem clamp(0.5rem, 1.5vw, 0.75rem)",
                }}
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {isHome ? <HeroSection onNavigate={setActiveTab} /> : <InnerPage tab={activeTab} />}
      </main>
    </div>
  );
}

function InnerPage({ tab }: { tab: Tab }) {
  const configs = {
    keys: {
      label: "Key Generation",
      sub: "Generate your X25519 keypair — share only the public key",
      card: "glass-card-secondary",
      accent: "#dc2626",
    },
    embed: {
      label: "Embed Message",
      sub: "Encrypt and hide a secret message inside a media file",
      card: "glass-card",
      accent: "#ef4444",
    },
    extract: {
      label: "Extract Message",
      sub: "Reveal and decrypt a hidden message using your private key",
      card: "glass-card-tertiary",
      accent: "#b91c1c",
    },
  };
  const cfg = configs[tab as keyof typeof configs];

  return (
    <div className="relative min-h-screen" style={{ paddingTop: "3.5rem" }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />
      </div>

      <div
        className="relative z-10 max-w-2xl xl:max-w-3xl mx-auto"
        style={{ padding: "clamp(1.5rem, 5vh, 3rem) clamp(1rem, 4vw, 1.5rem)" }}
      >
        <div className="mb-6 animate-fade-in-up">
          <p className="section-label mb-2">GhostBit / {tab}</p>
          <h1
            className="font-black mb-1.5"
            style={{ fontSize: "clamp(1.4rem, 3vw + 0.5rem, 2.5rem)", color: cfg.accent }}
          >
            {cfg.label}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "clamp(0.8rem, 1.2vw + 0.3rem, 0.95rem)" }}>
            {cfg.sub}
          </p>
        </div>
        <div className="glow-line-left mb-6" />
        <div
          className={`${cfg.card} animate-fade-in-up`}
          style={{ padding: "clamp(1.25rem, 3vw, 2.5rem)", animationDelay: "0.1s" }}
        >
          {tab === "keys" && <KeyGenerator />}
          {tab === "embed" && <EmbedForm />}
          {tab === "extract" && <ExtractForm />}
        </div>
      </div>
    </div>
  );
}

function HeroSection({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative" style={{ minHeight: "100vh", overflow: "clip" }}>
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />

        <div
          className="relative z-10 max-w-[1600px] mx-auto min-h-screen"
          style={{ padding: "0 clamp(1rem, 5vw, 4rem)" }}
        >
          <div
            className="grid grid-cols-1 lg:grid-cols-2 items-center min-h-screen"
            style={{ gap: "clamp(1rem, 4vw, 5rem)", paddingTop: "3.5rem" }}
          >
            {/* Left — text */}
            <div style={{ padding: "clamp(1.5rem, 4vh, 4rem) 0" }}>
              <div className="flex items-center gap-2 animate-fade-in-up" style={{ marginBottom: "clamp(1rem, 2.5vh, 1.75rem)" }}>
                <span
                  className="w-1.5 h-1.5 rounded-full block shrink-0"
                  style={{ background: "var(--accent-primary)" }}
                />
                <span
                  className="font-mono uppercase"
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "clamp(0.6rem, 1vw, 0.72rem)",
                    letterSpacing: "0.18em",
                  }}
                >
                  AES-256-GCM &middot; X25519 &middot; SHA-256
                </span>
              </div>

              <h1
                className="font-black leading-[0.92] tracking-tight animate-fade-in-up"
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw + 1rem, 4.75rem)",
                  marginBottom: "clamp(0.75rem, 2vh, 1.5rem)",
                  animationDelay: "0.07s",
                }}
              >
                HIDE IN<br />
                <span className="text-gradient">PLAIN</span><br />
                SIGHT.
              </h1>

              <p
                className="leading-relaxed animate-fade-in-up"
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "clamp(0.8rem, 1.2vw + 0.3rem, 1rem)",
                  maxWidth: "min(26rem, 90vw)",
                  marginBottom: "clamp(1.25rem, 3vh, 2.5rem)",
                  animationDelay: "0.14s",
                }}
              >
                Military-grade steganography framework. Encrypt messages and embed
                them invisibly into images, audio, and video.
              </p>

              <div
                className="flex flex-col sm:flex-row animate-fade-in-up"
                style={{ gap: "clamp(0.5rem, 1.5vw, 0.75rem)", animationDelay: "0.21s" }}
              >
                <button
                  onClick={() => onNavigate("embed")}
                  className="btn-primary"
                  style={{ padding: "clamp(0.55rem, 1.2vh, 0.75rem) clamp(1rem, 2.5vw, 1.5rem)", fontSize: "clamp(0.75rem, 1.1vw, 0.875rem)" }}
                >
                  Start Embedding &rarr;
                </button>
                <button
                  onClick={() => onNavigate("keys")}
                  className="btn-secondary"
                  style={{ padding: "clamp(0.55rem, 1.2vh, 0.75rem) clamp(1rem, 2.5vw, 1.5rem)", fontSize: "clamp(0.75rem, 1.1vw, 0.875rem)" }}
                >
                  Generate Keys
                </button>
              </div>
            </div>

            {/* Right — sphere */}
            <div
              className="relative w-full aspect-square mx-auto"
              style={{ maxWidth: "clamp(180px, 38vw, 460px)" }}
            >
              <ParticleSphere />
            </div>
          </div>
        </div>

        {/* Tech pills */}
        <div
          className="absolute bottom-6 left-0 right-0 z-10 flex justify-center flex-wrap px-4"
          style={{ gap: "clamp(0.4rem, 1vw, 0.625rem)" }}
        >
          {["X25519 KEX", "HKDF-SHA256", "AES-256-GCM", "LSB Stego", "PNG · WAV · MP4"].map((tag) => (
            <span key={tag} className="tech-pill">{tag}</span>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="relative" style={{ padding: "clamp(3rem, 8vh, 7rem) 0" }}>
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.3 }} />
        <div
          className="relative max-w-6xl mx-auto"
          style={{ padding: "0 clamp(1rem, 4vw, 2rem)" }}
        >
          {/* Section header */}
          <div className="text-center" style={{ marginBottom: "clamp(2rem, 5vh, 4rem)" }}>
            <p className="section-label mb-3">&mdash; How it Works &mdash;</p>
            <h2
              className="font-black leading-tight"
              style={{
                fontSize: "clamp(1.4rem, 2.5vw + 0.5rem, 2.75rem)",
                marginBottom: "clamp(0.5rem, 1.5vh, 1rem)",
              }}
            >
              Three Steps to <span className="text-gradient">Invisibility</span>
            </h2>
            <p
              className="max-w-md mx-auto"
              style={{
                color: "var(--text-secondary)",
                fontSize: "clamp(0.8rem, 1.2vw + 0.2rem, 0.95rem)",
              }}
            >
              A simple workflow backed by military-grade cryptography and content-adaptive steganography.
            </p>
          </div>

          {/* Pipeline */}
          <div className="animate-fade-in-up" style={{ marginBottom: "clamp(2rem, 4vh, 4rem)", animationDelay: "0.1s" }}>
            <PipelineAnimation />
          </div>

          {/* Step cards */}
          <div className="grid md:grid-cols-3 gap-5 stagger">
            {[
              { num: "01", title: "Generate Keys", desc: "The receiver creates an X25519 elliptic-curve keypair. Share only the public key.", tab: "keys" as Tab, accent: "#dc2626", border: "rgba(220,38,38,0.12)" },
              { num: "02", title: "Embed Message", desc: "Encrypt with AES-256-GCM and hide the ciphertext inside a PNG, WAV, or MP4 file.", tab: "embed" as Tab, accent: "#ef4444", border: "rgba(239,68,68,0.12)" },
              { num: "03", title: "Extract Message", desc: "Use your private key to extract and decrypt. Magic bytes and an integrity hash guarantee authenticity.", tab: "extract" as Tab, accent: "#b91c1c", border: "rgba(185,28,28,0.12)" },
            ].map((step) => (
              <div
                key={step.num}
                className="step-card animate-fade-in-up"
                style={{ border: `1px solid ${step.border}` }}
                onClick={() => onNavigate(step.tab)}
              >
                <span
                  className="absolute top-4 right-5 font-black leading-none pointer-events-none select-none"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)", color: step.accent, opacity: 0.1 }}
                >
                  {step.num}
                </span>
                <span
                  className="inline-flex items-center justify-center rounded-lg font-black"
                  style={{
                    width: "clamp(1.75rem, 3vw, 2.5rem)",
                    height: "clamp(1.75rem, 3vw, 2.5rem)",
                    fontSize: "clamp(0.65rem, 1vw, 0.875rem)",
                    marginBottom: "clamp(0.75rem, 2vh, 1.5rem)",
                    background: `${step.accent}18`,
                    color: step.accent,
                    border: `1px solid ${step.accent}30`,
                  }}
                >
                  {step.num}
                </span>
                <h3
                  className="font-bold"
                  style={{
                    color: step.accent,
                    fontSize: "clamp(0.875rem, 1.3vw + 0.3rem, 1.2rem)",
                    marginBottom: "clamp(0.4rem, 1vh, 0.75rem)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="leading-relaxed"
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "clamp(0.75rem, 1vw + 0.2rem, 0.875rem)",
                  }}
                >
                  {step.desc}
                </p>
                <div
                  className="flex items-center gap-1.5 font-mono"
                  style={{
                    color: step.accent,
                    opacity: 0.65,
                    marginTop: "clamp(1rem, 3vh, 2rem)",
                    fontSize: "clamp(0.65rem, 0.9vw, 0.75rem)",
                  }}
                >
                  <span>Try it</span><span>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="text-center"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "clamp(1.25rem, 3vh, 2.5rem)",
        }}
      >
        <p
          className="font-mono"
          style={{ color: "var(--text-muted)", fontSize: "clamp(0.6rem, 1vw, 0.75rem)" }}
        >
          GhostBit v1.0 &nbsp;&middot;&nbsp; Secure Steganography Framework
          &nbsp;&middot;&nbsp; AES-256-GCM + X25519 + HKDF-SHA256
        </p>
      </footer>
    </>
  );
}
