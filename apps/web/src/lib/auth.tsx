import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { http } from './http';

const TOKEN_KEY = 'lba_token';
const EMAIL_KEY = 'lba_email';

interface AuthCtx {
  token: string | null;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY));

  // Inyecta el token en cada request a /api/admin
  useEffect(() => {
    const id = http.interceptors.request.use(config => {
      if (token && config.url?.startsWith('/admin')) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => http.interceptors.request.eject(id);
  }, [token]);

  // Logout automático si la API responde 401 en una ruta admin
  useEffect(() => {
    const id = http.interceptors.response.use(
      r => r,
      err => {
        if (
          err.response?.status === 401 &&
          err.config?.url?.startsWith('/admin') &&
          token
        ) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(EMAIL_KEY);
          setToken(null);
          setEmail(null);
        }
        return Promise.reject(err);
      },
    );
    return () => http.interceptors.response.eject(id);
  }, [token]);

  async function login(email: string, password: string) {
    const { data } = await http.post<{ token: string; email: string }>(
      '/auth/login',
      { email, password },
    );
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(EMAIL_KEY, data.email);
    setToken(data.token);
    setEmail(data.email);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ token, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
