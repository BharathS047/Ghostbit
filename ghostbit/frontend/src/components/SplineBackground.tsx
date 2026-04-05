"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

export default function SplineBackground() {
  function onLoad(splineApp: any) {
    // We recursively traverse the scene to find text, groups, or buttons and hide them.
    // This allows the 3D shapes to remain while the template text is removed.
    function hideUnwanted(obj: any) {
      if (!obj) return;
      
      const n = (obj.name || "").toLowerCase();
      // Hide specific elements that are text or UI overlays
      if (
        n.includes("text") ||
        n.includes("button") ||
        n === "ui" ||
        n.includes("nav") ||
        n.includes("contact") ||
        n.includes("get started")
      ) {
        obj.visible = false;
      }
      
      if (obj.children && Array.isArray(obj.children)) {
        obj.children.forEach((child: any) => hideUnwanted(child));
      }
    }

    try {
      // Find the main scene and start recursion
      const scene = splineApp._scene;
      if (scene) {
        hideUnwanted(scene);
      }
    } catch (e) {
      console.error("Spline hide text error:", e);
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
        pointerEvents: "none",
      }}
    >
      <Spline
        scene="https://prod.spline.design/D71snLIIxZPtQbcp/scene.splinecode"
        onLoad={onLoad}
      />
    </div>
  );
}
