"use client";

import { useRouter } from "next/navigation";

export default function HeroSection() {
  const router = useRouter();

  return (
    <section
      className="relative h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{ backgroundImage: "url('/images/gaming-bg.svg')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 hero-fade-in">
        {/* Badge */}
        <span
          className="inline-block text-xs font-medium tracking-widest uppercase px-4 py-1.5 rounded-md mb-6"
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
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-4"
          style={{ color: "#ececed" }}
        >
          Welcome to{" "}
          <span style={{ color: "#6366f1" }}>GhostPlay</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-base sm:text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
          style={{ color: "#8b8b8e" }}
        >
          Jump into instant browser games. No downloads, no installs — just play.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => router.push("/login?mode=signup")}
            className="px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: "#6366f1", color: "#fff" }}
          >
            Sign Up — It&apos;s Free
          </button>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:border-white/20"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#ececed",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Login
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
            transform: translateY(16px);
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
