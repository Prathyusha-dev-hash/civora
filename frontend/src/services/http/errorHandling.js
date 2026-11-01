/**
 * Civora Standardized Error Handling
 */

export class ApiError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Normalizes HTTP response errors and network failures into a consistent ApiError instance.
 */
export async function normalizeHttpError(response, defaultServiceName = 'Backend Service') {
  let errorData = null;
  try {
    errorData = await response.json();
  } catch {
    // Response body is not JSON
  }

  const message =
    errorData?.error?.message ||
    errorData?.message ||
    `${defaultServiceName} returned HTTP ${response.status}: ${response.statusText}`;

  const code = errorData?.error?.code || `HTTP_${response.status}`;
  const details = errorData?.error?.details || errorData?.details || null;

  return new ApiError(message, response.status, code, details);
}

/**
 * Catches low-level fetch TypeError (connection refused, DNS failure, offline).
 */
export function normalizeNetworkError(err, serviceName = 'Backend Service') {
  if (err instanceof ApiError) return err;

  const isNetworkDrop =
    err instanceof TypeError &&
    (err.message.toLowerCase().includes('fetch') || err.message.toLowerCase().includes('network'));

  const message = isNetworkDrop
    ? `${serviceName} is currently unavailable (Connection refused or server offline).`
    : err.message || `An unexpected error occurred while communicating with ${serviceName}.`;

  const code = isNetworkDrop ? 'SERVICE_UNAVAILABLE' : 'CLIENT_REQUEST_ERROR';

  return new ApiError(message, isNetworkDrop ? 503 : 500, code);
}

