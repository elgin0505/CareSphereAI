'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface UserInfo {
  id?: string;
  name: string;
  accountNumber?: string;
  role: 'admin' | 'patient';
}

interface AuthCtx {
  isAuthed: boolean;
  user: UserInfo | null;
  login: (id: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  isAuthed: false,
  user: null,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('cs_user');
    if (savedUser && document.cookie.includes('cs_auth=1')) {
      setUser(JSON.parse(savedUser));
      setIsAuthed(true);
    }
  }, []);

  const login = async (id: string, pass: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: id, password: pass }),
      });

      const result = await response.json();

      if (result.success) {
        document.cookie = 'cs_auth=1; max-age=86400; path=/';
        setUser(result.data.user);
        setIsAuthed(true);
        localStorage.setItem('cs_user', JSON.stringify(result.data.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login failed:', err);
      // Fallback for demo if backend is not reachable or legacy
      if (id === 'admin@caresphere.my' && pass === 'demo2030') {
        document.cookie = 'cs_auth=1; max-age=86400; path=/';
        const adminUser: UserInfo = { name: 'Admin', role: 'admin' };
        setUser(adminUser);
        setIsAuthed(true);
        localStorage.setItem('cs_user', JSON.stringify(adminUser));
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    document.cookie = 'cs_auth=; max-age=0; path=/';
    setIsAuthed(false);
    setUser(null);
    localStorage.removeItem('cs_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthed, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
