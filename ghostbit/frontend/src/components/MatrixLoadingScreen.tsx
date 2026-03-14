"use client";

import { useEffect, useRef, useCallback } from "react";

export default function MatrixLoadingScreen({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:',.<>?/~`";
    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -50);

    const draw = () => {
      ctx.fillStyle = "rgba(3, 7, 18, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head character (bright cyan)
        ctx.fillStyle = "#22d3ee";
        ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
        ctx.fillText(char, x, y);

        // Trail (green fading)
        ctx.fillStyle = `rgba(16, 185, 129, ${0.5 + Math.random() * 0.3})`;
        ctx.font = `${fontSize}px JetBrains Mono, monospace`;
        if (drops[i] > 1) {
          const trailChar = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(trailChar, x, y - fontSize);
        }

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 35);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cleanup = startMatrix();
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cleanup?.();
      window.removeEventListener("resize", handleResize);
    };
  }, [startMatrix]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        className="relative z-10 px-12 py-8 rounded-2xl text-center animate-fade-in-up"
        style={{
          background: "rgba(3, 7, 18, 0.85)",
          border: "1px solid rgba(34, 211, 238, 0.3)",
          boxShadow: "0 0 60px rgba(34, 211, 238, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Spinner */}
        <div className="flex justify-center mb-5">
          <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(34,211,238,0.2)", borderTopColor: "#22d3ee" }} />
        </div>
        <p className="text-xl md:text-2xl font-bold text-gradient">{text}</p>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>This may take a moment...</p>
      </div>
    </div>
  );
}
