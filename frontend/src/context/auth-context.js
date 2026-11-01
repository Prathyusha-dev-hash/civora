import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  forgotPassword: async () => {},
  resetPassword: async () => {},
  refreshUser: async () => {},
  isCitizen: false,
  isAuthority: false,
  isAdmin: false,
  getDefaultPortalRoute: () => '/login',
});

export default AuthContext;

