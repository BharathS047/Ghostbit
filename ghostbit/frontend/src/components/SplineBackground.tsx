"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect } from "react";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

export default function SplineBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mute any audio produced by the Spline scene
  useEffect(() => {
    // Suspend AudioContext globally to kill any Spline-triggered sounds
    const origCreate = window.AudioContext || (window as any).webkitAudioContext;
    if (origCreate) {
      const origProto = origCreate.prototype;
      const origResume = origProto.resume;
      origProto.resume = function () {
        this.suspend();
        return Promise.resolve();
      };
      return () => {
        origProto.resume = origResume;
      };
    }
  }, []);

  // Mute any <audio>/<video> elements Spline injects
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.querySelectorAll("audio, video").forEach((media) => {
        (media as HTMLMediaElement).muted = true;
        (media as HTMLMediaElement).volume = 0;
      });
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function onLoad(splineApp: any) {
    function hideUnwanted(obj: any) {
      if (!obj) return;

      const n = (obj.name || "").toLowerCase();
      if (
        n.includes("text") ||
        n.includes("button") ||
        n === "ui" ||
        n.includes("nav") ||
        n.includes("contact") ||
        n.includes("get started") ||
        n.includes("noise") ||
        n.includes("grain") ||
        n.includes("static") ||
        n.includes("overlay")
      ) {
        obj.visible = false;
      }

      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach((child: any) => hideUnwanted(child));
      }
    }

    try {
      const scene = splineApp._scene;
      if (scene) {
        hideUnwanted(scene);
      }

      // Recursively find and disable the logo watermark overlay
      function disableWatermark(obj: any, depth: number) {
        if (!obj || depth > 4) return;
        // Disable logoOverlayPass wherever we find it
        if (obj.logoOverlayPass) {
          obj.logoOverlayPass.enabled = false;
        }
        // Override setWatermark to prevent re-enabling
        if (typeof obj.setWatermark === "function") {
          obj.setWatermark = () => {};
        }
        // Check pipeline property
        if (obj.pipeline) {
          if (obj.pipeline.logoOverlayPass) {
            obj.pipeline.logoOverlayPass.enabled = false;
          }
          if (typeof obj.pipeline.setWatermark === "function") {
            obj.pipeline.setWatermark = () => {};
          }
          // Also disable in effectComposer passes
          if (obj.pipeline.effectComposer?.passes) {
            for (const pass of obj.pipeline.effectComposer.passes) {
              const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
              if (pn.includes("logo") || pn.includes("watermark")) {
                pass.enabled = false;
              }
            }
          }
        }
        // Check effectComposer directly
        if (obj.effectComposer?.passes) {
          for (const pass of obj.effectComposer.passes) {
            const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
            if (pn.includes("logo") || pn.includes("watermark")) {
              pass.enabled = false;
            }
          }
        }
        // Recurse into common property names
        for (const key of ["_renderer", "renderer", "_pipeline", "pipeline", "_composer"]) {
          if (obj[key] && obj[key] !== obj) {
            disableWatermark(obj[key], depth + 1);
          }
        }
      }

      disableWatermark(splineApp, 0);

      // Also keep disabling it on every frame for a short while
      // (the watermark texture may load asynchronously after onLoad)
      let frames = 0;
      function keepDisabling() {
        disableWatermark(splineApp, 0);
        frames++;
        if (frames < 120) {
          requestAnimationFrame(keepDisabling);
        }
      }
      requestAnimationFrame(keepDisabling);

      // Disable noise/grain shader uniforms
      if (scene?.traverse) {
        scene.traverse((child: any) => {
          if (child?.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
              if (mat?.uniforms) {
                if (mat.uniforms.noiseIntensity) mat.uniforms.noiseIntensity.value = 0;
                if (mat.uniforms.grainIntensity) mat.uniforms.grainIntensity.value = 0;
                if (mat.uniforms.nIntensity) mat.uniforms.nIntensity.value = 0;
              }
            }
          }
        });
      }
    } catch (e) {
      console.error("Spline cleanup error:", e);
    }
  }

  return (
    <div
      ref={containerRef}
      className="spline-bg-root"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Spline
        style={{ width: "100vw", height: "100vh", display: "block" }}
        scene="https://prod.spline.design/D71snLIIxZPtQbcp/scene.splinecode"
        onLoad={onLoad}
      />
      {/* Force all Spline wrapper divs and canvas to fill the container */}
      <style jsx global>{`
        .spline-bg-root > div,
        .spline-bg-root > div > div,
        .spline-bg-root > div > div > div,
        .spline-bg-root canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          inset: 0 !important;
        }
      `}</style>
    </div>
  );
}
