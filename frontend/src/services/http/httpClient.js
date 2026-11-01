/**
 * Civora Centralized HTTP Client
 * 
 * Provides unified request execution, auth token injection, timeout aborts,
 * and standard error normalization. React components must never call fetch directly.
 */

import { API_BASE_URL } from '../../config/endpoints';
import { normalizeHttpError, normalizeNetworkError, ApiError } from './errorHandling';

const DEFAULT_TIMEOUT_MS = 15000;

class HttpClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.tokenGetter = () => localStorage.getItem('civicai_auth_token');
  }

  /**
   * Builds complete request URL handling slashes cleanly.
   */
  _buildUrl(endpoint, params = null) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${cleanEndpoint}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }

    return url.toString();
  }

  /**
   * Prepares default headers with optional auth token.
   */
  _getHeaders(customHeaders = {}) {
    const headers = { ...customHeaders };
    const token = this.tokenGetter ? this.tokenGetter() : null;
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Base request runner with timeout.
   */
  async _request(url, options = {}, serviceName = 'Backend Service') {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await normalizeHttpError(response, serviceName);
      }

      // Return null for 204 No Content
      if (response.status === 204) return null;

      const data = await response.json().catch(() => null);
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApiError(`Request to ${serviceName} timed out after ${options.timeout || DEFAULT_TIMEOUT_MS}ms`, 408, 'REQUEST_TIMEOUT');
      }
      throw normalizeNetworkError(err, serviceName);
    }
  }

  async get(endpoint, params = null, options = {}) {
    const url = this._buildUrl(endpoint, params);
    return this._request(url, {
      method: 'GET',
      headers: this._getHeaders(options.headers),
      ...options,
    });
  }

  async post(endpoint, body = {}, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._request(url, {
      method: 'POST',
      headers: this._getHeaders({
        'Content-Type': 'application/json',
        ...options.headers,
      }),
      body: JSON.stringify(body),
      ...options,
    });
  }

  async postFormData(endpoint, formData, options = {}) {
    const url = this._buildUrl(endpoint);
    // Note: Do NOT set Content-Type header for FormData, browser sets boundary automatically
    return this._request(url, {
      method: 'POST',
      headers: this._getHeaders(options.headers),
      body: formData,
      ...options,
    });
  }

  async patch(endpoint, body = {}, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._request(url, {
      method: 'PATCH',
      headers: this._getHeaders({
        'Content-Type': 'application/json',
        ...options.headers,
      }),
      body: JSON.stringify(body),
      ...options,
    });
  }

  async put(endpoint, body = {}, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._request(url, {
      method: 'PUT',
      headers: this._getHeaders({
        'Content-Type': 'application/json',
        ...options.headers,
      }),
      body: JSON.stringify(body),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    const url = this._buildUrl(endpoint);
    return this._request(url, {
      method: 'DELETE',
      headers: this._getHeaders(options.headers),
      ...options,
    });
  }
}

export const httpClient = new HttpClient();
export default httpClient;

