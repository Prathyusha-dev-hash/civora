import { useState, useCallback, useMemo } from 'react';
import { AuthContext } from './auth-context';
import { AuthService } from '../services/modules/auth.service';

const AUTHORITY_ROLES = ['AUTHORITY', 'AUTHORITY_FIELD_OFFICER', 'AUTHORITY_SUPERVISOR'];
const ADMIN_ROLES = ['ADMIN', 'CITY_ADMIN'];

export function AuthProvider({ children }) {
  // Initialize state directly from stored session
  const [session, setSessionState] = useState(() => {
    try {
      return AuthService.getSession();
    } catch (err) {
      console.error('[AuthProvider] Failed to restore session:', err);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const user = session?.user || null;
  const token = session?.token || null;

  const login = useCallback(async (credentials) => {
    setError(null);
    setIsLoading(true);
    try {
      const newSession = await AuthService.login(credentials);
      setSessionState(newSession);
      return newSession;
    } catch (err) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (formData) => {
    setError(null);
    try {
      const result = await AuthService.register(formData);
      return result;
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your details.';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthService.logout();
    } finally {
      setSessionState(null);
      setError(null);
    }
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return AuthService.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (payload) => {
    return AuthService.resetPassword(payload);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const updated = await AuthService.getCurrentUser();
      if (updated) {
        setSessionState((prev) => (prev ? { ...prev, user: updated } : null));
      }
      return updated;
    } catch (err) {
      console.warn('[AuthProvider] Failed to refresh user:', err);
      return null;
    }
  }, []);

  const getDefaultPortalRoute = useCallback((targetRole) => {
    const role = targetRole || user?.role;
    if (!role) return '/login';
    if (role === 'CITIZEN') return '/citizen';
    if (AUTHORITY_ROLES.includes(role)) return '/authority';
    if (ADMIN_ROLES.includes(role)) return '/admin';
    return '/login';
  }, [user?.role]);

  const value = useMemo(() => {
    const role = user?.role;
    return {
      user,
      token,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      refreshUser,
      isCitizen: role === 'CITIZEN',
      isAuthority: AUTHORITY_ROLES.includes(role),
      isAdmin: ADMIN_ROLES.includes(role),
      getDefaultPortalRoute,
    };
  }, [user, token, isLoading, error, login, register, logout, forgotPassword, resetPassword, refreshUser, getDefaultPortalRoute]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
