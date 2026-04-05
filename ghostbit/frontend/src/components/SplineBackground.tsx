"use client";

import dynamic from "next/dynamic";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

export default function SplineBackground() {
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

      // Disable post-processing noise/grain passes if present
      const renderer = splineApp._renderer;
      if (renderer?.composer?.passes) {
        for (const pass of renderer.composer.passes) {
          const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
          if (pn.includes("noise") || pn.includes("grain") || pn.includes("film")) {
            pass.enabled = false;
          }
        }
      }

      // Also check for effect composer on the app itself
      if (splineApp._composer?.passes) {
        for (const pass of splineApp._composer.passes) {
          const pn = (pass.name || pass.constructor?.name || "").toLowerCase();
          if (pn.includes("noise") || pn.includes("grain") || pn.includes("film")) {
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
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <Spline
        scene="https://prod.spline.design/D71snLIIxZPtQbcp/scene.splinecode"
        onLoad={onLoad}
      />
    </div>
  );
}
