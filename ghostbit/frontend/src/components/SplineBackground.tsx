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

  // Mute any <audio>/<video> elements AND hide the "Made with Spline" watermark
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      // Mute media
      el.querySelectorAll("audio, video").forEach((media) => {
        (media as HTMLMediaElement).muted = true;
        (media as HTMLMediaElement).volume = 0;
      });
      // Hide "Made with Spline" watermark logo
      el.querySelectorAll("a, div, img").forEach((node) => {
        const anchor = node.closest("a");
        if (anchor && anchor.href && anchor.href.includes("spline")) {
          (anchor as HTMLElement).style.display = "none";
        }
      });
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function onLoad(splineApp: any) {
    function hideUnwanted(obj: any) {
      if (!obj) return;

      const n = (obj.name || "").toLowerCase();
      // Hide text, UI overlays, and noise/grain layers
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

      // Disable the "Built with Spline" logo watermark overlay pass
      const renderer = splineApp._renderer;
      if (renderer?.logoOverlayPass) {
        renderer.logoOverlayPass.enabled = false;
      }

      // Disable post-processing noise/grain passes if present
      if (renderer?.effectComposer?.passes) {
        for (const pass of renderer.effectComposer.passes) {
          const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
          if (pn.includes("noise") || pn.includes("grain") || pn.includes("film") || pn.includes("logo")) {
            pass.enabled = false;
          }
        }
      }

      // Also check for effect composer on the app itself
      if (splineApp._composer?.passes) {
        for (const pass of splineApp._composer.passes) {
          const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
          if (pn.includes("noise") || pn.includes("grain") || pn.includes("film") || pn.includes("logo")) {
            pass.enabled = false;
          }
        }
      }

      // Traverse Three.js scene for ShaderMaterial-based noise
      if (scene?.traverse) {
        scene.traverse((child: any) => {
          if (child?.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            for (const mat of mats) {
              if (mat?.uniforms) {
                // Disable noise intensity uniforms commonly used in grain shaders
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
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Spline
        style={{ width: "100%", height: "100%" }}
        scene="https://prod.spline.design/D71snLIIxZPtQbcp/scene.splinecode"
        onLoad={onLoad}
      />
      {/* Force canvas to fill container and hide any watermark elements */}
      <style jsx>{`
        div :global(canvas) {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        div :global(a[href*="spline"]) {
          display: none !important;
        }
        div :global(> div) {
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}
