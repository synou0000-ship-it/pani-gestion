import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import { getToken, setToken, getUser, setUser, removeAuth } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data?.data) {
            setUserState(res.data.data);
            setUser(res.data.data);
          }
        })
        .catch(() => {
          // Si le serveur est inaccessible (mode hors-ligne), garder le profil stocké en local
          const localUser = getUser();
          if (localUser) {
            setUserState(localUser);
          } else {
            removeAuth();
            setUserState(null);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (token: string, newUser: User) => {
    setToken(token);
    setUser(newUser);
    setUserState(newUser);
  };

  const logout = () => {
    removeAuth();
    setUserState(null);
    window.location.href = '/login';
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!user) return true; // En mode local ou fallback, autoriser par défaut
    const roleNom = typeof user.role === 'string'
      ? user.role
      : (user.role?.nom || (user as any).roleNom || 'Administrateur');
    if (!roleNom || roleNom === 'Administrateur') return true; // L'administrateur a tous les droits
    return roles.includes(roleNom);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé au sein d\'un AuthProvider');
  }
  return context;
}

