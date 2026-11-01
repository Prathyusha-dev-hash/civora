/**
 * Authentication & Role-Based Access Control (RBAC) Service
 * 
 * Manages citizen registration, multi-role authentication, session persistence,
 * and password recovery for both Sandbox mode and future Live API integration.
 */

import { httpClient } from '../http/httpClient';
import { ENDPOINTS } from '../../config/endpoints';
import {
  toUIUser,
  toLoginDTO,
  toRegisterDTO,
  toForgotPasswordDTO,
  toResetPasswordDTO,
} from '../mappers/auth.mapper';

const AUTH_STORAGE_KEY = 'civicai_auth_session';
const AUTH_TOKEN_KEY = 'civicai_auth_token';

export class AuthService {
  /**
   * Retrieves the current authenticated session from storage.
   * Returns null if unauthenticated.
   */
  static getSession() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.user) {
          return {
            ...parsed,
            user: toUIUser(parsed.user),
          };
        }
      }
    } catch {
      // Storage parsing failure, fallback to null
    }

    return null;
  }

  /**
   * Persists the authenticated session and token into secure client storage.
   */
  static setSession(sessionData) {
    if (!sessionData) {
      this.clearSession();
      return;
    }

    const normalized = {
      user: toUIUser(sessionData.user),
      token: sessionData.token || null,
      isSandbox: false,
      authenticatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
      if (normalized.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, normalized.token);
      }
    } catch {
      // Storage quota or disabled
    }

    return normalized;
  }

  /**
   * Clears the current authenticated session.
   */
  static clearSession() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Registers a new Citizen account.
   */
  static async register(formData) {
    const payload = toRegisterDTO(formData);


    const response = await httpClient.post(ENDPOINTS.AUTH.REGISTER, payload);
    const data = response?.data || response;
    return {
      user: toUIUser(data.user || data),
      message: data.message || 'Citizen account registered successfully.',
    };
  }

  /**
   * Authenticates user with credentials and establishes a role-verified session.
   */
  static async login(credentials) {
    const payload = toLoginDTO(credentials);


    const response = await httpClient.post(ENDPOINTS.AUTH.LOGIN, payload);
    const data = response?.data || response;
    const session = this.setSession({
      user: data.user,
      token: data.token,
      isSandbox: false,
    });
    return session;
  }

  /**
   * Requests a password reset link for the provided email.
   */
  static async forgotPassword(email) {
    const payload = toForgotPasswordDTO(email);


    const response = await httpClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
    return response?.data || response;
  }

  /**
   * Resets password using the received token.
   */
  static async resetPassword({ email, token, newPassword }) {
    const payload = toResetPasswordDTO({ email, token, newPassword });


    const response = await httpClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
    return response?.data || response;
  }

  /**
   * Fetches the current authenticated user's profile from backend.
   */
  static async getCurrentUser() {
    const currentSession = this.getSession();
    if (!currentSession) return null;


    try {
      const response = await httpClient.get(ENDPOINTS.AUTH.ME);
      const data = response?.data || response;
      const user = toUIUser(data.user || data);
      this.setSession({
        ...currentSession,
        user,
      });
      return user;
    } catch {
      return currentSession.user;
    }
  }

  /**
   * Terminates the current session on client and notifies the server.
   */
  static async logout() {
    try {
      await httpClient.post(ENDPOINTS.AUTH.LOGOUT);
    } catch {
      // Continue with client session cleanup even if server call fails
    }
    this.clearSession();
  }
}

export default AuthService;
