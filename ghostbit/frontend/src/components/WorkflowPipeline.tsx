"use client";

import { useEffect, useState } from "react";

/* ════════════════════════════════════════════════════════════════
   GhostBit — "How It Works" workflow pipeline.

   Input → Processing → Output, connected by an animated pipeline with
   data packets flowing through it. Horizontal on desktop, vertical on
   tablet/mobile. Pure CSS animation (transform/opacity) for 60fps.
   No external dependencies.
   ════════════════════════════════════════════════════════════════ */

const PROCESS_WORDS = ["Encrypt", "Encode", "Hide", "Secure"];

export default function WorkflowPipeline() {
  const [word, setWord] = useState(0);

  // Cycle the processing-engine label (paused under reduced motion).
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => setWord((w) => (w + 1) % PROCESS_WORDS.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="wf-wrap dot-grid"
      role="group"
      aria-label="How GhostBit works: a secret message is encrypted, embedded, and exported as protected media."
    >
      {/* Screen-reader description of the flow */}
      <ol className="sr-only">
        <li>Input: your secret message or data.</li>
        <li>Processing: GhostBit encrypts, encodes, and hides the data.</li>
        <li>Output: protected media — image, audio, or video.</li>
      </ol>

      <div className="wf" aria-hidden="true">
        {/* ── Stage 1 — Input ── */}
        <div className="wf-stage wf-stage-input" tabIndex={0} aria-label="Input: your secret message">
          <div className="wf-node wf-node-side">
            <span className="wf-node-glow" />
            <span className="wf-node-ring" />
            <div className="wf-input-visual">
              {/* Secret message */}
              <svg className="wf-msg-main" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className="wf-label">
            <span className="wf-label-main">Secret Message</span>
            <span className="wf-label-sub">Your Input</span>
          </div>
        </div>

        {/* ── Connector 1 ── */}
        <div className="wf-conn" aria-hidden="true">
          <span className="wf-pipe" />
          <span className="wf-packet" style={{ animationDelay: "0s" }} />
          <span className="wf-packet" style={{ animationDelay: "0.8s" }} />
          <span className="wf-packet" style={{ animationDelay: "1.6s" }} />
        </div>

        {/* ── Stage 2 — Processing engine (focal point) ── */}
        <div className="wf-stage wf-stage-proc" tabIndex={0} aria-label="Processing: encrypt, encode and hide the data">
          <div className="wf-node wf-node-core">
            <span className="wf-core-glow" />
            {/* Rotating rings */}
            <span className="wf-ring wf-ring-1" />
            <span className="wf-ring wf-ring-2" />
            {/* Orbiting particles */}
            <span className="wf-orbit wf-orbit-1"><i /></span>
            <span className="wf-orbit wf-orbit-2"><i /></span>
            <span className="wf-orbit wf-orbit-3"><i /></span>
            {/* Pulsing energy core */}
            <span className="wf-core">
              <span className="wf-core-pulse" />
              <img src="/images/ghostbit-logo.png" alt="" className="wf-core-logo" />
            </span>
          </div>
          <div className="wf-label">
            <span className="wf-label-main wf-proc-word" key={word}>
              {PROCESS_WORDS[word]}
            </span>
            <span className="wf-label-sub">Processing Engine</span>
          </div>
        </div>

        {/* ── Connector 2 ── */}
        <div className="wf-conn" aria-hidden="true">
          <span className="wf-pipe" />
          <span className="wf-packet" style={{ animationDelay: "0.4s" }} />
          <span className="wf-packet" style={{ animationDelay: "1.2s" }} />
          <span className="wf-packet" style={{ animationDelay: "2s" }} />
        </div>

        {/* ── Stage 3 — Output ── */}
        <div className="wf-stage wf-stage-output" tabIndex={0} aria-label="Output: protected media">
          <div className="wf-node wf-node-side">
            <span className="wf-node-glow" />
            <span className="wf-node-ring" />
            <div className="wf-output-visual">
              <span className="wf-media wf-media-img" title="Image">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="8.5" cy="9.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M4 17l4.5-4 4 3.2L16 12l4 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="wf-media wf-media-audio" title="Audio">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M15.5 8.5a5 5 0 010 7M18 6a8 8 0 010 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="wf-media wf-media-video" title="Video">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M16 10l5-3v10l-5-3v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
          <div className="wf-label">
            <span className="wf-label-main">Protected Media</span>
            <span className="wf-label-sub">Image · Audio · Video</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wf-wrap {
          position: relative;
          width: 100%;
          border-radius: 1rem;
          overflow: hidden;
          background: #0c0c0e;
          border: 1px solid var(--border-subtle);
          box-shadow: var(--shadow-lg);
          padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 3vw, 2.5rem);
        }

        /* ── Layout ── */
        .wf {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          width: 100%;
        }

        .wf-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(0.6rem, 1.5vw, 0.9rem);
          flex-shrink: 0;
          border-radius: 1rem;
          padding: 0.5rem;
          outline: none;
          transition: transform 0.3s ease;
        }
        .wf-stage:focus-visible {
          box-shadow: 0 0 0 2px var(--accent-primary), 0 0 0 5px rgba(229, 72, 77, 0.25);
        }

        /* ── Nodes ── */
        .wf-node {
          position: relative;
          display: grid;
          place-items: center;
          border-radius: 50%;
        }
        .wf-node-side {
          width: clamp(78px, 13vw, 108px);
          aspect-ratio: 1;
        }
        .wf-node-core {
          width: clamp(132px, 20vw, 188px);
          aspect-ratio: 1;
        }

        /* Side-node plate + breathing glow */
        .wf-node-side .wf-node-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 38%, #17171b 0%, #111114 70%, #0c0c0f 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.55);
        }
        .wf-node-glow {
          position: absolute;
          inset: -10%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(229, 72, 77, 0.22) 0%, transparent 68%);
          animation: wfBreath 4s ease-in-out infinite;
        }
        .wf-stage-input .wf-node {
          animation: wfFloat 5s ease-in-out infinite;
        }
        .wf-stage-output .wf-node {
          animation: wfFloat 5s ease-in-out infinite 1s;
        }

        .wf-input-visual,
        .wf-output-visual {
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          width: 100%;
          height: 100%;
        }
        .wf-msg-main {
          width: 52%;
          height: auto;
          color: var(--text-primary);
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
        }

        /* Output media cluster */
        .wf-output-visual {
          gap: 4px;
        }
        .wf-media {
          position: absolute;
          width: 30%;
          color: var(--text-secondary);
          transition: color 0.3s ease, transform 0.3s ease;
        }
        .wf-media svg {
          width: 100%;
          height: auto;
        }
        .wf-media-img {
          top: 20%;
          left: 18%;
          transform: rotate(-8deg);
        }
        .wf-media-audio {
          top: 22%;
          right: 16%;
          transform: rotate(8deg);
        }
        .wf-media-video {
          bottom: 16%;
          left: 50%;
          transform: translateX(-50%);
        }

        /* ── Processing engine ── */
        .wf-core-glow {
          position: absolute;
          inset: -16%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(229, 72, 77, 0.3) 0%, transparent 64%);
          animation: wfBreath 3.4s ease-in-out infinite;
        }
        .wf-ring {
          position: absolute;
          border-radius: 50%;
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px));
        }
        .wf-ring-1 {
          inset: 4%;
          background: conic-gradient(from 0deg, transparent 0deg, rgba(229, 72, 77, 0.65) 70deg, transparent 150deg);
          animation: wfSpin 7s linear infinite;
        }
        .wf-ring-2 {
          inset: 16%;
          background: conic-gradient(from 180deg, transparent 0deg, rgba(255, 255, 255, 0.28) 60deg, transparent 130deg);
          animation: wfSpin 11s linear infinite reverse;
        }
        .wf-orbit {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          animation: wfSpin 6s linear infinite;
        }
        .wf-orbit i {
          position: absolute;
          top: 4%;
          left: 50%;
          width: 6px;
          height: 6px;
          margin-left: -3px;
          border-radius: 50%;
          background: var(--accent-primary);
          box-shadow: 0 0 8px 1px rgba(229, 72, 77, 0.7);
        }
        .wf-orbit-2 {
          inset: 12%;
          animation-duration: 9s;
          animation-direction: reverse;
        }
        .wf-orbit-2 i {
          background: #fff;
          box-shadow: 0 0 7px 1px rgba(255, 255, 255, 0.6);
        }
        .wf-orbit-3 {
          inset: 22%;
          animation-duration: 5s;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .wf-core {
          position: relative;
          z-index: 3;
          width: 46%;
          aspect-ratio: 1;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, #16161a 0%, #0e0e11 70%, #0a0a0d 100%);
          border: 1px solid rgba(229, 72, 77, 0.4);
          box-shadow: 0 0 20px rgba(229, 72, 77, 0.35), inset 0 1px 6px rgba(0, 0, 0, 0.6);
          color: var(--accent-primary);
        }
        .wf-core-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(229, 72, 77, 0.6);
          animation: wfCorePulse 2.2s ease-out infinite;
        }
        .wf-core-logo {
          width: 66%;
          height: auto;
          object-fit: cover;
          /* Match the header logo treatment exactly */
          filter: hue-rotate(120deg) saturate(1.4);
          mix-blend-mode: screen;
        }

        /* ── Labels ── */
        .wf-label {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .wf-label-main {
          font-weight: 700;
          font-size: clamp(0.82rem, 1.3vw, 1rem);
          color: var(--text-primary);
          letter-spacing: 0.01em;
        }
        .wf-proc-word {
          color: var(--accent-primary);
          animation: wfWord 0.4s ease;
        }
        .wf-label-sub {
          font-family: var(--font-mono, monospace);
          font-size: clamp(0.56rem, 0.9vw, 0.7rem);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        /* ── Connectors / pipeline ── */
        .wf-conn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: clamp(46px, 9vw, 64px);
        }
        .wf-pipe {
          position: absolute;
          left: 50%;
          top: 0;
          width: 2px;
          height: 100%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, transparent, rgba(229, 72, 77, 0.4), transparent);
          border-radius: 2px;
        }
        .wf-packet {
          position: absolute;
          left: 50%;
          top: 0;
          width: 6px;
          height: 6px;
          margin-left: -3px;
          border-radius: 50%;
          background: var(--accent-primary);
          box-shadow: 0 0 8px 1px rgba(229, 72, 77, 0.65);
          animation: wfFlowY 2.4s linear infinite;
        }

        /* ── Hover / focus interactions ── */
        /* Keyboard-focus states (no mouse/hover interactions) */
        .wf-stage-input:focus-visible .wf-node-glow,
        .wf-stage-output:focus-visible .wf-node-glow {
          inset: -22%;
          background: radial-gradient(circle, rgba(229, 72, 77, 0.4) 0%, transparent 66%);
        }
        .wf-stage-output:focus-visible .wf-media {
          color: var(--text-primary);
        }
        .wf-stage-proc:focus-visible .wf-ring-1 {
          animation-duration: 3s;
        }
        .wf-stage-proc:focus-visible .wf-ring-2 {
          animation-duration: 5s;
        }
        .wf-stage-proc:focus-visible .wf-orbit {
          animation-duration: 3.5s;
        }
        .wf-stage-proc:focus-visible .wf-orbit-3 {
          opacity: 1;
        }
        .wf-stage-proc:focus-visible .wf-core {
          box-shadow: 0 0 34px rgba(229, 72, 77, 0.6), inset 0 1px 6px rgba(0, 0, 0, 0.6);
          color: #fff;
        }

        /* ════ Desktop — horizontal layout (≥1024px) ════ */
        @media (min-width: 1024px) {
          .wf {
            flex-direction: row;
            align-items: center;
          }
          .wf-stage {
            flex: 0 0 auto;
            gap: 0.7rem;
          }
          /* Fixed label height so every node centre lands on one axis,
             letting us raise the pipe to that exact axis (see translateY). */
          .wf-label {
            height: 2.6rem;
            justify-content: flex-start;
          }
          .wf-conn {
            width: auto;
            height: auto;
            flex: 1 1 0;
            min-width: 40px;
            align-self: center;
            /* Raise by half the (gap + label) block so the pipe meets the
               node centres rather than the stage-block centres. */
            transform: translateY(-1.65rem);
          }
          .wf-pipe {
            left: 0;
            top: 50%;
            width: 100%;
            height: 2px;
            transform: translateY(-50%);
            background: linear-gradient(90deg, transparent, rgba(229, 72, 77, 0.4), transparent);
          }
          .wf-packet {
            left: 0;
            top: 50%;
            margin-left: 0;
            margin-top: -3px;
            animation-name: wfFlowX;
          }
        }

        /* ── Keyframes ── */
        @keyframes wfFlowY {
          0% { top: -6px; opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { top: calc(100% + 6px); opacity: 0; }
        }
        @keyframes wfFlowX {
          0% { left: -6px; opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { left: calc(100% + 6px); opacity: 0; }
        }
        @keyframes wfSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes wfFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes wfBreath {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes wfCorePulse {
          0% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes wfWord {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .wf-node-glow,
          .wf-core-glow,
          .wf-stage-input .wf-node,
          .wf-stage-output .wf-node,
          .wf-ring,
          .wf-orbit,
          .wf-core-pulse,
          .wf-packet,
          .wf-proc-word {
            animation: none !important;
          }
          .wf-orbit-3 {
            opacity: 1;
          }
          .wf-packet {
            opacity: 0.8;
            top: 50%;
          }
        }
      `}</style>
    </div>
  );
}
