"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, AUTH_EXPIRED_EVENT, clearToken, getToken, saveToken, type User } from "@/lib/api";

export type AuthStatus = "loading" | "loggedIn" | "loggedOut";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null; // the logged-in user; null while loading or when logged out
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // With a saved token, ask the server who we are. Without one we're simply logged out.
    const loadUser = () => {
      const request = getToken() ? api.getMe() : Promise.resolve(null);
      request
        .then((me) => {
          setUser(me);
          setStatus(me ? "loggedIn" : "loggedOut");
        })
        .catch(() => {
          // Expired/invalid token (api.ts already cleared it) or server unreachable.
          setUser(null);
          setStatus("loggedOut");
        });
    };

    loadUser();
    window.addEventListener(AUTH_EXPIRED_EVENT, loadUser);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, loadUser);
  }, []);

  async function login(email: string, password: string) {
    const result = await api.login(email, password);
    saveToken(result.token);
    setUser(result.user);
    setStatus("loggedIn");
  }

  async function signup(name: string, email: string, password: string) {
    const result = await api.signup(name, email, password);
    saveToken(result.token);
    setUser(result.user);
    setStatus("loggedIn");
  }

  // Reload so nothing from the account stays on screen; the dashboard then sends you to /login.
  function logout() {
    clearToken();
    window.location.reload();
  }

  return (
    <AuthContext.Provider value={{ status, user, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
