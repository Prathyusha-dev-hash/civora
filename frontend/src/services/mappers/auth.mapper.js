/**
 * Authentication Data Transfer Object (DTO) Mappers
 * 
 * Maps between backend API / sandbox user payloads and frontend presentation models.
 */

export function toUIUser(raw) {
  if (!raw) return null;

  return {
    id: raw.id || raw.userId || '',
    name: raw.name || raw.fullName || '',
    email: raw.email || '',
    role: raw.role || 'CITIZEN', // 'CITIZEN' | 'AUTHORITY_FIELD_OFFICER' | 'AUTHORITY_SUPERVISOR' | 'CITY_ADMIN'
    department: raw.department || raw.assignedDepartment || null,
    mobile: raw.mobile || raw.phone || '',
    address: raw.address || '',
    isSandbox: Boolean(raw.isSandbox || raw.is_sandbox),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

export function toLoginDTO(credentials) {
  return {
    email: String(credentials.email || '').trim().toLowerCase(),
    password: String(credentials.password || ''),
    target_portal: credentials.targetPortal || null,
  };
}

export function toRegisterDTO(formData) {
  return {
    full_name: String(formData.name || formData.fullName || '').trim(),
    email: String(formData.email || '').trim().toLowerCase(),
    mobile: String(formData.mobile || '').replace(/\D/gu, ''),
    password: String(formData.password || ''),
    address: String(formData.address || '').trim() || null,
    terms_accepted: Boolean(formData.termsAccepted),
  };
}

export function toForgotPasswordDTO(email) {
  return {
    email: String(email || '').trim().toLowerCase(),
  };
}

export function toResetPasswordDTO({ email, token, newPassword }) {
  return {
    email: String(email || '').trim().toLowerCase(),
    token: String(token || ''),
    new_password: String(newPassword || ''),
  };
}

export default {
  toUIUser,
  toLoginDTO,
  toRegisterDTO,
  toForgotPasswordDTO,
  toResetPasswordDTO,
};

