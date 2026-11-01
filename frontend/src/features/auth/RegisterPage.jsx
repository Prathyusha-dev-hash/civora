import { useState, useId } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';

export function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    agreeTerms: false,
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Field IDs for accessible labels
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const addressId = useId();
  const termsId = useId();

  // Password strength calculation
  const calculatePasswordStrength = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    const score = Object.values(checks).filter(Boolean).length;
    let label = t('auth.register.veryWeak');
    let color = 'bg-red-500';
    let textColor = 'text-red-500';

    if (score >= 5) {
      label = t('auth.register.strong');
      color = 'bg-[#2E7D6B] dark:bg-[#4EAD97]';
      textColor = 'text-[#2E7D6B] dark:text-[#4EAD97]';
    } else if (score >= 4) {
      label = t('auth.register.good');
      color = 'bg-[#7C97B0] dark:bg-[#8FAFCB]';
      textColor = 'text-[#7C97B0] dark:text-[#8FAFCB]';
    } else if (score >= 3) {
      label = t('auth.register.fair');
      color = 'bg-[#B7791F] dark:bg-[#E09E3E]';
      textColor = 'text-[#B7791F] dark:text-[#E09E3E]';
    } else if (score >= 1) {
      label = t('auth.register.weak');
      color = 'bg-[#C74949] dark:bg-[#E56B6B]';
      textColor = 'text-[#C74949] dark:text-[#E56B6B]';
    }

    return { checks, score, label, color, textColor };
  };

  const strength = calculatePasswordStrength(form.password);

  // Validation rules
  const validate = (currentForm = form) => {
    const newErrors = {};

    if (!currentForm.name.trim()) {
      newErrors.name = t('auth.register.validation.nameRequired');
    } else if (currentForm.name.trim().length < 2) {
      newErrors.name = t('auth.register.validation.nameMin');
    }

    if (!currentForm.email.trim()) {
      newErrors.email = t('auth.register.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentForm.email.trim())) {
      newErrors.email = t('auth.register.validation.emailInvalid');
    }

    if (!currentForm.phone.trim()) {
      newErrors.phone = t('auth.register.validation.phoneRequired');
    } else if (!/^[0-9+\s\-()]{10,15}$/.test(currentForm.phone.trim())) {
      newErrors.phone = t('auth.register.validation.phoneInvalid');
    }

    if (!currentForm.password) {
      newErrors.password = t('auth.register.validation.passwordRequired');
    } else if (currentForm.password.length < 8) {
      newErrors.password = t('auth.register.validation.passwordMin');
    }

    if (!currentForm.confirmPassword) {
      newErrors.confirmPassword = t('auth.register.validation.confirmRequired');
    } else if (currentForm.confirmPassword !== currentForm.password) {
      newErrors.confirmPassword = t('auth.register.validation.confirmMismatch');
    }

    if (!currentForm.agreeTerms) {
      newErrors.agreeTerms = t('auth.register.validation.termsRequired');
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const updated = { ...form, [name]: val };
    setForm(updated);

    if (touched[name]) {
      const v = validate(updated);
      setErrors(v);
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const v = validate(form);
    setErrors(v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      agreeTerms: true,
    });

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        address: form.address.trim(),
      });
      setIsSuccess(true);
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] text-sm font-bold mb-4">
          <ShieldCheck className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB]" />
          <span>{t('auth.register.badge')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
          {t('auth.register.title')}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] max-w-xl mx-auto leading-relaxed">
          {t('auth.register.subtitle')}
        </p>
      </div>

      {/* Success View */}
      {isSuccess ? (
        <div className="bg-white dark:bg-[#2D3C49] border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 rounded-2xl p-8 sm:p-12 shadow-xl text-center">
          <div className="w-20 h-20 rounded-full bg-[#2E7D6B]/15 dark:bg-[#2E7D6B]/30 text-[#2E7D6B] dark:text-[#4EAD97] mx-auto flex items-center justify-center mb-5">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] mb-3">
            {t('auth.register.successTitle')}
          </h2>
          <p className="text-[#64748B] dark:text-[#B7C3CE] text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed">
            {t('auth.register.successMsg', { name: form.name, email: form.email })}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login', { state: { prefilledEmail: form.email, prefilledTab: 'citizen' } })}
              className="min-h-[48px] inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-bold text-base sm:text-lg shadow-md transition-colors cursor-pointer"
            >
              <span>{t('auth.register.proceedToLogin')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Form View */
        <div className="bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] rounded-2xl p-6 sm:p-10 shadow-xl transition-colors">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-[#C74949]/10 dark:bg-[#C74949]/20 border border-[#C74949]/30 dark:border-[#E56B6B]/40 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-[#C74949] dark:text-[#E56B6B] shrink-0 mt-0.5" />
              <div className="text-sm sm:text-base text-[#C74949] dark:text-[#E56B6B]">
                <p className="font-bold">Registration Notice</p>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor={nameId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.register.nameLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id={nameId}
                  name="name"
                  type="text"
                  required
                  placeholder={t('auth.register.namePlaceholder')}
                  value={form.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  className={`w-full min-h-[48px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors ${
                    touched.name && errors.name
                      ? 'border-red-300 dark:border-red-700 bg-red-50/20'
                      : 'border-[#E1E7EE] dark:border-[#40515F]'
                  }`}
                />
              </div>
              {touched.name && errors.name && (
                <p className="mt-1.5 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.name}</p>
              )}
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor={emailId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                  {t('auth.register.emailLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    required
                    placeholder={t('auth.register.emailPlaceholder')}
                    value={form.email}
                    onChange={handleChange}
                    onBlur={() => handleBlur('email')}
                    className={`w-full min-h-[48px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors ${
                      touched.email && errors.email
                        ? 'border-red-300 dark:border-red-700 bg-red-50/20'
                        : 'border-[#E1E7EE] dark:border-[#40515F]'
                    }`}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className="mt-1.5 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor={phoneId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                  {t('auth.register.phoneLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    id={phoneId}
                    name="phone"
                    type="tel"
                    required
                    placeholder={t('auth.register.phonePlaceholder')}
                    value={form.phone}
                    onChange={handleChange}
                    onBlur={() => handleBlur('phone')}
                    className={`w-full min-h-[48px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors ${
                      touched.phone && errors.phone
                        ? 'border-red-300 dark:border-red-700 bg-red-50/20'
                        : 'border-[#E1E7EE] dark:border-[#40515F]'
                    }`}
                  />
                </div>
                {touched.phone && errors.phone && (
                  <p className="mt-1.5 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Address (Optional) */}
            <div>
              <label htmlFor={addressId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.register.addressLabel')} <span className="text-[#64748B] dark:text-[#B7C3CE] font-normal text-sm sm:text-base">({t('common.optional')})</span>
              </label>
              <div className="relative">
                <div className="absolute top-3.5 left-4 pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <MapPin className="w-5 h-5" />
                </div>
                <textarea
                  id={addressId}
                  name="address"
                  rows={2}
                  placeholder={t('auth.register.addressPlaceholder')}
                  value={form.address}
                  onChange={handleChange}
                  className="w-full min-h-[80px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Password & Confirm Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor={passwordId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                  {t('auth.register.passwordLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={form.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    className={`w-full min-h-[48px] pl-12 pr-12 py-3 rounded-xl text-base sm:text-lg border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors ${
                      touched.password && errors.password
                        ? 'border-red-300 dark:border-red-700 bg-red-50/20'
                        : 'border-[#E1E7EE] dark:border-[#40515F]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#2E4A62] dark:text-[#B7C3CE] dark:hover:text-white cursor-pointer min-h-[48px]"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="mt-1.5 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor={confirmPasswordId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                  {t('auth.register.confirmPasswordLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id={confirmPasswordId}
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder={t('auth.register.confirmPasswordPlaceholder')}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`w-full min-h-[48px] pl-12 pr-12 py-3 rounded-xl text-base sm:text-lg border bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors ${
                      touched.confirmPassword && errors.confirmPassword
                        ? 'border-red-300 dark:border-red-700 bg-red-50/20'
                        : 'border-[#E1E7EE] dark:border-[#40515F]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#2E4A62] dark:text-[#B7C3CE] dark:hover:text-white cursor-pointer min-h-[48px]"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="mt-1.5 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Password Strength Meter */}
            {form.password && (
              <div className="p-4 rounded-xl bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F]">
                <div className="flex items-center justify-between text-sm sm:text-base mb-2">
                  <span className="font-semibold text-[#64748B] dark:text-[#B7C3CE]">{t('auth.register.strength')}:</span>
                  <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                </div>
                <div className="h-2.5 w-full bg-[#E1E7EE] dark:bg-[#40515F] rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE]">
                  <span className={strength.checks.length ? 'text-[#2E7D6B] dark:text-[#4EAD97] font-semibold' : ''}>
                    ✓ 8+ characters
                  </span>
                  <span className={strength.checks.uppercase ? 'text-[#2E7D6B] dark:text-[#4EAD97] font-semibold' : ''}>
                    ✓ Uppercase letter
                  </span>
                  <span className={strength.checks.number ? 'text-[#2E7D6B] dark:text-[#4EAD97] font-semibold' : ''}>
                    ✓ Number digit
                  </span>
                  <span className={strength.checks.special ? 'text-[#2E7D6B] dark:text-[#4EAD97] font-semibold' : ''}>
                    ✓ Special symbol
                  </span>
                </div>
              </div>
            )}

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label htmlFor={termsId} className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id={termsId}
                  name="agreeTerms"
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={handleChange}
                  className="mt-1 rounded-md border-[#E1E7EE] dark:border-[#40515F] text-[#7C97B0] focus:ring-[#7C97B0] w-5 h-5 shrink-0 cursor-pointer"
                />
                <span className="text-sm sm:text-base text-[#2E4A62] dark:text-[#F2F5F8] leading-relaxed">
                  {t('auth.register.terms')}
                </span>
              </label>
              {touched.agreeTerms && errors.agreeTerms && (
                <p className="mt-1.5 text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">{errors.agreeTerms}</p>
              )}
            </div>

            {/* Role Notice */}
            <div className="p-4 rounded-xl bg-[#D6E3EF]/30 dark:bg-[#344656]/30 border border-[#E1E7EE] dark:border-[#40515F] flex items-start gap-3 text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
              <Info className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0 mt-0.5" />
              <span>
                {t('auth.register.roleNotice')}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-bold text-base sm:text-lg shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('auth.register.submitting')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.register.submitBtn')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 pt-6 border-t border-[#E1E7EE] dark:border-[#40515F] text-center text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE]">
            {t('auth.register.hasAccount')}{' '}
            <Link
              to="/login"
              className="font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:underline inline-flex items-center gap-1"
            >
              {t('auth.register.signInLink')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterPage;
