"use client";

import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */
interface Scenario {
  sourceIcon: string;
  sourceLabel: string;
  steps: { label: string; tagA: string; tagB: string }[];
  output: string[];
}

const SCENARIOS: Scenario[] = [
  {
    sourceIcon: "🔑",
    sourceLabel: "keys",
    steps: [
      { label: "X25519 KEX", tagA: "entropy", tagB: "curve25519" },
      { label: "Derive Keypair", tagA: "HKDF", tagB: "SHA-256" },
    ],
    output: ["Success ✓", "X25519 keypair created", "pub: 0x7f3a…c891", "priv: secured locally"],
  },
  {
    sourceIcon: "📄",
    sourceLabel: "message",
    steps: [
      { label: "AES-256-GCM", tagA: "plaintext", tagB: "ciphertext" },
      { label: "LSB Embed", tagA: "payload", tagB: "stego.png" },
    ],
    output: ["Success ✓", "Message embedded", "Output: stego_image.png", "2.4 KB → 1.2 MP image"],
  },
  {
    sourceIcon: "🖼️",
    sourceLabel: "stego file",
    steps: [
      { label: "Extract Bits", tagA: "LSB scan", tagB: "raw bits" },
      { label: "AES Decrypt", tagA: "ciphertext", tagB: "plaintext" },
    ],
    output: ["Success ✓", "Message extracted", "SHA-256 verified ✓", "Secret message revealed"],
  },
];

const SATELLITES = [
  { ch: "≡", x: 6, y: 10 },
  { ch: "△", x: 18, y: 5 },
  { ch: "{ }", x: 5, y: 82 },
  { ch: "//", x: 18, y: 90 },
  { ch: "◇", x: 4, y: 48 },
  { ch: "λ", x: 82, y: 6 },
  { ch: "01", x: 90, y: 38 },
  { ch: "∞", x: 85, y: 80 },
  { ch: "◆", x: 72, y: 90 },
  { ch: "∴", x: 42, y: 4 },
  { ch: "⬡", x: 58, y: 93 },
];

const CYCLE_MS = 5200;

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */
export default function PipelineAnimation() {
  const [idx, setIdx] = useState(0);
  const [dial, setDial] = useState<"in" | "visible" | "out">("in");
  const [termLines, setTermLines] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const sc = SCENARIOS[idx];

  useEffect(() => {
    // Clear previous timers
    timerRef.current.forEach(clearTimeout);
    const t: ReturnType<typeof setTimeout>[] = [];

    // Phase: dial in
    setDial("in");
    setTermLines(0);

    // After dial settles, type terminal lines
    t.push(setTimeout(() => setDial("visible"), 100));
    t.push(setTimeout(() => setTermLines(1), 800));
    t.push(setTimeout(() => setTermLines(2), 1100));
    t.push(setTimeout(() => setTermLines(3), 1400));
    t.push(setTimeout(() => setTermLines(4), 1700));

    // Dial out before cycling
    t.push(setTimeout(() => setDial("out"), CYCLE_MS - 900));

    // Cycle to next
    t.push(setTimeout(() => {
      setIdx((p) => (p + 1) % SCENARIOS.length);
    }, CYCLE_MS));

    timerRef.current = t;
    return () => t.forEach(clearTimeout);
  }, [idx]);

  return (
    <div className="pv-wrap">
      {/* Background surface */}
      <div className="pv-surface" />

      {/* Satellites — always visible, gently floating */}
      {SATELLITES.map((s, i) => (
        <div
          key={i}
          className="pv-sat"
          style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${i * 0.45}s` }}
        >
          {s.ch}
        </div>
      ))}

      {/* ═══ MAIN STRUCTURE (one unified piece) ═══ */}
      <div className="pv-structure">

        {/* ── Hub ── */}
        <div className="pv-hub">
          <div className="pv-hub-glow" />
          <div className="pv-hub-box">
            <svg viewBox="0 0 60 60" className="pv-hub-svg">
              <g stroke="rgba(200,180,255,0.85)" strokeWidth="1.1" fill="none">
                <polygon points="30,15 42,22 30,29 18,22" />
                <polygon points="18,22 30,29 30,38 18,31" />
                <polygon points="42,22 30,29 30,38 42,31" />
                <polygon points="30,6 42,13 30,20 18,13" opacity="0.5" />
                <polygon points="16,24 28,31 16,38 4,31" opacity="0.45" />
                <polygon points="44,24 56,31 44,38 32,31" opacity="0.45" />
                <polygon points="30,32 42,39 30,46 18,39" opacity="0.5" />
                <polygon points="16,38 28,45 16,52 4,45" opacity="0.3" />
                <polygon points="44,38 56,45 44,52 32,45" opacity="0.3" />
              </g>
            </svg>
          </div>
        </div>

        {/* ── Pipe: hub → source ── */}
        <div className="pv-pipe pv-pipe-h" style={{ width: 36 }} />

        {/* ── Source node (icon changes with dial) ── */}
        <div className="pv-source" key={`src-${idx}`}>
          <span className={`pv-source-icon pv-dial-${dial}`}>{sc.sourceIcon}</span>
          <span className={`pv-source-label pv-dial-${dial}`}>{sc.sourceLabel}</span>
        </div>

        {/* ── Pipe: source → dial section ── */}
        <div className="pv-pipe pv-pipe-h" style={{ width: 28 }} />

        {/* ── DIAL SECTION (rotary middle) ── */}
        <div className="pv-dial-area">
          <div className={`pv-dial-carousel pv-dial-${dial}`}>
            {sc.steps.map((step, i) => (
              <div key={`${idx}-${i}`} className="pv-step" style={{ animationDelay: `${i * 0.12}s` }}>
                <span className="pv-step-label">{step.label}</span>
                <div className="pv-step-tags">
                  <span className="pv-tag">{step.tagA}</span>
                  <span className="pv-tag-arrow">→</span>
                  <span className="pv-tag">{step.tagB}</span>
                </div>
              </div>
            ))}
            {/* Pipe between steps */}
            <div className="pv-dial-pipe" />
          </div>
        </div>

        {/* ── Pipe: dial → laptop ── */}
        <div className="pv-pipe pv-pipe-h" style={{ width: 28 }} />

        {/* ── Laptop ── */}
        <div className="pv-laptop">
          <div className="pv-laptop-screen">
            <div className="pv-term-bar">
              <span className="pv-term-dot" style={{ background: "#ef4444" }} />
              <span className="pv-term-dot" style={{ background: "#f59e0b" }} />
              <span className="pv-term-dot" style={{ background: "#22c55e" }} />
              <span className="pv-term-title">output</span>
            </div>
            <div className="pv-term-body">
              {sc.output.map((line, i) => (
                <div key={`${idx}-${i}`} className={`pv-term-line ${i < termLines ? "show" : ""}`}>
                  {i === 0 ? <span style={{ color: "#22c55e" }}>{line}</span> : line}
                </div>
              ))}
              <span className={`pv-term-cursor ${termLines >= 4 ? "on" : ""}`}>▊</span>
            </div>
          </div>
          <div className="pv-laptop-base" />
        </div>
      </div>

      {/* Indicator dots */}
      <div className="pv-dots">
        {SCENARIOS.map((_, i) => (
          <div key={i} className={`pv-dot ${i === idx ? "on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
