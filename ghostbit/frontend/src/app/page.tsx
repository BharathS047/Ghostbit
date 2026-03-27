"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

/**
 * Root page — redirects based on auth state:
 *   - Not logged in → /login
 *   - admin → /admin
 *   - approved → /dashboard
 *   - decoy → /play
 */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/play");
      return;
    }
    switch (user.role) {
      case "Admin":
        router.replace("/admin");
        break;
      case "Approved":
        router.replace("/dashboard");
        break;
      default:
        router.replace("/play");
        break;
    }
  }, [user, loading, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
      }}
    >
      <p className="font-mono text-sm" style={{ color: "var(--text-muted)" }}>
        Redirecting...
      </p>
    </div>
  );
}
