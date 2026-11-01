import { Shield, LogOut, User as UserIcon, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { LanguageDropdown } from './LanguageDropdown';
import { NotificationCenter } from './NotificationCenter';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const formatRole = (role) => {
    if (!role) return '';
    if (role === 'CITIZEN') return 'Citizen';
    if (role === 'AUTHORITY_FIELD_OFFICER') return 'Field Officer';
    if (role === 'AUTHORITY_SUPERVISOR') return 'Supervisor';
    if (role === 'AUTHORITY') return 'Authority';
    if (role === 'CITY_ADMIN') return 'City Admin';
    if (role === 'ADMIN') return 'Admin';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <header className="bg-[#E7EEF5] dark:bg-[#263746] text-[#2E4A62] dark:text-[#F2F5F8] border-b border-[#E1E7EE] dark:border-[#40515F] sticky top-0 z-40 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 sm:py-3.5 gap-4">
          {/* Left Side: Civora Shield Logo & Branding */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0] rounded-xl p-1 -ml-1 shrink-0"
            aria-label="Civora Home"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#7C97B0]/15 dark:bg-[#8FAFCB]/15 group-hover:bg-[#7C97B0]/25 flex items-center justify-center border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30 transition-colors shrink-0">
              <Shield className="w-6 h-6 text-[#2E4A62] dark:text-[#F2F5F8]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl sm:text-2xl tracking-tight text-[#2E4A62] dark:text-[#F2F5F8] leading-tight">
                  Civora
                </span>
              </div>
              <span className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] font-normal hidden md:inline leading-tight mt-0.5">
                {t('common.brandSubtitle')}
              </span>
            </div>
          </Link>

          {/* Right Side: Essential Actions, Language Dropdown & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <LanguageDropdown />
            <ThemeToggle className="min-h-[44px] sm:min-h-[46px]" />

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <NotificationCenter />

                {/* User Profile Pill */}
                <div className="hidden sm:flex items-center gap-2.5 bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] px-3.5 py-1.5 rounded-xl min-h-[44px] sm:min-h-[46px]">
                  <div className="w-8 h-8 rounded-lg bg-[#D6E3EF] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#8FAFCB] flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {user.name ? user.name.charAt(0) : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex flex-col text-left max-w-[120px] md:max-w-[160px]">
                    <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] truncate text-sm leading-tight">
                      {user.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#B7C3CE] leading-tight">
                      <span>{formatRole(user.role)}</span>
                      {user.isSandbox && (
                        <span className="bg-[#B7791F]/15 text-[#B7791F] dark:text-[#E09E3E] font-mono px-1 rounded border border-[#B7791F]/30 text-[10px]">
                          Sandbox
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t('common.signOut')}
                  aria-label={t('common.signOut')}
                  className="min-h-[44px] sm:min-h-[46px] inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base font-bold text-[#2E4A62] dark:text-[#F2F5F8] hover:text-[#2E4A62] bg-white dark:bg-[#2D3C49] hover:bg-[#F7F9FB] dark:hover:bg-[#354756] border border-[#E1E7EE] dark:border-[#40515F] transition-colors cursor-pointer select-none whitespace-nowrap shadow-2xs"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{t('common.signOut')}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Sign In Button */}
                <Link
                  to="/login"
                  role="button"
                  title={t('common.signIn')}
                  aria-label={t('common.signIn')}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="min-h-[44px] sm:min-h-[46px] min-w-[92px] sm:min-w-[105px] inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-sm sm:text-base font-bold text-[#2E4A62] dark:text-[#F2F5F8] bg-white dark:bg-[#2D3C49] hover:bg-[#F7F9FB] dark:hover:bg-[#354756] border border-[#E1E7EE] dark:border-[#40515F] transition-colors whitespace-nowrap select-none cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0]"
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{t('common.signIn')}</span>
                </Link>

                {/* Register Button */}
                <Link
                  to="/register"
                  role="button"
                  title={t('common.register')}
                  aria-label={t('common.register')}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="min-h-[44px] sm:min-h-[46px] min-w-[92px] sm:min-w-[105px] inline-flex items-center justify-center px-4 sm:px-6 py-2 rounded-xl text-sm sm:text-base font-bold text-white bg-[#7C97B0] hover:bg-[#69849E] dark:bg-[#8FAFCB] dark:hover:bg-[#A1BDD6] dark:text-[#202C38] transition-colors shadow-xs whitespace-nowrap select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C97B0]"
                >
                  <span className="whitespace-nowrap">{t('common.register')}</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
