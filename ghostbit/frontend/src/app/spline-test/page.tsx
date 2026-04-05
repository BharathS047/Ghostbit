"use client";

import dynamic from "next/dynamic";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(99,102,241,0.15)",
          borderTopColor: "#6366f1",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  ),
});

export default function SplineTestPage() {
  return (
    <div style={{ background: "#030712", minHeight: "100vh", padding: "32px" }}>
      <div className="max-w-7xl mx-auto">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ color: "#e2e8f0" }}
        >
          Spline 3D Hero Preview
        </h1>

        {/* Same hero section as /play authenticated view */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 420,
            borderRadius: 20,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.6))",
            border: "1px solid rgba(99,102,241,0.12)",
            boxShadow:
              "0 0 60px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Spline scene */}
          <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
            <Spline scene="https://prod.spline.design/D71snLIIxZPtQbcp/scene.splinecode" />
          </div>

          {/* Bottom gradient fade */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "50%",
              background:
                "linear-gradient(to top, rgba(3,7,18,0.9) 0%, transparent 100%)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />

          {/* Overlay text */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "32px 32px 28px",
              zIndex: 3,
              pointerEvents: "none",
            }}
          >
            <div
              className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
              style={{
                background: "rgba(99,102,241,0.15)",
                color: "#a5b4fc",
                border: "1px solid rgba(99,102,241,0.25)",
                backdropFilter: "blur(8px)",
              }}
            >
              NEW GAMES WEEKLY
            </div>
            <h1
              className="text-3xl sm:text-4xl font-black mb-2"
              style={{ color: "#f1f5f9", lineHeight: 1.15 }}
            >
              Play. Compete.{" "}
              <span style={{ color: "#a5b4fc" }}>Level Up.</span>
            </h1>
            <p
              className="text-sm sm:text-base max-w-md"
              style={{ color: "#94a3b8" }}
            >
              Free browser games you can jump into instantly. No downloads, no
              installs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
