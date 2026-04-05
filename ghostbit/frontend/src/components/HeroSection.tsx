"use client";

import { useRouter } from "next/navigation";
import SplineBackground from "./SplineBackground";

export default function HeroSection() {
  const router = useRouter();

  return (
    <section
      className="relative h-screen w-full bg-[#0a0a0b] flex items-center justify-center overflow-hidden"
    >
      {/* Spline 3D background */}
      <SplineBackground />

      {/* Soft dark overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 hero-fade-in mt-10 pointer-events-none">

        {/* Badge */}
        <span
          className="inline-block text-xs font-medium tracking-widest uppercase px-4 py-1.5 rounded-md mb-6 backdrop-blur-md"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "#8b8b8e",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          Free-to-Play Browser Games
        </span>

        {/* Heading */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black leading-tight mb-4"
          style={{ color: "#ececed" }}
        >
          Welcome to{" "}
          <span style={{ color: "#6366f1" }}>GhostPlay</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
          style={{ color: "#d1d1d5" }}
        >
          Jump into instant browser games. No downloads, no installs — just play.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 cursor-auto pointer-events-auto">
          <button
            onClick={() => router.push("/login?mode=signup")}
            className="px-8 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(99,102,241,0.4)",
            }}
          >
            Sign Up — It&apos;s Free
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 hover:bg-white/10"
            style={{
              background: "rgba(255,255,255,0.03)",
              color: "#ececed",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            Login to Your Account
          </button>
        </div>

      </div>

      <style jsx>{`
        .hero-fade-in {
          animation: heroFadeIn 0.8s ease-out forwards;
        }
        @keyframes heroFadeIn {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
