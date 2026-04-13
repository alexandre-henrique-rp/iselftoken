import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import type { User } from "~/types/user";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
  const navigate = useNavigate();
  const isInitialized = useRef(false);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch("/api/user/me", {
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      const payload = await response.json();

      if (payload?.error) {
        return null;
      }

      if (payload?.redirect) {
        navigate(payload.redirect);
        return null;
      }

      return payload?.data ?? payload ?? null;
    } catch {
      return null;
    }
  }, [navigate]);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setUser(null);
      setIsAuthenticated(false);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshUser = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const userData = await fetchUser();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    if (isInitialized.current) return;
    if (initialUser) {
      isInitialized.current = true;
      return;
    }

    isInitialized.current = true;

    const initAuth = async () => {
      setLoading(true);

      try {
        const userData = await fetchUser();

        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [initialUser, fetchUser]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
