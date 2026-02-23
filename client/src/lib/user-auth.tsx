import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredLanguage: string;
}

interface UserAuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: { name: string; phone: string; password: string; email?: string; preferredLanguage?: string; inviteCode?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  token: string | null;
}

const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  isLoading: true,
  isLoggedIn: false,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
  logout: () => {},
  token: null,
});

export function useUserAuth() {
  return useContext(UserAuthContext);
}

const TOKEN_KEY = "arya_user_token";

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const verifyToken = useCallback(async (t: string) => {
    try {
      const res = await fetch("/api/user/verify", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user) {
          return data.user as UserProfile;
        }
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setIsLoading(false);
      return;
    }
    verifyToken(savedToken).then((u) => {
      if (u) {
        setUser(u);
        setToken(savedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      setIsLoading(false);
    });
  }, [verifyToken]);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Connection error" };
    }
  }, []);

  const signup = useCallback(async (data: { name: string; phone: string; password: string; email?: string; preferredLanguage?: string; inviteCode?: string }) => {
    try {
      const res = await fetch("/api/user/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.token) {
        localStorage.setItem(TOKEN_KEY, result.token);
        setToken(result.token);
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error || "Signup failed" };
    } catch {
      return { success: false, error: "Connection error" };
    }
  }, []);

  const logout = useCallback(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      fetch("/api/user/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <UserAuthContext.Provider value={{ user, isLoading, isLoggedIn: !!user, login, signup, logout, token }}>
      {children}
    </UserAuthContext.Provider>
  );
}
