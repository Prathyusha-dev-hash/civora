import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { CitizenPortal } from './features/citizen/CitizenPortal';
import { AuthorityPortal } from './features/authority/AuthorityPortal';
import { AdminPortal } from './features/admin/AdminPortal';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage';
import { FirstVisitLanguagePage } from './features/language/FirstVisitLanguagePage';
import { NotificationHistoryPage } from './features/notifications/NotificationHistoryPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import { FontSizeProvider } from './context/FontSizeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { useAuth } from './context/useAuth';

const CITIZEN_ROLES = ['CITIZEN'];
const AUTHORITY_ROLES = ['AUTHORITY', 'AUTHORITY_FIELD_OFFICER', 'AUTHORITY_SUPERVISOR'];
const ADMIN_ROLES = ['ADMIN', 'CITY_ADMIN'];

function RootRoute() {
  const { isAuthenticated, isLoading, getDefaultPortalRoute } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultPortalRoute()} replace />;
  }

  return <CitizenPortal />;
}

export function App() {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/select-language" element={<FirstVisitLanguagePage />} />
                  <Route path="/" element={<AppShell />}>
                    <Route index element={<RootRoute />} />

                    {/* Public Authentication Routes */}
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="citizen/login" element={<Navigate to="/login?portal=citizen" replace />} />
                    <Route path="authority/login" element={<Navigate to="/login?portal=authority" replace />} />
                    <Route path="admin/login" element={<Navigate to="/login?portal=admin" replace />} />

                    {/* Authenticated Notifications Route */}
                    <Route
                      path="notifications"
                      element={
                        <ProtectedRoute allowedRoles={[...CITIZEN_ROLES, ...AUTHORITY_ROLES, ...ADMIN_ROLES]}>
                          <NotificationHistoryPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Citizen Portal (Public reporting and tracking) */}
                    <Route path="citizen/*" element={<CitizenPortal />} />

                    {/* Role-Protected Authority Portal */}
                    <Route
                      path="authority/*"
                      element={
                        <ProtectedRoute allowedRoles={AUTHORITY_ROLES}>
                          <AuthorityPortal />
                        </ProtectedRoute>
                      }
                    />

                    {/* Role-Protected Admin Portal */}
                    <Route
                      path="admin/*"
                      element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                          <AdminPortal />
                        </ProtectedRoute>
                      }
                    />

                    {/* Wildcard Fallback */}
                    <Route path="*" element={<RootRoute />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </FontSizeProvider>
    </ThemeProvider>
  );
}

export default App;
