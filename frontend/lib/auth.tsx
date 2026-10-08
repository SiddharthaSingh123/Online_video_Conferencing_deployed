"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, AUTH_EXPIRED_EVENT, clearToken, getToken, saveToken, type User } from "@/lib/api";

type AuthContextValue = {
  // Who the app acts as: the logged-in user, or the default user when logged out.
  // null only while the first /auth/me request is loading.
  user: User | null;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Ask the server who we are (api.ts sends the saved token, if any).
    const loadUser = () => {
      const hasToken = getToken() !== null;
      api
        .getMe()
        .then((me) => {
          setUser(me);
          setLoggedIn(hasToken);
        })
        .catch(() => {
          // A bad token was already cleared by api.ts, which also fires AUTH_EXPIRED_EVENT,
          // so this runs again and loads the default user.
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
    setLoggedIn(true);
  }

  async function signup(name: string, email: string, password: string) {
    const result = await api.signup(name, email, password);
    saveToken(result.token);
    setUser(result.user);
    setLoggedIn(true);
  }

  // Reload the page so every list re-fetches as the logged-out (default) user
  // and nothing from the account is left on screen.
  function logout() {
    clearToken();
    window.location.reload();
  }

  return (
    <AuthContext.Provider value={{ user, loggedIn, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside <AuthProvider>");
  return auth;
}
