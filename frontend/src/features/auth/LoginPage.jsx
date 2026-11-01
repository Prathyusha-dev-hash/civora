import { useState, useId } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Users,
  HardHat,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useLanguage } from '../../context/useLanguage';

const PORTAL_TABS = [
  {
    id: 'citizen',
    label: 'Citizen Portal',
    roleTarget: 'CITIZEN',
    icon: Users,
    desc: 'Report civic issues, track progress, and verify resolutions',
  },
  {
    id: 'authority',
    label: 'Authority Portal',
    roleTarget: 'AUTHORITY',
    icon: HardHat,
    desc: 'Manage work orders, dispatch field crews, and upload proof',
  },
  {
    id: 'admin',
    label: 'Admin Portal',
    roleTarget: 'ADMIN',
    icon: ShieldCheck,
    desc: 'City-wide oversight, cross-department SLAs, and hotspot analytics',
  },
];

const DEMO_ACCOUNTS = [
  {
    role: 'Citizen',
    name: 'Aditi Rao',
    email: 'citizen@civora.org',
    password: 'Password@123',
    department: 'Civic Resident (Indiranagar)',
    tab: 'citizen',
    badge: 'Resident Reporter',
  },
  {
    role: 'Field Officer',
    name: 'Inspector R. Sharma',
    email: 'officer.sharma@civora.gov',
    password: 'Password@123',
    department: 'Roadways & Infrastructure',
    tab: 'authority',
    badge: 'Authority Field Crew',
  },
  {
    role: 'Supervisor',
    name: 'Supervisor A. Patel',
    email: 'inspector.patel@civora.gov',
    password: 'Password@123',
    department: 'Water & Sanitation Board',
    tab: 'authority',
    badge: 'Authority Supervisor',
  },
  {
    role: 'City Admin',
    name: 'Commissioner V. Verma',
    email: 'admin@civora.gov',
    password: 'Password@123',
    department: 'Municipal Governance Core',
    tab: 'admin',
    badge: 'Executive Oversight',
  },
];

export function LoginPage() {
  const { user, isAuthenticated, login, getDefaultPortalRoute } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const portalParam = searchParams.get('portal');
  const [internalTab, setInternalTab] = useState(() => location.state?.prefilledTab || 'citizen');

  // Derive activeTab directly from URL query param with fallback to internal state
  const activeTab = portalParam && PORTAL_TABS.some((tab) => tab.id === portalParam)
    ? portalParam
    : (!portalParam && location.pathname === '/login' && !location.state?.prefilledTab)
      ? 'citizen'
      : internalTab;

  const [email, setEmail] = useState(() => location.state?.prefilledEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastSelectedDemo, setLastSelectedDemo] = useState(null);

  // Field IDs for accessible labels
  const emailId = useId();
  const passwordId = useId();

  const handleSelectDemo = (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setInternalTab(demo.tab);
    setLastSelectedDemo(demo.email);
    setErrorMessage(null);
    navigate(`/login?portal=${demo.tab}`, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await login({ email: email.trim(), password });
      const userRole = session.user?.role;

      // Check if user came from a protected URL they are actually authorized for
      const fromPath = location.state?.from?.pathname;
      let targetRoute = getDefaultPortalRoute(userRole);

      if (fromPath) {
        if (userRole === 'CITIZEN' && fromPath.startsWith('/citizen')) {
          targetRoute = fromPath;
        } else if (
          ['AUTHORITY', 'AUTHORITY_FIELD_OFFICER', 'AUTHORITY_SUPERVISOR'].includes(userRole) &&
          fromPath.startsWith('/authority')
        ) {
          targetRoute = fromPath;
        } else if (['ADMIN', 'CITY_ADMIN'].includes(userRole) && fromPath.startsWith('/admin')) {
          targetRoute = fromPath;
        }
      }

      navigate(targetRoute, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPortal = PORTAL_TABS.find((t) => t.id === activeTab) || PORTAL_TABS[0];
  const IconComponent = currentPortal.icon;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Page Heading */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] text-sm font-bold mb-4">
          <ShieldCheck className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB]" />
          <span>{t('auth.login.badge')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight">
          {t('auth.login.title')}
        </h1>
        <p className="mt-3 text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] max-w-xl mx-auto leading-relaxed">
          {t('auth.login.subtitle')}
        </p>
      </div>

      {/* Main Grid: Form on left, Demo Account Cards on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Portal Tabs & Login Form (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#2D3C49] border border-[#E1E7EE] dark:border-[#40515F] rounded-2xl p-6 sm:p-8 shadow-xl transition-colors">
          {/* Active Session Notification */}
          {isAuthenticated && user && (
            <div className="mb-6 p-4 rounded-xl bg-[#D6E3EF]/50 dark:bg-[#344656]/50 border border-[#7C97B0]/30 dark:border-[#8FAFCB]/30 flex items-center justify-between gap-3 text-sm sm:text-base">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0" />
                <span className="text-[#2E4A62] dark:text-[#F2F5F8]">
                  {t('common.signedInAs')} <strong className="font-bold">{user.name}</strong> ({user.role})
                </span>
              </div>
              <Link
                to={getDefaultPortalRoute()}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-semibold shrink-0 text-xs sm:text-sm transition-colors inline-flex items-center justify-center"
              >
                {t('common.returnAuthorized')} →
              </Link>
            </div>
          )}

          {/* Portal Destination Selector Tabs */}
          <div className="mb-6">
            <p className="text-sm font-bold text-[#64748B] dark:text-[#B7C3CE] uppercase tracking-wider mb-3">
              {t('auth.login.selectPortal')}
            </p>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#F7F9FB] dark:bg-[#202C38] rounded-xl border border-[#E1E7EE] dark:border-[#40515F]">
              {PORTAL_TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                const tabLabel = t(`nav.${tab.id}`) || tab.label;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setInternalTab(tab.id);
                      setErrorMessage(null);
                      navigate(`/login?portal=${tab.id}`, { replace: true });
                    }}
                    className={`min-h-[48px] flex flex-col items-center justify-center py-3 px-2 rounded-lg text-xs sm:text-sm transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#2D3C49] text-[#2E4A62] dark:text-[#8FAFCB] shadow-sm font-bold ring-1 ring-[#7C97B0]/40 dark:ring-[#8FAFCB]/40'
                        : 'text-[#64748B] dark:text-[#B7C3CE] hover:text-[#2E4A62] dark:hover:text-[#F2F5F8] font-medium'
                    }`}
                  >
                    <TabIcon className="w-5 h-5 mb-1" />
                    <span className="truncate">{tabLabel.replace(' Portal', '')}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-start gap-2.5 text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE]">
              <IconComponent className="w-4 h-4 text-[#7C97B0] dark:text-[#8FAFCB] shrink-0 mt-0.5" />
              <span>{currentPortal.desc}</span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-[#C74949]/10 dark:bg-[#C74949]/20 border border-[#C74949]/30 dark:border-[#E56B6B]/40 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-[#C74949] dark:text-[#E56B6B] shrink-0 mt-0.5" />
              <div className="text-sm sm:text-base text-[#C74949] dark:text-[#E56B6B]">
                <p className="font-bold">{t('auth.login.errorTitle')}</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor={emailId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8] mb-2">
                {t('auth.login.emailLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id={emailId}
                  type="email"
                  required
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full min-h-[48px] pl-12 pr-4 py-3 rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={passwordId} className="block text-base sm:text-lg font-semibold text-[#2E4A62] dark:text-[#F2F5F8]">
                  {t('auth.login.passwordLabel')} <span className="text-red-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm sm:text-base text-[#7C97B0] dark:text-[#8FAFCB] hover:underline font-semibold"
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#64748B] dark:text-[#B7C3CE]">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={t('auth.login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[48px] pl-12 pr-12 py-3 rounded-xl text-base sm:text-lg border border-[#E1E7EE] dark:border-[#40515F] bg-white dark:bg-[#202C38] text-[#2E4A62] dark:text-[#F2F5F8] placeholder:text-[#64748B]/60 focus:outline-none focus:ring-2 focus:ring-[#7C97B0] dark:focus:ring-[#8FAFCB] transition-colors"
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

            {/* Role Verification Notice */}
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] leading-relaxed">
              {t('auth.login.roleNotice')}
            </p>

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
                  <span>{t('auth.login.signInBtn')}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Registration Prompt for Citizens */}
          <div className="mt-6 pt-6 border-t border-[#E1E7EE] dark:border-[#40515F] text-center text-sm sm:text-base text-[#64748B] dark:text-[#B7C3CE]">
            {t('auth.login.noAccount')}{' '}
            <Link
              to="/register"
              className="font-bold text-[#7C97B0] dark:text-[#8FAFCB] hover:underline inline-flex items-center gap-1"
            >
              {t('auth.login.registerHere')}
            </Link>
          </div>
        </div>

        {/* Right Column: Quick Demo Accounts (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#F7F9FB] dark:bg-[#202C38] border border-[#E1E7EE] dark:border-[#40515F] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7C97B0] dark:text-[#8FAFCB]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#2E4A62] dark:text-[#F2F5F8]">
                  {t('auth.login.sandboxTitle')}
                </h3>
              </div>
              <span className="text-xs uppercase font-bold px-2.5 py-1 rounded bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB]">
                {t('auth.login.quickFill')}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] mb-4 leading-relaxed">
              {t('auth.login.sandboxDesc')}
            </p>

            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((demo) => {
                const isSelected = lastSelectedDemo === demo.email;
                return (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleSelectDemo(demo)}
                    className={`w-full min-h-[48px] text-left p-4 rounded-xl border transition-all text-sm flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'border-[#7C97B0] dark:border-[#8FAFCB] bg-white dark:bg-[#2D3C49] shadow-sm ring-1 ring-[#7C97B0] dark:ring-[#8FAFCB]'
                        : 'border-[#E1E7EE] dark:border-[#40515F] bg-white/80 dark:bg-[#2D3C49]/60 hover:border-[#7C97B0] dark:hover:border-[#8FAFCB]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base text-[#2E4A62] dark:text-[#F2F5F8]">
                          {demo.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#F7F9FB] dark:bg-[#202C38] text-[#2E4A62] dark:text-[#B7C3CE] font-mono font-medium">
                          {demo.role}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#B7C3CE] font-medium">
                        {demo.department}
                      </p>
                      <p className="text-xs font-mono text-[#64748B] dark:text-[#B7C3CE] mt-1">
                        {demo.email}
                      </p>
                    </div>

                    <div className="shrink-0 pl-3">
                      {isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-[#7C97B0] dark:bg-[#8FAFCB] text-white dark:text-[#202C38] flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm text-[#7C97B0] dark:text-[#8FAFCB] font-semibold group-hover:underline">
                          {t('auth.login.use')} →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
