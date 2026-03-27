"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Role = "decoy" | "approved" | "admin";

interface User {
  id: number;
  username: string;
  role: Role;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, email: string) => Promise<string>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("ghostbit_token");
    if (stored) {
      setToken(stored);
      fetchMe(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchMe(tk: string) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      const data = await res.json();
      setUser(data);
    } catch {
      // Token invalid — clear
      localStorage.removeItem("ghostbit_token");
      setToken(null);
      setUser(null);
    }
  }

  function redirectByRole(role: Role) {
    switch (role) {
      case "admin":
        router.push("/admin");
        break;
      case "approved":
        router.push("/dashboard");
        break;
      case "decoy":
      default:
        router.push("/play");
        break;
    }
  }

  async function login(username: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    localStorage.setItem("ghostbit_token", data.access_token);
    setToken(data.access_token);
    setUser({ id: 0, username: data.username, role: data.role, created_at: "" });
    // Fetch full user data then redirect
    await fetchMe(data.access_token);
    redirectByRole(data.role);
  }

  async function signup(username: string, password: string, email: string): Promise<string> {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Signup failed");
    }
    const data = await res.json();
    return data.message;
  }

  function logout() {
    localStorage.removeItem("ghostbit_token");
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  async function refreshUser() {
    if (token) await fetchMe(token);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
