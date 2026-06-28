"use client";

import { useRouter } from "next/navigation";
import SplineBackground from "./SplineBackground";

export default function HeroSection() {
  const router = useRouter();

  return (
    <>
      {/* Viewport-level background — sibling of the section so it escapes any
          local stacking context and stays fixed to the visible viewport. */}
      <SplineBackground />

      <section className="hero-section relative w-full flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        {/* Content layer: pointer-events:none everywhere except the buttons
            themselves, so cursor movement between/around buttons still drives
            the Spline scene below. */}
        <div className="hero-content relative z-10 flex flex-col items-center text-center hero-fade-in pointer-events-none">

          <span className="hero-badge backdrop-blur-md">
            Free-to-Play Browser Games
          </span>

          <h1 className="hero-heading font-black leading-tight">
            Welcome to{" "}
            <span style={{ color: "#6366f1" }}>GhostPlay</span>
          </h1>

          <p className="hero-sub leading-relaxed">
            Jump into instant browser games. No downloads, no installs — just play.
          </p>

          <div className="hero-buttons cursor-auto">
            <button
              onClick={() => router.push("/login?mode=signup")}
              className="hero-btn-primary font-bold transition-all duration-200 hover:brightness-110"
              style={{ pointerEvents: "auto" }}
            >
              Sign Up — It&apos;s Free
            </button>
            <button
              onClick={() => router.push("/login")}
              className="hero-btn-secondary font-bold transition-all duration-200 hover:bg-white/10"
              style={{ pointerEvents: "auto" }}
            >
              Login
            </button>
          </div>

        </div>

      <style jsx>{`
        /* Full viewport — dvh accounts for mobile browser chrome; vh is the fallback */
        .hero-section {
          height: 100vh;
          height: 100dvh;
        }

        /* Content wrapper — fluid horizontal padding */
        .hero-content {
          width: 100%;
          padding: 0 clamp(1rem, 6vw, 4rem);
          gap: clamp(0.75rem, 2vh, 1.25rem);
        }

        /* Badge */
        .hero-badge {
          display: inline-block;
          font-size: clamp(0.6rem, 1.2vw, 0.72rem);
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.3rem 0.85rem;
          border-radius: 0.375rem;
          background: rgba(255, 255, 255, 0.05);
          color: #8b8b8e;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* Heading — scales from 1.6rem (mobile) to 3rem (desktop), always one line */
        .hero-heading {
          color: #ececed;
          font-size: clamp(1.6rem, 4.5vw, 3rem);
          white-space: nowrap;
        }

        /* Subtitle — scales from 0.85rem to 1.05rem */
        .hero-sub {
          color: #c8c8cc;
          font-size: clamp(0.85rem, 1.6vw, 1.05rem);
          max-width: min(34rem, 88vw);
        }

        /* Button row — stacks on mobile, side-by-side on wider screens */
        .hero-buttons {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.75rem;
          width: min(100%, 20rem);
          margin-top: clamp(0.25rem, 1vh, 0.75rem);
        }

        @media (min-width: 480px) {
          .hero-buttons {
            flex-direction: row;
            width: auto;
            align-items: center;
          }
        }

        /* Primary button */
        .hero-btn-primary {
          flex: 1;
          padding: clamp(0.65rem, 1.5vh, 0.875rem) clamp(1.25rem, 3vw, 1.75rem);
          font-size: clamp(0.8rem, 1.4vw, 0.9rem);
          border-radius: 0.5rem;
          border: none;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.35);
          cursor: pointer;
          white-space: nowrap;
        }

        /* Secondary button */
        .hero-btn-secondary {
          flex: 1;
          padding: clamp(0.65rem, 1.5vh, 0.875rem) clamp(1.25rem, 3vw, 1.75rem);
          font-size: clamp(0.8rem, 1.4vw, 0.9rem);
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.04);
          color: #ececed;
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          cursor: pointer;
          white-space: nowrap;
        }

        /* Entrance animation */
        .hero-fade-in {
          animation: heroFadeIn 0.7s ease-out forwards;
        }
        @keyframes heroFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      </section>
    </>
  );
}
