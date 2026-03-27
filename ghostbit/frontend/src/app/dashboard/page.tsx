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
    <RouteGuard allowed={["approved", "admin"]}>
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
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <button onClick={() => setActiveTab("home")} className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-primary)" }}
            >
              <span className="text-xs font-black text-white tracking-tighter">GB</span>
            </div>
            <span className="font-bold tracking-tight text-gradient text-base">GhostBit</span>
          </button>

          <nav className="flex items-center gap-1">
            {(["keys", "embed", "extract"] as Tab[]).map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`tab-btn ${activeTab === id ? "active" : ""}`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
            <div className="ml-4 flex items-center gap-3">
              <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                {user?.username}
              </span>
              <button
                onClick={logout}
                className="text-xs font-mono px-3 py-1.5 rounded-md transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
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

/* Inner page wrapper — same as original */
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
    <div className="relative min-h-screen pt-16">
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />
      </div>

      <div className="relative z-10 max-w-2xl xl:max-w-3xl mx-auto px-4 sm:px-6 py-14 xl:py-20">
        <div className="mb-8 animate-fade-in-up">
          <p className="section-label mb-3">GhostBit / {tab}</p>
          <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: cfg.accent }}>
            {cfg.label}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>{cfg.sub}</p>
        </div>
        <div className="glow-line-left mb-8" />
        <div
          className={`${cfg.card} p-6 sm:p-8 md:p-10 animate-fade-in-up`}
          style={{ animationDelay: "0.1s" }}
        >
          {tab === "keys" && <KeyGenerator />}
          {tab === "embed" && <EmbedForm />}
          {tab === "extract" && <ExtractForm />}
        </div>
      </div>
    </div>
  );
}

/* Hero section — same as original */
function HeroSection({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  return (
    <>
      <section className="relative" style={{ minHeight: "100vh", overflow: "clip" }}>
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 xl:px-16 min-h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-24 items-center min-h-screen pt-16">
            <div className="py-16 lg:py-0">
              <div className="flex items-center gap-2.5 mb-10 animate-fade-in-up">
                <span
                  className="w-1.5 h-1.5 rounded-full block shrink-0"
                  style={{ background: "var(--accent-primary)" }}
                />
                <span className="text-xs font-mono uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  AES-256-GCM &middot; X25519 &middot; SHA-256
                </span>
              </div>
              <h1
                className="font-black leading-[0.92] tracking-tight mb-8 animate-fade-in-up"
                style={{ fontSize: "clamp(3.5rem, 6vw, 8rem)", animationDelay: "0.07s" }}
              >
                HIDE IN<br />
                <span className="text-gradient">PLAIN</span><br />
                SIGHT.
              </h1>
              <p
                className="text-lg xl:text-xl max-w-md leading-relaxed mb-12 animate-fade-in-up"
                style={{ color: "var(--text-secondary)", animationDelay: "0.14s" }}
              >
                Military-grade steganography framework. Encrypt messages and embed
                them invisibly into images, audio, and video.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "0.21s" }}>
                <button onClick={() => onNavigate("embed")} className="btn-primary px-8 py-4 text-base">
                  Start Embedding &rarr;
                </button>
                <button onClick={() => onNavigate("keys")} className="btn-secondary px-8 py-4 text-base">
                  Generate Keys
                </button>
              </div>
            </div>
            <div className="relative w-full aspect-square max-w-[320px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] xl:max-w-[750px] mx-auto">
              <ParticleSphere />
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center flex-wrap gap-2.5 px-4">
          {["X25519 KEX", "HKDF-SHA256", "AES-256-GCM", "LSB Stego", "PNG \u00b7 WAV \u00b7 MP4"].map((tag) => (
            <span key={tag} className="tech-pill">{tag}</span>
          ))}
        </div>
      </section>

      <section className="relative py-28 xl:py-36">
        <div className="absolute inset-0 dot-grid" style={{ opacity: 0.3 }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-20">
            <p className="section-label mb-4">&mdash; How it Works &mdash;</p>
            <h2
              className="font-black leading-tight mb-5"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)" }}
            >
              Three Steps to <span className="text-gradient">Invisibility</span>
            </h2>
            <p className="max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              A simple workflow backed by military-grade cryptography and content-adaptive steganography.
            </p>
          </div>
          <div className="mb-16 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <PipelineAnimation />
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger">
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
                  className="absolute top-5 right-6 font-black leading-none pointer-events-none select-none"
                  style={{ fontSize: "5rem", color: step.accent, opacity: 0.1 }}
                >
                  {step.num}
                </span>
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-6 text-sm font-black"
                  style={{ background: `${step.accent}18`, color: step.accent, border: `1px solid ${step.accent}30` }}
                >
                  {step.num}
                </span>
                <h3 className="text-xl font-bold mb-3" style={{ color: step.accent }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.desc}</p>
                <div className="mt-8 flex items-center gap-1.5 text-xs font-mono" style={{ color: step.accent, opacity: 0.65 }}>
                  <span>Try it</span><span>&rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-10 text-center" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          GhostBit v1.0 &nbsp;&middot;&nbsp; Secure Steganography Framework
          &nbsp;&middot;&nbsp; AES-256-GCM + X25519 + HKDF-SHA256
        </p>
      </footer>
    </>
  );
}
