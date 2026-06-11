import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LandingPage from '../features/landing/LandingPage';
import AppLayout from '../components/layout/AppLayout';
import OwnerLayout from '../components/layout/OwnerLayout';
import OwnerDashboardPage from '../features/owner/pages/OwnerDashboardPage';
import OwnerTurfListPage from '../features/owner/pages/OwnerTurfListPage';
import AddTurfPage from '../features/owner/pages/AddTurfPage';
import ManageTurfPage from '../features/owner/pages/ManageTurfPage';
import PhoneLoginPage from '../features/auth/pages/PhoneLoginPage';
import OtpVerificationPage from '../features/auth/pages/OtpVerificationPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import OwnerRegistrationPage from '../features/auth/pages/OwnerRegistrationPage';
import ProfileCreationPage from '../features/auth/pages/ProfileCreationPage';
import AdminPage from '../features/admin/pages/AdminPage';
import DashboardHomePage from '../features/dashboard/pages/DashboardHomePage';
import TurfListPage from '../features/turfs/pages/TurfListPage';
import TurfDetailPage from '../features/turfs/pages/TurfDetailPage';
import BookingFlowPage from '../features/turfs/pages/BookingFlowPage';
import BookingsPage from '../features/bookings/pages/BookingsPage';
import PublicGamesPage from '../features/publicGames/pages/PublicGamesPage';
import GameDetailPage from '../features/games/pages/GameDetailPage';
import MyGamesPage from '../features/games/pages/MyGamesPage';
import NotificationsPage from '../features/notifications/pages/NotificationsPage';
import ProfilePage from '../features/profile/pages/ProfilePage';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Customer-only route: redirects owners → /owner, admins → /admin */
function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isProfileComplete, isOwner, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isOwner) return <Navigate to="/owner" replace />;
  if (!isProfileComplete) return <Navigate to="/create-profile" replace />;
  return <>{children}</>;
}

/** Owner-only route */
function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isOwner, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

/** Admin-only route */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function AppRouter() {
  const { isAuthenticated, isProfileComplete, isOwner, isAdmin, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const homeRedirect = isAdmin
    ? '/admin'
    : isOwner
      ? '/owner'
      : isProfileComplete
        ? '/home'
        : '/create-profile';

  return (
    <Routes>
      {/* Landing — redirect if logged in */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={homeRedirect} replace /> : <LandingPage />}
      />

      {/* Public auth routes */}
      <Route path="/login" element={<PhoneLoginPage />} />
      <Route path="/verify-otp" element={<OtpVerificationPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/owner-register" element={<OwnerRegistrationPage />} />
      <Route path="/create-profile" element={<ProfileCreationPage />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

      {/* Customer app */}
      <Route element={<CustomerRoute><AppLayout /></CustomerRoute>}>
        <Route path="/home" element={<DashboardHomePage />} />
        <Route path="/turfs" element={<TurfListPage />} />
        <Route path="/turfs/:id" element={<TurfDetailPage />} />
        <Route path="/book/:turfId" element={<BookingFlowPage />} />
        <Route path="/games" element={<PublicGamesPage />} />
        <Route path="/games/:id" element={<GameDetailPage />} />
        <Route path="/my-games" element={<MyGamesPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Owner dashboard */}
      <Route element={<OwnerRoute><OwnerLayout /></OwnerRoute>}>
        <Route path="/owner" element={<OwnerDashboardPage />} />
        <Route path="/owner/turfs" element={<OwnerTurfListPage />} />
        <Route path="/owner/turfs/new" element={<AddTurfPage />} />
        <Route path="/owner/turfs/:id" element={<ManageTurfPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
