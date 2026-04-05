"use client";

import { Suspense } from "react";

function ResetPasswordRedirect() {
  // The reset flow now lives on /forgot-password with code entry.
  // Redirect anyone landing here.
  if (typeof window !== "undefined") {
    window.location.replace("/forgot-password");
  }
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "100vh", background: "#0a0a0b", color: "#8b8b8e" }}
    >
      <p className="text-sm font-mono">Redirecting...</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordRedirect />
    </Suspense>
  );
}
