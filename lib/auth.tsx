"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api, type ApiUser } from "./api";

export type User = ApiUser;

type Auth = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api<{ user: User }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      // Login par guest cart/wishlist backend me merge ho jayega (store sunta hai)
      window.dispatchEvent(new Event("dfa-auth"));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Login failed.";
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const data = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(data.user);
      toast.success(`Welcome to Dryfruit Adda, ${data.user.name.split(" ")[0]}!`);
      window.dispatchEvent(new Event("dfa-auth"));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Registration failed.";
    }
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    window.dispatchEvent(new Event("dfa-auth"));
    toast.success("Logged out. See you soon!");
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};
