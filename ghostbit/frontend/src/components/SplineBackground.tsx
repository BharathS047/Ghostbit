"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect } from "react";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

export default function SplineBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const splineAppRef = useRef<unknown>(null);
  const reducedMotionRef = useRef(false);

  // Mute any audio produced by the Spline scene
  useEffect(() => {
    const origCreate = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

  // Mute any <audio>/<video> elements Spline injects + find the canvas as soon as it appears
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.querySelectorAll("audio, video").forEach((media) => {
        (media as HTMLMediaElement).muted = true;
        (media as HTMLMediaElement).volume = 0;
      });
      if (!canvasRef.current) {
        const c = el.querySelector("canvas");
        if (c) canvasRef.current = c as HTMLCanvasElement;
      }
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Detect prefers-reduced-motion — guards the heavy scene
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = m.matches;
    const onChange = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  // Keep canvas resolution aligned with the actual viewport — fires on window resize,
  // mobile URL-bar toggle (visualViewport), font-load shifts, and rotation.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const forceResize = () => {
      // Dispatch resize so Spline's internal renderer recomputes its size.
      window.dispatchEvent(new Event("resize"));
    };

    const ro = new ResizeObserver(forceResize);
    ro.observe(el);

    const vv = window.visualViewport;
    if (vv) vv.addEventListener("resize", forceResize);

    return () => {
      ro.disconnect();
      if (vv) vv.removeEventListener("resize", forceResize);
    };
  }, []);

  // Forward window-level pointermove to the Spline canvas. Guarantees interaction
  // is driven by the cursor even if the canvas momentarily doesn't fill the viewport
  // (resize race) or another element above it eats the event.
  useEffect(() => {
    function forward(e: PointerEvent) {
      const c = canvasRef.current;
      if (!c) return;
      // Only re-dispatch when the original target isn't already the canvas, to avoid
      // infinite loops; Spline's listener is attached to its own canvas.
      if (e.target === c) return;
      const ev = new PointerEvent("pointermove", {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType,
        bubbles: true,
        cancelable: true,
      });
      c.dispatchEvent(ev);
    }
    window.addEventListener("pointermove", forward, { passive: true });
    return () => window.removeEventListener("pointermove", forward);
  }, []);

  function onLoad(splineApp: unknown) {
    splineAppRef.current = splineApp;
    type SplineLike = {
      _scene?: { traverse?: (cb: (child: unknown) => void) => void };
      logoOverlayPass?: { enabled: boolean };
      setWatermark?: () => void;
      pipeline?: SplineLike & { effectComposer?: { passes: Array<{ name?: string; constructor?: { name?: string }; enabled?: boolean }> } };
      effectComposer?: { passes: Array<{ name?: string; constructor?: { name?: string }; enabled?: boolean }> };
      _renderer?: SplineLike;
      renderer?: SplineLike;
      _pipeline?: SplineLike;
      _composer?: SplineLike;
    };

    function hideUnwanted(obj: unknown) {
      if (!obj || typeof obj !== "object") return;
      const o = obj as { name?: string; visible?: boolean; children?: unknown[] };
      const n = (o.name || "").toLowerCase();
      if (
        n.includes("text") || n.includes("button") || n === "ui" ||
        n.includes("nav") || n.includes("contact") || n.includes("get started") ||
        n.includes("noise") || n.includes("grain") || n.includes("static") || n.includes("overlay")
      ) {
        o.visible = false;
      }
      if (Array.isArray(o.children)) o.children.forEach(hideUnwanted);
    }

    function disableWatermark(obj: SplineLike | undefined, depth: number) {
      if (!obj || depth > 4) return;
      if (obj.logoOverlayPass) obj.logoOverlayPass.enabled = false;
      if (typeof obj.setWatermark === "function") obj.setWatermark = () => {};
      if (obj.pipeline) {
        if (obj.pipeline.logoOverlayPass) obj.pipeline.logoOverlayPass.enabled = false;
        if (typeof obj.pipeline.setWatermark === "function") obj.pipeline.setWatermark = () => {};
        if (obj.pipeline.effectComposer?.passes) {
          for (const pass of obj.pipeline.effectComposer.passes) {
            const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
            if (pn.includes("logo") || pn.includes("watermark")) pass.enabled = false;
          }
        }
      }
      if (obj.effectComposer?.passes) {
        for (const pass of obj.effectComposer.passes) {
          const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
          if (pn.includes("logo") || pn.includes("watermark")) pass.enabled = false;
        }
      }
      for (const key of ["_renderer", "renderer", "_pipeline", "pipeline", "_composer"] as const) {
        const next: SplineLike | undefined = obj[key] as SplineLike | undefined;
        if (next && next !== obj) disableWatermark(next, depth + 1);
      }
    }

    try {
      const app = splineApp as SplineLike;
      hideUnwanted(app._scene);
      disableWatermark(app, 0);

      // Bounded re-attempts — Spline's watermark texture may load asynchronously.
      // 5 attempts spaced ~100ms is enough without burning a frame budget for 2s.
      let attempts = 0;
      const timer = setInterval(() => {
        disableWatermark(app, 0);
        if (++attempts >= 5) clearInterval(timer);
      }, 100);

      // Disable noise/grain shader uniforms
      app._scene?.traverse?.((child: unknown) => {
        const c = child as { material?: unknown };
        if (c?.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const mat of mats) {
            const m = mat as { uniforms?: Record<string, { value: number }> };
            if (m?.uniforms) {
              if (m.uniforms.noiseIntensity) m.uniforms.noiseIntensity.value = 0;
              if (m.uniforms.grainIntensity) m.uniforms.grainIntensity.value = 0;
              if (m.uniforms.nIntensity) m.uniforms.nIntensity.value = 0;
            }
          }
        }
      });

      // Cache the canvas + force one resize so the renderer matches the visible viewport.
      const c = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      if (c) canvasRef.current = c;
      // Defer one frame so layout settles before measuring.
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    } catch (e) {
      console.error("Spline cleanup error:", e);
    }
  }

  return (
    <div
      ref={containerRef}
      className="spline-bg-root"
      aria-hidden="true"
    >
      <Spline
        scene="https://prod.spline.design/D71snLIIxZPtQbcp/scene.splinecode"
        onLoad={onLoad}
      />
      <style jsx global>{`
        /* Background layer: pinned to the visual viewport. dvw/dvh tracks mobile URL-bar
           changes; vw/vh is the fallback for older browsers. */
        .spline-bg-root {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          width: 100dvw;
          height: 100dvh;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }
        /* Force the canvas itself (not arbitrary wrapper depth) to fill the layer
           and accept pointer events so Spline drives interaction. */
        .spline-bg-root canvas {
          position: absolute;
          inset: 0;
          width: 100% !important;
          height: 100% !important;
          display: block;
          pointer-events: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .spline-bg-root { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
