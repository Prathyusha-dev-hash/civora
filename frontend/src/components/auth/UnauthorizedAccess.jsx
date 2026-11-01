import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export function UnauthorizedAccess({ requiredRoles = [] }) {
  const { user, logout, getDefaultPortalRoute } = useAuth();
  const navigate = useNavigate();

  const handleGoToPortal = () => {
    const route = getDefaultPortalRoute();
    navigate(route, { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const formatRole = (role) => {
    if (!role) return 'Unknown';
    return role
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white dark:bg-[#2D3C49] border border-red-200 dark:border-red-900/50 rounded-2xl p-6 sm:p-10 shadow-xl text-center transition-colors">
        <div className="w-18 h-18 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-[#2E4A62] dark:text-[#F2F5F8] tracking-tight mb-3">
          Access Restricted
        </h2>

        <p className="text-base sm:text-lg text-[#64748B] dark:text-[#B7C3CE] mb-6 leading-relaxed">
          Your current account role does not have authorization to view this portal.
        </p>

        <div className="bg-[#F7F9FB] dark:bg-[#202C38] rounded-xl p-5 mb-6 text-left border border-[#E1E7EE] dark:border-[#40515F] space-y-3">
          <div className="flex justify-between items-center text-sm sm:text-base">
            <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium">Current Role:</span>
            <span className="font-bold px-2.5 py-1 rounded-lg bg-[#D6E3EF] dark:bg-[#344656] text-[#2E4A62] dark:text-[#8FAFCB] text-sm">
              {formatRole(user?.role)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm sm:text-base">
            <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium">Signed In As:</span>
            <span className="font-semibold text-[#2E4A62] dark:text-[#F2F5F8] truncate max-w-[220px]">
              {user?.email || 'N/A'}
            </span>
          </div>
          {requiredRoles.length > 0 && (
            <div className="flex justify-between items-center text-sm sm:text-base pt-3 border-t border-[#E1E7EE] dark:border-[#40515F]">
              <span className="text-[#64748B] dark:text-[#B7C3CE] font-medium">Required Role:</span>
              <span className="text-red-600 dark:text-red-400 font-mono font-semibold text-xs sm:text-sm">
                {requiredRoles.map(formatRole).join(' or ')}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-3.5">
          <button
            onClick={handleGoToPortal}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#7C97B0] hover:bg-[#6B869E] dark:bg-[#8FAFCB] dark:hover:bg-[#7A9EB8] text-white dark:text-[#202C38] font-semibold shadow-md transition-all text-base sm:text-lg cursor-pointer"
          >
            <span>Return to Your Authorized Portal</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl border-2 border-[#E1E7EE] dark:border-[#40515F] text-[#2E4A62] dark:text-[#F2F5F8] font-semibold hover:bg-[#F7F9FB] dark:hover:bg-[#344656] transition-all text-base sm:text-lg cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Switch Account / Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedAccess;
