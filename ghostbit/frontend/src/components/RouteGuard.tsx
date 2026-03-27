"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, Role } from "../context/AuthContext";

interface Props {
  allowed: Role[];
  children: React.ReactNode;
}

export default function RouteGuard({ allowed, children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!allowed.includes(user.role)) {
      // Redirect to correct page for their role
      switch (user.role) {
        case "Admin":
          router.push("/admin");
          break;
        case "Approved":
          router.push("/dashboard");
          break;
        default:
          router.push("/play");
          break;
      }
    }
  }, [user, loading, allowed, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-secondary)",
        }}
      >
        <p className="font-mono text-sm">Loading...</p>
      </div>
    );
  }

  if (!user || !allowed.includes(user.role)) return null;

  return <>{children}</>;
}
