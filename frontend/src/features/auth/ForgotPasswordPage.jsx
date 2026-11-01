import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';

export function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth();
  const { t } = useLanguage();

  const [step, setStep] = useState(1); // 1: Request, 2: Reset Form, 3: Success
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [simulatedInfo, setSimulatedInfo] = useState(null);

  // Accessible field IDs
  const emailId = useId();
  const tokenId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await forgotPassword(email.trim());
      setSimulatedInfo(res.message);
      // Development builds of the backend return the one-time token (no email service configured);
      // otherwise the user pastes the token they received.
      setResetToken(res.devResetToken || '');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to process password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await resetPassword({
        email: email.trim(),
        token: resetToken,
        newPassword,
      });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[#D6E3EF] dark:bg-[#344656] text-[#7C97B0] dark:text-[#8FAFCB] mx-auto flex items-center justify-center mb-4">
          <KeyRound className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
          {t('auth.forgotPassword.title')}
        </h1>
        <p className="mt-2 text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
          {t('auth.forgotPassword.subtitle')}
        </p>
      </div>

      <div className="bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] rounded-2xl p-6 sm:p-10 shadow-xl transition-colors">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#C74949]/10 dark:bg-[#C74949]/20 border border-[#C74949]/30 dark:border-[#E56B6B]/40 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-[#C74949] dark:text-[#E56B6B] shrink-0 mt-0.5" />
            <p className="text-sm sm:text-base text-[#C74949] dark:text-[#E56B6B] font-semibold">{error}</p>
          </div>
        )}

        {/* STEP 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div>
              <label htmlFor={emailId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.forgotPassword.emailLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id={emailId}
                  type="email"
                  required
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[48px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors"
                />
              </div>
              <p className="mt-2 text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
                We will verify your account and provide a secure password reset token.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-bold text-base sm:text-lg shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.forgotPassword.requestBtn')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="pt-4 text-center">
              <Link
                to="/login"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm sm:text-base text-[#7C97B0] dark:text-[#8FAFCB] hover:underline font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('auth.forgotPassword.returnLogin')}</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Enter New Password & Token */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {simulatedInfo && (
              <div className="p-4 rounded-xl bg-[#2E7D6B]/10 dark:bg-[#2E7D6B]/20 border border-[#2E7D6B]/30 dark:border-[#4EAD97]/40 flex items-start gap-3 text-sm text-[#2E7D6B] dark:text-[#4EAD97]">
                <Sparkles className="w-5 h-5 text-[#2E7D6B] dark:text-[#4EAD97] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Reset Verification Code Ready</p>
                  <p className="text-xs sm:text-sm mt-1">{simulatedInfo}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor={tokenId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.forgotPassword.tokenLabel')}
              </label>
              <input
                id={tokenId}
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl text-sm sm:text-base font-mono border border-[#E1E7EE] dark:border-[#40515F] bg-[#F7F9FB] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB]"
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.forgotPassword.newPasswordLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[48px] pl-12 pr-12 py-3 rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB]"
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
            </div>

            <div>
              <label htmlFor={confirmPasswordId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.forgotPassword.confirmPasswordLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id={confirmPasswordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full min-h-[48px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-bold text-base sm:text-lg shadow-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.forgotPassword.savePasswordBtn')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[44px] px-3 text-sm sm:text-base text-[#64748B] hover:text-[#2E4A62] dark:text-[#B7C3CE] dark:hover:text-[#F2F5F8] font-semibold cursor-pointer"
              >
                {t('common.back')}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === 3 && (
          <div className="text-center py-6">
            <div className="w-18 h-18 rounded-full bg-[#2E7D6B]/15 dark:bg-[#2E7D6B]/30 text-[#2E7D6B] dark:text-[#4EAD97] mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] mb-3">
              {t('auth.forgotPassword.successTitle')}
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE] mb-8 leading-relaxed">
              {t('auth.forgotPassword.successMsg')}
            </p>
            <Link
              to="/login"
              state={{ prefilledEmail: email }}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-bold text-base sm:text-lg shadow-md transition-all duration-150"
            >
              <span>Sign In with New Password</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
