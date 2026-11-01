import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { UnauthorizedAccess } from './UnauthorizedAccess';

export function ProtectedRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-12 h-12 text-[#7C97B0] dark:text-[#8FAFCB] animate-spin mb-4" />
        <p className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-200">
          Verifying secure session credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    let portalParam = 'citizen';
    if (location.pathname.startsWith('/authority')) {
      portalParam = 'authority';
    } else if (location.pathname.startsWith('/admin')) {
      portalParam = 'admin';
    }
    return (
      <Navigate
        to={`/login?portal=${portalParam}`}
        state={{ from: location, prefilledTab: portalParam }}
        replace
      />
    );
  }

  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    return <UnauthorizedAccess requiredRoles={allowedRoles} />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
